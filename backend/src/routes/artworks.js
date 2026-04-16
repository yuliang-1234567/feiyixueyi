const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op, Sequelize } = require('sequelize');
const Artwork = require('../models/Artwork');
const ArtworkLike = require('../models/ArtworkLike');
const Comment = require('../models/Comment');
const View = require('../models/View');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/artworks'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'artwork-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB
    // 注意：不要设置 files 限制，因为 upload.single() 已经限制了只能上传一个文件
    fieldSize: 10 * 1024 * 1024, // 字段大小限制
    fields: 20 // 允许的表单字段数量（title, description, category, tags等）
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

const saveArtworkImageFromUrl = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  const normalizedUrl = imageUrl.trim();
  if (!normalizedUrl) {
    return null;
  }

  let sourcePath = null;
  try {
    if (normalizedUrl.startsWith('/uploads/')) {
      sourcePath = path.join(__dirname, '../..', normalizedUrl);
    } else if (/^https?:\/\//i.test(normalizedUrl)) {
      const parsedUrl = new URL(normalizedUrl);
      if (parsedUrl.pathname.startsWith('/uploads/')) {
        sourcePath = path.join(__dirname, '../..', parsedUrl.pathname);
      }
    }
  } catch (error) {
    console.warn('⚠️ [Artwork] 解析图片URL失败:', error.message);
  }

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return null;
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const targetFilename = 'artwork-' + uniqueSuffix + path.extname(sourcePath || '.png');
  const targetPath = path.join(__dirname, '../../uploads/artworks', targetFilename);

  await fs.promises.copyFile(sourcePath, targetPath);
  return `/uploads/artworks/${targetFilename}`;
};

// 获取作品列表（公开）
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 20, status = 'published', search, tags } = req.query;
    const where = { status };
    
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (tags) {
      const tagArray = tags.split(',');
      where.tags = { [Op.overlap]: tagArray };
    }
    
    // 排除已删除的作品
    where.deletedAt = null;

    const { count, rows: artworks } = await Artwork.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'nickname']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 获取每个作品的点赞状态（如果用户已登录）
    const userId = req.user?.id;
    let likedArtworkIds = [];
    if (userId) {
      const likes = await ArtworkLike.findAll({
        where: {
          userId,
          artworkId: { [Op.in]: artworks.map(a => a.id) }
        },
        attributes: ['artworkId']
      });
      likedArtworkIds = likes.map(l => l.artworkId);
    }

    const artworksWithLikeStatus = artworks.map(artwork => ({
      ...artwork.toJSON(),
      isLiked: likedArtworkIds.includes(artwork.id)
    }));

    res.json({
      success: true,
      data: {
        artworks: artworksWithLikeStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取作品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取作品列表失败',
      error: error.message
    });
  }
});

// 获取我的作品列表
router.get('/me/list', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const where = { authorId: req.user.id };
    
    if (status) where.status = status;
    if (category) where.category = category;
    
    // 排除已删除的作品（或者可以显示所有，包括已删除的）
    where.deletedAt = null;

    const { count, rows: artworks } = await Artwork.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'nickname']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 检查每个作品的imageUrl
    const artworksWithImages = artworks.map(artwork => {
      const artworkData = artwork.toJSON();
      if (!artworkData.imageUrl) {
        console.warn('⚠️ 作品缺少imageUrl字段:', artwork.id);
      }
      return artworkData;
    });

    res.json({
      success: true,
      data: {
        artworks: artworksWithImages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取我的作品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的作品列表失败',
      error: error.message
    });
  }
});

// 获取我点赞的作品列表
router.get('/me/likes', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const { count, rows: likes } = await ArtworkLike.findAndCountAll({
      where: { userId: req.user.id },
      include: [{
        model: Artwork,
        as: 'artwork',
        where: { deletedAt: null },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'nickname']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const artworks = likes
      .map(item => item.artwork)
      .filter(Boolean)
      .map(artwork => ({
        ...artwork.toJSON(),
        isLiked: true
      }));

    res.json({
      success: true,
      data: {
        likes: artworks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取我的点赞列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的点赞列表失败',
      error: error.message
    });
  }
});

// 获取作品详情
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findOne({
      where: {
        id: req.params.id,
        deletedAt: null  // 排除已删除的作品
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'nickname', 'bio']
      }]
    });
    
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: '作品不存在或已被删除'
      });
    }

    // 记录浏览（防重复：同一用户/IP在1小时内只记录一次）
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const viewWhere = {
      targetType: 'artwork',
      targetId: artwork.id,
      createdAt: { [Op.gte]: oneHourAgo }
    };
    
    if (userId) {
      viewWhere.userId = userId;
    } else {
      viewWhere.ipAddress = ipAddress;
    }
    
    const existingView = await View.findOne({
      where: viewWhere
    });

    if (!existingView) {
      await View.create({
        userId: userId || null,
        targetType: 'artwork',
        targetId: artwork.id,
        ipAddress,
        userAgent: req.get('user-agent')
      });
      await artwork.increment('views');
      await artwork.reload();
    }

    // 检查是否已点赞
    let isLiked = false;
    if (userId) {
      const like = await ArtworkLike.findOne({
        where: { userId, artworkId: artwork.id }
      });
      isLiked = !!like;
    }

    // 获取统计数据（使用模型中的计数字段，如果没有则查询）
    const likesCount = artwork.likesCount !== undefined ? artwork.likesCount : await ArtworkLike.count({ where: { artworkId: artwork.id } });
    const commentsCount = artwork.commentsCount !== undefined ? artwork.commentsCount : await Comment.count({ 
      where: { targetType: 'artwork', targetId: artwork.id, status: 'active' } 
    });
    const views = artwork.views !== undefined ? artwork.views : 0;

    // 确保imageUrl字段存在
    const artworkData = artwork.toJSON();
    if (!artworkData.imageUrl) {
      console.warn('⚠️ 作品缺少imageUrl字段:', artwork.id);
    }

    res.json({
      success: true,
      data: { 
        artwork: {
          ...artworkData,
          isLiked,
          likesCount,
          commentsCount,
          views
        }
      }
    });
  } catch (error) {
    console.error('获取作品详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取作品详情失败',
      error: error.message
    });
  }
});

