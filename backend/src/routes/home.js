const express = require('express');
const Master = require('../models/Master');
const News = require('../models/News');

const router = express.Router();

// 获取大师列表
router.get('/masters', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const masters = await Master.findAll({
      where: { status: 'published' },
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: { masters }
    });
  } catch (error) {
    console.error('获取大师列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取大师列表失败',
      error: error.message
    });
  }
});

// 获取新闻列表
router.get('/news', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    const where = { status: 'published' };
    
    if (category) {
      where.category = category;
    }
    
    const news = await News.findAll({
      where,
      order: [['publishDate', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: { news }
    });
  } catch (error) {
    console.error('获取新闻列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取新闻列表失败',
      error: error.message
    });
  }
});

module.exports = router;
