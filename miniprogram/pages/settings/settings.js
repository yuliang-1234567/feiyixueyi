// pages/settings/settings.js
Page({
  data: {
    settings: {
      notifications: true,
      autoPlay: true
    }
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const settings = wx.getStorageSync('settings') || {};
    this.setData({ settings: { ...this.data.settings, ...settings } });
  },

  toggleSetting(e) {
    const key = e.currentTarget.dataset.key;
    const value = !this.data.settings[key];
    this.setData({
      [`settings.${key}`]: value
    });
    wx.setStorageSync('settings', this.data.settings);
  },

  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: '清除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('user');
          wx.showToast({
            title: '已退出',
            icon: 'success'
          });
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }, 1500);
        }
      }
    });
  }
});

