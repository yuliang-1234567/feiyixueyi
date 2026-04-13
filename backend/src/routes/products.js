const express = require('express');
const { Op } = require('sequelize');
const Product = require('../models/Product');
const ProductLike = require('../models/ProductLike');
const ProductRating = require('../models/ProductRating');
const Comment = require('../models/Comment');
const View = require('../models/View');
const Artwork = require('../models/Artwork');
const User = require('../models/User');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();
const CREATOR_SAFE_ATTRIBUTES = ['id', 'username', 'avatar'];

// 获取产品列表
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 20, status = 'published', search } = req.query;
    const where = { status };
    
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 排除已删除的商品
    where.deletedAt = null;

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Artwork,
          as: 'pattern',
          attributes: ['id', 'title', 'imageUrl']
        },
        {
          model: User,
          as: 'creator',
          attributes: CREATOR_SAFE_ATTRIBUTES
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 获取每个商品的点赞状态（如果用户已登录）
    const userId = req.user?.id;
    let likedProductIds = [];
    if (userId) {
      const likes = await ProductLike.findAll({
        where: {
          userId,
          productId: { [Op.in]: products.map(p => p.id) }
        },
        attributes: ['productId']
      });
      likedProductIds = likes.map(l => l.productId);
    }

    const productsWithLikeStatus = products.map(product => ({
      ...product.toJSON(),
      isLiked: likedProductIds.includes(product.id)
    }));

    res.json({
      success: true,
      data: {
        products: productsWithLikeStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取产品列表失败',
      error: error.message
    });
  }
});

// 获取我的商品列表
router.get('/me/list', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const where = { 
      creatorId: req.user.id,
      deletedAt: null  // 排除已删除的商品
    };
    
    if (status) where.status = status;
    if (category) where.category = category;
    
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Artwork,
          as: 'pattern',
          attributes: ['id', 'title', 'imageUrl']
        },
        {
          model: User,
          as: 'creator',
          attributes: CREATOR_SAFE_ATTRIBUTES
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 检查每个商品的images字段
    const productsWithImages = products.map(product => {
      const productData = product.toJSON();
      if (!productData.images || !Array.isArray(productData.images) || productData.images.length === 0) {
        console.warn('⚠️ 商品缺少images字段:', product.id);
      }
      return productData;
    });

    res.json({
      success: true,
      data: {
        products: productsWithImages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取我的商品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的商品列表失败',
      error: error.message
    });
  }
});

// 获取产品详情
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        deletedAt: null  // 排除已删除的商品
      },
      include: [
        {
          model: Artwork,
          as: 'pattern',
          attributes: ['id', 'title', 'imageUrl', 'category']
        },
        {
          model: User,
          as: 'creator',
          attributes: CREATOR_SAFE_ATTRIBUTES
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在或已被删除'
      });
    }

    // 记录浏览（防重复：同一用户/IP在1小时内只记录一次）
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const viewWhere = {
      targetType: 'product',
      targetId: product.id,
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
        targetType: 'product',
        targetId: product.id,
        ipAddress,
        userAgent: req.get('user-agent')
      });
      await product.increment('views');
      await product.reload();
    }

    // 检查是否已点赞
    let isLiked = false;
    if (userId) {
      const like = await ProductLike.findOne({
        where: { userId, productId: product.id }
      });
      isLiked = !!like;
    }

    // 获取统计数据（使用模型中的计数字段，如果没有则查询）
    const likesCount = product.likesCount !== undefined ? product.likesCount : await ProductLike.count({ where: { productId: product.id } });
    const commentsCount = product.commentsCount !== undefined ? product.commentsCount : await Comment.count({ 
      where: { targetType: 'product', targetId: product.id, status: 'active' } 
    });
    const views = product.views !== undefined ? product.views : 0;
    const rating = product.rating !== undefined ? product.rating : 0;

    // 确保images字段存在
    const productData = product.toJSON();
    if (!productData.images || !Array.isArray(productData.images) || productData.images.length === 0) {
      console.warn('⚠️ 商品缺少images字段:', product.id);
    }

    res.json({
      success: true,
      data: { 
        product: {
          ...productData,
          isLiked,
          likesCount,
          commentsCount,
          views,
          rating
        }
      }
    });
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取产品详情失败',
      error: error.message
    });
  }
});

