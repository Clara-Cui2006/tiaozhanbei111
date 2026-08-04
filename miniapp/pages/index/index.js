const app = getApp()

Page({
  data: {},

  goWebview(e) {
    const path = e.currentTarget.dataset.path || '/'
    const url = app.globalData.platformUrl + path
    wx.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(url)}`
    })
  }
})
