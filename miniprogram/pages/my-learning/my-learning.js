const LEARNING_RECORDS_KEY = 'learning_records_v1';

function formatDate(isoText) {
  if (!isoText) return '';
  const d = new Date(isoText);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

Page({
  data: {
    records: []
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    const raw = wx.getStorageSync(LEARNING_RECORDS_KEY);
    const list = Array.isArray(raw) ? raw : [];
    this.setData({
      records: list.map(item => ({
        ...item,
        displayTime: formatDate(item.createdAt)
      }))
    });
  },

  previewRecordImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({
      urls: [url],
      current: url
    });
  },

  clearRecords() {
    if (!this.data.records.length) return;
    wx.showModal({
      title: '确认清空',
      content: '是否清空全部学习记录？',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync(LEARNING_RECORDS_KEY);
        this.setData({ records: [] });
      }
    });
  }
});