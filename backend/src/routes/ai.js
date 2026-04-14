const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Artwork = require('../models/Artwork');
const { authenticate } = require('../middleware/auth');
const { generateQwenLearnAnalysis } = require('../utils/qwen');
const { enhanceImageWithQwen } = require('../utils/qwenImageEdit');

const router = express.Router();

// 简单内存限流：针对数字焕新 /transform 接口，按用户限流
const TRANSFORM_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 分钟窗口
const TRANSFORM_RATE_LIMIT_MAX = 10; // 每用户每窗口最多 10 次
const transformRateBuckets = new Map(); // userId -> { windowStart, count }

function checkTransformRateLimit(userId) {
  if (!userId) {
    return { allowed: true };
  }
  const now = Date.now();
  const bucket = transformRateBuckets.get(userId) || {
    windowStart: now,
    count: 0,
  };

  if (now - bucket.windowStart > TRANSFORM_RATE_LIMIT_WINDOW_MS) {
    bucket.windowStart = now;
    bucket.count = 0;
  }

  bucket.count += 1;
  transformRateBuckets.set(userId, bucket);

  if (bucket.count > TRANSFORM_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remainingMs: TRANSFORM_RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart),
    };
  }

  return { allowed: true };
}

// 确保上传目录存在
const ensureUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const tempUploadDir = path.join(__dirname, '../../uploads/temp');
const artworksUploadDir = path.join(__dirname, '../../uploads/artworks');
const productTemplatesDir = path.join(__dirname, '../../uploads/product-templates');
ensureUploadDir(tempUploadDir);
ensureUploadDir(artworksUploadDir);
ensureUploadDir(productTemplatesDir);

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'learn-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 单个文件上传配置（用于 AI 学艺）
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB
    // 注意：不要设置 files 限制，因为 upload.single() 已经限制了只能上传一个文件
    // 设置 files 限制会导致与 upload.single() 冲突
    fieldSize: 10 * 1024 * 1024, // 字段大小限制
    fields: 10 // 允许的表单字段数量
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

// 多文件上传配置（用于数字焕新 - 仅上传纹样，可选）
const uploadPattern = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
    fieldSize: 10 * 1024 * 1024,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('只支持图片格式: jpeg, jpg, png, gif, webp'));
  }
});

// 数字焕新：纹样 + 可选产品底图（pattern 必填，product 可选）
const uploadTransform = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 2,
    fieldSize: 10 * 1024 * 1024,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('只支持图片格式: jpeg, jpg, png, gif, webp'));
  }
});

// 获取参考作品列表（用于AI学艺）
router.get('/references', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    const where = category ? { category } : {};
    
    const User = require('../models/User');
    const artworks = await Artwork.findAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        artworks: artworks.map(artwork => ({
          id: artwork.id,
          title: artwork.title,
          description: artwork.description,
          imageUrl: artwork.imageUrl,
          category: artwork.category,
          author: artwork.author ? {
            id: artwork.author.id,
            username: artwork.author.username,
            avatar: artwork.author.avatar
          } : null
        }))
      }
    });
  } catch (error) {
    console.error('获取参考作品失败:', error);
    res.status(500).json({
      success: false,
      message: '获取参考作品失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// AI学艺 - 轮廓比对和相似度评分
router.post('/learn', authenticate, upload.single('image'), async (req, res) => {
  let userImagePath = null;
  
  try {
    console.log('🔍 [AI Learn] 收到请求:', {
      hasFile: !!req.file,
      referenceId: req.body.referenceId,
      skill: req.body.skill,
      skillName: req.body.skillName,
      userId: req.user.id,
      fileSize: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传作品图片'
      });
    }

    // 检查文件大小（额外检查）
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `文件过大，最大支持 50MB，当前文件大小为 ${(req.file.size / 1024 / 1024).toFixed(2)}MB`
      });
    }

    userImagePath = req.file.path;
    let { referenceId, skill, skillName } = req.body;

    let referenceArtwork = null;
    let referenceImagePath = null;

    // 技能名称到类别的映射
    const skillCategoryMap = {
      'peking-opera': '传统戏剧',
      'paper-cutting': '剪纸',
      'guqin': '传统音乐',
      'embroidery': '刺绣',
      'pottery': '陶艺',
      'calligraphy': '书法'
    };

    const User = require('../models/User');

    if (!referenceId) {
      const whereCondition = {};
      if (skill && skillCategoryMap[skill]) {
        whereCondition.category = skillCategoryMap[skill];
      }

      referenceArtwork = await Artwork.findOne({
        where: whereCondition,
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });

      if (!referenceArtwork) {
        referenceArtwork = await Artwork.findOne({
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar']
          }],
          order: [['createdAt', 'DESC']]
        });
      }
    } else {
      referenceArtwork = await Artwork.findByPk(referenceId, {
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        }]
      });
    }

    if (referenceArtwork && referenceArtwork.imageUrl) {
      if (referenceArtwork.imageUrl.startsWith('/uploads/')) {
        referenceImagePath = path.join(__dirname, '../..', referenceArtwork.imageUrl);
      } else {
        referenceImagePath = path.join(__dirname, '../../uploads', referenceArtwork.imageUrl.replace('/uploads/', ''));
      }

      if (!fs.existsSync(referenceImagePath)) {
        console.warn('⚠️ [AI Learn] 参考图片不存在，切换为本地自评模式:', referenceImagePath);
        referenceImagePath = null;
      } else {
        console.log('✅ [AI Learn] 找到参考作品:', referenceArtwork.id, referenceArtwork.title);
      }
    } else {
      console.warn('⚠️ [AI Learn] 未找到可用参考作品，切换为本地自评模式');
    }

    console.log('🖼️ [AI Learn] 开始处理图片...');

    // 使用Sharp进行图像预处理
    const userImage = await sharp(userImagePath)
      .resize(224, 224)
      .greyscale()
      .normalize()
      .toBuffer();
    
    let similarity;
    if (referenceImagePath) {
      const referenceImage = await sharp(referenceImagePath)
        .resize(224, 224)
        .greyscale()
        .normalize()
        .toBuffer();

      console.log('🔍 [AI Learn] 计算相似度...');
      similarity = await calculateSimilarity(userImage, referenceImage);
    } else {
      console.log('🔍 [AI Learn] 无参考图，执行本地自评打分...');
      similarity = await estimateSimilarityFromSingleImage(userImage);
    }

    const accuracy = Math.min(100, Math.max(0, Math.round(similarity * 100)));

    console.log('✅ [AI Learn] 相似度计算结果:', { similarity, accuracy });

    // 生成改进建议（优先使用 Qwen，失败则回退本地模板）
    const skillLabel = skillName || skill || '传统技艺';
    const referenceTitle = referenceArtwork?.title || '无参考作品（本地自评）';
    const fallbackSuggestions = generateSuggestions(similarity);
    const fallbackAdvice = generateDeterministicAdvice({
      accuracy,
      skillName: skillLabel,
      referenceTitle,
    });

    const aiAnalysis = await generateQwenLearnAnalysis({
      skillName: skillLabel,
      similarity,
      referenceTitle,
      referenceDescription: referenceArtwork?.description || '',
      localHints: fallbackSuggestions,
    });

    const suggestions = aiAnalysis?.suggestions?.length ? aiAnalysis.suggestions : fallbackSuggestions;
    const advice = aiAnalysis ? {
      score: aiAnalysis.score,
      strengths: aiAnalysis.strengths,
      improvements: aiAnalysis.improvements,
      learningPlan: aiAnalysis.learningPlan,
    } : fallbackAdvice;
    const details = aiAnalysis?.details?.length
      ? aiAnalysis.details
      : (aiAnalysis?.summary ? [aiAnalysis.summary] : []);

    console.log('🤖 [AI Learn] 建议来源:', {
      generated: !!aiAnalysis,
      provider: aiAnalysis?.provider || 'local-fallback',
      model: aiAnalysis?.model || null,
    });

    // 保存用户上传的图片（可选）
    const savedImageFilename = `user-${req.user.id}-${Date.now()}${path.extname(req.file.filename)}`;
    const savedImagePath = path.join(artworksUploadDir, savedImageFilename);
    await fs.promises.copyFile(userImagePath, savedImagePath);
    const savedImageUrl = `/uploads/artworks/${savedImageFilename}`;

    console.log('✅ [AI Learn] 分析完成');

    res.json({
      success: true,
      message: '分析完成',
      data: {
        similarity: accuracy,
        accuracy: accuracy,
        suggestions,
        details,
        advice,
        ai: {
          generated: !!aiAnalysis,
          provider: aiAnalysis?.provider || 'local-fallback',
          model: aiAnalysis?.model || null,
        },
        userImageUrl: savedImageUrl,
        analysisMode: referenceImagePath ? 'local-compare' : 'local-self-evaluate',
        reference: referenceArtwork ? {
          id: referenceArtwork.id,
          title: referenceArtwork.title,
          description: referenceArtwork.description,
          imageUrl: referenceArtwork.imageUrl,
          category: referenceArtwork.category,
          author: referenceArtwork.author
        } : null
      }
    });
  } catch (error) {
    console.error('❌ [AI Learn] 错误:', error);
    
    // 处理 Multer 错误
    if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: '文件过大，最大支持 50MB，请压缩图片后重试'
        });
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: '文件数量超出限制，只能上传一个文件'
        });
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: '意外的文件字段，请确保只上传一个图片文件'
        });
      } else if (error.code === 'LIMIT_FIELD_COUNT') {
        return res.status(400).json({
          success: false,
          message: '表单字段数量超出限制'
        });
      } else if (error.code === 'LIMIT_FIELD_KEY') {
        return res.status(400).json({
          success: false,
          message: '表单字段名过长'
        });
      } else if (error.code === 'LIMIT_FIELD_VALUE') {
        return res.status(400).json({
          success: false,
          message: '表单字段值过大'
        });
      } else if (error.code === 'LIMIT_PART_COUNT') {
        return res.status(400).json({
          success: false,
          message: '表单部分数量超出限制'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'AI分析失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  } finally {
    // 清理临时文件（可选，如果需要保留可以注释掉）
    // if (userImagePath && fs.existsSync(userImagePath)) {
    //   fs.unlinkSync(userImagePath);
    // }
  }
});

