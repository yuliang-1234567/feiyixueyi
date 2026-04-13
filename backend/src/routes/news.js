const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

// 图片抓取缓存（避免重复抓取）
const imageCache = new Map();

/**
 * 从网页抓取合适的图片
 * @param {string} url - 新闻链接
 * @returns {Promise<string|null>} - 图片URL或null
 */
async function fetchNewsImage(url) {
  // 检查缓存
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 10000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    let imageUrl = null;

    // 1. 优先获取 Open Graph 图片
    imageUrl = $('meta[property="og:image"]').attr('content') || 
               $('meta[name="og:image"]').attr('content');

    // 2. 如果没有，尝试获取文章主图（常见的选择器）
    if (!imageUrl) {
      const contentSelectors = [
        '.content img',
        '.article-content img',
        '.news-content img',
        '.detail-content img',
        '.article-body img',
        'article img',
        '.main-content img'
      ];

      for (const selector of contentSelectors) {
        const img = $(selector).first();
        if (img.length) {
          imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-original');
          if (imageUrl) break;
        }
      }
    }

    // 3. 如果还没有，获取第一个合适的图片（宽度>300px或没有宽度限制）
    if (!imageUrl) {
      $('img').each((i, elem) => {
        const $img = $(elem);
        const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original');
        if (!src) return;

        // 跳过小图标和logo
        const srcLower = src.toLowerCase();
        if (srcLower.includes('icon') || srcLower.includes('logo') || srcLower.includes('avatar')) {
          return;
        }

        const width = $img.attr('width');
        const style = $img.attr('style') || '';
        
        // 如果宽度大于300px或没有宽度限制，使用这个图片
        if (!width || parseInt(width) > 300 || !style.includes('width')) {
          imageUrl = src;
          return false; // break
        }
      });
    }

    // 处理相对路径
    if (imageUrl) {
      // 移除查询参数中的尺寸限制（如果有）
      imageUrl = imageUrl.split('?')[0];
      
      if (!imageUrl.startsWith('http')) {
        try {
          const baseUrl = new URL(url);
          if (imageUrl.startsWith('//')) {
            imageUrl = baseUrl.protocol + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = baseUrl.origin + imageUrl;
          } else {
            imageUrl = new URL(imageUrl, url).href;
          }
        } catch (e) {
          console.error('处理图片URL失败:', e);
          imageUrl = null;
        }
      }
    }

    // 缓存结果（即使失败也缓存，避免重复请求）
    imageCache.set(url, imageUrl || null);
    
    return imageUrl || null;
  } catch (error) {
    // 根据错误类型记录不同的日志级别
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.warn(`抓取图片超时 [${url}]:`, error.message);
    } else if (error.response?.status === 404) {
      console.warn(`页面不存在 [${url}]:`, error.message);
    } else {
      console.error(`抓取图片失败 [${url}]:`, error.message);
    }
    
    // 缓存null，避免重复请求失败的URL（缓存5分钟）
    imageCache.set(url, null);
    
    // 5分钟后清除缓存，允许重试
    setTimeout(() => {
      imageCache.delete(url);
    }, 5 * 60 * 1000);
    
    return null;
  }
}

/**
 * 获取默认图片URL
 * @returns {string} 默认图片URL
 */
function getDefaultImage() {
  return '/images/ihchina/b1.png';
}

