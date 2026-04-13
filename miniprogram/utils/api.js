/**
 * API工具类
 * 统一处理API请求和错误处理
 */

const DEFAULT_API_BASE_URL = 'https://feiyixueyi.cn/api';

function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL;
}

/**
 * 处理401错误 - token过期
 */
function handle401Error() {
  // 清除token和用户信息
  wx.removeStorageSync('token');
  wx.removeStorageSync('user');
  
  // 获取当前页面路径
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const currentRoute = currentPage ? currentPage.route : '';
  
  // 排除登录页和首页，避免循环跳转
  const excludePages = ['pages/login/login', 'pages/index/index'];
  const isExcluded = excludePages.some(page => currentRoute.includes(page));
  
  if (!isExcluded) {
    // 延迟跳转，避免在请求回调中直接跳转
    setTimeout(() => {
      wx.showModal({
        title: '登录已过期',
        content: '您的登录已过期，请重新登录',
        showCancel: false,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?redirect=' + encodeURIComponent('/' + currentRoute)
            });
          }
        }
      });
    }, 100);
  }
}

/**
 * 请求封装
 */
function request(options) {
  return new Promise((resolve, reject) => {
    // 自动添加token
    const token = wx.getStorageSync('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.header
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      url: getApiBaseUrl() + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: headers,
      success: (res) => {
        console.log(`[API] ${options.method || 'GET'} ${options.url}`, {
          statusCode: res.statusCode,
          data: res.data
        });

        if (res.statusCode === 200 || res.statusCode === 201) {
          // 如果后端返回 { success: true, data: {...} }，直接返回 res.data
          if (res.data && res.data.success !== undefined) {
            if (res.data.success) {
              resolve(res.data);
            } else {
              const errorMsg = res.data.message || '请求失败';
              console.error('[API] 请求失败:', errorMsg);
              
              // 检查是否是token过期
              if (errorMsg.includes('过期') || errorMsg.includes('expired')) {
                handle401Error();
              }
              
              reject(new Error(errorMsg));
            }
          } else {
            // 如果后端直接返回数据，也返回 res.data
            resolve(res.data);
          }
        } else if (res.statusCode === 401) {
          // 未授权，处理token过期
          const errorMsg = res.data?.message || '认证失败';
          console.warn('[API] 401未授权:', errorMsg);
          
          handle401Error();
          
          reject(new Error(errorMsg));
        } else if (res.statusCode >= 400 && res.statusCode < 500) {
          // 客户端错误
          const errorMsg = res.data?.message || `请求失败: ${res.statusCode}`;
          console.error('[API] 客户端错误:', errorMsg);
          reject(new Error(errorMsg));
        } else {
          // 服务器错误
          const errorMsg = res.data?.message || `服务器错误: ${res.statusCode}`;
          console.error('[API] 服务器错误:', errorMsg);
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        console.error('[API] 网络请求失败:', err);
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
        reject(new Error(err.errMsg || '网络错误'));
      }
    });
  });
}

/**
 * GET请求
 */
function get(url, data = {}, headers = {}) {
  return request({
    url,
    method: 'GET',
    data,
    header: headers
  });
}

/**
 * POST请求
 */
function post(url, data = {}) {
  return request({
    url,
    method: 'POST',
    data
  });
}

/**
 * PUT请求
 */
function put(url, data = {}) {
  return request({
    url,
    method: 'PUT',
    data
  });
}

/**
 * DELETE请求
 */
function del(url, data = {}) {
  return request({
    url,
    method: 'DELETE',
    data
  });
}

/**
 * 构建图片URL
 */
function getImageUrl(imagePath) {
  if (!imagePath) {
    return '';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = getApiBaseUrl().replace('/api', '');
  return baseUrl + (imagePath.startsWith('/') ? imagePath : '/' + imagePath);
}

module.exports = {
  get,
  post,
  put,
  del,
  getImageUrl
};

