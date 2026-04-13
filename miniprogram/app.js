// app.js
App({
  onLaunch() {
    // 初始化云开发
    // wx.cloud.init({
    //   env: 'your-env-id'
    // })

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo
            }
          })
        }
      }
    })
  },

  globalData: {
    userInfo: null,
    apiUrl: 'https://feiyixueyi.cn/api'
  }
})

