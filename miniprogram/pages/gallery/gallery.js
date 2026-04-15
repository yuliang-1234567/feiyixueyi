// pages/gallery/gallery.js
const api = require('../../utils/api');
const { STORAGE_KEYS } = require('../../utils/constants');
const { shouldHideFromMiniProgram } = require('../../utils/filters');
const FAVORITE_KEY = STORAGE_KEYS.FAVORITE_ARTWORK_IDS;

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
    limit: 12,
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
      const favoriteIds = getFavoriteIds();

      const res = await api.get('/artworks', {
        page: this.data.page,
        limit: this.data.limit,
        status: 'published',
        ...(this.data.category ? { category: this.data.category } : {})
      });

      // 与 Web 端保持一致：success + data.artworks + data.pagination
      const ok = res?.success === true;
      // 兼容后端返回：{ success, data: { artworks, pagination } } 或 { success, data: { data: { artworks } } }
      const rawArtworks =
        (ok ? (res?.data?.artworks ?? res?.data?.data?.artworks) : res?.artworks) || [];
      const pagination =
        (ok ? (res?.data?.pagination ?? res?.data?.data?.pagination) : res?.pagination) || null;

      // 先把接口返回的数据全部展示出来：不做 mock、不做标签过滤
      const newArtworks = (Array.isArray(rawArtworks) ? rawArtworks : [])
        .map(item => {
          const normalizedId = item?.id ?? item?._id ?? item?.artworkId ?? '';
          const imageUrl = api.getImageUrl(item?.imageUrl || item?.coverUrl || item?.cover || '');
          return {
            ...item,
            id: normalizedId,
            imageUrl,
            isFavorited: favoriteIds.includes(normalizedId)
          };
        });

      const updatedArtworks =
        this.data.page === 1 ? newArtworks : [...this.data.artworks, ...newArtworks];

      const totalPages = Number(pagination?.pages || 0) || (pagination?.total ? Math.ceil(Number(pagination.total) / this.data.limit) : 0);
      const hasMore = totalPages ? this.data.page < totalPages : newArtworks.length >= this.data.limit;

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
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/artwork-detail/artwork-detail?id=${id}`,
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

