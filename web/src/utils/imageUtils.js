/**
 * 图片URL工具函数
 * 统一处理图片URL的构建
 */

const API_BASE_URL =
  (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3100'
    : 'http://121.199.74.74');

const FALLBACK_IMAGE_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f5f7fa"/>
          <stop offset="100%" stop-color="#dfe6ee"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <g fill="#9aa7b5" font-family="Arial, sans-serif" text-anchor="middle">
        <text x="400" y="390" font-size="36">图片暂不可用</text>
        <text x="400" y="440" font-size="24">Image unavailable</text>
      </g>
    </svg>`
  );

/**
 * 构建完整的图片URL
 * @param {string} imagePath - 图片路径（如 /uploads/artworks/xxx.jpg）
 * @returns {string} 完整的图片URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return '';
  }

  // 如果已经是完整的URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // public 目录下的 /images/ 由前端静态服务提供，直接返回以使用当前页面同源
  if (imagePath.startsWith('/images/')) {
    return imagePath;
  }

  // 如果路径以 / 开头（如 /uploads/artworks/xxx），拼接后端地址
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }

  // 否则添加 / 前缀
  return `${API_BASE_URL}/${imagePath}`;
};

/**
 * 获取多张图片的第一张
 * @param {string|string[]} images - 图片路径或图片数组
 * @returns {string} 第一张图片的完整URL
 */
export const getFirstImageUrl = (images) => {
  if (!images) {
    return getDefaultImageUrl();
  }

  if (Array.isArray(images)) {
    if (images.length === 0) {
      return getDefaultImageUrl();
    }
    const firstImage = images[0];
    return firstImage ? getImageUrl(firstImage) : getDefaultImageUrl();
  }

  return getImageUrl(images);
};

/**
 * 获取默认图片URL
 * @param {string} type - 图片类型：'product' 或 'artwork'，默认为 'product'
 * @returns {string} 默认图片URL
 */
export const getDefaultImageUrl = (type = 'product') => {
  if (type === 'product') {
    return `${API_BASE_URL}/uploads/default-product.png`;
  }
  return `${API_BASE_URL}/uploads/default-image.png`;
};

export const getFallbackImageUrl = () => FALLBACK_IMAGE_DATA_URL;

