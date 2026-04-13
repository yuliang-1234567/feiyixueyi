// pages/recognize/recognize.js
const api = require('../../utils/api.js');
const API_BASE_URL = 'https://feiyixueyi.cn/api';

function normalizeImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('wxfile://')) {
    return url;
  }
  return api.getImageUrl(url);
}

function isRemoteUrl(path) {
  return typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'));
}

Page({
  data: {
    selectedImage: '',
    uploading: false,
    recognizing: false,
    result: null,
    history: [],
    aiMeta: null
  },

  onLoad() {
    this.loadHistory();
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          selectedImage: tempFilePath,
          result: null
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 识别图片
  async recognizeImage() {
    if (!this.data.selectedImage) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    this.setData({ recognizing: true });

    try {
      const uploadFilePath = await this.prepareUploadFile(this.data.selectedImage);

      const arRes = await this.uploadAndRecognize(uploadFilePath);
      const recognitionResult = this.parseRecognitionResult(arRes.data || {});
      const finalImageUrl = normalizeImageUrl(arRes.data?.imageUrl || this.data.selectedImage);

      this.setData({
        result: recognitionResult,
        aiMeta: arRes.data?.ai || null,
        recognizing: false
      });

      // 保存到历史记录
      this.saveHistory({
        id: Date.now(),
        imageUrl: finalImageUrl,
        title: recognitionResult.title,
        time: new Date().toLocaleString('zh-CN')
      });

      wx.showToast({
        title: '识别成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('识别失败:', error);
      wx.showToast({
        title: error.message || '识别失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ recognizing: false });
    }
  },

  parseRecognitionResult(data) {
    if (data?.title) {
      return {
        title: data.title || '非遗作品',
        category: data.category || '传统美术',
        description: data.description || '这是一件精美的非遗作品，展现了传统工艺的精湛技艺。',
        technique: data.technique || '传统手工制作',
        history: data.history || '具有悠久的历史传承',
        culturalSignificance: data.culturalSignificance,
        confidence: data.confidence
      };
    }

    const content = data?.content || (Array.isArray(data?.contents) ? data.contents[0] : null);
    if (content) {
      return {
        title: content.title || '非遗作品',
        category: content.category || '传统美术',
        description: content.description || content.history || '这是一件精美的非遗作品，展现了传统工艺的精湛技艺。',
        technique: content.technique || '传统手工制作',
        history: content.history || '具有悠久的历史传承',
        culturalSignificance: content.culturalSignificance,
        markerImage: content.markerImage ? api.getImageUrl(content.markerImage) : null
      };
    }

    return {
      title: '非遗作品',
      category: '传统美术',
      description: '这是一件精美的非遗作品，展现了传统工艺的精湛技艺。',
      technique: '传统手工制作',
      history: '具有悠久的历史传承'
    };
  },

  // 上传图片并识别（AI主链路）
  uploadAndRecognize(filePath) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      const apiUrl = `${API_BASE_URL}/ar/recognize`;
      
      const header = {
        'Content-Type': 'multipart/form-data'
      };
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }

      this.setData({ uploading: true });

      wx.uploadFile({
        url: apiUrl,
        filePath: filePath,
        name: 'image',
        header: header,
        success: (res) => {
          this.setData({ uploading: false });
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data);
            } else {
              reject(new Error(data.message || '识别失败'));
            }
          } catch (e) {
            console.error('解析识别响应失败:', e, res.data);
            reject(new Error('解析响应失败'));
          }
        },
        fail: (err) => {
          this.setData({ uploading: false });
          console.error('上传并识别失败:', err);
          reject(err);
        }
      });
    });
  },

  // 上传前准备：历史记录里的远程图先下载，本地图先校验文件存在
  prepareUploadFile(path) {
    return new Promise((resolve, reject) => {
      if (!path) {
        reject(new Error('请先选择图片'));
        return;
      }

      if (isRemoteUrl(path)) {
        wx.downloadFile({
          url: path,
          success: (res) => {
            if (res.statusCode === 200 && res.tempFilePath) {
              resolve(res.tempFilePath);
            } else {
              reject(new Error('历史图片已失效，请重新选择图片'));
            }
          },
          fail: () => {
            reject(new Error('历史图片已失效，请重新选择图片'));
          }
        });
        return;
      }

      const fs = wx.getFileSystemManager();
      fs.access({
        path,
        success: () => resolve(path),
        fail: () => reject(new Error('本地图片不存在，请重新选择图片'))
      });
    });
  },

  // 查看作品详情
  viewArtwork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/artwork-detail/artwork-detail?id=${id}`
    });
  },

  // 查看历史记录
  viewHistory(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      selectedImage: normalizeImageUrl(item.imageUrl),
      result: {
        title: item.title,
        category: '非遗作品'
      }
    });
  },

  // 保存历史记录
  saveHistory(item) {
    try {
      let history = wx.getStorageSync('recognize_history') || [];
      history.unshift({
        ...item,
        imageUrl: normalizeImageUrl(item.imageUrl)
      });
      // 只保留最近20条
      history = history.slice(0, 20);
      wx.setStorageSync('recognize_history', history);
      this.setData({ history });
    } catch (error) {
      console.error('保存历史失败:', error);
    }
  },

  // 加载历史记录
  loadHistory() {
    try {
      const rawHistory = wx.getStorageSync('recognize_history') || [];
      const history = rawHistory.map((item) => ({
        ...item,
        imageUrl: normalizeImageUrl(item.imageUrl)
      }));
      wx.setStorageSync('recognize_history', history);
      this.setData({ history });
    } catch (error) {
      console.error('加载历史失败:', error);
    }
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有识别历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('recognize_history');
          this.setData({ history: [] });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  }
});
