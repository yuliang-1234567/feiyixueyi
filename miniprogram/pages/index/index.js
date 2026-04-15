// pages/index/index.js
const api = require('../../utils/api.js');

function shouldHideFromMiniProgram(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return tags.includes('数字焕新') || tags.includes('文创产品');
}

const { WEB_IMAGES_BASE } = require('../../utils/config');

const LEARNING_RECORDS_KEY = 'learning_records_v1';

function getLearningRecords(limit = 6) {
  const raw = wx.getStorageSync(LEARNING_RECORDS_KEY);
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((x) => x && typeof x === 'object')
    .slice(0, limit)
    .map((x) => ({
      id: x.id || `rec-${Math.random().toString(16).slice(2)}`,
      skillName: x.skillName || '学艺记录',
      score: Number(x.score) || 0,
      createdAt: x.createdAt || '',
      imageUrl: x.imageUrl || ''
    }));
}

Page({
  data: {
    hero: {
      badge: '国家非物质文化遗产',
      title: '承古启今 智创未来',
      subtitle: '用 AI 学艺与数字化工具，让传统技艺更易学、更可传。',
      bgUrl: `${WEB_IMAGES_BASE}/backgrounds/home1-bg.png`
    },
    modules: [
      {
        id: 'learn',
        title: '学习非遗',
        desc: '从地域与项目入门，建立你的文化坐标',
        imageUrl: `${WEB_IMAGES_BASE}/home/modules/1.png`,
        url: '/pages/learn/learn',
        nav: 'tab'
      },
      {
        id: 'ai-learn',
        title: 'AI学艺',
        desc: '上传作品，获得相似度与改进建议',
        imageUrl: `${WEB_IMAGES_BASE}/home/modules/2.png`,
        url: '/pages/ai-learn/ai-learn',
        nav: 'tab'
      },
      {
        id: 'gallery',
        title: '作品库',
        desc: '浏览作品与工艺，收藏你的灵感',
        imageUrl: `${WEB_IMAGES_BASE}/home/modules/4.png`,
        url: '/pages/gallery/gallery',
        nav: 'tab'
      },
      {
        id: 'recognize',
        title: '图片识别',
        desc: '快速识别作品类别与元素',
        imageUrl: `${WEB_IMAGES_BASE}/home/modules/5.png`,
        url: '/pages/recognize/recognize',
        nav: 'nav'
      }
    ],
    recents: [],
    featuredArtworks: [],
    masters: []
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.setData({ recents: getLearningRecords(6) });
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    this.setData({
      recents: getLearningRecords(6)
    });

    // 加载推荐作品
    try {
      const artworkRes = await api.get('/artworks', {
        page: 1,
        limit: 6,
        status: 'published'
      });
      const ok = artworkRes?.success === true;
      const rawArtworks = (ok ? artworkRes?.data?.artworks : artworkRes?.artworks) || [];
      const featuredArtworks = (Array.isArray(rawArtworks) ? rawArtworks : [])
        .map(item => ({
          ...item,
          id: item?.id ?? item?._id ?? item?.artworkId ?? item?.id,
          imageUrl: api.getImageUrl(item?.imageUrl || item?.coverUrl || item?.cover || '')
        }));

      this.setData({
        featuredArtworks,
        masters: featuredArtworks.slice(0, 10)
      });
    } catch (error) {
      console.error('加载作品失败:', error);
    }

  },

  handleHeroPrimary() {
    wx.switchTab({ url: '/pages/learn/learn' });
  },

  handleHeroSecondary() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  navigateToGallery() {
    wx.switchTab({
      url: '/pages/gallery/gallery'
    });
  },

  navigateToRecognize() {
    wx.navigateTo({
      url: '/pages/recognize/recognize'
    });
  },

  navigateToFeature(e) {
    const url = e.currentTarget.dataset.url;
    const nav = e.currentTarget.dataset.nav;
    if (url) {
      // 对于 tabBar 页面，使用 switchTab
      if (
        nav === 'tab' ||
        url === '/pages/gallery/gallery' ||
        url === '/pages/profile/profile' ||
        url === '/pages/index/index' ||
        url === '/pages/learn/learn' ||
        url === '/pages/ai-learn/ai-learn'
      ) {
        wx.switchTab({ url });
      } else {
        wx.navigateTo({ url });
      }
    }
  },

  navigateToArtwork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/artwork-detail/artwork-detail?id=${id}`
    });
  },

  navigateToCategory(e) {
    const category = e.currentTarget.dataset.category;
    wx.switchTab({
      url: `/pages/gallery/gallery?category=${category}`
    });
  },

  goToAiLearn() {
    wx.switchTab({ url: '/pages/ai-learn/ai-learn' });
  }
});

