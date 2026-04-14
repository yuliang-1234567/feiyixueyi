import React, { useState, useEffect } from 'react';
import { Card, Button, InputNumber, Empty, message, Divider } from 'antd';
import { ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { cartUtils } from '../utils/cart';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';
import { LucideIcon } from "../components/icons/lucide";
import "./Cart.css";

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
    <div className="cart-page">
      <div className="cart-hero">
        <h1 className="cart-title">购物车</h1>
      </div>

      {cart.length === 0 ? (
        <Card className="cart-emptyCard">
          <Empty 
            description="购物车是空的"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary"
              onClick={() => navigate('/shop')}
              className="cart-primaryBtn"
            >
              去购物
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <Card className="cart-listCard">
            {cart.map((item) => (
              <div key={item.id}>
                <div className="cart-itemRow">
                  <img
                    src={getImageUrl(item.image || item.images?.[0]) || CART_IMG_PLACEHOLDER}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = CART_IMG_PLACEHOLDER;
                    }}
                    className="cart-itemImage"
                  />
                  <div className="cart-itemBody">
                    <h3 className="cart-itemName">{item.name}</h3>
                    <p className="cart-itemCategory">{item.category}</p>
                    <div className="cart-itemBottom">
                      <div className="cart-itemPrice">¥{item.price}</div>
                      <div className="cart-itemActions">
                        <InputNumber
                          min={1}
                          max={item.stock || 999}
                          value={item.quantity}
                          onChange={(value) => handleQuantityChange(item.id, value)}
                          className="cart-qtyInput"
                        />
                        <Button
                          type="text"
                          danger
                          icon={<LucideIcon icon={Trash2} />}
                          onClick={() => handleRemove(item.id)}
                          className="cart-removeBtn"
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

          <Card className="cart-summaryCard">
            <div className="cart-summaryTop">
              <span className="cart-summaryLabel">总计</span>
              <span className="cart-summaryValue">
                ¥{(Number.isFinite(totalPrice) ? totalPrice : 0).toFixed(2)}
              </span>
            </div>
            <div className="cart-summaryMeta">
              免运费 · 7天无理由退换
            </div>
            <div className="cart-summaryBtns">
              <Button onClick={() => navigate('/shop')} className="cart-secondaryBtn">
                继续购物
              </Button>
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleCheckout}
              icon={<LucideIcon icon={ShoppingCart} />}
              className="cart-primaryBtn cart-checkoutBtn"
            >
              结算
            </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Cart;