// 获取数字焕新预设产品列表（供前端选择产品底图，并说明引用资源目录）
const PRODUCT_TEMPLATE_LIST = [
  { type: 'T恤', name: 'T恤', file: 'tshirt.png' },
  { type: '手机壳', name: '手机壳', file: 'phone-case.png' },
  { type: '帆布袋', name: '帆布袋', file: 'bag.png' },
  { type: '明信片', name: '明信片', file: 'postcard.png' },
  { type: '马克杯', name: '马克杯', file: 'mug.png' },
];
router.get('/product-templates', (req, res) => {
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol;
  const baseUrl = `${proto}://${req.get('host')}`.replace(/\/$/, '');
  res.json({
    success: true,
    data: {
      directory: 'backend/uploads/product-templates',
      directoryNote: '将对应文件名图片放入该目录即可作为「选择产品」的底图',
      templates: PRODUCT_TEMPLATE_LIST.map(t => ({
        type: t.type,
        name: t.name,
        file: t.file,
        imageUrl: `${baseUrl}/uploads/product-templates/${t.file}`
      }))
    }
  });
});

// 对外暴露算法生成图的稳定访问地址（经 /api 反代链路，避免 /uploads 在站点层被拦截）
function resolvePublicImageFile(req) {
  const raw = req.params.filename || '';
  const safeFilename = path.basename(raw);
  if (!safeFilename || safeFilename !== raw) {
    return { error: { status: 400, message: '非法文件名' } };
  }

  const filePath = path.join(artworksUploadDir, safeFilename);
  if (!fs.existsSync(filePath)) {
    return { error: { status: 404, message: '图片不存在' } };
  }

  return { filePath, safeFilename };
}

function inferImageContentType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

router.head('/public-image/:filename', (req, res) => {
  try {
    const resolved = resolvePublicImageFile(req);
    if (resolved.error) {
      return res.status(resolved.error.status).end();
    }

    const stats = fs.statSync(resolved.filePath);
    res.setHeader('Content-Type', inferImageContentType(resolved.safeFilename));
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).end();
  } catch (error) {
    console.error('❌ [Transform] public-image HEAD 失败:', error.message);
    return res.status(500).end();
  }
});

router.get('/public-image/:filename', (req, res) => {
  try {
    const resolved = resolvePublicImageFile(req);
    if (resolved.error) {
      return res.status(resolved.error.status).json({
        success: false,
        message: resolved.error.message,
      });
    }

    const stats = fs.statSync(resolved.filePath);
    res.setHeader('Content-Type', inferImageContentType(resolved.safeFilename));
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.sendFile(resolved.filePath);
  } catch (error) {
    console.error('❌ [Transform] public-image 读取失败:', error.message);
    return res.status(500).json({
      success: false,
      message: '读取图片失败',
    });
  }
});

