import React from 'react';
import { Breadcrumb } from 'antd';
import { Home } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { LucideIcon } from "./icons/lucide";

/**
 * 面包屑导航组件
 * 用于显示当前页面在网站中的位置
 */
const BreadcrumbNav = ({ items = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 路由到标题的映射
  const routeMap = {
    '/': '首页',
    '/heritage-learn': '学习非遗',
    '/learn': 'AI学艺',
    '/transform': '数字焕新',
    '/gallery': '作品库',
    '/shop': '文创商城',
    '/cart': '购物车',
    '/orders': '我的订单',
    '/profile': '个人中心',
    '/artworks/me': '我的作品',
    '/products/me': '商品管理',
  };

  // 如果没有传入items，自动根据路由生成
  const breadcrumbItems = items.length > 0 ? items : (() => {
    const paths = location.pathname.split('/').filter(Boolean);
    const result = [
      {
        title: (
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <LucideIcon icon={Home} /> 首页
          </span>
        ),
      },
    ];

    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const title = routeMap[currentPath] || path;
      if (index === paths.length - 1) {
        result.push({ title });
      } else {
        result.push({
          title: (
            <span onClick={() => navigate(currentPath)} style={{ cursor: 'pointer' }}>
              {title}
            </span>
          ),
        });
      }
    });

    return result;
  })();

  return (
    <Breadcrumb
      items={breadcrumbItems}
      style={{
        marginBottom: '24px',
        padding: '12px 0',
      }}
      separator=">"
    />
  );
};

export default BreadcrumbNav;

