import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';

/**
 * 回到顶部按钮组件
 * 当页面滚动超过一定距离时显示
 */
const BackToTop = ({ 
  visibilityHeight = 400,
  duration = 500 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setVisible(scrollTop > visibilityHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibilityHeight]);

  const scrollToTop = () => {
    const start = window.pageYOffset;
    const startTime = performance.now();

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeInOutCubic = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      window.scrollTo(0, start * (1 - easeInOutCubic));

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  if (!visible) return null;

  return (
    <Button
      type="primary"
      shape="circle"
      icon={<ArrowUpOutlined />}
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '40px',
        width: '56px',
        height: '56px',
        fontSize: '20px',
        zIndex: 999,
        background: 'var(--gradient-primary)',
        border: 'none',
        boxShadow: 'var(--shadow-lg)',
        transition: 'all var(--transition-base)',
        animation: 'fadeInUp 0.3s ease-out'
      }}
      className="back-to-top-btn"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
    />
  );
};

export default BackToTop;

