// pages/profile/profile.js
const api = require('../../utils/api.js');
const { IMAGES_BASE } = require('../../utils/config');
const { STORAGE_KEYS } = require('../../utils/constants');
const DEFAULT_AVATAR_URL = `${IMAGES_BASE}/categories/background.jpg`;
const FAVORITE_KEY = STORAGE_KEYS.FAVORITE_ARTWORK_IDS;

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    displayName: '',
    displayEmail: '',
    avatar: DEFAULT_AVATAR_URL,
    stats: {
      learningRecords: 0,
      likes: 0
    },
    token: null
  },

  onLoad() {
    this.checkLogin();
    this.loadStats();
  },

  onShow() {
    this.checkLogin();
    this.loadStats();
  },

  checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({ token });
      const storedUser = wx.getStorageSync('user');
      if (storedUser) {
        this.updateUserInfo(storedUser);
      } else {
        this.fetchCurrentUser();
      }
    } else {
      this.setData({ token: null });
      this.updateUserInfo(null);
    }
  },

  async fetchCurrentUser() {
    try {
      const res = await api.get('/auth/me');
      const user = res.data?.user || res.user;
      if (user) {
        wx.setStorageSync('user', user);
        this.updateUserInfo(user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  updateUserInfo(user) {
    if (user) {
      const displayName = user.nickname || user.nickName || user.username || (user.email ? user.email.split('@')[0] : '') || '非遗用户';
      const avatar = user.avatar || user.avatarUrl || DEFAULT_AVATAR_URL;
      this.setData({
        userInfo: user,
        hasUserInfo: true,
        displayName,
        displayEmail: user.email || '',
        avatar
      });
    } else {
      this.setData({
        userInfo: null,
        hasUserInfo: false,
        displayName: '',
        displayEmail: '',
        avatar: DEFAULT_AVATAR_URL
      });
    }
  },

  async loadStats() {
    const learningRecords = wx.getStorageSync(STORAGE_KEYS.LEARNING_RECORDS);
    const favorites = wx.getStorageSync(FAVORITE_KEY);
    const learningCount = Array.isArray(learningRecords) ? learningRecords.length : 0;
    const likesCount = Array.isArray(favorites) ? favorites.length : 0;

    this.setData({
      'stats.learningRecords': learningCount,
      'stats.likes': likesCount
    });
  },

  navigateToMyArtworks() {
    if (!this.data.token) {
      this.redirectToLogin('/pages/my-artworks/my-artworks');
      return;
    }
    wx.navigateTo({
      url: '/pages/my-artworks/my-artworks'
    });
  },

  navigateToMyLikes() {
    wx.navigateTo({
      url: '/pages/my-likes/my-likes'
    });
  },

  navigateToMyLearning() {
    wx.navigateTo({
      url: '/pages/my-learning/my-learning'
    });
  },

  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  navigateToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  handleLogin() {
    if (!this.data.token) {
      this.redirectToLogin('/pages/profile/profile');
    }
  },

  redirectToLogin(redirectPath) {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/login/login?redirect=${encodeURIComponent(redirectPath)}`
      });
    }, 400);
  }
});