// 数字焕新（纯AI生成）：无需上传纹样/底图，基于产品样机 + 风格 + 描述直接生成效果图
// 依赖 Qwen 图像模型；未配置 Key 时返回 503
router.post('/generate-product', authenticate, async (req, res) => {
  try {
    const rate = checkTransformRateLimit(req.user && req.user.id);
    if (!rate.allowed) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试（数字焕新每分钟最多 10 次）',
      });
    }

    const {
      productType,
      stylePrompt,
      description,
      extraPrompt,
      heritageHint,
      config,
    } = req.body || {};

    const normalizedProductType = String(productType || '').trim() || '其他';
    const category = (normalizedProductType && PRODUCT_CONFIGS[normalizedProductType]) ? normalizedProductType : '其他';

    // 选择样机底图
    let templatePath = getProductTemplatePath(category);
    if (!templatePath) {
      await ensureDefaultProductTemplate();
      templatePath = getProductTemplatePath(category);
    }
    if (!templatePath) {
      return res.status(503).json({
        success: false,
        message: '缺少产品样机资源，请在 backend/uploads/product-templates/ 下配置 default.png 或对应类型样机图',
      });
    }

    // 这里的“编辑提示词”会让模型在样机图上直接生成商品效果
    const coreDesc = String(description || '').trim();
    if (!coreDesc) {
      return res.status(400).json({
        success: false,
        message: '请填写描述，用于生成作品主题与元素',
      });
    }

    const aiPromptParts = [
      `请为「${category}」生成一张高质量电商效果图。`,
      '要求：主体清晰、构图高级、细节丰富、质感真实、背景干净、无水印、无logo。',
      '图案/画面主题：' + coreDesc,
    ];
    if (heritageHint && String(heritageHint).trim()) {
      aiPromptParts.push('非遗灵感（可参考融入）：' + String(heritageHint).trim());
    }
    if (extraPrompt && String(extraPrompt).trim()) {
      aiPromptParts.push('额外要求：' + String(extraPrompt).trim());
    }

    const finalAiPrompt = aiPromptParts.join('\n');

    // 尽量提供公网 URL，减少 DashScope 抓取失败
    const forwardedProto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto = forwardedProto || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`.replace(/\/$/, '');
    const templatePublicUrl = `${baseUrl}/uploads/product-templates/${path.basename(templatePath)}`;

    let customConfig = null;
    if (config) {
      try {
        customConfig = typeof config === 'string' ? JSON.parse(config) : config;
      } catch (e) {
        console.warn('⚠️ [GenerateProduct] config 解析失败，将忽略:', e.message);
      }
    }

    const aiEnhanced = await enhanceImageWithQwen({
      baseImagePath: templatePath,
      baseImageUrl: templatePublicUrl,
      productType: category,
      stylePrompt,
      aiPrompt: finalAiPrompt,
      config: customConfig,
    });

    if (!aiEnhanced || !aiEnhanced.buffer) {
      return res.status(503).json({
        success: false,
        message: '当前未配置或暂不可用的 AI 图像生成能力（请检查 QWEN_API_KEY / DASHSCOPE_API_KEY）',
      });
    }

    const aiFilename = `transform-gen-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
    const aiFilePath = path.join(artworksUploadDir, aiFilename);
    await fs.promises.writeFile(aiFilePath, aiEnhanced.buffer);

    return res.json({
      success: true,
      message: '生成产品图成功',
      data: {
        transformedImageUrl: `/uploads/artworks/${aiFilename}`,
        productType: category,
        transformSource: 'ai-generate',
        ai: {
          provider: aiEnhanced.provider,
          model: aiEnhanced.model,
          triedModels: aiEnhanced.triedModels || [aiEnhanced.model],
        },
      },
    });
  } catch (error) {
    console.error('❌ [GenerateProduct] 生成失败:', { message: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: error.message || '生成失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// 数字焕新 - 使用后台算法将纹样融合到产品底图（Sharp 合成）
// 必须上传纹样；产品底图二选一：上传 product 文件，或传 productType 使用预设样机
router.post('/transform', authenticate, uploadTransform.fields([
  { name: 'pattern', maxCount: 1 },
  { name: 'product', maxCount: 1 }
]), async (req, res) => {
  try {
    const { productType, config, aiPrompt, stylePrompt } = req.body || {};
    const patternFile = req.files && req.files.pattern && req.files.pattern[0];
    const productFile = req.files && req.files.product && req.files.product[0];

    const rate = checkTransformRateLimit(req.user && req.user.id);
    if (!rate.allowed) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试（数字焕新每分钟最多 10 次）',
      });
    }

    if (!patternFile) {
      return res.status(400).json({
        success: false,
        message: '算法融合需要上传纹样图片',
      });
    }

    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (patternFile.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `纹样文件过大，最大支持 50MB，当前为 ${(patternFile.size / 1024 / 1024).toFixed(2)}MB`
      });
    }
    if (productFile && productFile.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `产品底图过大，最大支持 50MB`
      });
    }

    const category = (productType && PRODUCT_CONFIGS[productType]) ? productType : '其他';
    let productPath = null;

    if (productFile) {
      productPath = productFile.path;
    } else {
      let templatePath = getProductTemplatePath(category);
      if (!templatePath) {
        await ensureDefaultProductTemplate();
        templatePath = getProductTemplatePath(category);
      }
      if (!templatePath) {
        return res.status(503).json({
          success: false,
          message: '缺少产品样机资源，请在 backend/uploads/product-templates/ 下配置 default.png 或对应类型样机图',
        });
      }
      productPath = templatePath;
    }

    let customConfig = null;
    if (config) {
      try {
        customConfig = typeof config === 'string' ? JSON.parse(config) : config;
      } catch (e) {
        console.warn('⚠️ [Transform] config 解析失败，将忽略:', e.message);
      }
    }

    console.log('🎨 [Transform] 算法融合:', { pattern: patternFile.path, product: productPath, category, userId: req.user?.id });

    // 先执行原有本地算法，保证最小可用结果
    const localTransformedImageUrl = await applyStyleTransfer(patternFile.path, productPath, category, customConfig);

    // AI 增强（可选）：优先使用你开通的 Qwen 图像模型，失败自动回退到本地算法结果
    const localTransformedAbsPath = path.join(__dirname, '../..', localTransformedImageUrl);
    const forwardedProto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto = forwardedProto || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`.replace(/\/$/, '');
    const localTransformedPublicUrl = `${baseUrl}${localTransformedImageUrl}`;
    console.log('🔗 [Transform] 提供给模型的输入图 URL:', localTransformedPublicUrl);
    const aiEnhanced = await enhanceImageWithQwen({
      baseImagePath: localTransformedAbsPath,
      baseImageUrl: localTransformedPublicUrl,
      productType: category,
      stylePrompt,
      aiPrompt,
    });

    let transformedImageUrl = localTransformedImageUrl;
    let transformSource = 'local';
    let aiMeta = null;

    if (aiEnhanced && aiEnhanced.buffer) {
      const aiFilename = `transform-ai-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      const aiFilePath = path.join(artworksUploadDir, aiFilename);
      await fs.promises.writeFile(aiFilePath, aiEnhanced.buffer);
      transformedImageUrl = `/uploads/artworks/${aiFilename}`;
      transformSource = 'ai';
      aiMeta = {
        provider: aiEnhanced.provider,
        model: aiEnhanced.model,
        triedModels: aiEnhanced.triedModels || [aiEnhanced.model],
      };
    }

    console.log('🤖 [Transform] 输出来源:', {
      transformSource,
      provider: aiMeta?.provider || 'local-fallback',
      model: aiMeta?.model || null,
      triedModels: aiMeta?.triedModels || [],
    });

    res.json({
      success: true,
      message: '生成产品图成功',
      data: {
        transformedImageUrl,
        productType: category,
        transformSource,
        ai: aiMeta,
      }
    });
  } catch (error) {
    console.error('❌ [Transform] 算法融合错误:', { message: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '生成产品图失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 辅助函数：计算相似度
async function calculateSimilarity(image1, image2) {
  try {
    // 获取图像元数据
    const metadata1 = await sharp(image1).metadata();
    const metadata2 = await sharp(image2).metadata();

    // 提取图像数据
    const { data: pixels1 } = await sharp(image1)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data: pixels2 } = await sharp(image2)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 计算结构相似度 (SSIM-like)
    let totalDiff = 0;
    let totalSquaredDiff = 0;
    const pixelCount = Math.min(pixels1.length, pixels2.length);

    for (let i = 0; i < pixelCount; i++) {
      const diff = Math.abs(pixels1[i] - pixels2[i]);
      totalDiff += diff;
      totalSquaredDiff += diff * diff;
    }

    // 计算平均差异
    const meanDiff = totalDiff / pixelCount;
    const variance = (totalSquaredDiff / pixelCount) - (meanDiff * meanDiff);

    // 归一化相似度（0-1之间）
    // 使用指数函数使结果更合理
    const normalizedDiff = meanDiff / 255;
    const similarity = Math.exp(-normalizedDiff * 3); // 调整系数可以改变敏感度

    return Math.max(0.3, Math.min(0.95, similarity)); // 限制在30%-95%之间
  } catch (error) {
    console.error('计算相似度错误:', error);
    return 0.65;
  }
}

// 生成改进建议
function generateSuggestions(similarity) {
  const suggestions = [];
  
  if (similarity < 0.4) {
    suggestions.push('整体轮廓需要更接近参考作品，建议仔细观察参考作品的形状特征');
    suggestions.push('注意细节的完整性，确保关键元素都已体现');
    suggestions.push('线条可以更加流畅，减少不必要的转折');
    suggestions.push('比例关系需要调整，确保各部分协调统一');
  } else if (similarity < 0.6) {
    suggestions.push('整体形状不错，但可以进一步优化细节部分');
    suggestions.push('线条可以更加流畅自然，避免生硬的连接');
    suggestions.push('注意对称性和平衡感，保持作品的整体美感');
    suggestions.push('可以加强重点部位的刻画，突出作品特色');
  } else if (similarity < 0.8) {
    suggestions.push('作品与参考作品相似度较高，整体表现良好');
    suggestions.push('可以进一步细化细节，提升作品的精致度');
    suggestions.push('考虑添加个性化元素，展现自己的创作风格');
    suggestions.push('保持当前的创作水平，继续练习会有更大提升');
  } else {
    suggestions.push('作品与参考作品相似度很高！表现非常出色');
    suggestions.push('可以尝试添加个性化元素，创造独特风格');
    suggestions.push('考虑挑战更高难度的作品，进一步提升技艺');
    suggestions.push('继续保持，你的技艺已经相当精湛！');
  }
  
  return suggestions;
}

async function estimateSimilarityFromSingleImage(imageBuffer) {
  try {
    const { data: pixels } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < pixels.length; i++) {
      sum += pixels[i];
    }
    const mean = sum / pixels.length;

    let varianceSum = 0;
    let gradientSum = 0;
    let gradientCount = 0;

    for (let i = 0; i < pixels.length; i++) {
      const current = pixels[i];
      const diff = current - mean;
      varianceSum += diff * diff;

      if (i > 0) {
        gradientSum += Math.abs(current - pixels[i - 1]);
        gradientCount += 1;
      }
    }

    const std = Math.sqrt(varianceSum / pixels.length);
    const avgGradient = gradientCount > 0 ? gradientSum / gradientCount : 0;

    const contrastScore = Math.min(1, std / 64);
    const structureScore = Math.min(1, avgGradient / 40);
    const exposureScore = 1 - Math.min(1, Math.abs(mean - 128) / 128);

    const combined = (contrastScore * 0.45) + (structureScore * 0.35) + (exposureScore * 0.2);

    return Math.max(0.35, Math.min(0.92, 0.45 + combined * 0.5));
  } catch (error) {
    console.error('单图自评计算错误:', error.message);
    return 0.68;
  }
}

// 10 套差异化 AI 建议模板
const ADVICE_TEMPLATES = [
  {
    strengths: ['作品整体结构完整，框架清晰', '细节处理较为精细，层次分明', '传统元素运用得当，韵味十足'],
    improvements: ['建议加强线条的流畅性，一气呵成', '可以尝试更丰富的色彩搭配', '注意保持传统风格的统一性'],
    learningPlan: { direction: '继续深入学习传统技艺，向专业化发展', professional: '建议多参考大师作品，揣摩技法', skills: '重点练习基础线条与构图', mentor: '可以寻找专业导师进行一对一指导' },
  },
  {
    strengths: ['构图比例协调，主次分明', '用笔力度把控得当', '留白运用有章法'],
    improvements: ['线条转折处可以更圆润自然', '细节刻画可以再深入一层', '整体节奏感有提升空间'],
    learningPlan: { direction: '拓展多种风格，形成个人特色', professional: '建议参与线下工坊体验', skills: '加强临摹练习，打好基本功', mentor: '观摩非遗传承人现场演示' },
  },
  {
    strengths: ['色彩运用和谐，过渡自然', '造型准确，特征突出', '作品富有表现力'],
    improvements: ['可以适当增加细节密度', '注意虚实对比的运用', '尝试更多传统纹样的组合'],
    learningPlan: { direction: '从临摹走向创作，融入个人理解', professional: '推荐阅读相关非遗文献', skills: '分阶段突破技术难点', mentor: '加入非遗爱好者社群交流' },
  },
  {
    strengths: ['整体韵味把握到位', '传统技法运用规范', '作品具有辨识度'],
    improvements: ['线条的疏密节奏可再优化', '局部可以加强对比', '整体氛围营造还有提升空间'],
    learningPlan: { direction: '在传承基础上探索现代表达', professional: '建议参观博物馆与展览', skills: '从单一技法扩展到综合运用', mentor: '参加非遗研培计划' },
  },
  {
    strengths: ['布局合理，视觉中心突出', '笔触干净利落', '传统意蕴表达充分'],
    improvements: ['可以加强明暗层次', '细节衔接处再打磨', '尝试不同材质的应用'],
    learningPlan: { direction: '向非遗传承人方向努力', professional: '系统学习该技艺的历史脉络', skills: '重点攻克薄弱环节', mentor: '寻找当地非遗保护机构推荐导师' },
  },
  {
    strengths: ['线条流畅，气韵生动', '局部刻画细腻', '整体风格统一'],
    improvements: ['构图可尝试更多角度', '色彩饱和度可适度调整', '注意作品与环境的契合'],
    learningPlan: { direction: '兼顾技艺精进与文化传播', professional: '建议录制学习过程分享', skills: '定期复盘，总结进步与不足', mentor: '参加非遗传承人研修班' },
  },
  {
    strengths: ['形神兼备，形准神似', '工艺规范，步骤清晰', '作品完整度高'],
    improvements: ['可以尝试更大胆的创新', '局部可增加装饰性元素', '整体节奏感可再加强'],
    learningPlan: { direction: '探索非遗与当代设计的融合', professional: '关注非遗数字化保护动态', skills: '强化薄弱技法的专项训练', mentor: '寻求跨领域合作机会' },
  },
  {
    strengths: ['传统韵味浓厚', '细节处理到位', '整体和谐统一'],
    improvements: ['线条力度可以有更多变化', '可以尝试不同尺寸的创作', '注意作品的故事性和文化内涵'],
    learningPlan: { direction: '成为该技艺的推广者', professional: '建议参与非遗进校园等活动', skills: '从模仿到创新的过渡练习', mentor: '联系省级非遗传承人请教' },
  },
  {
    strengths: ['技法运用熟练', '作品具有个人特色', '传统与现代结合较好'],
    improvements: ['可以进一步打磨边缘细节', '整体光影关系可再推敲', '尝试系列化创作'],
    learningPlan: { direction: '在保护传承中创新发展', professional: '建议建立个人作品档案', skills: '定期设定阶段性目标', mentor: '参加中国非遗传承人研修培训计划' },
  },
  {
    strengths: ['创意表达独特', '技艺掌握扎实', '作品富有感染力'],
    improvements: ['可以加强作品的叙事性', '细节与整体的平衡可再优化', '尝试融入地域文化特色'],
    learningPlan: { direction: '向非遗传承与创新并重发展', professional: '建议撰写学习心得与体会', skills: '跨门类学习，拓宽视野', mentor: '寻找志同道合的学艺伙伴互相切磋' },
  },
];

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateDeterministicAdvice({ accuracy, skillName, referenceTitle }) {
  // 完全随机选择模板，确保每次生成的建议都不同
  const randomIndex = Math.floor(Math.random() * ADVICE_TEMPLATES.length);
  const template = ADVICE_TEMPLATES[randomIndex];
  const scoreOffset = (Math.floor(Math.random() * 13) - 6); // -6 到 +6
  const score = Math.min(100, Math.max(0, accuracy + scoreOffset));
  return {
    score,
    strengths: template.strengths,
    improvements: template.improvements,
    learningPlan: template.learningPlan,
  };
}

// 产品类型配置 - 定义不同产品的合成参数
const PRODUCT_CONFIGS = {
  'T恤': {
    scaleRatio: 0.45, // 纹样大小相对于产品宽度的比例（较小，避免超出）
    verticalPosition: 0.35, // 垂直位置偏移（0.5为中心，0.35偏上）
    horizontalPosition: 0.5, // 水平位置（0.5为中心）
    blendMode: 'multiply', // 混合模式：multiply 让纹样更贴合布料
    opacity: 0.85, // 透明度
    useMask: true, // 使用蒙版限制区域
    maskShape: 'ellipse', // 蒙版形状：ellipse, circle, rectangle, rounded-rectangle, heart, star
    maskPadding: 0.15 // 蒙版内边距（边缘留白）
  },
  '手机壳': {
    scaleRatio: 0.65,
    verticalPosition: 0.5,
    horizontalPosition: 0.5,
    blendMode: 'over',
    opacity: 0.9,
    useMask: true,
    maskShape: 'rounded-rectangle', // 手机壳使用圆角矩形更合适
    maskPadding: 0.2 // 手机壳需要更多边距（避开摄像头和按钮）
  },
  '帆布袋': {
    scaleRatio: 0.55,
    verticalPosition: 0.45,
    horizontalPosition: 0.5,
    blendMode: 'over',
    opacity: 0.88,
    useMask: true,
    maskShape: 'rectangle', // 帆布袋使用矩形
    maskPadding: 0.12
  },
  '明信片': {
    scaleRatio: 0.75, // 明信片可以更大面积
    verticalPosition: 0.5,
    horizontalPosition: 0.5,
    blendMode: 'over',
    opacity: 0.92,
    useMask: false, // 明信片不需要蒙版
    maskShape: 'rectangle',
    maskPadding: 0
  },
  '马克杯': {
    scaleRatio: 0.5,
    verticalPosition: 0.45,
    horizontalPosition: 0.5,
    blendMode: 'over',
    opacity: 0.88,
    useMask: true,
    maskShape: 'ellipse',
    maskPadding: 0.15
  },
  '其他': {
    scaleRatio: 0.5,
    verticalPosition: 0.5,
    horizontalPosition: 0.5,
    blendMode: 'over',
    opacity: 0.85,
    useMask: true,
    maskShape: 'ellipse', // 默认使用椭圆
    maskPadding: 0.15
  }
};

// 产品类型 → 样机文件名（数字焕新算法融合用）
const PRODUCT_TEMPLATE_FILES = {
  'T恤': 'tshirt.png',
  '手机壳': 'phone-case.png',
  '帆布袋': 'bag.png',
  '明信片': 'postcard.png',
  '马克杯': 'mug.png',
  '其他': 'default.png',
};
const DEFAULT_TEMPLATE_FILE = 'default.png';

async function ensureDefaultProductTemplate() {
  const defaultPath = path.join(productTemplatesDir, DEFAULT_TEMPLATE_FILE);
  if (fs.existsSync(defaultPath)) return defaultPath;
  try {
    const width = 800;
    const height = 800;
    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 240, g: 240, b: 240, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    await fs.promises.writeFile(defaultPath, buffer);
    console.log('🎨 [Transform] 已自动创建默认样机图:', defaultPath);
    return defaultPath;
  } catch (e) {
    console.warn('⚠️ [Transform] 创建默认样机图失败:', e.message);
    return null;
  }
}

function getProductTemplatePath(productType) {
  const filename = PRODUCT_TEMPLATE_FILES[productType] || DEFAULT_TEMPLATE_FILE;
  const primaryPath = path.join(productTemplatesDir, filename);
  if (fs.existsSync(primaryPath)) return primaryPath;
  const fallbackPath = path.join(productTemplatesDir, DEFAULT_TEMPLATE_FILE);
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  return null;
}

// 检测产品有效区域（通过分析透明度和颜色差异）
async function detectProductRegion(imagePath, padding = 0.1) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // 如果是小图片，直接使用中心区域
    if (metadata.width < 200 || metadata.height < 200) {
      const paddingX = Math.floor(metadata.width * padding);
      const paddingY = Math.floor(metadata.height * padding);
      return {
        x: paddingX,
        y: paddingY,
        width: metadata.width - paddingX * 2,
        height: metadata.height - paddingY * 2
      };
    }

    // 缩放到较小尺寸进行采样分析（提高性能）
    const sampleSize = 400;
    const scale = Math.min(sampleSize / metadata.width, sampleSize / metadata.height);
    const sampleWidth = Math.floor(metadata.width * scale);
    const sampleHeight = Math.floor(metadata.height * scale);

    const { data, info } = await image
      .resize(sampleWidth, sampleHeight)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // 分析图像，找出非透明区域和内容区域
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasContent = false;
    let transparentCount = 0;
    let totalPixels = width * height;

    // 采样分析（每隔几个像素检查一次，提高性能）
    const step = Math.max(1, Math.floor(width / 100));
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * channels;
        const alpha = data[idx + 3] || 255;

        if (alpha < 10) {
          transparentCount++;
        } else {
          hasContent = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // 如果透明像素很少（<5%），说明没有透明背景，使用中心区域
    const transparentRatio = transparentCount / totalPixels;
    if (transparentRatio < 0.05 || !hasContent) {
      // 使用中心区域，稍微缩小
      const centerPadding = padding + 0.05; // 稍微增加边距
      const paddingX = Math.floor(metadata.width * centerPadding);
      const paddingY = Math.floor(metadata.height * centerPadding);
      return {
        x: paddingX,
        y: paddingY,
        width: metadata.width - paddingX * 2,
        height: metadata.height - paddingY * 2
      };
    }

    // 将采样坐标缩放回原图尺寸
    const scaleX = metadata.width / width;
    const scaleY = metadata.height / height;
    
    minX = Math.floor(minX * scaleX);
    minY = Math.floor(minY * scaleY);
    maxX = Math.floor(maxX * scaleX);
    maxY = Math.floor(maxY * scaleY);

    // 应用内边距
    const regionWidth = maxX - minX + 1;
    const regionHeight = maxY - minY + 1;
    const padX = Math.floor(regionWidth * padding);
    const padY = Math.floor(regionHeight * padding);

    return {
      x: Math.max(0, Math.min(minX + padX, metadata.width)),
      y: Math.max(0, Math.min(minY + padY, metadata.height)),
      width: Math.min(metadata.width - Math.max(0, minX + padX), Math.max(1, regionWidth - padX * 2)),
      height: Math.min(metadata.height - Math.max(0, minY + padY), Math.max(1, regionHeight - padY * 2))
    };
  } catch (error) {
    console.warn('⚠️ [Style Transfer] 检测产品区域失败，使用默认区域:', error.message);
    // 返回默认区域（中心区域，带边距）
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const paddingX = Math.floor(metadata.width * padding);
      const paddingY = Math.floor(metadata.height * padding);
      return {
        x: paddingX,
        y: paddingY,
        width: Math.max(1, metadata.width - paddingX * 2),
        height: Math.max(1, metadata.height - paddingY * 2)
      };
    } catch (e) {
      // 如果连这个都失败，返回整个图片
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      return {
        x: 0,
        y: 0,
        width: metadata.width,
        height: metadata.height
      };
    }
  }
}

