import React from 'react';
import { Spin } from 'antd';

/**
 * 加载状态组件
 * 用于展示数据加载中的状态
 */
const LoadingState = ({ 
  tip = '加载中...', 
  size = 'large',
  fullScreen = false,
  style = {}
}) => {
  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        ...style
      }}>
        <Spin tip={tip} size={size} />
      </div>
    );
  }

  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      ...style
    }}>
      <Spin tip={tip} size={size} />
    </div>
  );
};

export default LoadingState;

