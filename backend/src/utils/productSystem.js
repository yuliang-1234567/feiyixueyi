/**
 * 全局产品系统（单一事实来源）
 *
 * 目标：
 * - Web/小程序/后端使用同一份产品类型 key 与展示 label
 * - 后端统一维护 key -> 样机模板文件名（uploads/product-templates）
 * - “scene”用于不同页面过滤可选项（transform / shop / publish 等）
 */

const PRODUCT_SYSTEM = {
  version: 'v1',
  products: [
    {
      key: 'tshirt',
      label: 'T恤',
      scenes: ['transform', 'shop', 'publish'],
      templateFile: 'tshirt.png',
      aliases: ['t恤', 'T恤', 'tee', 't-shirt', 'tshirt'],
    },
    {
      key: 'phone-case',
      label: '手机壳',
      scenes: ['transform', 'shop', 'publish'],
      templateFile: 'phone-case.png',
      aliases: ['手机壳', '手机套', 'phone case'],
    },
    {
      key: 'bag',
      label: '帆布袋',
      scenes: ['transform', 'shop', 'publish'],
      templateFile: 'bag.png',
      aliases: ['帆布袋', '托特包', 'tote', 'bag'],
    },
    {
      key: 'postcard',
      label: '明信片',
      scenes: ['transform', 'shop', 'publish'],
      templateFile: 'postcard.png',
      aliases: ['明信片', 'post card', 'postcard'],
    },
    {
      key: 'mug',
      label: '马克杯',
      scenes: ['transform', 'publish'],
      templateFile: 'mug.png',
      aliases: ['马克杯', '杯子', 'mug', 'cup'],
    },
    {
      key: 'other',
      label: '其他',
      scenes: ['transform', 'shop', 'publish'],
      templateFile: 'default.png',
      aliases: ['其他'],
    },
  ],
};

function getProductsForScene(scene) {
  const key = String(scene || '').trim();
  return PRODUCT_SYSTEM.products.filter((p) => Array.isArray(p.scenes) && p.scenes.includes(key));
}

function getProductByKey(productKey) {
  const key = String(productKey || '').trim();
  return PRODUCT_SYSTEM.products.find((p) => p.key === key) || null;
}

function inferProductLabelFromText(text) {
  const content = String(text || '').toLowerCase();
  for (const p of PRODUCT_SYSTEM.products) {
    const aliases = Array.isArray(p.aliases) ? p.aliases : [];
    for (const a of aliases) {
      if (!a) continue;
      if (content.includes(String(a).toLowerCase())) {
        return p.label;
      }
    }
  }
  return '';
}

module.exports = {
  PRODUCT_SYSTEM,
  getProductsForScene,
  getProductByKey,
  inferProductLabelFromText,
};