// 创建作品
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, tags, status = 'published', imageUrl } = req.body;
    
    let savedImageUrl = null;
    if (req.file) {
      savedImageUrl = `/uploads/artworks/${req.file.filename}`;
    } else {
      savedImageUrl = await saveArtworkImageFromUrl(imageUrl);
    }

    if (!savedImageUrl) {
      return res.status(400).json({
        success: false,
        message: '请上传作品图片或提供可访问的 imageUrl'
      });
    }

    // 构建作品数据，确保字段顺序正确
    const artworkData = {
      title,
      description: description || '',
      imageUrl: savedImageUrl,
      category,
      authorId: req.user.id,
      aiSimilarity: null,
      aiAccuracy: null,
      aiSuggestions: [],
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
      views: 0,
      status: status || 'published',
      likesCount: 0,
      commentsCount: 0
    };

    const artwork = await Artwork.create(artworkData);

    await artwork.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'nickname']
      }]
    });

    res.status(201).json({
      success: true,
      message: '作品创建成功',
      data: { artwork }
    });
  } catch (error) {
    console.error('创建作品失败:', error);
    res.status(500).json({
      success: false,
      message: '创建作品失败',
      error: error.message
    });
  }
});

// 更新作品
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const artwork = await Artwork.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: '作品不存在或已被删除'
      });
    }

    if (artwork.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限修改此作品'
      });
    }

    const { title, description, category, tags, status } = req.body;
    const updateData = {};
    
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || '';
    if (category) updateData.category = category;
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        updateData.tags = tags.trim() ? tags.split(',').map(t => t.trim()).filter(t => t) : [];
      } else if (Array.isArray(tags)) {
        updateData.tags = tags.filter(t => t);
      } else {
        updateData.tags = [];
      }
    }
    if (status) updateData.status = status;
    if (req.file) updateData.imageUrl = `/uploads/artworks/${req.file.filename}`;

    await artwork.update(updateData);

    await artwork.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'nickname']
      }]
    });

    res.json({
      success: true,
      message: '作品更新成功',
      data: { artwork }
    });
  } catch (error) {
    console.error('更新作品失败:', error);
    res.status(500).json({
      success: false,
      message: '更新作品失败',
      error: error.message
    });
  }
});

// 删除作品
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const artwork = await Artwork.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: '作品不存在或已被删除'
      });
    }

    if (artwork.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限删除此作品'
      });
    }

    // 软删除
    await artwork.destroy();

    res.json({
      success: true,
      message: '作品已删除'
    });
  } catch (error) {
    console.error('删除作品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除作品失败',
      error: error.message
    });
  }
});

// 点赞作品
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const artwork = await Artwork.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: '作品不存在或已被删除'
      });
    }

    const userId = req.user.id;
    const [like, created] = await ArtworkLike.findOrCreate({
      where: {
        userId,
        artworkId: artwork.id
      },
      defaults: {
        userId,
        artworkId: artwork.id
      }
    });

    if (!created) {
      // 如果已存在，则取消点赞
      await like.destroy();
      await artwork.decrement('likesCount');
    } else {
      await artwork.increment('likesCount');
    }

    await artwork.reload();
    const likesCount = artwork.likesCount || await ArtworkLike.count({
      where: { artworkId: artwork.id }
    });

    res.json({
      success: true,
      message: created ? '点赞成功' : '取消点赞成功',
      data: { 
        likes: likesCount,
        isLiked: created
      }
    });
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({
      success: false,
      message: '操作失败',
      error: error.message
    });
  }
});

// 获取作品统计
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: '作品不存在'
      });
    }

    if (artwork.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限查看统计'
      });
    }

    // 获取7天和30天的统计数据
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [views7d, views30d] = await Promise.all([
      View.count({
        where: {
          targetType: 'artwork',
          targetId: artwork.id,
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      }),
      View.count({
        where: {
          targetType: 'artwork',
          targetId: artwork.id,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      })
    ]);

    const [likes7d, likes30d] = await Promise.all([
      ArtworkLike.count({
        where: {
          artworkId: artwork.id,
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      }),
      ArtworkLike.count({
        where: {
          artworkId: artwork.id,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      })
    ]);

    const [comments7d, comments30d] = await Promise.all([
      Comment.count({
        where: {
          targetType: 'artwork',
          targetId: artwork.id,
          status: 'active',
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      }),
      Comment.count({
        where: {
          targetType: 'artwork',
          targetId: artwork.id,
          status: 'active',
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: {
          views: artwork.views,
          likes: artwork.likesCount || 0,
          comments: artwork.commentsCount || 0
        },
        last7Days: {
          views: views7d,
          likes: likes7d,
          comments: comments7d
        },
        last30Days: {
          views: views30d,
          likes: likes30d,
          comments: comments30d
        }
      }
    });
  } catch (error) {
    console.error('获取作品统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取作品统计失败',
      error: error.message
    });
  }
});

module.exports = router;
