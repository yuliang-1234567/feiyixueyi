import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Input } from 'antd';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  BookOpenText,
  Home,
  Palette,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  User,
  Wand2,
} from "lucide-react";
import { useAuthStore } from '../store/authStore';
import { cartUtils } from '../utils/cart';
import { LucideIcon } from "./icons/lucide";
import "./Header.css";

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
      icon: <LucideIcon icon={Home} />,
      label: '首页',
    },
    {
      key: '/heritage-learn',
      icon: <LucideIcon icon={BookOpenText} />,
      label: '学习非遗',
    },
    {
      key: '/learn',
      icon: <LucideIcon icon={Sparkles} />,
      label: 'AI学艺',
    },
    {
      key: '/transform',
      icon: <LucideIcon icon={Wand2} />,
      label: '数字焕新',
    },
    {
      key: '/heritage-sketch',
      icon: <LucideIcon icon={Palette} />,
      label: '一笔成纹',
    },
    {
      key: '/gallery',
      icon: <LucideIcon icon={Home} />,
      label: '作品市',
    },
    {
      key: '/shop',
      icon: <LucideIcon icon={Store} />,
      label: '文创商城',
    },
  ];

  const userMenuItems = [
    {
      key: 'artworks',
      icon: <LucideIcon icon={Home} />,
      label: '我的作品',
    },
    {
      key: 'products',
      icon: <LucideIcon icon={Store} />,
      label: '商品管理',
    },
    {
      key: 'orders',
      icon: <LucideIcon icon={Store} />,
      label: '我的订单',
    },
    {
      key: 'profile',
      icon: <LucideIcon icon={User} />,
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
    <AntHeader className="immersive-header">
      <button type="button" className="header-brand" onClick={() => navigate('/')}>
        <span className="header-logoMark" aria-hidden="true">
          <LucideIcon icon={Palette} size={20} strokeWidth={1.6} />
        </span>
        <span className="header-title">非遗传承</span>
      </button>
      <Menu
        theme="light"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        className="header-menu"
      />
      <div className="header-actions">
        <div className="header-search">
          <LucideIcon icon={Search} className="header-search-icon" />
          <Input
            placeholder="搜索非遗项目、作品、商品..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            className="header-searchInput"
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
          className="header-searchBtn"
          onClick={() => {
            const keyword = searchKeyword.trim();
            navigate(`/search?q=${encodeURIComponent(keyword)}`);
          }}
        >
          搜索
        </Button>
        <Badge count={cartCount} showZero={false} className="header-cartBadge">
          <Button
            type="text"
            icon={<LucideIcon icon={ShoppingCart} className="header-cart-icon" />}
            onClick={() => navigate('/cart')}
            className="header-cartBtn"
          />
        </Badge>
        {user ? (
          <Dropdown 
            menu={{ items: userMenuItems, onClick: handleMenuClick }} 
            placement="bottomRight"
            overlayStyle={{ borderRadius: '12px' }}
          >
            <Avatar 
              className="header-avatar"
              src={user.avatar}
            >
              {user.username?.[0]?.toUpperCase()}
            </Avatar>
          </Dropdown>
        ) : (
          <>
            <Button 
              type="text" 
              onClick={() => navigate('/login')}
              className="header-loginBtn"
            >
              登录
            </Button>
            <Button 
              type="primary" 
              onClick={() => navigate('/register')}
              className="header-registerBtn"
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

