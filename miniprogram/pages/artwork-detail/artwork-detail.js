// pages/artwork-detail/artwork-detail.js
const api = require('../../utils/api.js');
const mockArtworks = require('../../utils/galleryWorksMock');
const { shouldHideFromMiniProgram } = require('../../utils/filters');

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
    artwork: null,
    loading: false
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.loadArtwork(id);
    }
  },

  async loadArtwork(id) {
    this.setData({ loading: true });
    try {
        const res = await api.get(`/artworks/${id}`);
        const artwork = res.data.artwork;
        const getSafeImageUrl = require('../../utils/getSafeImageUrl');
        if (artwork && artwork.imageUrl) {
          artwork.imageUrl = getSafeImageUrl(artwork.imageUrl);
        }

        if (shouldHideFromMiniProgram(artwork)) {
          wx.showToast({
            title: '该作品暂不在小程序展示',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
          return;
        }

        this.setData({
          artwork,
          loading: false
        });
    } catch (error) {
      console.error('加载作品失败:', error);
      // 如果是 mock 作品，使用本地 mock 数据
      if (isMockArtworkId(id)) {
        const mockArtwork = getMockArtworkById(id);
        if (mockArtwork) {
          const getSafeImageUrl = require('../../utils/getSafeImageUrl');
          if (mockArtwork.imageUrl) {
            mockArtwork.imageUrl = getSafeImageUrl(mockArtwork.imageUrl);
          }
          this.setData({
            artwork: mockArtwork,
            loading: false
          });
          return;
        }
      }
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  previewImage() {
    if (this.data.artwork && this.data.artwork.imageUrl) {
      wx.previewImage({
        urls: [this.data.artwork.imageUrl],
        current: this.data.artwork.imageUrl
      });
    }
  }
});

