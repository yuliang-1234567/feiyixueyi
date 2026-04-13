/**
 * 作品库 Mock 数据
 * 数据来源：web/public/images/works 目录
 * 与接口 /artworks 返回结构一致，便于 Gallery、ArtworkDetail 复用
 */

const MOCK_ARTWORKS = [
  // 包包类 (4) - 刺绣
  { id: 'mock-bag1', title: '刺绣手拎包', description: '将传统刺绣纹样应用于手拎包，牡丹与云纹点缀，日常通勤亦可承载非遗之美。', imageUrl: '/images/works/bag1.jpg', category: '刺绣', views: 320, likesCount: 48, commentsCount: 6, tags: ['刺绣', '手袋', '非遗'], createdAt: '2024-06-15T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-bag2', title: '云纹帆布托特包', description: '帆布托特包搭配简化云纹与几何图案，兼顾耐用与东方美学。', imageUrl: '/images/works/bag2.jpg', category: '刺绣', views: 256, likesCount: 32, commentsCount: 4, tags: ['帆布', '云纹', '托特包'], createdAt: '2024-07-02T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-bag3', title: '锦鲤绣花斜挎包', description: '锦鲤戏水主题刺绣斜挎包，寓意吉祥，适合出游与休闲场景。', imageUrl: '/images/works/bag3.jpg', category: '刺绣', views: 412, likesCount: 67, commentsCount: 9, tags: ['刺绣', '锦鲤', '斜挎包'], createdAt: '2024-07-20T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-bag4', title: '花鸟纹小手包', description: '花鸟纹样刺绣小手包，精致小巧，可作为礼赠或搭配正装。', imageUrl: '/images/works/bag4.jpg', category: '刺绣', views: 189, likesCount: 28, commentsCount: 3, tags: ['刺绣', '花鸟', '手包'], createdAt: '2024-08-01T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  // 杯具类 (4) - 泥塑/陶瓷
  { id: 'mock-cup1', title: '青花纹样陶瓷杯', description: '经典青花瓷纹样复刻于日常马克杯，让茶饮时光多一分传统韵味。', imageUrl: '/images/works/cup1.jpg', category: '泥塑', views: 528, likesCount: 89, commentsCount: 12, tags: ['青花', '陶瓷', '马克杯'], createdAt: '2024-05-10T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-cup2', title: '剪纸风印花杯', description: '剪纸窗花图案印于杯身，红白对比鲜明，节日或日常使用皆宜。', imageUrl: '/images/works/cup2.jpg', category: '剪纸', views: 445, likesCount: 76, commentsCount: 8, tags: ['剪纸', '印花', '陶瓷'], createdAt: '2024-05-28T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-cup3', title: '泥塑纹饰随手杯', description: '泥塑陶艺中的绳纹与戳印纹样应用于随手杯，古朴而实用。', imageUrl: '/images/works/cup3.jpg', category: '泥塑', views: 298, likesCount: 41, commentsCount: 5, tags: ['泥塑', '陶艺', '随手杯'], createdAt: '2024-06-08T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-cup4', title: '水墨意境保温杯', description: '水墨山水与留白意境印于保温杯，办公、出行都可品味东方美。', imageUrl: '/images/works/cup4.jpg', category: '其他', views: 367, likesCount: 55, commentsCount: 7, tags: ['水墨', '保温杯', '山水'], createdAt: '2024-06-22T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  // 手机类 (8) - 其他/数码
  { id: 'mock-phone1', title: '青花瓷手机壳', description: '青花瓷纹样应用于手机壳，兼顾防摔与传统文化表达。', imageUrl: '/images/works/phone1.jpg', category: '其他', views: 612, likesCount: 102, commentsCount: 15, tags: ['青花', '手机壳', '数码'], createdAt: '2024-07-05T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone2', title: '云纹简约手机壳', description: '抽象云纹与极简线条结合，适合偏好低调国风的用户。', imageUrl: '/images/works/phone2.jpg', category: '其他', views: 389, likesCount: 58, commentsCount: 6, tags: ['云纹', '简约', '手机壳'], createdAt: '2024-07-12T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone3', title: '剪纸窗花手机壳', description: '传统剪纸窗花纹样印制，红金配色，节日氛围感十足。', imageUrl: '/images/works/phone3.jpg', category: '剪纸', views: 478, likesCount: 72, commentsCount: 10, tags: ['剪纸', '窗花', '手机壳'], createdAt: '2024-07-18T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone4', title: '刺绣花纹手机壳', description: '刺绣感花纹与浮雕工艺结合，触感与视觉兼具非遗特色。', imageUrl: '/images/works/phone4.jpg', category: '刺绣', views: 534, likesCount: 81, commentsCount: 11, tags: ['刺绣', '浮雕', '手机壳'], createdAt: '2024-07-25T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone5', title: '水墨山水手机壳', description: '水墨山水图案印于手机壳，远山淡影，握在手中如携一幅小画。', imageUrl: '/images/works/phone5.jpg', category: '其他', views: 421, likesCount: 64, commentsCount: 8, tags: ['水墨', '山水', '手机壳'], createdAt: '2024-08-02T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone6', title: '锦鲤祥云手机壳', description: '锦鲤与祥云组合，寓意吉祥顺遂，色彩明快适合年轻用户。', imageUrl: '/images/works/phone6.jpg', category: '其他', views: 556, likesCount: 88, commentsCount: 13, tags: ['锦鲤', '祥云', '手机壳'], createdAt: '2024-08-10T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone7', title: '泥塑纹路手机壳', description: '陶艺泥塑的肌理与纹路感融入手机壳设计，低调耐看。', imageUrl: '/images/works/phone7.jpg', category: '泥塑', views: 312, likesCount: 44, commentsCount: 4, tags: ['泥塑', '肌理', '手机壳'], createdAt: '2024-08-18T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-phone8', title: '篆刻印章手机壳', description: '篆刻印章与书法元素应用于手机壳，黑白红三色，文艺气质。', imageUrl: '/images/works/phone8.jpg', category: '其他', views: 398, likesCount: 62, commentsCount: 7, tags: ['篆刻', '印章', '书法'], createdAt: '2024-08-25T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  // T恤类 (4) - 刺绣/其他
  { id: 'mock-tshirt1', title: '刺绣 logo 短袖 T 恤', description: '袖口或胸侧小面积刺绣 logo，简约百搭，兼顾品质与国潮感。', imageUrl: '/images/works/T-shirt1.jpg', category: '刺绣', views: 687, likesCount: 115, commentsCount: 18, tags: ['刺绣', 'T恤', '国潮'], createdAt: '2024-09-01T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-tshirt2', title: '剪纸印花 T 恤', description: '传统剪纸图案满印或局部印花，红白或黑金配色，日常出街吸睛。', imageUrl: '/images/works/T-shirt2.jpg', category: '剪纸', views: 523, likesCount: 79, commentsCount: 9, tags: ['剪纸', '印花', 'T恤'], createdAt: '2024-09-08T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-tshirt3', title: '水墨竹韵 T 恤', description: '水墨竹子与留白设计，男女皆宜，清新雅致。', imageUrl: '/images/works/T-shirt3.jpg', category: '其他', views: 467, likesCount: 71, commentsCount: 8, tags: ['水墨', '竹子', 'T恤'], createdAt: '2024-09-15T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
  { id: 'mock-tshirt4', title: '云纹国风 T 恤', description: '云纹与几何国风元素组合，中性款式，日常通勤与休闲均可。', imageUrl: '/images/works/T-shirt4.jpg', category: '刺绣', views: 501, likesCount: 83, commentsCount: 11, tags: ['云纹', '国风', 'T恤'], createdAt: '2024-09-22T10:00:00.000Z', status: 'published', authorId: 0, author: { id: 0, username: 'demo', nickname: '非遗创作者', avatar: null } },
];

/** 支持的类别，与 Gallery 筛选一致 */
export const MOCK_CATEGORIES = ['剪纸', '刺绣', '泥塑', '其他'];

/**
 * 获取 Mock 作品列表（分页、按类别筛选）
 * @param {Object} opts - { category, page, limit }
 * @returns {{ artworks: Array, pagination: { total, page, limit } }}
 */
export function getMockArtworks(opts = {}) {
  const { category = '', page = 1, limit = 12 } = opts;
  let list = [...MOCK_ARTWORKS];

  if (category) {
    list = list.filter((a) => a.category === category);
  }

  const total = list.length;
  const start = (page - 1) * limit;
  const artworks = list.slice(start, start + limit);

  return {
    artworks,
    pagination: { total, page, limit },
  };
}

/**
 * 根据 id 获取单条 Mock 作品（供 ArtworkDetail 使用）
 * @param {string} id - 如 'mock-bag1'
 * @returns {Object|null}
 */
export function getMockArtworkById(id) {
  if (!id) return null;
  const found = MOCK_ARTWORKS.find((a) => String(a.id) === String(id));
  return found ? { ...found, isLiked: false } : null;
}

/**
 * 判断 id 是否为 Mock 作品
 * @param {string} id
 * @returns {boolean}
 */
export function isMockArtworkId(id) {
  return typeof id === 'string' && id.startsWith('mock-');
}

export default MOCK_ARTWORKS;