// 创建蒙版 - 支持多种形状
async function createMask(width, height, centerX, centerY, radiusX, radiusY, shape = 'ellipse') {
  const maskData = Buffer.alloc(width * height * 4);
  const softEdge = 0.1; // 软边缘宽度（相对于半径的比例）
  
  // 为心形预计算边界点（如果形状是心形）
  // 使用改进的心形参数方程，生成标准的心形形状
  // 心形参数方程: x = 16*sin³(t), y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)
  let heartBoundaryPoints = null;
  if (shape === 'heart') {
    heartBoundaryPoints = [];
    const step = 0.015; // 角度步长，更小的步长提高精度
    
    // 先计算一次以确定最大范围，用于正确归一化
    let maxX = 0, minX = 0, maxY = 0, minY = 0;
    const testStep = 0.01;
    for (let t = 0; t <= 2 * Math.PI; t += testStep) {
      const paramX = 16 * Math.pow(Math.sin(t), 3);
      const paramY = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      maxX = Math.max(maxX, paramX);
      minX = Math.min(minX, paramX);
      maxY = Math.max(maxY, paramY);
      minY = Math.min(minY, paramY);
    }
    
    // 计算归一化因子（使用最大范围，保持宽高比）
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const normalizeFactor = Math.max(rangeX, rangeY) / 2; // 除以2得到半径
    
    // 计算边界点并归一化
    for (let t = 0; t <= 2 * Math.PI; t += step) {
      const paramX = 16 * Math.pow(Math.sin(t), 3);
      const paramY = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      // 归一化到[-1, 1]范围，保持宽高比
      heartBoundaryPoints.push({
        x: paramX / normalizeFactor,
        y: paramY / normalizeFactor
      });
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let alpha = 0;
      let isInside = false;
      
      // 根据形状计算是否在内部
      switch (shape) {
        case 'circle':
          // 圆形（半径取较小值，确保是正圆）
          const radius = Math.min(radiusX, radiusY);
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          isInside = distance <= radius * (1 - softEdge);
          const edgeDistance = (distance - radius * (1 - softEdge)) / (radius * softEdge);
          if (distance <= radius) {
            if (isInside) {
              alpha = 255;
            } else {
              alpha = Math.floor(255 * Math.max(0, 1 - edgeDistance));
            }
          }
          break;
          
        case 'ellipse':
          // 椭圆（原有的椭圆逻辑）
          const dxEllipse = (x - centerX) / radiusX;
          const dyEllipse = (y - centerY) / radiusY;
          const distanceEllipse = Math.sqrt(dxEllipse * dxEllipse + dyEllipse * dyEllipse);
          isInside = distanceEllipse <= (1 - softEdge);
          if (distanceEllipse <= 1.0) {
            if (isInside) {
              alpha = 255;
            } else {
              const edgeDist = (distanceEllipse - (1 - softEdge)) / softEdge;
              alpha = Math.floor(255 * Math.max(0, 1 - edgeDist));
            }
          }
          break;
          
        case 'rectangle':
        case 'square':
          // 方形/矩形
          const halfWidth = radiusX;
          const halfHeight = radiusY;
          const dxRect = Math.abs(x - centerX);
          const dyRect = Math.abs(y - centerY);
          isInside = dxRect <= halfWidth * (1 - softEdge) && dyRect <= halfHeight * (1 - softEdge);
          const edgeDistX = Math.max(0, (dxRect - halfWidth * (1 - softEdge)) / (halfWidth * softEdge));
          const edgeDistY = Math.max(0, (dyRect - halfHeight * (1 - softEdge)) / (halfHeight * softEdge));
          const edgeDistRect = Math.min(1, Math.max(edgeDistX, edgeDistY));
          if (dxRect <= halfWidth && dyRect <= halfHeight) {
            if (isInside) {
              alpha = 255;
            } else {
              alpha = Math.floor(255 * Math.max(0, 1 - edgeDistRect));
            }
          }
          break;
          
        case 'rounded-rectangle':
        case 'rounded-square':
          // 圆角方形/矩形
          const cornerRadius = Math.min(radiusX, radiusY) * 0.2; // 圆角半径为最小边的20%
          const halfW = radiusX;
          const halfH = radiusY;
          const dxRounded = Math.abs(x - centerX);
          const dyRounded = Math.abs(y - centerY);
          
          // 检查是否在圆角矩形内
          let inCorner = false;
          if (dxRounded > halfW - cornerRadius && dyRounded > halfH - cornerRadius) {
            // 在圆角区域
            const cornerDx = dxRounded - (halfW - cornerRadius);
            const cornerDy = dyRounded - (halfH - cornerRadius);
            const cornerDist = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
            inCorner = cornerDist <= cornerRadius;
          } else {
            // 在矩形区域
            inCorner = dxRounded <= halfW && dyRounded <= halfH;
          }
          
          if (inCorner) {
            // 计算到边缘的距离
            let distToEdge = 0;
            if (dxRounded > halfW - cornerRadius && dyRounded > halfH - cornerRadius) {
              const cornerDx = dxRounded - (halfW - cornerRadius);
              const cornerDy = dyRounded - (halfH - cornerRadius);
              const cornerDist = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
              distToEdge = Math.max(0, cornerRadius - cornerDist) / (cornerRadius * softEdge);
            } else {
              const distX = (halfW - dxRounded) / (halfW * softEdge);
              const distY = (halfH - dyRounded) / (halfH * softEdge);
              distToEdge = Math.min(distX, distY);
            }
            alpha = Math.floor(255 * Math.min(1, distToEdge));
          }
          break;
          
        case 'heart':
          // 心形（使用预计算的参数方程边界点，更准确的心形形状）- 实心填充
          // 心形参数方程: x = 16*sin³(t), y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)
          // 这个方程生成的心形有正确的顶部凹陷和底部弧形
          const dxHeart = x - centerX;
          const dyHeart = y - centerY;
          
          // 归一化坐标，增大心形尺寸（使用75%的半径）
          const heartMaxRadius = Math.min(radiusX, radiusY) * 0.75;
          const nx = dxHeart / heartMaxRadius;
          const ny = dyHeart / heartMaxRadius;
          
          // 翻转y坐标，使心形顶部在上方
          const flippedY = -ny;
          
          // 使用预计算的边界点进行射线法判断
          if (heartBoundaryPoints && heartBoundaryPoints.length > 0) {
            // 使用射线法判断点是否在心形内部
            let intersections = 0;
            const rayY = flippedY;
            const rayStartX = nx;
            const rayEndX = nx + 50; // 射线终点（足够远）
            
            // 遍历预计算的边界点
            let prevPoint = heartBoundaryPoints[heartBoundaryPoints.length - 1];
            for (let i = 0; i < heartBoundaryPoints.length; i++) {
              const currPoint = heartBoundaryPoints[i];
              
              // 检查射线是否与边界线段相交
              const crossesRay = (prevPoint.y <= rayY && currPoint.y > rayY) || (prevPoint.y > rayY && currPoint.y <= rayY);
              if (crossesRay) {
                // 避免除零错误
                const dy = currPoint.y - prevPoint.y;
                if (Math.abs(dy) > 1e-10) {
                  // 计算交点
                  const tIntersect = (rayY - prevPoint.y) / dy;
                  const xIntersect = prevPoint.x + tIntersect * (currPoint.x - prevPoint.x);
                  // 检查交点是否在射线范围内
                  if (xIntersect > rayStartX && xIntersect <= rayEndX) {
                    intersections++;
                  }
                }
              }
              prevPoint = currPoint;
            }
            
            // 如果交点数量为奇数，点在内部
            if (intersections % 2 === 1) {
              alpha = 255;
            } else {
              // 在外部，计算到边界的距离用于软边缘
              let minDist = Infinity;
              // 使用每第5个点以节省计算
              for (let i = 0; i < heartBoundaryPoints.length; i += 5) {
                const point = heartBoundaryPoints[i];
                const dist = Math.sqrt((nx - point.x) * (nx - point.x) + (flippedY - point.y) * (flippedY - point.y));
                minDist = Math.min(minDist, dist);
              }
              
              // 软边缘
              if (minDist <= softEdge) {
                const edgeAlpha = Math.max(0, 1 - (minDist / softEdge));
                alpha = Math.floor(255 * edgeAlpha);
              }
            }
          } else {
            // 如果没有预计算的点，使用简化方法（不应该发生）
            alpha = 0;
          }
          break;
          
        case 'star':
          // 星形（五角星）- 实心填充
          const dxStar = x - centerX;
          const dyStar = y - centerY;
          const angleStar = Math.atan2(dyStar, dxStar);
          const distanceStar = Math.sqrt(dxStar * dxStar + dyStar * dyStar);
          const maxRadius = Math.min(radiusX, radiusY) * 0.9; // 稍微缩小以适应区域
          
          if (distanceStar === 0) {
            // 在中心点，完全填充
            alpha = 255;
            break;
          }
          
          const normalizedDist = distanceStar / maxRadius;
          
          // 五角星公式（更准确的实现）
          const n = 5; // 五角星的角数
          const outerRadius = 1.0;
          const innerRadius = 0.38; // 内半径
          
          // 将角度归一化，从顶部开始（-π/2），确保角度为正
          let normalizedAngle = ((angleStar + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI / n);
          const sector = Math.floor(normalizedAngle);
          const angleInSector = normalizedAngle - sector;
          
          // 计算该角度对应的星形边界半径
          // 在每个扇形内，半径从外角（outerRadius）线性变化到内角（innerRadius），再回到外角
          let radiusAtAngle;
          if (angleInSector < 0.5) {
            // 前半段：从外角到内角（线性递减）
            radiusAtAngle = outerRadius - (outerRadius - innerRadius) * (angleInSector * 2);
          } else {
            // 后半段：从内角到外角（线性递增）
            radiusAtAngle = innerRadius + (outerRadius - innerRadius) * ((angleInSector - 0.5) * 2);
          }
          
          // 判断点是否在星形内部（实心填充）
          // 关键：如果点到中心的距离小于该角度对应的边界半径，则点在星形内部
          if (normalizedDist < radiusAtAngle) {
            // 在星形内部，完全填充（alpha = 255）
            alpha = 255;
          } else if (normalizedDist <= radiusAtAngle + softEdge) {
            // 在边界外部附近，使用软边缘（渐变到透明）
            const edgeDist = (normalizedDist - radiusAtAngle) / softEdge;
            alpha = Math.floor(255 * Math.max(0, 1 - edgeDist));
          }
          // 如果在外部（normalizedDist > radiusAtAngle + softEdge），alpha保持为0
          break;
          
        default:
          // 默认使用椭圆
          const dxDefault = (x - centerX) / radiusX;
          const dyDefault = (y - centerY) / radiusY;
          const distanceDefault = Math.sqrt(dxDefault * dxDefault + dyDefault * dyDefault);
          if (distanceDefault <= 1.0) {
            if (distanceDefault <= (1 - softEdge)) {
              alpha = 255;
            } else {
              const edgeDistDefault = (distanceDefault - (1 - softEdge)) / softEdge;
              alpha = Math.floor(255 * Math.max(0, 1 - edgeDistDefault));
            }
          }
      }
      
      maskData[idx] = 255; // R
      maskData[idx + 1] = 255; // G
      maskData[idx + 2] = 255; // B
      maskData[idx + 3] = alpha; // A
    }
  }
  
  return sharp(maskData, {
    raw: {
      width,
      height,
      channels: 4
    }
  }).png().toBuffer();
}

// 兼容旧函数名
async function createEllipseMask(width, height, centerX, centerY, radiusX, radiusY) {
  return createMask(width, height, centerX, centerY, radiusX, radiusY, 'ellipse');
}

// 应用风格迁移 - 使用 Sharp 合成图片（优化版）
async function applyStyleTransfer(patternPath, productPath, category = '其他', customConfig = null) {
  try {
    console.log('🎨 [Style Transfer] 开始处理图片...', {
      pattern: patternPath,
      product: productPath,
      category,
      hasCustomConfig: !!customConfig
    });

    // 检查文件是否存在
    if (!fs.existsSync(patternPath)) {
      throw new Error(`纹样图片不存在: ${patternPath}`);
    }
    if (!fs.existsSync(productPath)) {
      throw new Error(`产品图片不存在: ${productPath}`);
    }

    // 获取产品默认配置
    const defaultConfig = PRODUCT_CONFIGS[category] || PRODUCT_CONFIGS['其他'];
    
    // 合并自定义配置（如果提供）
    const config = customConfig 
      ? {
          ...defaultConfig,
          ...customConfig,
          // 确保数值在合理范围内
          scaleRatio: Math.max(0.1, Math.min(1.0, customConfig.scaleRatio ?? defaultConfig.scaleRatio)),
          verticalPosition: Math.max(0, Math.min(1, customConfig.verticalPosition ?? defaultConfig.verticalPosition)),
          horizontalPosition: Math.max(0, Math.min(1, customConfig.horizontalPosition ?? defaultConfig.horizontalPosition)),
          opacity: Math.max(0.1, Math.min(1.0, customConfig.opacity ?? defaultConfig.opacity)),
          maskPadding: Math.max(0, Math.min(0.5, customConfig.maskPadding ?? defaultConfig.maskPadding)),
          // 验证混合模式（Sharp支持的混合模式）
          blendMode: ['over', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'darken', 'lighten', 'color-dodge', 'color-burn'].includes(customConfig.blendMode) 
            ? customConfig.blendMode 
            : defaultConfig.blendMode,
          // 确保useMask是布尔值
          useMask: typeof customConfig.useMask === 'boolean' ? customConfig.useMask : defaultConfig.useMask,
          // 验证蒙版形状
          maskShape: ['ellipse', 'circle', 'rectangle', 'square', 'rounded-rectangle', 'rounded-square', 'heart', 'star'].includes(customConfig.maskShape)
            ? customConfig.maskShape
            : (defaultConfig.maskShape || 'ellipse'),
        }
      : defaultConfig;
    
    console.log('🎨 [Style Transfer] 最终配置:', config);

    // 读取产品图片（作为背景）
    const productImage = sharp(productPath);
    const productMetadata = await productImage.metadata();
    
    // 读取纹样图片
    const patternImage = sharp(patternPath);
    const patternMetadata = await patternImage.metadata();

    console.log('🎨 [Style Transfer] 图片信息:', {
      product: `${productMetadata.width}x${productMetadata.height}, ${productMetadata.format}`,
      pattern: `${patternMetadata.width}x${patternMetadata.height}, ${patternMetadata.format}`
    });

    // 检测产品有效区域
    let productRegion;
    if (config.useMask) {
      productRegion = await detectProductRegion(productPath, config.maskPadding);
      console.log('🎨 [Style Transfer] 产品有效区域:', productRegion);
    } else {
      // 不使用蒙版时，使用整个图片区域（带边距）
      const padding = config.maskPadding || 0.1;
      productRegion = {
        x: Math.floor(productMetadata.width * padding),
        y: Math.floor(productMetadata.height * padding),
        width: Math.floor(productMetadata.width * (1 - padding * 2)),
        height: Math.floor(productMetadata.height * (1 - padding * 2))
      };
    }

    // 计算纹样大小（基于产品有效区域）
    const patternWidth = Math.floor(productRegion.width * config.scaleRatio);
    const patternAspectRatio = patternMetadata.height / patternMetadata.width;
    const patternHeight = Math.floor(patternWidth * patternAspectRatio);
    
    // 确保纹样不超出有效区域
    const finalPatternWidth = Math.min(patternWidth, productRegion.width);
    const finalPatternHeight = Math.min(patternHeight, productRegion.height);

    // 如果高度超出，按高度缩放
    let adjustedPatternWidth = finalPatternWidth;
    let adjustedPatternHeight = finalPatternHeight;
    if (adjustedPatternHeight > productRegion.height) {
      adjustedPatternHeight = productRegion.height;
      adjustedPatternWidth = Math.floor(adjustedPatternHeight / patternAspectRatio);
    }

    // 计算位置（基于产品有效区域和配置的位置偏移）
    const centerX = productRegion.x + productRegion.width * config.horizontalPosition;
    const centerY = productRegion.y + productRegion.height * config.verticalPosition;
    const left = Math.max(productRegion.x, Math.floor(centerX - adjustedPatternWidth / 2));
    const top = Math.max(productRegion.y, Math.floor(centerY - adjustedPatternHeight / 2));
    
    // 确保不超出图片边界
    const finalLeft = Math.max(0, Math.min(left, productMetadata.width - adjustedPatternWidth));
    const finalTop = Math.max(0, Math.min(top, productMetadata.height - adjustedPatternHeight));

    console.log('🎨 [Style Transfer] 合成参数:', {
      productSize: `${productMetadata.width}x${productMetadata.height}`,
      productRegion: `${productRegion.width}x${productRegion.height} at (${productRegion.x}, ${productRegion.y})`,
      patternSize: `${adjustedPatternWidth}x${adjustedPatternHeight}`,
      position: `(${finalLeft}, ${finalTop})`,
      blendMode: config.blendMode,
      opacity: config.opacity
    });

    // 处理纹样：调整大小，保持宽高比
    let resizedPattern = await patternImage
      .resize(adjustedPatternWidth, adjustedPatternHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .ensureAlpha()
      .png({ quality: 100 })
      .toBuffer();

    // 如果配置了旋转角度，应用旋转
    if (config.rotation && config.rotation !== 0) {
      try {
        resizedPattern = await sharp(resizedPattern)
          .rotate(config.rotation, {
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        console.log('🎨 [Style Transfer] 已应用旋转:', config.rotation, '度');
      } catch (rotateError) {
        console.warn('⚠️ [Style Transfer] 旋转处理失败，使用原图:', rotateError.message);
      }
    }

    // 如果配置了颜色，应用颜色到纹样（改进的融合算法）
    if (config.patternColor && config.patternColor !== '#000000') {
      try {
        const { data, info } = await sharp(resizedPattern)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        
        // 解析颜色
        const hex = config.patternColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 改进的融合算法：使用原图的亮度信息来混合新颜色，保持细节
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) { // 如果有透明度
            // 计算原图的亮度（使用加权平均）
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            // 使用亮度作为混合因子，保持纹样的细节和层次
            const factor = gray / 255;
            // 应用新颜色，但保持原图的明暗关系
            data[i] = Math.floor(r * factor);     // R
            data[i + 1] = Math.floor(g * factor); // G
            data[i + 2] = Math.floor(b * factor); // B
            // 保持原有透明度
          }
        }
        
        // 重新创建图片
        resizedPattern = await sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png().toBuffer();
        
        console.log('🎨 [Style Transfer] 已应用颜色:', config.patternColor);
      } catch (colorError) {
        console.warn('⚠️ [Style Transfer] 颜色处理失败，使用原图:', colorError.message);
      }
    }

    // 如果需要应用透明度，使用 modulate 或 composite 方法
    if (config.opacity < 1.0) {
      // 读取原始像素数据
      const { data, info } = await sharp(resizedPattern)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // 修改 Alpha 通道
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          data[i] = Math.floor(data[i] * config.opacity);
        }
      }
      
      // 重新创建图片
      resizedPattern = await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4
        }
      }).png().toBuffer();
    }

    // 如果需要使用蒙版，根据配置的形状创建蒙版
    if (config.useMask) {
      const maskRadiusX = adjustedPatternWidth / 2;
      const maskRadiusY = adjustedPatternHeight / 2;
      const maskCenterX = adjustedPatternWidth / 2;
      const maskCenterY = adjustedPatternHeight / 2;
      const maskShape = config.maskShape || 'ellipse';
      
      console.log('🎨 [Style Transfer] 创建蒙版:', {
        shape: maskShape,
        size: `${adjustedPatternWidth}x${adjustedPatternHeight}`,
        center: `(${maskCenterX}, ${maskCenterY})`,
        radius: `(${maskRadiusX}, ${maskRadiusY})`
      });
      
      const mask = await createMask(
        adjustedPatternWidth,
        adjustedPatternHeight,
        maskCenterX,
        maskCenterY,
        maskRadiusX,
        maskRadiusY,
        maskShape
      );

      // 应用蒙版到纹样
      resizedPattern = await sharp(resizedPattern)
        .composite([
          {
            input: mask,
            blend: 'dest-in' // 使用蒙版作为Alpha通道
          }
        ])
        .png()
        .toBuffer();
    }

    // 合成图片：将纹样叠加到产品上
    const transformedImage = await productImage
      .ensureAlpha()
      .composite([
        {
          input: resizedPattern,
          left: finalLeft,
          top: finalTop,
          blend: config.blendMode // 使用配置的混合模式
        }
      ])
      .png({ 
        quality: 90,
        compressionLevel: 6
      })
      .toBuffer();

    // 保存合成后的图片
    const transformedFilename = `transformed-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
    const transformedPath = path.join(artworksUploadDir, transformedFilename);
    await fs.promises.writeFile(transformedPath, transformedImage);

    // 验证文件是否成功保存
    const stats = await fs.promises.stat(transformedPath);
    console.log('✅ [Style Transfer] 图片保存成功:', {
      path: transformedPath,
      size: stats.size,
      url: `/uploads/artworks/${transformedFilename}`
    });

    const transformedUrl = `/uploads/artworks/${transformedFilename}`;
    
    return transformedUrl;
  } catch (error) {
    console.error('❌ [Style Transfer] 图片合成失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 如果合成失败，尝试返回产品原图（复制到artworks目录）
    try {
      const productFilename = `product-backup-${Date.now()}${path.extname(productPath)}`;
      const backupPath = path.join(artworksUploadDir, productFilename);
      await fs.promises.copyFile(productPath, backupPath);
      const backupUrl = `/uploads/artworks/${productFilename}`;
      console.log('⚠️ [Style Transfer] 使用产品原图作为备用:', backupUrl);
      return backupUrl;
    } catch (backupError) {
      console.error('❌ [Style Transfer] 备用方案也失败:', backupError);
      throw new Error('图片合成失败，请重试');
    }
  }
}

module.exports = router;
