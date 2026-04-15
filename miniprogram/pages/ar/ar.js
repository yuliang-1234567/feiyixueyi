// pages/ar/ar.js
const api = require('../../utils/api.js');
const { API_BASE } = require('../../utils/config');
const API_BASE_URL = API_BASE;

Page({
  data: {
    cameraContext: null,
    arContents: [],
    currentContent: null,
    showInfo: false,
    loading: false,
    scanHistory: [],
    showHistory: false,
    showContentList: false,
    audioContext: null,
    isPlaying: false,
    flashMode: 'off',
    devicePosition: 'back'
  },

  onLoad() {
    this.initCamera();
    this.loadARContents();
    this.loadScanHistory();
  },

  // Camera初始化完成
  onCameraInit(e) {
    console.log('Camera初始化成功:', e);
    if (e && e.detail) {
      console.log('Camera详细信息:', e.detail);
    }
  },

  // Camera错误处理
  onCameraError(e) {
    console.error('Camera错误:', e);
    let errorMsg = '相机初始化失败';
    if (e && e.detail) {
      if (e.detail.errMsg) {
        errorMsg = e.detail.errMsg;
      } else if (e.detail.errCode) {
        errorMsg = `相机错误码: ${e.detail.errCode}`;
      }
    }
    wx.showModal({
      title: '相机错误',
      content: errorMsg,
      showCancel: false,
      confirmText: '确定'
    });
  },

  onUnload() {
    // 停止音频播放
    if (this.data.audioContext) {
      this.data.audioContext.stop();
    }
  },

  initCamera() {
    const ctx = wx.createCameraContext();
    this.setData({
      cameraContext: ctx
    });
  },

  // 加载AR内容列表
  async loadARContents() {
    try {
      this.setData({ loading: true });
      const res = await api.get('/ar');
      
      let contents = [];
      if (res.success && res.data && res.data.contents) {
        contents = res.data.contents;
      } else if (Array.isArray(res.data)) {
        contents = res.data;
      } else if (Array.isArray(res)) {
        contents = res;
      }

      // 处理图片URL
      contents = contents.map(item => ({
        ...item,
        markerImageUrl: item.markerImage ? api.getImageUrl(item.markerImage) : '',
        model3dUrl: item.model3d ? api.getImageUrl(item.model3d) : '',
        audioUrl: item.audio ? api.getImageUrl(item.audio) : ''
      }));

      this.setData({
        arContents: contents,
        loading: false
      });
    } catch (error) {
      console.error('加载AR内容失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ loading: false });
    }
  },

  // 加载扫描历史
  loadScanHistory() {
    try {
      const history = wx.getStorageSync('ar_scan_history') || [];
      this.setData({ scanHistory: history });
    } catch (error) {
      console.error('加载扫描历史失败:', error);
    }
  },

  // 保存扫描历史
  saveScanHistory(content) {
    try {
      let history = wx.getStorageSync('ar_scan_history') || [];
      // 移除重复项
      history = history.filter(item => item.id !== content.id);
      // 添加到开头
      history.unshift({
        id: content.id,
        title: content.title,
        markerId: content.markerId,
        scannedAt: new Date().toISOString()
      });
      // 只保留最近20条
      history = history.slice(0, 20);
      wx.setStorageSync('ar_scan_history', history);
      this.setData({ scanHistory: history });
    } catch (error) {
      console.error('保存扫描历史失败:', error);
    }
  },

  // 扫描二维码/条形码
  scanMarker(e) {
    console.log('scanMarker被调用:', e);
    
    // 如果是从camera组件的scancode事件触发
    if (e && e.detail) {
      const result = e.detail.result || e.detail.scanResult || e.detail.value;
      if (result) {
        console.log('Camera扫描结果:', result);
        this.loadARContent(String(result).trim(), 'image');
        return;
      }
    }
    
    // 手动调用扫描API
    wx.scanCode({
      onlyFromCamera: false, // 允许从相册选择
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        console.log('wx.scanCode扫描结果:', res);
        if (res.result) {
          this.loadARContent(String(res.result).trim(), 'image');
        } else {
          wx.showToast({
            title: '未识别到内容',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('wx.scanCode扫描失败:', err);
        let errorMsg = '扫描失败，请重试';
        if (err.errMsg) {
          if (err.errMsg.includes('cancel')) {
            errorMsg = '已取消扫描';
          } else if (err.errMsg.includes('permission')) {
            errorMsg = '需要相机权限';
          } else {
            errorMsg = err.errMsg;
          }
        }
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 选择图片识别
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        await this.recognizeImage(tempFilePath);
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
  async recognizeImage(filePath) {
    try {
      this.setData({ loading: true });
      
      // 上传图片到服务器
      const uploadRes = await this.uploadImage(filePath);
      
      if (!uploadRes) {
        this.setData({ loading: false });
        return;
      }

      // 调用识别API
      const res = await api.post('/ar/recognize', {
        imageUrl: uploadRes.imageUrl,
        markerId: uploadRes.filename // 使用文件名作为临时markerId
      });

      if (res.success && res.data) {
        if (res.data.content) {
          // 找到匹配的内容
          const content = res.data.content;
          content.markerImageUrl = content.markerImage ? api.getImageUrl(content.markerImage) : '';
          content.model3dUrl = content.model3d ? api.getImageUrl(content.model3d) : '';
          content.audioUrl = content.audio ? api.getImageUrl(content.audio) : '';

          this.setData({
            currentContent: content,
            showInfo: true,
            loading: false
          });
          this.saveScanHistory(content);
        } else if (res.data.contents && res.data.contents.length > 0) {
          // 显示匹配列表
          wx.showModal({
            title: '识别结果',
            content: `找到 ${res.data.contents.length} 个可能的匹配项，请从列表中选择`,
            showCancel: false,
            success: () => {
              this.setData({
                arContents: res.data.contents.map(item => ({
                  ...item,
                  markerImageUrl: item.markerImage ? api.getImageUrl(item.markerImage) : '',
                  model3dUrl: item.model3d ? api.getImageUrl(item.model3d) : '',
                  audioUrl: item.audio ? api.getImageUrl(item.audio) : ''
                })),
                showContentList: true,
                loading: false
              });
            }
          });
        } else {
          wx.showToast({
            title: '未找到匹配内容',
            icon: 'none',
            duration: 2000
          });
          this.setData({ loading: false });
        }
      } else {
        wx.showToast({
          title: res.message || '识别失败',
          icon: 'none',
          duration: 2000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('图片识别失败:', error);
      wx.showToast({
        title: error.message || '识别失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ loading: false });
    }
  },

  // 上传图片
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      const apiUrl = API_BASE_URL;
      
      const header = {
        'Content-Type': 'multipart/form-data'
      };
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }

      wx.uploadFile({
        url: `${apiUrl}/upload`,
        filePath: filePath,
        name: 'image',
        header: header,
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success && data.data) {
              const rawUrl = data.data.url || data.data.path;
              resolve({
                imageUrl: api.getImageUrl(rawUrl),
                imagePath: rawUrl,
                filename: data.data.filename || ''
              });
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (e) {
            console.error('解析上传响应失败:', e, res.data);
            reject(new Error('解析响应失败'));
          }
        },
        fail: (err) => {
          console.error('上传图片失败:', err);
          reject(err);
        }
      });
    });
  },

  // 加载AR内容
  async loadARContent(markerId, markerType = 'image') {
    try {
      if (!markerId) {
        wx.showToast({
          title: '标识ID不能为空',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      this.setData({ loading: true });
      
      const res = await api.post('/ar/scan', {
        markerId: String(markerId).trim(),
        markerType: markerType
      });

      let content = null;
      if (res.success && res.data) {
        if (res.data.content) {
          content = res.data.content;
        } else if (res.data.id || res.data.title) {
          // 直接是content对象
          content = res.data;
        }
      } else if (res.data && (res.data.id || res.data.title)) {
        content = res.data;
      }

      if (content) {
        // 处理图片URL
        content.markerImageUrl = content.markerImage ? api.getImageUrl(content.markerImage) : '';
        content.model3dUrl = content.model3d ? api.getImageUrl(content.model3d) : '';
        content.audioUrl = content.audio ? api.getImageUrl(content.audio) : '';

        this.setData({
          currentContent: content,
          showInfo: true,
          loading: false
        });

        // 保存扫描历史
        this.saveScanHistory(content);
      } else {
        wx.showToast({
          title: '未找到AR内容',
          icon: 'none',
          duration: 2000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载AR内容失败:', error);
      wx.showToast({
        title: error.message || error.errMsg || '加载失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ loading: false });
    }
  },

  // 从内容列表选择
  selectContent(e) {
    const content = e.currentTarget.dataset.content;
    this.setData({
      currentContent: content,
      showInfo: true,
      showContentList: false
    });
    this.saveScanHistory(content);
  },

  // 从历史记录选择
  selectHistory(e) {
    const historyItem = e.currentTarget.dataset.item;
    this.loadARContent(historyItem.markerId, 'image');
    this.setData({ showHistory: false });
  },

  // 切换前后摄像头
  switchCamera() {
    this.setData({
      devicePosition: this.data.devicePosition === 'back' ? 'front' : 'back'
    });
  },

  // 切换闪光灯
  toggleFlash() {
    const modes = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(this.data.flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setData({
      flashMode: modes[nextIndex]
    });
  },

  // 播放音频
  playAudio() {
    if (!this.data.currentContent || !this.data.currentContent.audioUrl) {
      wx.showToast({
        title: '暂无音频',
        icon: 'none'
      });
      return;
    }

    if (this.data.isPlaying) {
      // 停止播放
      if (this.data.audioContext) {
        this.data.audioContext.stop();
      }
      this.setData({ isPlaying: false });
    } else {
      // 开始播放
      const audioContext = wx.createInnerAudioContext();
      audioContext.src = this.data.currentContent.audioUrl;
      audioContext.onPlay(() => {
        this.setData({ isPlaying: true });
      });
      audioContext.onEnded(() => {
        this.setData({ isPlaying: false });
      });
      audioContext.onError((err) => {
        console.error('音频播放失败:', err);
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
        this.setData({ isPlaying: false });
      });
      audioContext.play();
      this.setData({ audioContext });
    }
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  },

  // 分享
  onShareAppMessage() {
    if (this.data.currentContent) {
      return {
        title: `发现非遗：${this.data.currentContent.title}`,
        path: `/pages/ar/ar?markerId=${this.data.currentContent.markerId}`,
        imageUrl: this.data.currentContent.markerImageUrl || ''
      };
    }
    return {
      title: 'AR识物 - 探索非遗文化',
      path: '/pages/ar/ar'
    };
  },

  // 关闭信息面板
  closeInfo() {
    // 停止音频
    if (this.data.audioContext) {
      this.data.audioContext.stop();
    }
    this.setData({
      showInfo: false,
      isPlaying: false,
      currentContent: null
    });
  },

  // 切换内容列表显示
  toggleContentList() {
    this.setData({
      showContentList: !this.data.showContentList
    });
  },

  // 切换历史记录显示
  toggleHistory() {
    this.setData({
      showHistory: !this.data.showHistory
    });
  }
});

