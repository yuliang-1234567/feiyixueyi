import React, { useRef, useState, useEffect } from "react";
import { Button, Image, Input, Modal, message } from "antd";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Clock, Mail, Map, Play, Sparkles, Wand2, Landmark } from "lucide-react";
import api from "../utils/api";
import BackToTop from "../components/BackToTop";
import ChinaMap from "../components/ChinaMap";
import { provincesData } from "../data/provincesData";
import "./Home.css";
import { LucideIcon } from "../components/icons/lucide";

// 大师风采数据：标题、类型、工艺描述，点击卡片弹框展示详情（上图下描述）
const MASTER_DATA = [
  {
    url: "/images/home/masters/1.png",
    title: "经纬之间",
    category: "传统织造工艺",
    description:
      '在木制织机的节奏声中，匠人以经纬为骨、耐心为魂，将棉线或丝线一梭一梭地织入布面。每一次脚踏与抛梭，都是对经验的精准调用。这种织造工艺依赖手感与记忆完成，纹理与密度无法被完全复制，是典型"慢工出细活"的代表。',
  },
  {
    url: "/images/home/masters/2.png",
    title: "泥火相生",
    category: "手工制陶工艺",
    description:
      "双手贴合旋转的陶坯，通过指尖的压力控制器型的高低、厚薄与曲线。陶艺并非单纯塑形，而是人与泥、水、转速之间的动态博弈。成型只是开始，真正的考验还在之后的晾坯与烧制中，每一件成品都具有不可逆的独特性。",
  },
  {
    url: "/images/home/masters/3.png",
    title: "刀下见神",
    category: "传统木雕工艺",
    description:
      '匠人以木为纸、以刀为笔，通过层层减法塑造形体。木雕讲究"顺纹而行"，既要理解木材的性格，又要提前预判结构受力。雕刻的不只是造型，更是对比例、神态与动态的长期训练，成品往往兼具实用与审美价值。',
  },
  {
    url: "/images/home/masters/4.png",
    title: "针线生花",
    category: "传统刺绣工艺",
    description:
      "在绷紧的绣布上，针线以极小的尺度构建复杂图案。刺绣依靠不同针法叠加产生明暗、层次与质感变化，细节密度远超机器绣。作品完成周期长，对专注力和稳定度要求极高，是高度依赖经验积累的精细手工技艺。",
  },
  {
    url: "/images/home/masters/5.png",
    title: "竹编技艺",
    category: "传统竹编技艺",
    description:
      "在竹刀劈划的清脆声中，匠人以竹篾为骨、韧劲为魂，将原本刚直的毛竹化作指尖的绕指柔。每一次挑压与交织，都是对力道与空间感的极致掌控。这种编织技艺始于破竹之险，成于经纬之变，其疏密与形态承载着手的温度，是机器无法模拟的灵动，是典型“刚柔并济”的艺术。",
  },
  {
    url: "/images/home/masters/6.png",
    title: "古法造纸/捞纸",
    category: "传统造纸工艺",
    description:
      "在浆水荡漾的细微声响中，匠人以竹帘为网、水流为媒，将如云似雪的植物纤维在水中定格成纸。每一次入水与荡料，都是手腕与水性无声的博弈。这种捞纸工艺全凭经验感知厚薄均匀，湿纸的纤维纹理无法被精准复刻，每一张纸都独一无二，是典型“化浆为纸、点草成金”的见证。",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const mapVisualRef = useRef(null);
  const [masters, setMasters] = useState([]);
  const [, setIsMastersHovered] = useState(false);
  const [mastersScrollProgress, setMastersScrollProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [recentItems, setRecentItems] = useState([]);

  const mastersScrollRef = useRef(null);
  const mastersLoopWidthRef = useRef(0);
  const mastersRafRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const isMastersHoveredRef = useRef(false);
  const mastersAutoPauseUntilRef = useRef(0);

  useEffect(() => {
    setMasters(
      MASTER_DATA.map((item, i) => ({
        id: i + 1,
        name: item.title,
        title: item.title,
        category: item.category,
        description: item.description,
        cardDescription:
          item.description.length > 56
            ? item.description.slice(0, 56) + "…"
            : item.description,
        image: item.url,
      }))
    );
  }, []);

  const handleSubscribe = async () => {
    if (!email) {
      message.warning("请输入邮箱地址");
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      message.error("请输入有效的邮箱地址");
      return;
    }

    try {
      const response = await api.post("/subscriptions", {
        email: email.trim(),
        source: "home",
      });

      if (response.data.success) {
        message.success("订阅成功！感谢您的关注。");
        setEmail("");
      } else {
        message.error(response.data.message || "订阅失败，请稍后重试");
      }
    } catch (error) {
      console.error("订阅失败:", error);
      const errorMessage =
        error.response?.data?.message || "订阅失败，请稍后重试";
      message.error(errorMessage);
    }
  };

  const HOME_RECENTS_KEY = "feiyixueyi:homeRecents:v1";

  const loadRecents = () => {
    try {
      const raw = window.localStorage.getItem(HOME_RECENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => x && typeof x === "object" && typeof x.path === "string")
        .slice(0, 6);
    } catch {
      return [];
    }
  };

  const pushRecent = (item) => {
    try {
      const next = [
        { ...item, ts: Date.now() },
        ...loadRecents().filter((x) => x.path !== item.path),
      ].slice(0, 6);
      window.localStorage.setItem(HOME_RECENTS_KEY, JSON.stringify(next));
      setRecentItems(next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setRecentItems(loadRecents());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goWithRecent = (item) => {
    pushRecent(item);
    navigate(item.path);
  };

  useEffect(() => {
    const container = mastersScrollRef.current;
    if (!container || masters.length <= 1) return undefined;

    const firstGroup = container.querySelector(".masters-group");
    if (!firstGroup) return undefined;

    const loopWidth = firstGroup.scrollWidth;
    mastersLoopWidthRef.current = loopWidth;
    container.scrollLeft = loopWidth;
    setMastersScrollProgress(0);

    const syncProgress = () => {
      const width = mastersLoopWidthRef.current;
      if (!width) return;
      const relative =
        (((container.scrollLeft - width) % width) + width) % width;
      setMastersScrollProgress((relative / width) * 100);
    };

    const tick = () => {
      if (
        !isMastersHoveredRef.current &&
        !syncingScrollRef.current &&
        mastersLoopWidthRef.current
      ) {
        const now = Date.now();
        if (now >= mastersAutoPauseUntilRef.current) {
          // 段落感速度曲线：更克制、更耐看（避免跑马灯）
          const t = (now % 3600) / 3600; // 3.6s 一个小周期
          const ease = 0.55 + 0.45 * Math.sin(t * Math.PI * 2);
          const speed = 0.35 + ease * 0.55; // 0.35 ~ 0.90
          container.scrollLeft -= speed;
        }
        if (container.scrollLeft <= 0) {
          syncingScrollRef.current = true;
          container.scrollLeft += mastersLoopWidthRef.current;
          syncingScrollRef.current = false;
        }
        syncProgress();
      }
      mastersRafRef.current = window.requestAnimationFrame(tick);
    };

    mastersRafRef.current = window.requestAnimationFrame(tick);

    const handleScroll = () => {
      const width = mastersLoopWidthRef.current;
      if (!width || syncingScrollRef.current) return;

      // 用户主动滚动：优先级高于自动滚动（暂停一段时间再恢复）
      mastersAutoPauseUntilRef.current = Date.now() + 4500;

      if (container.scrollLeft <= 0) {
        syncingScrollRef.current = true;
        container.scrollLeft += width;
        syncingScrollRef.current = false;
      } else if (container.scrollLeft >= width * 2) {
        syncingScrollRef.current = true;
        container.scrollLeft -= width;
        syncingScrollRef.current = false;
      }
      syncProgress();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (mastersRafRef.current) {
        window.cancelAnimationFrame(mastersRafRef.current);
        mastersRafRef.current = null;
      }
    };
  }, [masters]);

  const handleMastersScrollbarChange = (event) => {
    const width = mastersLoopWidthRef.current;
    const container = mastersScrollRef.current;
    if (!width || !container) return;

    const nextProgress = Number(event.target.value);
    mastersAutoPauseUntilRef.current = Date.now() + 6000;
    syncingScrollRef.current = true;
    container.scrollLeft = width + (nextProgress / 100) * width;
    syncingScrollRef.current = false;
    setMastersScrollProgress(nextProgress);
  };

  const openMasterModal = (master) => {
    setSelectedMaster(master);
    setMasterModalVisible(true);
    mastersAutoPauseUntilRef.current = Date.now() + 9000;
  };

  const closeMasterModal = () => {
    setMasterModalVisible(false);
    setSelectedMaster(null);
  };

  // 处理地图省份点击
  const handleProvinceClick = (provinceName) => {
    console.log("点击的省份名称:", provinceName);

    // 省份名称映射（处理地图返回的名称格式）
    const nameMap = {
      北京市: "北京",
      天津市: "天津",
      河北省: "河北",
      山西省: "山西",
      内蒙古自治区: "内蒙古",
      辽宁省: "辽宁",
      吉林省: "吉林",
      黑龙江省: "黑龙江",
      上海市: "上海",
      江苏省: "江苏",
      浙江省: "浙江",
      安徽省: "安徽",
      福建省: "福建",
      江西省: "江西",
      山东省: "山东",
      河南省: "河南",
      湖北省: "湖北",
      湖南省: "湖南",
      广东省: "广东",
      广西壮族自治区: "广西",
      海南省: "海南",
      重庆市: "重庆",
      四川省: "四川",
      贵州省: "贵州",
      云南省: "云南",
      西藏自治区: "西藏",
      陕西省: "陕西",
      甘肃省: "甘肃",
      青海省: "青海",
      宁夏回族自治区: "宁夏",
      新疆维吾尔自治区: "新疆",
      台湾省: "台湾",
      香港特别行政区: "香港",
      澳门特别行政区: "澳门",
    };

    // 标准化省份名称
    const normalizedName = nameMap[provinceName] || provinceName;
    console.log("标准化后的名称:", normalizedName);

    // 查找对应的省份数据
    const provinceData = provincesData.find((p) => p.name === normalizedName);
    console.log("找到的数据:", provinceData);

    if (provinceData) {
      setSelectedProvince(provinceData);
      setModalVisible(true);
    } else {
      console.warn("未找到省份数据:", normalizedName);
    }
  };

  // 关闭Modal
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedProvince(null);
  };

  const scrollToMap = () => {
    mapVisualRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="new-home-page">
      {/* Hero Section - 首屏 */}
      <section className="hero-section-new">
        <div className="hero-background-new">
          <img
            src="/images/backgrounds/home1-bg.png"
            alt="非遗传承"
            className="hero-bg-image-new"
          />
          <div className="hero-overlay-new"></div>
        </div>
        <div className="hero-content-new">
          <div className="hero-badge">国家非物质文化遗产</div>
          <h1 className="hero-title-new">承古启今 智创未来</h1>
          <p className="hero-subtitle-new">
            融合现代人工智能与数字修复技术，重现传统工艺的极致魅力，让非遗触手可及。
          </p>
          <div className="hero-highlights" aria-label="平台亮点">
            <div className="hero-highlight">
              <LucideIcon icon={Sparkles} size={18} strokeWidth={1.6} />
              <span>
                <strong>AI学艺</strong>：循序讲解 + 个性化练习，让入门更轻。
              </span>
            </div>
            <div className="hero-highlight">
              <LucideIcon icon={Wand2} size={18} strokeWidth={1.6} />
              <span>
                <strong>数字焕新</strong>：纹样迁移与创意打样，让灵感更快落地。
              </span>
            </div>
            <div className="hero-highlight">
              <LucideIcon icon={Landmark} size={18} strokeWidth={1.6} />
              <span>
                <strong>地域地图</strong>：从一省一艺出发，找到你的文化坐标。
              </span>
            </div>
          </div>
          <div className="hero-actions-new">
              <Button
              type="primary"
              className="hero-btn-primary"
                onClick={() =>
                  goWithRecent({ title: "学习非遗", path: "/heritage-learn" })
                }
            >
              开始学习 <LucideIcon icon={ChevronRight} />
            </Button>
              <Button
              className="hero-btn-secondary"
                onClick={() => goWithRecent({ title: "大师作品库", path: "/gallery" })}
            >
              <LucideIcon icon={Play} /> 查看作品库
            </Button>
          </div>
        </div>
      </section>

      {/* 探索核心模块 */}
      <section className="explore-modules-section">
        <div className="section-container">
          <div className="section-header-new">
            <h2 className="section-title-new">探索核心模块</h2>
            <button
              type="button"
              className="section-link section-link-button"
              onClick={() => navigate("/search?q=")}
            >
              查看所有功能 <LucideIcon icon={ChevronRight} />
            </button>
          </div>
          <p className="section-subtitle">
            从非遗入门到AI导师，全方位探索非遗保护的五大支柱。
          </p>
          <div className="modules-grid">
            <div
              className="module-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  goWithRecent({ title: "学习非遗", path: "/heritage-learn" });
              }}
              onClick={() => goWithRecent({ title: "学习非遗", path: "/heritage-learn" })}
            >
              <div className="module-image-wrapper">
                <img
                  src="/images/home/modules/1.png"
                  alt="学习非遗"
                  className="module-image"
                />
              </div>
              <h3 className="module-title">学习非遗</h3>
              <p className="module-description">
                认识、理解、传承中华优秀传统文化
              </p>
            </div>
            <div
              className="module-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  goWithRecent({ title: "AI学艺", path: "/learn" });
              }}
              onClick={() => goWithRecent({ title: "AI学艺", path: "/learn" })}
            >
              <div className="module-image-wrapper">
                <img
                  src="/images/home/modules/2.png"
                  alt="AI学艺"
                  className="module-image"
                />
              </div>
              <h3 className="module-title">AI学艺</h3>
              <p className="module-description">通过AI技术学习传统技艺</p>
            </div>
            <div
              className="module-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  goWithRecent({ title: "数字焕新", path: "/transform" });
              }}
              onClick={() => goWithRecent({ title: "数字焕新", path: "/transform" })}
            >
              <div className="module-image-wrapper">
                <img
                  src="/images/home/modules/3.png"
                  alt="数字焕新"
                  className="module-image"
                />
              </div>
              <h3 className="module-title">数字焕新</h3>
              <p className="module-description">
                上传产品+纹样，一键生成文创打样图
              </p>
              <div className="module-tag">AI风格迁移</div>
            </div>
            <div
              className="module-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  goWithRecent({ title: "大师作品库", path: "/gallery" });
              }}
              onClick={() => goWithRecent({ title: "大师作品库", path: "/gallery" })}
            >
              <div className="module-image-wrapper">
                <img
                  src="/images/home/modules/4.png"
                  alt="大师作品库"
                  className="module-image"
                />
              </div>
              <h3 className="module-title">大师作品库</h3>
              <p className="module-description">浏览传统大师的经典作品</p>
            </div>
            <div
              className="module-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  goWithRecent({ title: "文创商城", path: "/shop" });
              }}
              onClick={() => goWithRecent({ title: "文创商城", path: "/shop" })}
            >
              <div className="module-image-wrapper">
                <img
                  src="/images/home/modules/5.png"
                  alt="文创商城"
                  className="module-image"
                />
              </div>
              <h3 className="module-title">文创商城</h3>
              <p className="module-description">购买精美的非遗文创产品</p>
            </div>
          </div>
        </div>
      </section>

      {/* 继续学习 / 最近浏览 */}
      <section className="recents-section">
        <div className="section-container">
          <div className="section-header-new">
            <h2 className="section-title-new">继续学习</h2>
            <button
              type="button"
              className="section-link section-link-button"
              onClick={() => navigate("/search?q=")}
            >
              去探索更多 <LucideIcon icon={ChevronRight} />
            </button>
          </div>
          <p className="section-subtitle">
            你最近访问过的功能会出现在这里，随时续上进度。
          </p>

          {recentItems.length === 0 ? (
            <div className="recents-empty">
              <div className="recents-emptyCard">
                <div className="recents-emptyTitle">还没有浏览记录</div>
                <div className="recents-emptyText">
                  先从“学习非遗”或“AI学艺”开始，首页会自动记住你去过哪里。
                </div>
                <div className="recents-emptyActions">
                  <Button
                    type="primary"
                    onClick={() =>
                      goWithRecent({ title: "学习非遗", path: "/heritage-learn" })
                    }
                  >
                    从入门开始
                  </Button>
                  <Button
                    onClick={() => goWithRecent({ title: "AI学艺", path: "/learn" })}
                  >
                    试试AI导师
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="recents-grid">
              {recentItems.map((item) => (
                <div
                  key={item.path}
                  className="recents-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => goWithRecent(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goWithRecent(item);
                  }}
                >
                  <div className="recents-cardTop">
                    <div className="recents-cardTitle">{item.title}</div>
                    <div className="recents-cardMeta">继续</div>
                  </div>
                  <div className="recents-cardBottom">
                    <span className="recents-cardHint">一键回到上次位置</span>
                    <LucideIcon icon={ChevronRight} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 大师风采 - 轮播 */}
      <section className="masters-section">
        <div className="section-container">
          <div className="section-header-new">
            <h2 className="section-title-new">
              <span className="title-icon" aria-hidden="true">
                <LucideIcon icon={Clock} size={22} strokeWidth={1.6} />
              </span>
              大师风采
            </h2>
          </div>
          <div
            className="masters-carousel"
            onMouseEnter={() => {
              isMastersHoveredRef.current = true;
              setIsMastersHovered(true);
            }}
            onMouseLeave={() => {
              isMastersHoveredRef.current = false;
              setIsMastersHovered(false);
            }}
          >
            <div ref={mastersScrollRef} className="masters-scrollViewport">
              <div className="masters-track">
                <div className="masters-group" aria-hidden="true">
                  {masters.map((master) => (
                    <div
                      key={`m-a-${master.id}`}
                      className="master-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openMasterModal(master)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openMasterModal(master);
                      }}
                    >
                      <div className="master-image-wrapper">
                        <img
                          src={master.image}
                          alt={master.name}
                          className="master-image"
                          onError={(e) => {
                            e.target.src = "/images/ihchina/b1.png";
                          }}
                        />
                        <div className="master-category-badge">
                          {master.category}
                        </div>
                      </div>
                      <h3 className="master-name">{master.name}</h3>
                      <p className="master-description">
                        {master.cardDescription}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="masters-group">
                  {masters.map((master) => (
                    <div
                      key={`m-b-${master.id}`}
                      className="master-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openMasterModal(master)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openMasterModal(master);
                      }}
                    >
                      <div className="master-image-wrapper">
                        <img
                          src={master.image}
                          alt={master.name}
                          className="master-image"
                          onError={(e) => {
                            e.target.src = "/images/ihchina/b1.png";
                          }}
                        />
                        <div className="master-category-badge">
                          {master.category}
                        </div>
                      </div>
                      <h3 className="master-name">{master.name}</h3>
                      <p className="master-description">
                        {master.cardDescription}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="masters-group" aria-hidden="true">
                  {masters.map((master) => (
                    <div
                      key={`m-c-${master.id}`}
                      className="master-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openMasterModal(master)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openMasterModal(master);
                      }}
                    >
                      <div className="master-image-wrapper">
                        <img
                          src={master.image}
                          alt={master.name}
                          className="master-image"
                          onError={(e) => {
                            e.target.src = "/images/ihchina/b1.png";
                          }}
                        />
                        <div className="master-category-badge">
                          {master.category}
                        </div>
                      </div>
                      <h3 className="master-name">{master.name}</h3>
                      <p className="master-description">
                        {master.cardDescription}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="masters-scrollbarWrap">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={mastersScrollProgress}
                onChange={handleMastersScrollbarChange}
                className="masters-scrollbar"
                aria-label="大师风采滚动控制"
              />
            </div>
          </div>
          <div className="masters-actions">
            <button
              type="button"
              className="section-link section-link-button"
              onClick={() => navigate("/gallery")}
            >
              查看更多作品 <LucideIcon icon={ChevronRight} />
            </button>
          </div>
        </div>
      </section>

      {/* 地域非遗地图 */}
      <section className="map-section">
        <div className="section-container">
          <div className="map-content-wrapper">
            <div className="map-text-content">
              <h2 className="section-title-new">
                <span className="title-icon" aria-hidden="true">
                  <LucideIcon icon={Map} size={22} strokeWidth={1.6} />
                </span>
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
              <Button type="primary" className="map-button" onClick={scrollToMap}>
                开启互动地图
              </Button>
            </div>
            <div
              className="map-visual"
              ref={mapVisualRef}
              style={{
                backgroundImage: `url(${
                  process.env.PUBLIC_URL || ""
                }/images/map/mapbg.png)`,
                backgroundPosition: "center center",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
              }}
            >
              <ChinaMap onProvinceClick={handleProvinceClick} />
            </div>
          </div>
        </div>
      </section>

      {/* 订阅非遗周刊 */}
      <section className="subscribe-section">
        <div className="section-container">
          <div className="subscribe-content">
            <div className="subscribe-icon" aria-hidden="true">
              <LucideIcon icon={Mail} size={44} strokeWidth={1.5} />
            </div>
            <h2 className="subscribe-title">订阅非遗周刊</h2>
            <p className="subscribe-subtitle">
              获取最新故事、大师访谈和活动邀请。
            </p>
            <div className="subscribe-form">
              <Input
                placeholder="请输入您的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="subscribe-input"
                size="large"
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSubscribe}
                className="subscribe-button"
              >
                订阅
              </Button>
            </div>
          </div>
        </div>
      </section>

      <BackToTop />

      {/* 省份详情Modal */}
      <Modal
        title={
          selectedProvince
            ? `${selectedProvince.name} - ${selectedProvince.heritage}`
            : ""
        }
        open={modalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="close" onClick={handleModalClose}>
            关闭
          </Button>,
          selectedProvince ? (
            <Button
              key="learn"
              type="primary"
              onClick={() => {
                handleModalClose();
                navigate(`/search?q=${encodeURIComponent(selectedProvince.heritage)}`);
              }}
            >
              查看相关内容
            </Button>
          ) : null,
        ]}
        width={600}
      >
        {selectedProvince && (
          <div className="province-modal-content">
            <div className="province-info">
              <h3 className="province-heritage-title">
                {selectedProvince.heritage}
              </h3>
              {selectedProvince.imgUrl && (
                <div className="province-image-card">
                  <div className="province-image-16by9">
                    <Image
                      src={`/images/map/${selectedProvince.imgUrl}`}
                      alt={selectedProvince.heritage}
                      preview={{ mask: "点击放大查看" }}
                      className="province-image"
                    />
                  </div>
                </div>
              )}
              <p className="province-description">
                {selectedProvince.description}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* 大师详情Modal */}
      <Modal
        title={
          selectedMaster
            ? `${selectedMaster.name} · ${selectedMaster.category}`
            : ""
        }
        open={masterModalVisible}
        onCancel={closeMasterModal}
        footer={[
          <Button key="close" onClick={closeMasterModal}>
            关闭
          </Button>,
          <Button key="gallery" type="primary" onClick={() => navigate("/gallery")}>
            去作品库看看
          </Button>,
        ]}
        width={680}
      >
        {selectedMaster && (
          <div className="master-modal-content">
            <div className="master-modal-hero">
              <img
                src={selectedMaster.image}
                alt={selectedMaster.name}
                className="master-modal-image"
                onError={(e) => {
                  e.target.src = "/images/ihchina/b1.png";
                }}
              />
            </div>
            <p className="master-modal-description">{selectedMaster.description}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Home;
