// pages/my-likes/my-likes.js
const api = require('../../utils/api');
const mockData = require('../../utils/galleryWorksMock');
const getSafeImageUrl = require('../../utils/getSafeImageUrl');
const { STORAGE_KEYS } = require('../../utils/constants');
const FAVORITE_KEY = STORAGE_KEYS.FAVORITE_ARTWORK_IDS;

function normalizeId(value) {
  return String(value || '');
}

function getFavoriteIds() {
  const value = wx.getStorageSync(FAVORITE_KEY);
  return Array.isArray(value) ? value.map(normalizeId).filter(Boolean) : [];
}

function parseArtworkList(res) {
  const ok = res?.success === true;
  const artworks = (ok ? (res?.data?.artworks ?? res?.data?.data?.artworks) : res?.artworks) || [];
  const pagination = (ok ? (res?.data?.pagination ?? res?.data?.data?.pagination) : res?.pagination) || null;
  return {
    artworks: Array.isArray(artworks) ? artworks : [],
    pagination
  };
}

async function fetchFavoriteArtworksFromApi(favoriteIdSet) {
  const foundMap = new Map();
  let page = 1;
  const limit = Math.max(60, favoriteIdSet.size * 2);
  const maxPages = 10;

  while (page <= maxPages && foundMap.size < favoriteIdSet.size) {
    const res = await api.get('/artworks', { page, limit, status: 'published' });
    const { artworks, pagination } = parseArtworkList(res);

    artworks.forEach((item) => {
      const id = normalizeId(item?.id ?? item?._id ?? item?.artworkId);
      if (!id || !favoriteIdSet.has(id)) return;
      if (!foundMap.has(id)) {
        foundMap.set(id, {
          ...item,
          id,
          imageUrl: api.getImageUrl(item?.imageUrl || item?.coverUrl || item?.cover || ''),
          isLiked: true
        });
      }
    });

    const totalPages = Number(pagination?.pages || 0) || 0;
    if (artworks.length === 0) break;
    if (totalPages > 0 && page >= totalPages) break;
    page += 1;
  }

  return foundMap;
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
      const favoriteIds = getFavoriteIds();
      if (favoriteIds.length === 0) {
        this.setData({ likes: [], loading: false });
        return;
      }

      const favoriteIdSet = new Set(favoriteIds);
      let likesById = new Map();

      try {
        likesById = await fetchFavoriteArtworksFromApi(favoriteIdSet);
      } catch (apiError) {
        console.warn('加载接口收藏失败，回退到本地 mock 数据:', apiError?.message || apiError);
      }

      // 兜底：接口查不到的收藏 ID，尝试从 mock 数据补齐
      mockData.forEach((item) => {
        const id = normalizeId(item?.id);
        if (!id || !favoriteIdSet.has(id) || likesById.has(id)) return;
        likesById.set(id, {
          ...item,
          id,
          imageUrl: getSafeImageUrl(item.imageUrl),
          isLiked: true
        });
      });

      // 按收藏顺序展示
      const likes = favoriteIds
        .map((id) => likesById.get(id))
        .filter(Boolean);

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