// 创建产品（需要认证）
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, images, price, category, patternId, status, stock, material, size, origin, craftsmanship, culturalMeaning, originalPrice } = req.body;

    console.log('🛍️ [Product] 创建产品:', {
      name,
      category,
      price,
      userId: req.user.id
    });

    // 验证必填字段
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: '请提供产品名称、价格和类别'
      });
    }

    // 处理图片数组
    let imagesArray = [];
    if (images) {
      if (Array.isArray(images)) {
        imagesArray = images;
      } else {
        imagesArray = [images];
      }
    }

    // 验证patternId是否存在（如果提供）
    if (patternId) {
      const patternArtwork = await Artwork.findByPk(patternId);
      if (!patternArtwork) {
        return res.status(400).json({
          success: false,
          message: `关联的作品不存在 (ID: ${patternId})`
        });
      }
    }

    // 创建产品
    const product = await Product.create({
      name,
      description: description || '',
      images: imagesArray,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      category,
      patternId: patternId || null,
      creatorId: req.user.id,
      status: status || 'published', // 默认为已发布
      stock: stock !== undefined ? parseInt(stock) : 999, // 默认库存999
      material: material || null,
      size: size || null,
      origin: origin || null,
      craftsmanship: craftsmanship || null,
      culturalMeaning: culturalMeaning || null
    });

    await product.reload({
      include: [
        {
          model: Artwork,
          as: 'pattern',
          attributes: ['id', 'title', 'imageUrl'],
          required: false // 如果patternId为null，不要求必须有关联
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });

    console.log('✅ [Product] 产品创建成功:', product.id);

    res.status(201).json({
      success: true,
      message: '产品创建成功',
      data: { product }
    });
  } catch (error) {
    console.error('❌ [Product] 创建产品失败:', error);
    console.error('错误详情:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // 处理特定的数据库错误
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: '关联的数据不存在，请检查作品ID或用户ID',
        error: process.env.NODE_ENV === 'development' ? error.message : '数据关联错误'
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: process.env.NODE_ENV === 'development' ? error.errors.map(e => e.message).join(', ') : '数据格式错误'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '创建产品失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// 更新产品
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在或已被删除'
      });
    }

    if (product.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限修改此产品'
      });
    }

    const { name, description, images, price, originalPrice, category, status, stock, material, size, origin, craftsmanship, culturalMeaning } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || '';
    if (images !== undefined) {
      if (Array.isArray(images)) {
        updateData.images = images.filter(img => img);
      } else if (typeof images === 'string' && images.trim()) {
        updateData.images = [images.trim()];
      } else {
        updateData.images = [];
      }
    }
    if (price !== undefined && price !== null) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: '价格必须大于0'
        });
      }
      updateData.price = parsedPrice;
    }
    if (originalPrice !== undefined && originalPrice !== null) {
      updateData.originalPrice = parseFloat(originalPrice);
    }
    if (category) updateData.category = category;
    if (status) updateData.status = status;
    if (stock !== undefined && stock !== null) {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          success: false,
          message: '库存不能为负数'
        });
      }
      updateData.stock = parsedStock;
    }
    if (material !== undefined) updateData.material = material;
    if (size !== undefined) updateData.size = size;
    if (origin !== undefined) updateData.origin = origin;
    if (craftsmanship !== undefined) updateData.craftsmanship = craftsmanship;
    if (culturalMeaning !== undefined) updateData.culturalMeaning = culturalMeaning;

    await product.update(updateData);

    await product.reload({
      include: [
        {
          model: Artwork,
          as: 'pattern',
          attributes: ['id', 'title', 'imageUrl']
        },
        {
          model: User,
          as: 'creator',
          attributes: CREATOR_SAFE_ATTRIBUTES
        }
      ]
    });

    res.json({
      success: true,
      message: '产品更新成功',
      data: { product }
    });
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({
      success: false,
      message: '更新产品失败',
      error: error.message
    });
  }
});

// 删除产品
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在或已被删除'
      });
    }

    if (product.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限删除此产品'
      });
    }

    // 软删除
    await product.destroy();

    res.json({
      success: true,
      message: '产品已删除'
    });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除产品失败',
      error: error.message
    });
  }
});

// 点赞产品
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在或已被删除'
      });
    }

    const userId = req.user.id;
    const [like, created] = await ProductLike.findOrCreate({
      where: {
        userId,
        productId: product.id
      },
      defaults: {
        userId,
        productId: product.id
      }
    });

    if (!created) {
      await like.destroy();
      await product.decrement('likesCount');
    } else {
      await product.increment('likesCount');
    }

    await product.reload();
    const likesCount = product.likesCount || await ProductLike.count({
      where: { productId: product.id }
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

// 获取产品统计
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, deletedAt: null }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在或已被删除'
      });
    }

    if (product.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限查看统计'
      });
    }

    // 获取7天和30天的统计数据
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [views7d, views30d, likes7d, likes30d, comments7d, comments30d, sales7d, sales30d] = await Promise.all([
      View.count({
        where: {
          targetType: 'product',
          targetId: product.id,
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      }),
      View.count({
        where: {
          targetType: 'product',
          targetId: product.id,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      }),
      ProductLike.count({
        where: {
          productId: product.id,
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      }),
      ProductLike.count({
        where: {
          productId: product.id,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      }),
      Comment.count({
        where: {
          targetType: 'product',
          targetId: product.id,
          status: 'active',
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      }),
      Comment.count({
        where: {
          targetType: 'product',
          targetId: product.id,
          status: 'active',
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      }),
      // 这里需要从订单中统计销量，暂时使用product.sales
      Promise.resolve(0),
      Promise.resolve(0)
    ]);

    res.json({
      success: true,
      data: {
        total: {
          views: product.views,
          likes: product.likesCount || 0,
          comments: product.commentsCount || 0,
          sales: product.sales,
          rating: product.rating || 0
        },
        last7Days: {
          views: views7d,
          likes: likes7d,
          comments: comments7d,
          sales: sales7d
        },
        last30Days: {
          views: views30d,
          likes: likes30d,
          comments: comments30d,
          sales: sales30d
        }
      }
    });
  } catch (error) {
    console.error('获取产品统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取产品统计失败',
      error: error.message
    });
  }
});

// 更新产品状态（管理员）
router.patch('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const product = await Product.findOne({
      where: { id: req.params.id, deletedAt: null }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在或已被删除'
      });
    }

    product.status = status;
    await product.save();

    res.json({
      success: true,
      message: '产品状态更新成功',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新产品状态失败',
      error: error.message
    });
  }
});

module.exports = router;
