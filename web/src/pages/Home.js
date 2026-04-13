import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, RightOutlined, PlayCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { getImageUrl } from '../utils/imageUtils';
import BackToTop from '../components/BackToTop';
import ChinaMap from '../components/ChinaMap';
import { provincesData } from '../data/provincesData';
import './Home.css';

// 大师风采数据：标题、类型、工艺描述，点击卡片弹框展示详情（上图下描述）
const MASTER_DATA = [
  {
    url: '/images/home/masters/1.png',
    title: '经纬之间',
    category: '传统织造工艺',
    description: '在木制织机的节奏声中，匠人以经纬为骨、耐心为魂，将棉线或丝线一梭一梭地织入布面。每一次脚踏与抛梭，都是对经验的精准调用。这种织造工艺依赖手感与记忆完成，纹理与密度无法被完全复制，是典型"慢工出细活"的代表。',
  },
  {
    url: '/images/home/masters/2.png',
    title: '泥火相生',
    category: '手工制陶工艺',
    description: '双手贴合旋转的陶坯，通过指尖的压力控制器型的高低、厚薄与曲线。陶艺并非单纯塑形，而是人与泥、水、转速之间的动态博弈。成型只是开始，真正的考验还在之后的晾坯与烧制中，每一件成品都具有不可逆的独特性。',
  },
  {
    url: '/images/home/masters/3.png',
    title: '刀下见神',
    category: '传统木雕工艺',
    description: '匠人以木为纸、以刀为笔，通过层层减法塑造形体。木雕讲究"顺纹而行"，既要理解木材的性格，又要提前预判结构受力。雕刻的不只是造型，更是对比例、神态与动态的长期训练，成品往往兼具实用与审美价值。',
  },
  {
    url: '/images/home/masters/4.png',
    title: '针线生花',
    category: '传统刺绣工艺',
    description: '在绷紧的绣布上，针线以极小的尺度构建复杂图案。刺绣依靠不同针法叠加产生明暗、层次与质感变化，细节密度远超机器绣。作品完成周期长，对专注力和稳定度要求极高，是高度依赖经验积累的精细手工技艺。',
  },
  {
    url: '/images/home/masters/5.png',
    title: '竹编技艺',
    category: '传统竹编技艺',
    description: '在竹刀劈划的清脆声中，匠人以竹篾为骨、韧劲为魂，将原本刚直的毛竹化作指尖的绕指柔。每一次挑压与交织，都是对力道与空间感的极致掌控。这种编织技艺始于破竹之险，成于经纬之变，其疏密与形态承载着手的温度，是机器无法模拟的灵动，是典型“刚柔并济”的艺术。',
  },
  {
    url: '/images/home/masters/6.png',
    title: '古法造纸/捞纸',
    category: '传统造纸工艺',
    description: '在浆水荡漾的细微声响中，匠人以竹帘为网、水流为媒，将如云似雪的植物纤维在水中定格成纸。每一次入水与荡料，都是手腕与水性无声的博弈。这种捞纸工艺全凭经验感知厚薄均匀，湿纸的纤维纹理无法被精准复刻，每一张纸都独一无二，是典型“化浆为纸、点草成金”的见证。',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const [masters, setMasters] = useState([]);
  const [news, setNews] = useState([]);
  const [currentMasterIndex, setCurrentMasterIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);

  useEffect(() => {
    setMasters(MASTER_DATA.map((item, i) => ({
      id: i + 1,
      name: item.title,
      title: item.title,
      category: item.category,
      description: item.description,
      cardDescription: item.description.length > 56 ? item.description.slice(0, 56) + '…' : item.description,
      image: item.url
    })));
  }, []);

  useEffect(() => {
    loadNews();
  }, []);

  // 大师风采轮播自动切换
  useEffect(() => {
    if (masters.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentMasterIndex((prev) => (prev + 1) % masters.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [masters.length]);

  const loadMasters = async () => {
    try {
      const response = await api.get('/news/masters');
      if (response.data.success) {
        setMasters(response.data.data.masters || []);
      }
    } catch (error) {
      console.error('加载大师数据失败:', error);
      // 降级使用本地数据
      setMasters([
        { id: 1, name: '陈大师', category: '木雕', image: '/images/ihchina/b1.png', description: '传统木雕技艺传承人' },
        { id: 2, name: '李大师', category: '针织', image: '/images/ihchina/b2.png', description: '传统针织技艺传承人' },
        { id: 3, name: '张大师', category: '陶艺', image: '/images/ihchina/b3.png', description: '传统陶艺技艺传承人' },
        { id: 4, name: '王大师', category: '剪纸', image: '/images/ihchina/b4.png', description: '传统剪纸技艺传承人' },
      ]);
    }
  };

  const loadNews = async () => {
    try {
      const response = await api.get('/news');
      if (response.data.success) {
        setNews(response.data.data.news || []);
      }
    } catch (error) {
      console.error('加载资讯失败:', error);
      setNews([]);
    }
  };

  const handleSubscribe = async () => {
    if (!email) {
      message.warning('请输入邮箱地址');
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      message.error('请输入有效的邮箱地址');
      return;
    }

    try {
      const response = await api.post('/subscriptions', {
        email: email.trim(),
        source: 'home'
      });

      if (response.data.success) {
        message.success('订阅成功！感谢您的关注。');
        setEmail('');
      } else {
        message.error(response.data.message || '订阅失败，请稍后重试');
      }
    } catch (error) {
      console.error('订阅失败:', error);
      const errorMessage = error.response?.data?.message || '订阅失败，请稍后重试';
      message.error(errorMessage);
    }
  };

  const nextMaster = () => {
    setCurrentMasterIndex((prev) => (prev + 1) % masters.length);
  };

  const prevMaster = () => {
    setCurrentMasterIndex((prev) => (prev - 1 + masters.length) % masters.length);
  };

  // 处理地图省份点击
  const handleProvinceClick = (provinceName) => {
    console.log('点击的省份名称:', provinceName);
    
    // 省份名称映射（处理地图返回的名称格式）
    const nameMap = {
      '北京市': '北京',
      '天津市': '天津',
      '河北省': '河北',
      '山西省': '山西',
      '内蒙古自治区': '内蒙古',
      '辽宁省': '辽宁',
      '吉林省': '吉林',
      '黑龙江省': '黑龙江',
      '上海市': '上海',
      '江苏省': '江苏',
      '浙江省': '浙江',
      '安徽省': '安徽',
      '福建省': '福建',
      '江西省': '江西',
      '山东省': '山东',
      '河南省': '河南',
      '湖北省': '湖北',
      '湖南省': '湖南',
      '广东省': '广东',
      '广西壮族自治区': '广西',
      '海南省': '海南',
      '重庆市': '重庆',
      '四川省': '四川',
      '贵州省': '贵州',
      '云南省': '云南',
      '西藏自治区': '西藏',
      '陕西省': '陕西',
      '甘肃省': '甘肃',
      '青海省': '青海',
      '宁夏回族自治区': '宁夏',
      '新疆维吾尔自治区': '新疆',
      '台湾省': '台湾',
      '香港特别行政区': '香港',
      '澳门特别行政区': '澳门'
    };
    
    // 标准化省份名称
    const normalizedName = nameMap[provinceName] || provinceName;
    console.log('标准化后的名称:', normalizedName);
    
    // 查找对应的省份数据
    const provinceData = provincesData.find(p => p.name === normalizedName);
    console.log('找到的数据:', provinceData);
    
    if (provinceData) {
      setSelectedProvince(provinceData);
      setModalVisible(true);
    } else {
      console.warn('未找到省份数据:', normalizedName);
    }
  };

  // 关闭Modal
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedProvince(null);
  };

  return (
    <div className="new-home-page">
      {/* Hero Section - 首屏 */}
      <section className="hero-section-new">
        <div className="hero-background-new">
          <img src="/images/backgrounds/home3-bg.jpg" alt="非遗传承" className="hero-bg-image-new" />
          <div className="hero-overlay-new"></div>
        </div>
        <div className="hero-content-new">
          <div className="hero-badge">国家非物质文化遗产</div>
          <h1 className="hero-title-new">承古启今 智创未来</h1>
          <p className="hero-subtitle-new">
            融合现代人工智能与数字修复技术，重现传统工艺的极致魅力，让非遗触手可及。
          </p>
          <div className="hero-actions-new">
            <Button 
              type="primary" 
              className="hero-btn-primary"
              onClick={() => navigate('/heritage-learn')}
            >
              开始学习 <RightOutlined />
            </Button>
            <Button 
              className="hero-btn-secondary"
              onClick={() => navigate('/gallery')}
            >
              <PlayCircleOutlined /> 查看作品库
            </Button>
          </div>
        </div>
      </section>

      {/* 探索核心模块 */}
      <section className="explore-modules-section">
        <div className="section-container">
          <div className="section-header-new">
            <h2 className="section-title-new">探索核心模块</h2>
            <a href="#" className="section-link">查看所有功能 <RightOutlined /></a>
          </div>
          <p className="section-subtitle">从非遗入门到AI导师，全方位探索非遗保护的五大支柱。</p>
          <div className="modules-grid">
            <div className="module-card" onClick={() => navigate('/heritage-learn')}>
              <div className="module-image-wrapper">
                <img src="/images/home/modules/1.png" alt="学习非遗" className="module-image" />
              </div>
              <h3 className="module-title">学习非遗</h3>
              <p className="module-description">认识、理解、传承中华优秀传统文化</p>
            </div>
            <div className="module-card" onClick={() => navigate('/learn')}>
              <div className="module-image-wrapper">
                <img src="/images/home/modules/2.png" alt="AI学艺" className="module-image" />
              </div>
              <h3 className="module-title">AI学艺</h3>
              <p className="module-description">通过AI技术学习传统技艺</p>
            </div>
            <div className="module-card" onClick={() => navigate('/transform')}>
              <div className="module-image-wrapper">
                <img src="/images/home/modules/3.png" alt="数字焕新" className="module-image" />
              </div>
              <h3 className="module-title">数字焕新</h3>
              <p className="module-description">上传产品+纹样，一键生成文创打样图</p>
              <div className="module-tag">AI风格迁移</div>
            </div>
            <div className="module-card" onClick={() => navigate('/gallery')}>
              <div className="module-image-wrapper">
                <img src="/images/home/modules/4.png" alt="大师作品库" className="module-image" />
              </div>
              <h3 className="module-title">大师作品库</h3>
              <p className="module-description">浏览传统大师的经典作品</p>
            </div>
            <div className="module-card" onClick={() => navigate('/shop')}>
              <div className="module-image-wrapper">
                <img src="/images/home/modules/5.png" alt="文创商城" className="module-image" />
              </div>
              <h3 className="module-title">文创商城</h3>
              <p className="module-description">购买精美的非遗文创产品</p>
            </div>
          </div>
        </div>
      </section>

      {/* 大师风采 - 轮播 */}
      <section className="masters-section">
        <div className="section-container">
          <div className="section-header-new">
            <h2 className="section-title-new">
              <span className="title-icon">🕐</span>
              大师风采
            </h2>
            <div className="carousel-controls">
              <button className="carousel-btn" onClick={prevMaster}>
                <ArrowLeftOutlined />
              </button>
              <button className="carousel-btn" onClick={nextMaster}>
                <ArrowRightOutlined />
              </button>
            </div>
          </div>
          <div className="masters-carousel">
            <div className="masters-list" style={{ transform: `translateX(-${masters.length ? currentMasterIndex * 25 : 0}%)` }}>
              {masters.map((master) => (
                <div key={master.id} className="master-card">
                  <div className="master-image-wrapper">
                    <img src={master.image} alt={master.name} className="master-image" onError={(e) => { e.target.src = '/images/ihchina/b1.png'; }} />
                    <div className="master-category-badge">{master.category}</div>
                  </div>
                  <h3 className="master-name">{master.name}</h3>
                  <p className="master-description">{master.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 地域非遗地图 */}
      <section className="map-section">
        <div className="section-container">
          <div className="map-content-wrapper">
            <div className="map-text-content">
              <h2 className="section-title-new">
                <span className="title-icon">🗺️</span>
                地域非遗地图
              </h2>
              <p className="map-description">
                通过互动地图探索中国各省市的非物质文化遗产项目。寻找身边的工坊，或开启一段虚拟文化之旅。
              </p>
              <div className="map-keywords">
                <span className="keyword-tag">京剧</span>
                <span className="keyword-tag">苏绣</span>
                <span className="keyword-tag">敦煌艺术</span>
              </div>
              <Button type="primary" className="map-button">开启互动地图</Button>
            </div>
            <div className="map-visual">
              <ChinaMap onProvinceClick={handleProvinceClick} />
            </div>
          </div>
        </div>
      </section>

      {/* 非遗资讯 */}
      <section className="news-section">
        <div className="section-container">
          <h2 className="section-title-new">
            <span className="title-divider"></span>
            非遗资讯
          </h2>
          <p className="section-subtitle">来自中国非物质文化遗产网的权威资讯与活动动态</p>
          <div className="news-grid">
            {news.map((item) => {
              // 处理图片URL：如果是外部URL（ihchina.cn），使用代理接口
              const getImageUrl = (url) => {
                if (!url) return '/images/ihchina/b1.png';
                
                // 如果是相对路径，直接返回
                if (url.startsWith('/')) return url;
                
                // 如果是外部URL（ihchina.cn），使用代理接口避免CORS和403错误
                if (url.startsWith('http') && url.includes('ihchina.cn')) {
                  const apiBaseUrl =
                    process.env.REACT_APP_API_URL ||
                    (process.env.NODE_ENV === 'development'
                      ? 'http://localhost:3100/api'
                      : 'http://121.199.74.74/api');
                  return `${apiBaseUrl}/news/image-proxy?url=${encodeURIComponent(url)}`;
                }
                
                // 其他外部URL直接返回
                if (url.startsWith('http')) return url;
                
                // 相对路径，添加默认前缀
                return `/images/ihchina/${url}`;
              };
              const imageUrl = getImageUrl(String(item.image));
              const defaultImage = '/images/ihchina/b1.png';

              return (
                <a
                  key={item.id}
                  className="news-card"
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="news-image-wrapper">
                    <img 
                      src={imageUrl} 
                      alt={item.title} 
                      className="news-image" 
                      onError={(e) => {
                        // 如果图片加载失败，使用默认图片
                        if (e.target.src !== defaultImage) {
                          e.target.src = defaultImage;
                        }
                      }}
                      onLoad={(e) => {
                        // 图片加载成功，移除可能的错误样式
                        e.target.style.opacity = '1';
                      }}
                      style={{ 
                        transition: 'opacity 0.3s',
                        minHeight: '200px',
                        objectFit: 'cover'
                      }}
                    />
                    <div className="news-category">{item.category}</div>
                  </div>
                  <div className="news-card-body">
                    <h3 className="news-title">{item.title}</h3>
                    {item.summary && <p className="news-summary">{item.summary}</p>}
                    <p className="news-date">{item.date}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* 订阅非遗周刊 */}
      <section className="subscribe-section">
        <div className="section-container">
          <div className="subscribe-content">
            <div className="subscribe-icon">✉️</div>
            <h2 className="subscribe-title">订阅非遗周刊</h2>
            <p className="subscribe-subtitle">获取最新故事、大师访谈和活动邀请。</p>
            <div className="subscribe-form">
              <Input
                placeholder="请输入您的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="subscribe-input"
                size="large"
              />
              <Button type="primary" size="large" onClick={handleSubscribe} className="subscribe-button">
                订阅
              </Button>
            </div>
          </div>
        </div>
      </section>

      <BackToTop />

      {/* 省份详情Modal */}
      <Modal
        title={selectedProvince ? `${selectedProvince.name} - ${selectedProvince.heritage}` : ''}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="close" onClick={handleModalClose}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedProvince && (
          <div className="province-modal-content">
            <div className="province-info">
              <h3 className="province-heritage-title">{selectedProvince.heritage}</h3>
              <p className="province-description">{selectedProvince.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Home;
