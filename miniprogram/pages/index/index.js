// pages/index/index.js
const api = require('../../utils/api.js');

function shouldHideFromMiniProgram(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return tags.includes('数字焕新') || tags.includes('文创产品');
}

const STATIC_IMAGE_BASE_URL = 'https://feiyixueyi.cn/uploads/images';

// 24节气名称
const SOLAR_TERMS = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑",
  "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
];

// 画作名称（可自定义）
const PAINTING_NAMES = [
  "水仙", "兰花", "迎春花", "玉兰花", "黄鹂桃花", "燕归来", "杜鹃杏花图", "牡丹图",
  "紫藤花", "石榴花", "荷花", "竹影", "荷塘清趣", "向日葵", "菊花", "桂花",
  "芙蓉", "枫叶", "菊花石", "柿子", "梅花", "雪松", "腊梅", "瑞雪"
];

const generateSolarTermImages = () => {
  return SOLAR_TERMS.map((term, i) => ({
    id: i + 1,
    src: `${STATIC_IMAGE_BASE_URL}/categories/categories${String(i + 1).padStart(3, '0')}.jpg`,
    title: term,
    fullTitle: `${term}·${PAINTING_NAMES[i]}`,
    source: "中国非物质文化遗产保护中心",
    author: "丁鼎",
    createTime: "2025.03.26"
  }));
};

const HOME_IMAGES = generateSolarTermImages();

Page({
  data: {
    // 轮播图相关
    images: HOME_IMAGES,
    currentIndex: 0,
    totalImages: HOME_IMAGES.length,
    visibleThumbnails: [],
    thumbnailScrollLeft: 0,
    
    categories: [
      { id: '剪纸', name: '剪纸', icon: '✂️' },
      { id: '刺绣', name: '刺绣', icon: '🧵' },
      { id: '泥塑', name: '泥塑', icon: '🏺' },
      { id: '其他', name: '其他', icon: '🎨' }
    ],
    features: [
      { id: 'gallery', name: '作品展示', icon: '🖼️', url: '/pages/gallery/gallery' },
      { id: 'recognize', name: '图片识别', icon: '📷', url: '/pages/recognize/recognize' },
      { id: 'learn-map', name: '非遗地图', icon: '🗺️', url: '/pages/learn/learn' },
      { id: 'ai-learn', name: '学艺', icon: '🤖', url: '/pages/ai-learn/ai-learn' }
    ],
    featuredArtworks: []
  },

  // 计算当前图片
  getCurrentImage() {
    return this.data.images[this.data.currentIndex] || this.data.images[0];
  },

  // 计算要显示的缩略图范围（始终显示5个，选中项居中）
  getVisibleThumbnails() {
    const visibleCount = 5;
    const halfCount = Math.floor(visibleCount / 2);
    const indices = [];
    const currentIndex = this.data.currentIndex;
    const totalImages = this.data.totalImages;

    for (let i = -halfCount; i <= halfCount; i++) {
      let index = currentIndex + i;
      if (index < 0) {
        index = totalImages + index;
      } else if (index >= totalImages) {
        index = index - totalImages;
      }
      indices.push(index);
    }

    return indices.map(index => ({
      index,
      ...this.data.images[index]
    }));
  },

  // 切换到上一张
  goToPrevious() {
    const currentIndex = this.data.currentIndex;
    const newIndex = currentIndex === 0 ? this.data.totalImages - 1 : currentIndex - 1;
    this.setData({ currentIndex: newIndex });
    this.updateThumbnails();
  },

  // 切换到下一张
  goToNext() {
    const currentIndex = this.data.currentIndex;
    const newIndex = currentIndex === this.data.totalImages - 1 ? 0 : currentIndex + 1;
    this.setData({ currentIndex: newIndex });
    this.updateThumbnails();
  },

  // 跳转到指定图片
  goToImage(e) {
    const index = e.currentTarget.dataset.index;
    if (index !== undefined && index !== this.data.currentIndex) {
      this.setData({ currentIndex: index });
      this.updateThumbnails();
    }
  },

  // 更新缩略图显示
  updateThumbnails() {
    const visibleThumbnails = this.getVisibleThumbnails();
    this.setData({ visibleThumbnails });
    
    // 计算滚动位置，使选中项居中
    const thumbnailWidth = 120; // rpx，需要转换为px
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const screenWidth = windowInfo.windowWidth;
    const rpxRatio = screenWidth / 750;
    const thumbnailWidthPx = thumbnailWidth * rpxRatio;
    const centerIndex = Math.floor(visibleThumbnails.length / 2);
    const scrollLeft = centerIndex * thumbnailWidthPx - screenWidth / 2 + thumbnailWidthPx / 2;
    
    this.setData({
      thumbnailScrollLeft: Math.max(0, scrollLeft)
    });
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    // 加载推荐作品
    try {
      const artworkRes = await api.get('/artworks', {
        page: 1,
        limit: 6,
        status: 'published'
      });
      const rawArtworks = artworkRes.data.artworks || artworkRes.data.data?.artworks || [];
      this.setData({
        featuredArtworks: rawArtworks
          .filter(item => !shouldHideFromMiniProgram(item))
          .map(item => ({
          ...item,
          imageUrl: api.getImageUrl(item.imageUrl)
        }))
      });
    } catch (error) {
      console.error('加载作品失败:', error);
    }

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
    if (url) {
      // 对于 tabBar 页面，使用 switchTab
      if (url === '/pages/gallery/gallery' || url === '/pages/profile/profile' || url === '/pages/index/index' || url === '/pages/learn/learn' || url === '/pages/ai-learn/ai-learn') {
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
  }
});

