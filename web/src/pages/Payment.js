import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const orderId = searchParams.get('orderId');
  const amount = parseFloat(searchParams.get('amount') || 0);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/payment' } });
    }
  }, [user, navigate]);

  const handlePayment = async () => {
    if (!orderId) {
      message.error('订单信息错误');
      return;
    }

    setLoading(true);
    try {
      // 模拟支付延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await api.post(`/orders/${orderId}/pay`);
      
      if (response.data.success) {
        message.success('支付成功！');
        setTimeout(() => {
          navigate('/orders');
        }, 1500);
      } else {
        message.error(response.data.message || '支付失败');
        setLoading(false);
      }
    } catch (error) {
      console.error('支付失败:', error);
      message.error(error.response?.data?.message || '支付失败，请重试');
      setLoading(false);
    }
  };

  const cancelPayment = () => {
    navigate(-1);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '40px 24px',
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Card style={{ 
        borderRadius: '24px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '60px 40px',
          color: '#fff',
          marginBottom: '40px'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>💳</div>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: 600,
            marginBottom: '20px',
            color: '#fff'
          }}>
            模拟支付
          </h2>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 700,
            marginBottom: '12px'
          }}>
            ¥{amount.toFixed(2)}
          </div>
          <p style={{ 
            fontSize: '16px',
            opacity: 0.9
          }}>
            点击下方按钮完成支付
          </p>
        </div>

        <div style={{
          background: '#f8f9fa',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: '1px solid #e8e8e8'
          }}>
            <span style={{ color: '#666', fontSize: '16px' }}>订单号：</span>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>ORD{orderId}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0'
          }}>
            <span style={{ color: '#666', fontSize: '16px' }}>支付金额：</span>
            <span style={{ 
              fontWeight: 700, 
              fontSize: '20px',
              color: '#ff4444'
            }}>
              ¥{amount.toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handlePayment}
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
            确认支付
          </Button>
          <Button
            size="large"
            block
            onClick={cancelPayment}
            style={{
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '12px',
              height: '50px',
              fontSize: '18px',
              color: '#666'
            }}
          >
            取消
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Payment;

