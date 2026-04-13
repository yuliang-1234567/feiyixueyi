const express = require('express');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      limit: 50
    });
    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

// 获取用户详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    res.json({
      success: true,
      data: { user: user.toJSON() }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
});

// 更新用户信息
router.put('/:id', authenticate, async (req, res) => {
  try {
    // 只能更新自己的信息
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: '无权修改其他用户信息'
      });
    }

    const { nickname, bio, interests } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    user.nickname = nickname || user.nickname;
    user.bio = bio || user.bio;
    user.interests = interests || user.interests;
    await user.save();

    res.json({
      success: true,
      message: '更新成功',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
    });
  }
});

module.exports = router;
