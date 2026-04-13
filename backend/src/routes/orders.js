const express = require('express');
const { Sequelize } = require('sequelize');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 获取订单列表
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取订单列表失败',
      error: error.message
    });
  }
});

// 创建订单
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;

    console.log('🛒 [Order] 创建订单:', {
      userId: req.user.id,
      itemsCount: items?.length,
      totalAmount
    });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单项不能为空'
      });
    }

    // 验证产品和库存
    let calculatedTotal = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product || item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `产品不存在 (ID: ${item.product || item.productId})`
        });
      }
      
      // 检查库存（如果产品有库存限制）
      if (product.stock !== null && product.stock < (item.quantity || 1)) {
        return res.status(400).json({
          success: false,
          message: `产品 ${product.name} 库存不足`
        });
      }

      // 计算总价
      const itemPrice = item.price || product.price;
      calculatedTotal += itemPrice * (item.quantity || 1);
    }

    // 使用计算的总价或提供的总价
    const finalTotal = totalAmount || calculatedTotal;

    console.log('✅ [Order] 验证通过，创建订单...');

    // 获取产品信息并构建订单项
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findByPk(item.product || item.productId);
      if (product) {
        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || product.price),
          imageUrl: product.images?.[0] || null
        });
      }
    }

    // 创建订单
    const order = await Order.create({
      userId: req.user.id,
      items: orderItems,
      shippingName: shippingAddress?.name || req.user.username,
      shippingPhone: shippingAddress?.phone || '',
      shippingAddress: shippingAddress?.address || '',
      shippingCity: shippingAddress?.city || '',
      shippingProvince: shippingAddress?.province || '',
      shippingZipCode: shippingAddress?.zipCode || '',
      totalAmount: parseFloat(finalTotal),
      status: 'pending'
    });

    console.log('✅ [Order] 订单创建成功:', order.id);

    // 更新库存（如果产品有库存限制）
    for (const item of items) {
      const product = await Product.findByPk(item.product || item.productId);
      if (product && product.stock !== null) {
        await Product.update(
          {
            stock: Sequelize.literal(`stock - ${item.quantity || 1}`),
            sales: Sequelize.literal(`sales + ${item.quantity || 1}`)
          },
          { where: { id: item.product || item.productId } }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: { order }
    });
  } catch (error) {
    console.error('❌ [Order] 创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// 支付订单（模拟支付）
router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '订单状态不正确，无法支付'
      });
    }

    // 模拟支付延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 更新订单状态为已支付
    await order.update({
      status: 'paid'
    });

    console.log('✅ [Order] 订单支付成功:', orderId);

    res.json({
      success: true,
      message: '支付成功',
      data: { order }
    });
  } catch (error) {
    console.error('❌ [Order] 支付失败:', error);
    res.status(500).json({
      success: false,
      message: '支付失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

module.exports = router;
