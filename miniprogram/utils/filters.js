// miniprogram/utils/filters.js
function shouldHideFromMiniProgram(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return tags.includes('数字焕新') || tags.includes('文创产品');
}

module.exports = {
  shouldHideFromMiniProgram
};

