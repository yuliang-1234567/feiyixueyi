import React, { useState, useEffect } from 'react';
import { Card, Tabs, Empty, Tag, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待付款' },
    { key: 'paid', label: '待发货' },
    { key: 'shipped', label: '已发货' },
    { key: 'completed', label: '已完成' }
  ];

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      navigate('/login', { state: { from: '/orders' } });
    }
  }, [user, activeTab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      
      let ordersList = [];
      if (response.data?.success && response.data?.data?.orders) {
        ordersList = response.data.data.orders;
      } else if (response.data?.orders) {
        ordersList = response.data.orders;
      } else if (response.data?.data?.orders) {
        ordersList = response.data.data.orders;
      } else if (Array.isArray(response.data)) {
        ordersList = response.data;
      }

      setOrders(ordersList);
    } catch (error) {
      console.error('加载订单失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '加载订单失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': { text: '待付款', color: 'orange' },
      'paid': { text: '待发货', color: 'blue' },
      'shipped': { text: '已发货', color: 'cyan' },
      'completed': { text: '已完成', color: 'green' },
      'cancelled': { text: '已取消', color: 'red' }
    };
    return statusMap[status] || { text: status, color: 'default' };
  };

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

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
          我的订单
        </h1>
      </div>

      <Card style={{ borderRadius: '20px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: '24px' }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Spin size="large" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Empty description="暂无订单" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {filteredOrders.map((order) => {
              const statusInfo = getStatusText(order.status);
              return (
                <Card
                  key={order.id}
                  style={{
                    borderRadius: '16px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div>
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        订单号：{order.orderNumber || `ORD${order.id}`}
                      </span>
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : ''}
                        </span>
                      </div>
                    </div>
                    <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    {Array.isArray(order.items) && order.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '16px',
                          alignItems: 'center'
                        }}
                      >
                        <img
                          src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${((process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3100/api' : 'http://121.199.74.74/api'))).replace(/\/api\/?$/, '')}${item.imageUrl}`) : ''}
                          alt={item.productName || item.name}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            background: '#f5f5f5'
                          }}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f5f5f5"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E无图片%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 600,
                            marginBottom: '4px'
                          }}>
                            {item.productName || item.name}
                          </div>
                          <div style={{ color: '#666', fontSize: '14px' }}>
                            ¥{item.price} × {item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <span style={{ 
                      fontSize: '20px', 
                      fontWeight: 700,
                      color: '#ff4444'
                    }}>
                      合计：¥{order.totalAmount}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Orders;