// 非遗资讯数据 - 来源于中国非物质文化遗产网 (ihchina.cn)
const NEWS_DATA = [
  {
    id: 1,
    title: '「春节——中国人庆祝传统新年的社会实践」列入人类非物质文化遗产代表作名录',
    category: '新闻动态',
    date: '2025.03.18',
    image: 'https://www.ihchina.cn/Uploads/Picture/2024/12/06/s6752e2e3b086a.jpg',
    link: 'https://www.ihchina.cn/news_details/29429.html',
    summary: '联合国教科文组织保护非物质文化遗产政府间委员会第18届常会通过决议，将中国申报的「春节——中国人庆祝传统新年的社会实践」列入人类非物质文化遗产代表作名录。',
  },
  {
    id: 2,
    title: '习近平：民族的特色，很古朴也很时尚',
    category: '专题报道',
    date: '2025.12.16',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/03/18/s67d8deecdf3c5.jpeg',
    link: 'https://www.ihchina.cn/news_details/29815.html',
    summary: '习近平总书记在考察中强调，非遗是中华优秀传统文化的重要组成部分，要推动创造性转化、创新性发展。',
  },
  {
    id: 3,
    title: '冰雪为媒 匠心传韵​——第九届吉林冰雪产业国际博览非遗展区绽放文化魅力',
    category: '通知公告',
    date: '2025.12.16',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/12/23/s694a51608e2e0_793_444_0_0.jpg',
    link: 'https://www.ihchina.cn/news2_details/31463.html',
    summary: '12月18日至22日，在第九届吉林冰雪产业国际博览会上，6000平方米的“冰雪风物馆”冰雪非遗展区备受瞩目。展区以“冰雪焕新 吉享非遗”为主题，汇聚14个省区市的近50个非遗项目以及吉林省内100余个非遗项目，通过展览、展演、研学、直播等多元形式，搭建起跨越地',
  },
  {
    id: 4,
    title: '京津冀非物质文化遗产交流展示展演活动走进河北高校',
    category: '活动资讯',
    date: '2025.12.15',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/12/16/s6940bb601d744.jpg',
    link: 'https://www.ihchina.cn/news2_details/31458.html',
    summary: '三地非遗项目走进校园，让青年学子近距离感受传统技艺的魅力，推动非遗在年轻群体中的传播。',
  },
  {
    id: 5,
    title: '赣风鄱韵 狮舞华章—— 2025江西舞狮大会成功举办',
    category: '青少年',
    date: '2025.12.15',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/12/22/s6948ed1bb312d_1071_601_30_0.jpg',
    link: 'https://www.ihchina.cn/news2_details/31461.html',
    summary: '12月20日，2025江西舞狮大会在上饶市鄱阳县盛大启幕。本次活动由江西省文化和旅游厅、上饶市人民政府联合主办，以“赣风鄱韵 狮舞华章”为主题，通过狮艺展演、非遗市集、基层巡演等多元形式，呈现了一场传统与当代交织的文化盛宴，为冬日赣鄱点燃了澎湃热情。',
  },
  {
    id: 6,
    title: '在《神奇秘谱》雅集感受「中国音乐史的活化石」',
    category: '传统音乐',
    date: '2025.12.15',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/12/15/s693fa4de5ce25.jpg',
    link: 'https://www.ihchina.cn/news_details/31456.html',
    summary: '古琴雅集活动再现明代琴谱风采，传承人现场演绎千年琴韵。',
  },
  {
    id: 7,
    title: '2025中国·雷山苗年在贵州省雷山县举行',
    category: '专题报道',
    date: '2025.11.20',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/11/06/s690c39b66c2eb_793_444_86_0.jpg',
    link: 'https://www.ihchina.cn/news2_details/31325.html',
    summary: '银饰流光映星河，芦笙振谷醉苗乡。11月5日，2025中国·雷山苗年在素有“苗疆圣地”美誉的贵州省雷山县举行开幕式。身着百鸟衣、锡绣盛装的苗族同胞与五湖四海的游客汇成彩色洪流，让这座小城成为欢乐的海洋、文化的殿堂。',
  },
  {
    id: 8,
    title: '“我是非遗小记者”系列活动获评2025年度广东省特色研学旅游产品',
    category: '展览',
    date: '2025.11.19',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/09/17/s68ca475baa669_793_444_70_0.jpg',
    link: 'https://www.ihchina.cn/news2_details/31275.html',
    summary: '9月13日，在2025广东国际旅游产业博览会举办期间，由广东省文化和旅游厅指导，广东省研学旅行协会主办的“广东省研学旅游发展交流会暨广东省特色研学旅游产品推介会”在广交会展馆举办，正式推出61个2025年度广东省特色研学旅游产品。',
  },
  {
    id: 9,
    title: '第十八届“良辰美景•恭王府非遗演出季”成功举办',
    category: '人物',
    date: '2025.11.12',
    image: 'https://www.ihchina.cn/Uploads/Picture/2025/06/20/s6854c3de307b1_1269_712_0_0.jpg',
    link: 'https://www.ihchina.cn/news_details/31165.html',
    summary: '2025年文化和自然遗产日期间，第十八届“良辰美景·恭王府非遗演出季”于6月13日至17日在恭王府大戏楼成功举办。',
  },
];

