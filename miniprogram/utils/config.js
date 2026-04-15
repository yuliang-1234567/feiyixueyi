// miniprogram/utils/config.js
// 统一管理站点域名与资源路径
const SITE_ORIGIN = 'https://feiyixueyi.cn';

const API_BASE = `${SITE_ORIGIN}/api`;
const UPLOADS_BASE = `${SITE_ORIGIN}/uploads`;
const IMAGES_BASE = `${SITE_ORIGIN}/images`;

// 与 web/public/images 对齐的静态资源根目录（经 /uploads 对外暴露）
const WEB_IMAGES_BASE = IMAGES_BASE;

// web/public/json/100000_full.json 的线上访问路径
const CHINA_GEOJSON_URL = `${SITE_ORIGIN}/json/100000_full.json`;

const MAP_IMAGES_BASE = `${IMAGES_BASE}/map`;

module.exports = {
  SITE_ORIGIN,
  API_BASE,
  UPLOADS_BASE,
  IMAGES_BASE,
  WEB_IMAGES_BASE,
  CHINA_GEOJSON_URL,
  MAP_IMAGES_BASE
};

