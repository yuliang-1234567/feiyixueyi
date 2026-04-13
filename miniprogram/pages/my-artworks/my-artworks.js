// pages/my-artworks/my-artworks.js
const api = require('../../utils/api.js');
const mockArtworks = require('../../utils/galleryWorksMock');

// 检查是否是 mock 作品
function isMockArtworkId(id) {
  return typeof id === 'string' && id.startsWith('mock-');
}

// 根据 id 获取 mock 作品
function getMockArtworkById(id) {
  if (!id) return null;
  const found = mockArtworks.find((a) => String(a.id) === String(id));
  return found ? { ...found, isLiked: false } : null;
}

Page({
  data: {
    artworks: [],
    loading: false
  },

  onLoad() {
    this.loadArtworks();
  },

  onPullDownRefresh() {
    this.loadArtworks().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadArtworks() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/login/login?redirect=${encodeURIComponent('/pages/my-artworks/my-artworks')}`
        });
      }, 400);
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await api.get('/artworks/me/list');
      let artworks = res.data?.artworks || res.data?.data?.artworks || [];
      const getSafeImageUrl = require('../../utils/getSafeImageUrl');
      
      // 处理作品数据，对于 mock 作品，使用完整的 mock 数据
      artworks = artworks.map(item => {
        if (isMockArtworkId(item.id)) {
          const mockArtwork = getMockArtworkById(item.id);
          if (mockArtwork) {
            return {
              ...mockArtwork
            };
          }
        }
        return {
          ...item,
          imageUrl: getSafeImageUrl(item.imageUrl)
        };
      });
      
      this.setData({
        artworks: artworks,
        loading: false
      });
    } catch (error) {
      console.error('加载作品失败:', error);
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

