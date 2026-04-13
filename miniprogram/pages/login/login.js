const api = require('../../utils/api.js');

Page({
  data: {
    email: '',
    password: '',
    loading: false,
    redirect: ''
  },

  onLoad(options) {
    if (options?.redirect) {
      this.setData({ redirect: options.redirect });
    }
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value.trim() });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  async handleSubmit() {
    if (!this.data.email) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }
    if (!this.data.password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await api.post('/auth/login', {
        email: this.data.email,
        password: this.data.password
      });

      const token =
        res.token ||
        res.data?.token ||
        res.data?.data?.token ||
        res.data?.accessToken ||
        res.data?.data?.accessToken;

      const user =
        res.user ||
        res.data?.user ||
        res.data?.data?.user ||
        res.data?.profile;

      if (!token) {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
        return;
      }

      wx.setStorageSync('token', token);
      if (user) {
        wx.setStorageSync('user', user);
      }

      wx.showToast({ title: '登录成功', icon: 'success' });

      setTimeout(() => {
        const redirectPath = this.data.redirect ? decodeURIComponent(this.data.redirect) : '';
        const tabPages = [
          '/pages/index/index',
          '/pages/gallery/gallery',
          '/pages/ar/ar',
          '/pages/profile/profile'
        ];

        if (this.data.redirect) {
          if (tabPages.includes(redirectPath)) {
            wx.switchTab({ url: redirectPath });
          } else {
            wx.redirectTo({ url: redirectPath });
          }
        } else {
          wx.switchTab({ url: '/pages/profile/profile' });
        }
      }, 500);
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({ title: error.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  navigateToRegister() {
    wx.showToast({
      title: '请在网页端完成注册',
      icon: 'none'
    });
  }
});
