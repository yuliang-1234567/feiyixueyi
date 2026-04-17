import { create } from 'zustand';
import api from '../utils/api';

// 从localStorage加载初始状态
const loadAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return {
        user: data.state?.user || null,
        token: data.state?.token || null,
      };
    }
  } catch (e) {
    console.error('❌ 加载认证信息失败:', e);
  }
  return { user: null, token: null };
};

// 保存到localStorage
const saveAuthToStorage = (user, token) => {
  try {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: { user, token },
      })
    );
    console.log('✅ 认证信息已保存到localStorage');
  } catch (e) {
    console.error('❌ 保存认证信息失败:', e);
  }
};

const { user: initialUser, token: initialToken } = loadAuthFromStorage();

// 初始化API headers
if (initialToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
  console.log('✅ API headers 已初始化');
}

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!initialUser && !!initialToken,

  login: async (email, password, loginType = 'user') => {
    try {
      console.log('🔐 [Login] 开始登录请求...', { email });
      const response = await api.post('/auth/login', { email, password, loginType });
      console.log('🔐 [Login] API响应:', response.data);

      if (response.data && response.data.success) {
        const { user, token } = response.data.data;
        console.log('✅ [Login] 登录成功，用户信息:', user);

        // 更新状态
        set({
          user,
          token,
          isAuthenticated: true,
        });

        // 设置API请求头
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // 保存到localStorage
        saveAuthToStorage(user, token);

        // 验证状态已更新
        const currentState = get();
        console.log('✅ [Login] 状态已更新:', {
          user: currentState.user,
          token: !!currentState.token,
          isAuthenticated: currentState.isAuthenticated,
        });

        return { success: true, user, token };
      }

      const errorMsg = response.data?.message || '登录失败，请检查账号和密码';
      console.error('❌ [Login] 登录失败:', errorMsg);
      return { success: false, message: errorMsg };
    } catch (error) {
      console.error('❌ [Login] 登录异常:', error);
      console.error('错误详情:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMsg = '登录失败，请稍后重试';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (error.response?.status === 401) {
        errorMsg = '邮箱或密码错误';
      } else if (error.response?.status === 500) {
        errorMsg = '服务器错误，请稍后重试';
      } else if (!error.response) {
        errorMsg = '网络错误，请检查网络连接';
      }

      return { success: false, message: errorMsg };
    }
  },

  register: async (username, email, password) => {
    try {
      console.log('📝 [Register] 开始注册请求...', { username, email });
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });
      console.log('📝 [Register] API响应:', response.data);

      if (response.data && response.data.success) {
        const { user, token } = response.data.data;
        console.log('✅ [Register] 注册成功，用户信息:', user);

        set({
          user,
          token,
          isAuthenticated: true,
        });

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        saveAuthToStorage(user, token);

        return { success: true, user, token };
      }

      const errorMsg = response.data?.message || '注册失败';
      console.error('❌ [Register] 注册失败:', errorMsg);
      return { success: false, message: errorMsg };
    } catch (error) {
      console.error('❌ [Register] 注册异常:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        '注册失败，请稍后重试';
      return { success: false, message: errorMsg };
    }
  },

  logout: () => {
    console.log('👋 [Logout] 用户登出');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth-storage');
    console.log('✅ [Logout] 登出完成');
  },

  fetchCurrentUser: async () => {
    try {
      console.log('👤 [FetchUser] 获取当前用户信息...');
      const response = await api.get('/auth/me');
      console.log('👤 [FetchUser] API响应:', response.data);

      if (
        response.data &&
        response.data.success &&
        response.data.data?.user
      ) {
        const currentUser = response.data.data.user;
        console.log('✅ [FetchUser] 更新用户信息:', currentUser);
        const { token } = get();

        set({
          user: currentUser,
          isAuthenticated: true,
        });

        saveAuthToStorage(currentUser, token);

        return { success: true, user: currentUser };
      }

      const errorMsg = response.data?.message || '获取用户信息失败';
      console.error('❌ [FetchUser] 获取用户信息失败:', errorMsg);
      return { success: false, message: errorMsg };
    } catch (error) {
      console.error('❌ [FetchUser] 获取用户信息异常:', error);

      // 如果是401错误，清除认证信息
      if (error.response?.status === 401) {
        console.log('⚠️ [FetchUser] 401错误，清除认证信息');
        get().logout();
      }

      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        '获取用户信息失败';

      return {
        success: false,
        message: errorMsg,
      };
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    const { token } = get();
    if (token) {
      saveAuthToStorage(user, token);
    }
  },

  initAuth: async () => {
    const { token, user } = get();
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('🔄 [InitAuth] API headers 已设置');
      // 如果只有token但没有用户信息，尝试获取用户信息
      if (!user) {
        console.log('🔄 [InitAuth] 获取用户信息...');
        await get().fetchCurrentUser();
      }
    }
  },
}));
