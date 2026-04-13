const express = require('express');
const Subscription = require('../models/Subscription');
const { Op } = require('sequelize');

const router = express.Router();

// 创建订阅
router.post('/', async (req, res) => {
  try {
    const { email, source = 'home' } = req.body;

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }

    // 检查是否已订阅
    const existing = await Subscription.findOne({
      where: {
        email: email.toLowerCase().trim()
      }
    });

    if (existing) {
      if (existing.status === 'active') {
        return res.status(400).json({
          success: false,
          message: '该邮箱已订阅'
        });
      } else {
        // 如果之前取消过订阅，重新激活
        await existing.update({
          status: 'active',
          subscribedAt: new Date(),
          source
        });
        return res.json({
          success: true,
          message: '订阅成功',
          data: { subscription: existing }
        });
      }
    }

    // 创建新订阅
    const subscription = await Subscription.create({
      email: email.toLowerCase().trim(),
      status: 'active',
      source,
      subscribedAt: new Date()
    });

    res.json({
      success: true,
      message: '订阅成功',
      data: { subscription }
    });
  } catch (error) {
    console.error('创建订阅失败:', error);
    res.status(500).json({
      success: false,
      message: '订阅失败，请稍后重试',
      error: error.message
    });
  }
});

// 取消订阅
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱地址'
      });
    }

    const subscription = await Subscription.findOne({
      where: {
        email: email.toLowerCase().trim()
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: '未找到该邮箱的订阅记录'
      });
    }

    await subscription.update({
      status: 'unsubscribed'
    });

    res.json({
      success: true,
      message: '已取消订阅'
    });
  } catch (error) {
    console.error('取消订阅失败:', error);
    res.status(500).json({
      success: false,
      message: '取消订阅失败',
      error: error.message
    });
  }
});

// 获取订阅列表（需要管理员权限）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Subscription.findAndCountAll({
      where,
      order: [['subscribedAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        subscriptions: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取订阅列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订阅列表失败',
      error: error.message
    });
  }
});

module.exports = router;
