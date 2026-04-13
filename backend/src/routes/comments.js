const express = require('express');
const { Op } = require('sequelize');
const Comment = require('../models/Comment');
const Artwork = require('../models/Artwork');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 获取评论列表
router.get('/', async (req, res) => {
  try {
    const { targetType, targetId, page = 1, limit = 20, parentId = null } = req.query;
    
    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: targetType, targetId'
      });
    }

    const where = {
      targetType,
      targetId: parseInt(targetId),
      status: 'active'
    };

    if (parentId !== null && parentId !== undefined) {
      where.parentId = parentId === 'null' || parentId === '' ? null : parseInt(parentId);
    } else {
      // 默认只获取顶级评论
      where.parentId = null;
    }

    const { count, rows: comments } = await Comment.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar', 'nickname']
        },
        {
          model: Comment,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar', 'nickname']
          }],
          limit: 5, // 只加载前5条回复
          order: [['createdAt', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败',
      error: error.message
    });
  }
});

// 创建评论
router.post('/', authenticate, async (req, res) => {
  try {
    const { targetType, targetId, content, parentId, rating } = req.body;

    if (!targetType || !targetId || !content) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: targetType, targetId, content'
      });
    }

    // 验证target是否存在（检查软删除）
    if (targetType === 'artwork') {
      const artwork = await Artwork.findOne({
        where: { id: parseInt(targetId), deletedAt: null }
      });
      if (!artwork) {
        return res.status(404).json({
          success: false,
          message: '作品不存在或已被删除'
        });
      }
    } else if (targetType === 'product') {
      const product = await Product.findOne({
        where: { id: parseInt(targetId), deletedAt: null }
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: '商品不存在或已被删除'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的targetType'
      });
    }

    // 如果parentId存在，验证父评论
    if (parentId) {
      const parent = await Comment.findByPk(parentId);
      if (!parent || parent.targetType !== targetType || parent.targetId !== parseInt(targetId)) {
        return res.status(400).json({
          success: false,
          message: '父评论不存在或不属于该目标'
        });
      }
    }

    const comment = await Comment.create({
      userId: req.user.id,
      targetType,
      targetId: parseInt(targetId),
      content: content.trim(),
      parentId: parentId ? parseInt(parentId) : null,
      rating: rating ? parseInt(rating) : null,
      status: 'active'
    });

    // 更新评论计数
    if (targetType === 'artwork') {
      await Artwork.increment('commentsCount', { where: { id: targetId } });
    } else if (targetType === 'product') {
      await Product.increment('commentsCount', { where: { id: targetId } });
      
      // 如果是商品评论且有评分，更新商品平均评分
      if (rating) {
        const product = await Product.findByPk(targetId, {
          include: [{
            model: Comment,
            as: 'comments',
            where: { rating: { [Op.ne]: null } },
            attributes: [],
            required: false
          }]
        });
        
        // 重新计算平均评分
        const ratingResult = await Comment.findAll({
          where: {
            targetType: 'product',
            targetId: parseInt(targetId),
            rating: { [Op.ne]: null },
            status: 'active'
          },
          attributes: [[require('sequelize').fn('AVG', require('sequelize').col('rating')), 'avgRating']],
          raw: true
        });
        
        if (ratingResult[0] && ratingResult[0].avgRating) {
          await Product.update(
            { rating: parseFloat(ratingResult[0].avgRating).toFixed(2) },
            { where: { id: targetId } }
          );
        }
      }
    }

    await comment.reload({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar', 'nickname']
      }]
    });

    res.status(201).json({
      success: true,
      message: '评论成功',
      data: { comment }
    });
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({
      success: false,
      message: '创建评论失败',
      error: error.message
    });
  }
});

// 删除评论
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    // 检查权限：只有评论作者或管理员可以删除
    if (comment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限删除此评论'
      });
    }

    // 软删除
    await comment.update({ status: 'deleted' });

    // 更新评论计数
    if (comment.targetType === 'artwork') {
      await Artwork.decrement('commentsCount', { where: { id: comment.targetId } });
    } else if (comment.targetType === 'product') {
      await Product.decrement('commentsCount', { where: { id: comment.targetId } });
    }

    res.json({
      success: true,
      message: '评论已删除'
    });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败',
      error: error.message
    });
  }
});

// 获取评论详情
router.get('/:id', async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar', 'nickname']
        },
        {
          model: Comment,
          as: 'parent',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar', 'nickname']
          }]
        },
        {
          model: Comment,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar', 'nickname']
          }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    res.json({
      success: true,
      data: { comment }
    });
  } catch (error) {
    console.error('获取评论详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论详情失败',
      error: error.message
    });
  }
});

// 获取当前用户的评论列表
router.get('/me', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { count, rows: comments } = await Comment.findAndCountAll({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar', 'nickname']
        },
        {
          model: Artwork,
          as: 'artwork',
          attributes: ['id', 'title', 'imageUrl'],
          where: { deletedAt: null },
          required: false
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'images'],
          where: { deletedAt: null },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 处理返回数据，添加targetTitle和targetImage字段
    const processedComments = comments.map(comment => {
      let targetTitle = '';
      let targetImage = '';

      if (comment.targetType === 'artwork' && comment.artwork) {
        targetTitle = comment.artwork.title;
        targetImage = comment.artwork.imageUrl;
      } else if (comment.targetType === 'product' && comment.product) {
        targetTitle = comment.product.name;
        targetImage = comment.product.images ? comment.product.images[0] : '';
      }

      return {
        ...comment.toJSON(),
        targetTitle,
        targetImage
      };
    });

    res.json({
      success: true,
      data: {
        comments: processedComments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取用户评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户评论列表失败',
      error: error.message
    });
  }
});

module.exports = router;

