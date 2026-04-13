const express = require('express');
const { Op } = require('sequelize');
const ARContent = require('../models/ARContent');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
router.post('/recognize', async (req, res) => {
  try {
    // 这里可以实现图片识别逻辑
    // 目前简单实现：根据图片特征或文件名匹配
    const { imageUrl, imageHash } = req.body;

    // 如果提供了markerId，直接查找
    if (req.body.markerId) {
      const content = await ARContent.findOne({
        where: {
          markerId: req.body.markerId,
          status: 'active'
        }
      });

      if (content) {
        await content.increment('scans');
        return res.json({
          success: true,
          data: { content }
        });
      }
    }

    // 否则返回所有AR内容，让前端选择
    const contents = await ARContent.findAll({
      where: { status: 'active' },
      order: [['scans', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: { 
        contents,
        message: '请从列表中选择匹配的内容'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '识别失败',
      error: error.message
    });
  }
});

module.exports = router;
