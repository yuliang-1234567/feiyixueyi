// pages/about/about.js
Page({
  data: {
    version: '',
    appName: '非遗技艺平台'
  },

  onLoad() {
    this.setData({
      version: this.getMiniProgramVersion()
    });
  },

  getMiniProgramVersion() {
    try {
      const info = wx.getAccountInfoSync();
      const runtimeVersion = info?.miniProgram?.version;
      return runtimeVersion || '开发版';
    } catch (error) {
      return '开发版';
    }
  }
});

