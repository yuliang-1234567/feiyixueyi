// pages/gallery/gallery.js
const api = require('../../utils/api');
const { STORAGE_KEYS } = require('../../utils/constants');
const { shouldHideFromMiniProgram } = require('../../utils/filters');
const FAVORITE_KEY = STORAGE_KEYS.FAVORITE_ARTWORK_IDS;

function normalizeId(value) {
  return String(value || '');
}

function getFavoriteIds() {
  const value = wx.getStorageSync(FAVORITE_KEY);
  return Array.isArray(value) ? value.map(normalizeId).filter(Boolean) : [];
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

  async syncLocalFavoritesToBackend() {
    const token = wx.getStorageSync('token');
    if (!token) return;
    if (this._favoriteSyncing) return;

    const localFavoriteIds = getFavoriteIds();
    if (!localFavoriteIds.length) return;

    this._favoriteSyncing = true;
    try {
      const likesRes = await api.get('/artworks/me/likes', { page: 1, limit: 200 });
      const serverLikes = likesRes?.data?.likes || [];
      const serverIdSet = new Set(
        (Array.isArray(serverLikes) ? serverLikes : [])
          .map((item) => normalizeId(item?.id))
          .filter(Boolean)
      );

      const missingOnServer = localFavoriteIds.filter((id) => !serverIdSet.has(id));
      for (const id of missingOnServer) {
        try {
          await api.post(`/artworks/${id}/like`);
        } catch (syncError) {
          console.warn('同步单个收藏失败:', id, syncError?.message || syncError);
        }
      }
    } catch (error) {
      console.warn('同步本地收藏到后端失败:', error?.message || error);
    } finally {
      this._favoriteSyncing = false;
    }
  },

  onLoad(options) {
    if (options.category) {
      this.setData({ category: options.category });
    }
    this.syncLocalFavoritesToBackend();
    this.loadArtworks();
  },

  onShow() {
    if (this.data.artworks.length) {
      const favoriteIdSet = new Set(getFavoriteIds());
      const artworks = this.data.artworks.map(item => ({
        ...item,
        isFavorited: favoriteIdSet.has(normalizeId(item.id))
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
      const favoriteIdSet = new Set(getFavoriteIds());

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
          const normalizedId = normalizeId(item?.id ?? item?._id ?? item?.artworkId);
          const imageUrl = api.getImageUrl(item?.imageUrl || item?.coverUrl || item?.cover || '');
          return {
            ...item,
            id: normalizedId,
            imageUrl,
            isFavorited: favoriteIdSet.has(normalizedId)
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
    const artworkId = normalizeId(e.currentTarget.dataset.id);
    const artworks = [...this.data.artworks];
    const index = artworks.findIndex(item => normalizeId(item.id) === artworkId);
    if (index < 0) return;

    const favoriteIds = getFavoriteIds();
    const exists = favoriteIds.includes(artworkId);

    // 先做乐观更新，失败时回滚
    artworks[index].isFavorited = !exists;
    this.setData({ artworks });

    const rollback = () => {
      const rolledBack = [...this.data.artworks];
      const targetIndex = rolledBack.findIndex(item => normalizeId(item.id) === artworkId);
      if (targetIndex >= 0) {
        rolledBack[targetIndex].isFavorited = exists;
        this.setData({ artworks: rolledBack });
      }
    };

    api.post(`/artworks/${artworkId}/like`).then((res) => {
      const isLiked = Boolean(res?.data?.isLiked);
      const currentIds = getFavoriteIds();
      const idSet = new Set(currentIds);
      if (isLiked) {
        idSet.add(artworkId);
      } else {
        idSet.delete(artworkId);
      }
      wx.setStorageSync(FAVORITE_KEY, Array.from(idSet));

      const synced = [...this.data.artworks];
      const targetIndex = synced.findIndex(item => normalizeId(item.id) === artworkId);
      if (targetIndex >= 0) {
        synced[targetIndex].isFavorited = isLiked;
        if (typeof res?.data?.likes === 'number') {
          synced[targetIndex].likesCount = res.data.likes;
        }
        this.setData({ artworks: synced });
      }

      wx.showToast({
        title: isLiked ? '收藏成功' : '已取消收藏',
        icon: 'none'
      });
    }).catch((error) => {
      // 无登录/网络异常时，回退到本地收藏，不中断用户体验
      const fallbackIds = getFavoriteIds();
      const fallbackSet = new Set(fallbackIds);
      if (exists) {
        fallbackSet.delete(artworkId);
      } else {
        fallbackSet.add(artworkId);
      }
      wx.setStorageSync(FAVORITE_KEY, Array.from(fallbackSet));

      rollback();
      const fallbackArtworks = [...this.data.artworks];
      const targetIndex = fallbackArtworks.findIndex(item => normalizeId(item.id) === artworkId);
      if (targetIndex >= 0) {
        fallbackArtworks[targetIndex].isFavorited = !exists;
        this.setData({ artworks: fallbackArtworks });
      }

      console.warn('同步收藏到后端失败，已使用本地收藏兜底:', error?.message || error);
      wx.showToast({
        title: exists ? '已取消收藏(本地)' : '收藏成功(本地)',
        icon: 'none'
      });
    });
  }
});

