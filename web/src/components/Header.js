import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Input } from 'antd';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { HomeOutlined, BulbOutlined, ExperimentOutlined, ShopOutlined, UserOutlined, ShoppingCartOutlined, SearchOutlined, ReadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { cartUtils } from '../utils/cart';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const [cartCount, setCartCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 从 URL 同步搜索关键词（在搜索页时）
  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchKeyword(searchParams.get('q') || '');
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(cartUtils.getTotalCount());
    };
    updateCartCount();
    // 监听storage变化（跨标签页同步）
    window.addEventListener('storage', updateCartCount);
    // 定期更新（同标签页）
    const interval = setInterval(updateCartCount, 1000);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      clearInterval(interval);
    };
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/heritage-learn',
      icon: <ReadOutlined />,
      label: '学习非遗',
    },
    {
      key: '/learn',
      icon: <BulbOutlined />,
      label: 'AI学艺',
    },
    {
      key: '/transform',
      icon: <ExperimentOutlined />,
      label: '数字焕新',
    },
    {
      key: '/gallery',
      icon: <HomeOutlined />,
      label: '作品市',
    },
    {
      key: '/shop',
      icon: <ShopOutlined />,
      label: '文创商城',
    },
  ];

  const userMenuItems = [
    {
      key: 'artworks',
      icon: <HomeOutlined />,
      label: '我的作品',
    },
    {
      key: 'products',
      icon: <ShopOutlined />,
      label: '商品管理',
    },
    {
      key: 'orders',
      icon: <ShopOutlined />,
      label: '我的订单',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'logout',
      label: '退出登录',
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'artworks') {
      navigate('/artworks/me');
    } else if (key === 'products') {
      navigate('/products/me');
    } else if (key === 'orders') {
      navigate('/orders');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  return (
    <AntHeader className="immersive-header" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '0 32px',
      background: 'white',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 2px 12px rgba(139, 111, 71, 0.12)',
      borderBottom: '2px solid var(--border-brown)'
    }}>
      <div 
        style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onClick={() => navigate('/')}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          background: '#c8102e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 2px 8px rgba(200, 16, 46, 0.3)'
        }}>
          🎨
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#c8102e',
          letterSpacing: '0.5px'
        }}>
          非遗传承
        </div>
      </div>
      <Menu
        theme="light"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          minWidth: 0,
          borderBottom: 'none',
          background: 'transparent',
          fontSize: '15px',
          fontWeight: '500'
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', borderRadius: '8px', padding: '4px 12px' }}>
          <SearchOutlined style={{ fontSize: '18px', color: '#999' }} />
          <Input
            placeholder="搜索非遗项目、作品、商品..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{
              border: 'none',
              background: 'transparent',
              width: '200px',
              fontSize: '14px'
            }}
            onPressEnter={(e) => {
              const keyword = (e.target.value || searchKeyword).trim();
              navigate(`/search?q=${encodeURIComponent(keyword)}`);
            }}
            onClear={() => {
              setSearchKeyword('');
              navigate('/search?q=');
            }}
          />
        </div>
        <Button
          type="primary"
          style={{
            background: '#c8102e',
            border: 'none',
            borderRadius: '8px',
            height: '36px',
            padding: '0 20px',
            fontSize: '14px',
            fontWeight: '600'
          }}
          onClick={() => {
            const keyword = searchKeyword.trim();
            navigate(`/search?q=${encodeURIComponent(keyword)}`);
          }}
        >
          搜索
        </Button>
        <Badge count={cartCount} showZero={false} style={{
          backgroundColor: '#c8102e'
        }}>
          <Button
            type="text"
            icon={<ShoppingCartOutlined style={{ fontSize: '20px', color: '#333' }} />}
            onClick={() => navigate('/cart')}
            style={{
              color: '#333',
              fontSize: '20px',
              padding: '0 12px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        </Badge>
        {user ? (
          <Dropdown 
            menu={{ items: userMenuItems, onClick: handleMenuClick }} 
            placement="bottomRight"
            overlayStyle={{ borderRadius: '12px' }}
          >
            <Avatar 
              style={{ 
                cursor: 'pointer',
                border: '2px solid var(--primary-color)',
                boxShadow: '0 2px 8px rgba(139, 111, 71, 0.25)',
                transition: 'all 0.3s'
              }} 
              src={user.avatar}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 111, 71, 0.35)';
                e.currentTarget.style.borderColor = 'var(--accent-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 111, 71, 0.25)';
                e.currentTarget.style.borderColor = 'var(--primary-color)';
              }}
            >
              {user.username?.[0]?.toUpperCase()}
            </Avatar>
          </Dropdown>
        ) : (
          <>
            <Button 
              type="text" 
              onClick={() => navigate('/login')}
              style={{ 
                color: 'var(--primary-color)',
                fontWeight: '600',
                padding: '0 20px',
                height: '40px',
                borderRadius: '8px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 111, 71, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              登录
            </Button>
            <Button 
              type="primary" 
              onClick={() => navigate('/register')}
              style={{
                background: 'var(--gradient-primary)',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                padding: '0 24px',
                fontWeight: '600',
                color: 'white',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 111, 71, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 111, 71, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              注册
            </Button>
          </>
        )}
      </div>
    </AntHeader>
  );
};

export default Header;

