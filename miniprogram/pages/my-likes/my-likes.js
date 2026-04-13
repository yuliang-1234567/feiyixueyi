// pages/my-likes/my-likes.js
const mockData = require('../../utils/galleryWorksMock');
const FAVORITE_KEY = 'favorite_artwork_ids_v1';

function getFavoriteIds() {
  const value = wx.getStorageSync(FAVORITE_KEY);
  return Array.isArray(value) ? value : [];
}

Page({
  data: {
    likes: [],
    loading: false
  },

  onLoad() {
    this.loadLikes();
  },

  onShow() {
    this.loadLikes();
  },

  onPullDownRefresh() {
    this.loadLikes().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadLikes() {
    this.setData({ loading: true });
    try {
      const favoriteIds = getFavoriteIds().map(id => String(id));
      const getSafeImageUrl = require('../../utils/getSafeImageUrl');
      const likes = mockData
        .filter(item => favoriteIds.includes(String(item.id)))
        .map(item => ({
          ...item,
          imageUrl: getSafeImageUrl(item.imageUrl)
        }));
      this.setData({
        likes,
        loading: false
      });
    } catch (error) {
      console.error('加载收藏失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/artwork-detail/artwork-detail?id=${id}`
    });
  }
});

