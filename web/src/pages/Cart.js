import React, { useState, useEffect } from 'react';
import { Card, Button, InputNumber, Empty, message, Divider } from 'antd';
import { ShoppingCartOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cartUtils } from '../utils/cart';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';

// 占位图：无网络请求，图片加载失败或 item.image 为空时使用
const CART_IMG_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23f0f0f0' width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' fill='%23999' text-anchor='middle' dy='.3em' font-size='12' font-family='sans-serif'%3E暂无图片%3C/text%3E%3C/svg%3E";

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const cartItems = cartUtils.getCart();
    setCart(cartItems);
  };

  const handleQuantityChange = (productId, quantity) => {
    const newCart = cartUtils.updateQuantity(productId, quantity);
    setCart(newCart);
  };

  const handleRemove = (productId) => {
    const newCart = cartUtils.removeFromCart(productId);
    setCart(newCart);
    message.success('已从购物车移除');
  };

  const handleCheckout = async () => {
    if (!user) {
      message.warning('请先登录');
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    if (cart.length === 0) {
      message.warning('购物车为空');
      return;
    }

    setLoading(true);
    try {
      const items = cart.map(item => ({
        product: item.id,
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const totalAmount = cartUtils.getTotalPrice();

      const response = await api.post('/orders', {
        items,
        totalAmount
      });

      if (response.data.success) {
        const orderId = response.data.data?.order?.id || response.data.order?.id;
        
        if (orderId) {
          // 清空购物车
          cartUtils.clearCart();
          
          // 跳转到支付页面
          navigate(`/payment?orderId=${orderId}&amount=${totalAmount}`);
        } else {
          message.error('订单创建失败，未获取到订单ID');
        }
      } else {
        message.error(response.data.message || '创建订单失败');
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      message.error(error.response?.data?.message || '创建订单失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = cartUtils.getTotalPrice();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '40px 24px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '16px'
        }}>
          购物车
        </h1>
      </div>

      {cart.length === 0 ? (
        <Card style={{ borderRadius: '20px', textAlign: 'center', padding: '60px' }}>
          <Empty 
            description="购物车是空的"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary"
              onClick={() => navigate('/shop')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                height: '44px',
                padding: '0 32px',
                fontWeight: '600'
              }}
            >
              去购物
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <Card style={{ borderRadius: '20px', marginBottom: '24px' }}>
            {cart.map((item) => (
              <div key={item.id}>
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '20px 0',
                  alignItems: 'center'
                }}>
                  <img
                    src={getImageUrl(item.image || item.images?.[0]) || CART_IMG_PLACEHOLDER}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = CART_IMG_PLACEHOLDER;
                    }}
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      background: '#f5f5f5'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      marginBottom: '8px'
                    }}>
                      {item.name}
                    </h3>
                    <p style={{ 
                      color: '#666', 
                      fontSize: '14px',
                      marginBottom: '12px'
                    }}>
                      {item.category}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ 
                          fontSize: '20px', 
                          fontWeight: 700,
                          color: '#ff4444'
                        }}>
                          ¥{item.price}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <InputNumber
                          min={1}
                          max={item.stock || 999}
                          value={item.quantity}
                          onChange={(value) => handleQuantityChange(item.id, value)}
                          style={{ width: '100px' }}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemove(item.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <Divider style={{ margin: 0 }} />
              </div>
            ))}
          </Card>

          <Card style={{ borderRadius: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>总计：</span>
              <span style={{ 
                fontSize: '28px', 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                ¥{(Number.isFinite(totalPrice) ? totalPrice : 0).toFixed(2)}
              </span>
            </div>
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleCheckout}
              icon={<ShoppingCartOutlined />}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                height: '50px',
                fontSize: '18px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
            >
              结算
            </Button>
          </Card>
        </>
      )}
    </div>
  );
};

export default Cart;

