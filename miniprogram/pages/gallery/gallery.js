// pages/gallery/gallery.js
const mockData = require('../../utils/galleryWorksMock');
const FAVORITE_KEY = 'favorite_artwork_ids_v1';

function getFavoriteIds() {
  const value = wx.getStorageSync(FAVORITE_KEY);
  return Array.isArray(value) ? value : [];
}

Page({
  data: {
    artworks: [],
    category: '',
    categories: [
      { id: '', name: '全部' },
      { id: '剪纸', name: '剪纸' },
      { id: '刺绣', name: '刺绣' },
      { id: '泥塑', name: '泥塑' },
      { id: '其他', name: '其他' }
    ],
    page: 1,
    limit: 20,
    loading: false,
    hasMore: true
  },

  onLoad(options) {
    if (options.category) {
      this.setData({ category: options.category });
    }
    this.loadArtworks();
  },

  onShow() {
    if (this.data.artworks.length) {
      const favoriteIds = getFavoriteIds();
      const artworks = this.data.artworks.map(item => ({
        ...item,
        isFavorited: favoriteIds.includes(item.id)
      }));
      this.setData({ artworks });
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      artworks: [],
      hasMore: true
    });
    this.loadArtworks().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  async loadArtworks() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const artworksList = this.data.category
        ? mockData.filter(item => item.category === this.data.category)
        : mockData;

      const start = (this.data.page - 1) * this.data.limit;
      const end = start + this.data.limit;
      const pagedList = artworksList.slice(start, end);
      const favoriteIds = getFavoriteIds();
      const getSafeImageUrl = require('../../utils/getSafeImageUrl');
      const newArtworks = pagedList.map(item => ({
        ...item,
        imageUrl: getSafeImageUrl(item.imageUrl),
        isFavorited: favoriteIds.includes(item.id)
      }));
      
      // 如果是第一页，则替换作品列表；否则追加
      const updatedArtworks = this.data.page === 1 ? newArtworks : [...this.data.artworks, ...newArtworks];
      
      const hasMore = end < artworksList.length;
      
      this.setData({
        artworks: updatedArtworks,
        hasMore: hasMore,
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

  loadMore() {
    this.setData({
      page: this.data.page + 1
    });
    this.loadArtworks();
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      category: category,
      page: 1,
      artworks: [],
      hasMore: true
    });
    this.loadArtworks();
  },

  navigateToDetail(e) {
    console.log('点击事件触发，e:', e);
    const id = e.currentTarget.dataset.id;
    console.log('准备跳转到作品详情页，id:', id);
    wx.navigateTo({
      url: `/pages/artwork-detail/artwork-detail?id=${id}`,
      success: function(res) {
        console.log('跳转成功:', res);
      },
      fail: function(err) {
        console.log('跳转失败:', err);
      }
    });
  },

  toggleFavorite(e) {
    const artworkId = e.currentTarget.dataset.id;
    const artworks = [...this.data.artworks];
    const index = artworks.findIndex(item => String(item.id) === String(artworkId));
    if (index < 0) return;

    const favoriteIds = getFavoriteIds();
    const idAsString = String(artworkId);
    const exists = favoriteIds.some(id => String(id) === idAsString);

    let nextIds;
    if (exists) {
      nextIds = favoriteIds.filter(id => String(id) !== idAsString);
    } else {
      nextIds = [artworkId, ...favoriteIds];
    }
    wx.setStorageSync(FAVORITE_KEY, nextIds);

    artworks[index].isFavorited = !exists;
    this.setData({ artworks });

    wx.showToast({
      title: exists ? '已取消收藏' : '收藏成功',
      icon: 'none'
    });
  }
});

