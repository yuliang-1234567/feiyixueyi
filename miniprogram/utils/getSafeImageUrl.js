// miniprogram/utils/getSafeImageUrl.js
// 用于开发期图片 HTTP 协议自动替换为本地占位图
const UPLOADS_BASE_URL = 'https://feiyixueyi.cn';
const REMOTE_PLACEHOLDERS = [
  'https://feiyixueyi.cn/uploads/images/categories/categories001.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories002.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories003.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories004.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories005.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories006.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories007.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories008.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories009.jpg',
  'https://feiyixueyi.cn/uploads/images/categories/categories010.jpg'
];

function getSafeImageUrl(url) {
  if (!url) return getPlaceholderForUrl('default');
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return `https://${url.slice(7)}`;
  if (url.startsWith('../') || url.startsWith('./') || url.startsWith('../../')) return getPlaceholderForUrl(url);
  if (url.startsWith('/images/')) return `${UPLOADS_BASE_URL}/uploads${url}`;
  if (url.startsWith('/uploads/')) return UPLOADS_BASE_URL + url;
  // 其它情况 fallback
  return getPlaceholderForUrl(url);
}

// 根据 URL 生成哈希值，返回对应的占位图片
function getPlaceholderForUrl(url) {
  // 生成 URL 的哈希值
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 根据哈希值选择占位图片
  const index = Math.abs(hash) % REMOTE_PLACEHOLDERS.length;
  return REMOTE_PLACEHOLDERS[index];
}

module.exports = getSafeImageUrl;