// 大师风采数据 - 用于首页轮播，含人物/技艺图片
const MASTERS_DATA = [
  {
    id: 1,
    name: '姚惠芬',
    category: '苏绣',
    image: 'https://www.ihchina.cn/Uploads/Picture/2018/11/14/s5beb9247da49c.png',
    description: '国家级非遗苏绣代表性传承人，走进威尼斯双年展的中国苏绣大师',
  },
  {
    id: 2,
    name: '张树萍',
    category: '传统戏剧',
    image: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3fedf4c187.png',
    description: '初心不改，戏大于天，桂剧表演艺术家',
  },
  {
    id: 3,
    name: '刘兰芳',
    category: '曲艺',
    image: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3fef5cd130.png',
    description: '评书表演艺术家，从艺60周年回眸',
  },
  {
    id: 4,
    name: '尚长荣',
    category: '京剧',
    image: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3ff4c5330e.png',
    description: '「老戏骨」的创新之路，京剧花脸表演艺术家',
  },
];

/**
 * 增强新闻数据，自动抓取缺失的图片
 * @param {Array} newsList - 新闻列表
 * @returns {Promise<Array>} - 增强后的新闻列表
 */
async function enhanceNewsData(newsList) {
  const enhancedNews = await Promise.all(
    newsList.map(async (item) => {
      // 如果图片URL无效或缺失，尝试抓取
      if (!item.image || item.image.includes('placeholder') || item.image.includes('default')) {
        try {
          const scrapedImage = await fetchNewsImage(item.link);
          if (scrapedImage) {
            return { ...item, image: scrapedImage };
          }
        } catch (error) {
          console.error(`增强新闻数据失败 [${item.title}]:`, error.message);
        }
      }
      return item;
    })
  );
  return enhancedNews;
}

/**
 * 确保新闻项有有效的图片URL
 * @param {Object} item - 新闻项
 * @returns {Promise<Object>} - 带有有效图片URL的新闻项
 */
async function ensureValidImage(item) {
  // 如果原始图片URL有效（http开头且不是占位符），直接使用
  if (item.image && 
      item.image.startsWith('http') && 
      !item.image.includes('placeholder') &&
      !item.image.includes('default')) {
    return item;
  }
  
  // 否则尝试从网页抓取图片
  try {
    const scrapedImage = await fetchNewsImage(item.link);
    if (scrapedImage) {
      return { ...item, image: scrapedImage };
    }
  } catch (error) {
    console.error(`抓取图片失败 [${item.title}]:`, error.message);
  }
  
  // 如果抓取失败，使用原始图片（如果存在）或默认图片
  const fallbackImage = item.image && item.image.startsWith('http') 
    ? item.image 
    : getDefaultImage();
  return { ...item, image: fallbackImage };
}

