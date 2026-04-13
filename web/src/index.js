import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

// 设置 body 背景图片
const setBodyBackground = () => {
  const bgImageUrl = `${process.env.PUBLIC_URL || ''}/images/backgrounds/homeBg.png`;
  document.body.style.backgroundImage = `url(${bgImageUrl})`;
  document.body.style.backgroundRepeat = 'repeat';
  document.body.style.backgroundSize = 'auto';
  document.body.style.backgroundAttachment = 'fixed';
  document.body.style.backgroundPosition = '0 0';
};

// 动态加载华文行楷字体
const loadFont = () => {
  const fontUrl = `${process.env.PUBLIC_URL || ''}/fonts/华文行楷.ttf`;
  const fontFace = new FontFace('华文行楷', `url(${fontUrl})`, {
    style: 'normal',
    weight: 'normal',
    display: 'swap'
  });
  
  fontFace.load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    console.log('✅ 华文行楷字体加载成功');
  }).catch((error) => {
    console.error('❌ 华文行楷字体加载失败:', error);
  });
};

// 初始化认证状态
const initApp = async () => {
  try {
    const { initAuth } = useAuthStore.getState();
    await initAuth();
    console.log('✅ 应用初始化完成');
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
  }
};

// 设置背景图片
setBodyBackground();

// 加载字体
loadFont();

// 初始化应用
initApp();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);

