import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3100/api'
    : 'https://feiyixueyi.cn/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const authData = JSON.parse(token);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (e) {
        console.error('❌ [API] 解析token失败:', e);
      }
    }
    
    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔵 [API] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        headers: config.headers.Authorization ? '有Token' : '无Token',
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url} 成功`, {
        status: response.status,
        data: response.data,
      });
    }
    
    // 检查响应中的错误消息（即使状态码是200）
    if (response.data && response.data.success === false) {
      const errorMsg = response.data.message || '请求失败';
      // 如果是token过期相关的错误
      if (errorMsg.includes('过期') || errorMsg.includes('expired') || errorMsg.includes('重新登录')) {
        console.log('⚠️ [API] Token过期，清除认证信息');
        localStorage.removeItem('auth-storage');
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login?expired=true';
          }, 100);
        }
        return Promise.reject(new Error(errorMsg));
      }
    }
    
    return response;
  },
  (error) => {
    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ [API] ${error.config?.method?.toUpperCase()} ${error.config?.url} 失败`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
      });
    }
    
    // 401 未授权，清除认证信息并跳转到登录页
    if (error.response?.status === 401) {
      const errorMsg = error.response?.data?.message || '认证失败';
      console.log('⚠️ [API] 401错误，清除认证信息:', errorMsg);
      
      // 清除认证信息
      localStorage.removeItem('auth-storage');
      
      // 延迟跳转，避免在请求回调中直接跳转
      if (window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login?expired=true&message=' + encodeURIComponent(errorMsg);
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