// GET /api/news - 获取非遗资讯列表
router.get('/', async (req, res) => {
  try {
    // 检查是否需要抓取图片（通过查询参数控制，默认启用）
    const shouldFetchImages = req.query.fetchImages !== 'false';
    
    let newsData = NEWS_DATA;
    
    // 如果需要抓取图片，异步增强数据
    if (shouldFetchImages) {
      // 使用Promise.allSettled确保即使部分失败也能返回数据
      const enhancedNews = await Promise.allSettled(
        NEWS_DATA.map(item => ensureValidImage(item))
      );
      
      // 提取成功的结果，失败的使用原始数据（确保有图片）
      newsData = enhancedNews.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // 如果增强失败，至少确保有图片
          const item = NEWS_DATA[index];
          const fallbackImage = item.image && item.image.startsWith('http') 
            ? item.image 
            : getDefaultImage();
          return { ...item, image: fallbackImage };
        }
      });
    } else {
      // 即使不抓取，也确保所有项都有有效的图片URL
      newsData = NEWS_DATA.map(item => {
        if (!item.image || !item.image.startsWith('http')) {
          return { ...item, image: getDefaultImage() };
        }
        return item;
      });
    }

    res.json({
      success: true,
      data: {
        news: newsData,
      },
    });
  } catch (error) {
    console.error('获取资讯失败:', error);
    // 即使出错也返回数据，使用默认图片
    const fallbackNews = NEWS_DATA.map(item => ({
      ...item,
      image: item.image && item.image.startsWith('http') ? item.image : getDefaultImage()
    }));
    res.json({
      success: true,
      data: {
        news: fallbackNews,
      },
    });
  }
});

// GET /api/news/masters - 获取大师风采列表（用于首页轮播）
router.get('/masters', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        masters: MASTERS_DATA,
      },
    });
  } catch (error) {
    console.error('获取大师数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取大师数据失败',
    });
  }
});

// GET /api/news/image-proxy - 图片代理接口，解决CORS和403问题
router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: '缺少图片URL参数'
      });
    }

    // 验证URL是否来自允许的域名
    const allowedDomains = ['ihchina.cn', 'www.ihchina.cn'];
    const urlObj = new URL(url);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return res.status(403).json({
        success: false,
        message: '不允许的图片域名'
      });
    }

    try {
      // 使用axios获取图片，设置合适的headers避免403
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.ihchina.cn/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        },
        timeout: 10000
      });

      // 设置响应头
      res.set({
        'Content-Type': response.headers['content-type'] || 'image/png',
        'Cache-Control': 'public, max-age=86400', // 缓存1天
        'Access-Control-Allow-Origin': '*'
      });

      // 返回图片数据
      res.send(Buffer.from(response.data));
    } catch (error) {
      console.error('代理图片失败:', error.message);
      res.status(500).json({
        success: false,
        message: '获取图片失败',
        error: error.message
      });
    }
  } catch (error) {
    console.error('图片代理错误:', error);
    res.status(500).json({
      success: false,
      message: '图片代理服务错误',
      error: error.message
    });
  }
});

// POST /api/news/refresh-images - 批量刷新新闻图片（管理员功能，可选）
router.post('/refresh-images', async (req, res) => {
  try {
    const results = await Promise.allSettled(
      NEWS_DATA.map(async (item) => {
        try {
          const scrapedImage = await fetchNewsImage(item.link);
          return {
            id: item.id,
            title: item.title,
            originalImage: item.image,
            newImage: scrapedImage || item.image,
            success: !!scrapedImage
          };
        } catch (error) {
          return {
            id: item.id,
            title: item.title,
            originalImage: item.image,
            newImage: item.image,
            success: false,
            error: error.message
          };
        }
      })
    );

    const refreshResults = results.map(r => 
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }
    );

    res.json({
      success: true,
      message: '图片刷新完成',
      data: {
        results: refreshResults,
        successCount: refreshResults.filter(r => r.success).length,
        totalCount: refreshResults.length
      }
    });
  } catch (error) {
    console.error('批量刷新图片失败:', error);
    res.status(500).json({
      success: false,
      message: '批量刷新图片失败',
      error: error.message
    });
  }
});

module.exports = router;
