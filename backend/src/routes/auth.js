const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名、邮箱和密码'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    // 创建用户（密码会在hook中自动加密）
    const user = await User.create({
      username,
      email,
      password
    });

    // 生成token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [Auth] 登录请求:', { email, hasPassword: !!password });

    if (!email || !password) {
      console.log('❌ [Auth] 缺少邮箱或密码');
      return res.status(400).json({
        success: false,
        message: '请提供邮箱和密码'
      });
    }

    // 检查 JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('❌ [Auth] JWT_SECRET 未设置');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }

    // 查找用户
    console.log('🔍 [Auth] 查找用户:', email);
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ [Auth] 用户不存在:', email);
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    console.log('✅ [Auth] 找到用户:', user.id, user.username);

    // 验证密码
    console.log('🔐 [Auth] 验证密码...');
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ [Auth] 密码验证失败');
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    console.log('✅ [Auth] 密码验证成功');

    // 生成token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log('✅ [Auth] Token 生成成功');

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar || ''
        }
      }
    });
  } catch (error) {
    console.error('❌ [Auth] 登录异常:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 刷新token（可选，如果需要token刷新功能）
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '请提供token'
      });
    }

    // 尝试解码token（即使过期也能解码）
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }

    // 查找用户
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 生成新token
    const newToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar || ''
        }
      }
    });
  } catch (error) {
    console.error('❌ [Auth] Token刷新异常:', error);
    res.status(500).json({
      success: false,
      message: 'Token刷新失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
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

module.exports = router;

