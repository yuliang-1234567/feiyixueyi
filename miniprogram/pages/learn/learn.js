const provincesData = require('../../utils/provincesData');

Page({
  data: {
    keyword: '',
    provinces: provincesData,
    filteredProvinces: provincesData,
    selectedProvince: null,
    showProvincePanel: false,
    hotKeywords: ['京剧', '苏绣', '敦煌艺术']
  },

  onKeywordInput(e) {
    const keyword = (e.detail.value || '').trim();
    this.setData({ keyword });
    this.applyFilter(keyword);
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.applyFilter('');
  },

  applyFilter(keyword) {
    if (!keyword) {
      this.setData({ filteredProvinces: this.data.provinces });
      return;
    }

    const normalized = keyword.toLowerCase();
    const filteredProvinces = this.data.provinces.filter((item) => {
      return (
        item.name.toLowerCase().includes(normalized) ||
        item.heritage.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized)
      );
    });

    this.setData({ filteredProvinces });
  },

  selectProvince(e) {
    const name = e.currentTarget.dataset.name;
    const province = this.data.provinces.find((item) => item.name === name);
    if (!province) return;

    this.setData({
      selectedProvince: province,
      showProvincePanel: true
    });
  },

  closeProvincePanel() {
    this.setData({
      showProvincePanel: false
    });
  }
});