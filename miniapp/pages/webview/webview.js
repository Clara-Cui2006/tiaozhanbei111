const app = getApp()

Page({
  data: {
    url: ''
  },

  onLoad(options) {
    const url = options.url ? decodeURIComponent(options.url) : app.globalData.platformUrl
    this.setData({ url })
  }
})
