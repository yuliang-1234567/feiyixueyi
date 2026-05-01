const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ARContent = require('../models/ARContent');
const AIInvocationLog = require('../models/AIInvocationLog');
const { generateQwenRecognitionAnalysis } = require('../utils/qwen');

const router = express.Router();

let ensureAiLogTablePromise = null;

async function ensureAiLogTable() {
  if (!ensureAiLogTablePromise) {
    ensureAiLogTablePromise = AIInvocationLog.sync().catch((error) => {
      ensureAiLogTablePromise = null;
      throw error;
    });
  }
  await ensureAiLogTablePromise;
}

function normalizeFailureReason(errorLike) {
  const raw = String(
    errorLike?.message ||
    errorLike?.error ||
    errorLike ||
    ''
  ).trim();
  if (!raw) return 'unknown';
  if (/rate|throttl|quota/i.test(raw)) return 'rate_limit';
  if (/timeout|timed out|etimedout/i.test(raw)) return 'timeout';
  if (/auth|unauthoriz|api key|forbidden|401|403/i.test(raw)) return 'auth_error';
  if (/network|socket|connect|dns|econn/i.test(raw)) return 'network_error';
  if (/invalid|bad request|参数|格式/i.test(raw)) return 'invalid_request';
  return raw.slice(0, 200);
}

async function logAiInvocation(payload = {}) {
  try {
    await ensureAiLogTable();
    await AIInvocationLog.create({
      userId: payload.userId || null,
      feature: String(payload.feature || 'unknown'),
      endpoint: String(payload.endpoint || 'unknown'),
      provider: payload.provider ? String(payload.provider) : null,
      model: payload.model ? String(payload.model) : null,
      success: Boolean(payload.success),
      latencyMs: Number(payload.latencyMs || 0),
      downgraded: Boolean(payload.downgraded),
      costCny: Number(payload.costCny || 0),
      errorReason: payload.errorReason ? String(payload.errorReason) : null,
      metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    });
  } catch (error) {
    console.warn('⚠️ [AI Monitor] 写入调用日志失败:', error.message);
  }
}

const tempUploadDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const recognizeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `recognize-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const recognizeUpload = multer({
  storage: recognizeStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式: jpeg, jpg, png, gif, webp'));
    }
  }
});

async function runLegacyRecognition({ markerId }) {
  if (markerId) {
    const content = await ARContent.findOne({
      where: {
        markerId,
        status: 'active'
      }
    });

    if (content) {
      await content.increment('scans');
      return { content };
    }
  }

  const contents = await ARContent.findAll({
    where: { status: 'active' },
    order: [['scans', 'DESC']],
    limit: 10
  });

  return {
    contents,
    message: '请从列表中选择匹配的内容'
  };
}

// 获取AR内容列表
router.get('/', async (req, res) => {
  try {
    const contents = await ARContent.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { contents }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取AR内容失败',
      error: error.message
    });
  }
});

// 通过标识物获取AR内容
router.post('/scan', async (req, res) => {
  try {
    const { markerId, markerType } = req.body;

    const content = await ARContent.findOne({
      where: {
        markerId,
        markerType,
        status: 'active'
      }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的AR内容'
      });
    }

    // 增加扫描次数
    await content.increment('scans');

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '扫描失败',
      error: error.message
    });
  }
});

// 图片识别（通过图片匹配AR内容）
router.post('/recognize', recognizeUpload.single('image'), async (req, res) => {
  const startMs = Date.now();
  try {
    const { imageUrl, markerId } = req.body;

    let publicImageUrl = imageUrl;
    let uploadedRelativePath = null;

    if (req.file) {
      uploadedRelativePath = `/uploads/temp/${req.file.filename}`;
      publicImageUrl = `${req.protocol}://${req.get('host')}${uploadedRelativePath}`;
    }

    let aiResult = null;
    if (publicImageUrl) {
      aiResult = await generateQwenRecognitionAnalysis({ imageUrl: publicImageUrl });
    }

    if (aiResult) {
      console.log('🤖 [AI Recognize] 识别来源:', {
        generated: true,
        provider: aiResult.provider,
        model: aiResult.model,
      });

      await logAiInvocation({
        userId: null,
        feature: 'image_recognize',
        endpoint: '/ar/recognize',
        provider: aiResult.provider || null,
        model: aiResult.model || null,
        success: true,
        latencyMs: Date.now() - startMs,
        downgraded: false,
        costCny: 0,
      });

      return res.json({
        success: true,
        data: {
          title: aiResult.title,
          category: aiResult.category,
          description: aiResult.description,
          technique: aiResult.technique,
          history: aiResult.history,
          culturalSignificance: aiResult.culturalSignificance,
          confidence: aiResult.confidence,
          imageUrl: uploadedRelativePath || imageUrl || '',
          ai: {
            generated: true,
            provider: aiResult.provider,
            model: aiResult.model,
          },
          fallback: false,
        }
      });
    }

    const legacyData = await runLegacyRecognition({ markerId });

    console.log('⚙️ [AI Recognize] 识别来源:', {
      generated: false,
      provider: 'local-fallback',
      model: 'legacy-ar-matcher',
    });

    await logAiInvocation({
      userId: null,
      feature: 'image_recognize',
      endpoint: '/ar/recognize',
      provider: 'local-fallback',
      model: 'legacy-ar-matcher',
      success: false,
      latencyMs: Date.now() - startMs,
      downgraded: true,
      costCny: 0,
      errorReason: 'local_fallback',
    });

    res.json({
      success: true,
      data: {
        ...legacyData,
        imageUrl: uploadedRelativePath || imageUrl || '',
        ai: {
          generated: false,
          provider: 'local-fallback',
          model: 'legacy-ar-matcher',
        },
        fallback: true,
      }
    });
  } catch (error) {
    await logAiInvocation({
      userId: null,
      feature: 'image_recognize',
      endpoint: '/ar/recognize',
      provider: null,
      model: null,
      success: false,
      latencyMs: Date.now() - startMs,
      downgraded: false,
      costCny: 0,
      errorReason: normalizeFailureReason(error),
    });
    res.status(500).json({
      success: false,
      message: '识别失败',
      error: error.message
    });
  }
});

module.exports = router;
