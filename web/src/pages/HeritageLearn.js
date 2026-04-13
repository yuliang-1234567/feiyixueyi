import React, { useState } from "react";
import { Button, Card, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import {
  RightOutlined,
  ReadOutlined,
  CrownOutlined,
  FireOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import "./HeritageLearn.css";

// 教程资源数据结构：{ title, type: 'video'|'article', url, source, description }
const TUTORIAL_RESOURCES = {
  苏绣: [
    {
      title: "苏绣劈线技法教学",
      type: "video",
      url: "https://www.bilibili.com/video/BV1rd4y1b7Wv/",
      source: "B站 刺绣国风馆",
      description: "介绍蚕丝线结构及劈线基础技法",
    },
    {
      title: "苏绣体验与研学",
      type: "article",
      url: "http://xue.suxiu.js.cn/",
      source: "钱亚清苏绣艺术中心",
      description: "苏绣在线课程与非遗研学资源",
    },
    {
      title: "《非遗里的中国》江苏篇·苏绣",
      type: "video",
      url: "https://tv.cctv.com/",
      source: "中央广播电视总台 CCTV",
      description: "央视节目展示宋明清三代苏绣风格与创新工艺",
    },
    {
      title: "《中国绣娘》纪录片",
      type: "video",
      url: "https://tv.cctv.com/",
      source: "央视纪录频道 CCTV-9，采访姚惠芬、姚建萍",
      description: "国家级非遗传承人苏绣创作故事",
    },
  ],
  京剧: [
    {
      title: "《跟我学》张馨月教京剧《凤还巢》",
      type: "video",
      url: "https://tv.cctv.com/2019/01/04/VIDEHQP79hJcbey8aBipxA3N190104.shtml",
      source: "中央广播电视总台 戏曲频道 CCTV-11",
      description: "北京京剧院梅派青衣、国家一级演员张馨月教授唱段",
    },
    {
      title: "《拿手好戏》京剧研学",
      type: "video",
      url: "https://tv.cctv.cn/",
      source: "中央广播电视总台，王珮瑜等京剧艺术家",
      description: "以戏带功的京剧研学教学节目",
    },
    {
      title: "京剧旦行小讲堂",
      type: "article",
      url: "https://www.cnpoc.cn/",
      source: "国家京剧院 国剧课堂",
      description: "旦行六大类别及表演方式系统讲解",
    },
  ],
  剪纸: [
    {
      title: "陈竟：中国民间剪纸艺术讲座",
      type: "article",
      url: "https://www.ihchina.cn/project_details/24109",
      source: "中国非物质文化遗产网，南京大学教授陈竟",
      description: "剪纸历史、分类、造型与技法系统讲座",
    },
    {
      title: "阜阳剪纸教学",
      type: "video",
      url: "https://www.ihchina.cn/art/detail/id/22009.html",
      source: "中国非物质文化遗产网，省级传承人葛庭友",
      description: "阜阳剪纸技法与图案教学",
    },
    {
      title: "非遗传承人宋胜林趣味剪纸课程",
      type: "video",
      url: "https://v.qq.com/x/cover/mzc00200wc8kfvr.html",
      source: "腾讯视频，非遗传承人宋胜林",
      description: "25集课程：一刀剪汉字、拉花、双喜、动物、花卉等",
    },
  ],
  古琴艺术: [
    {
      title: "杨青古琴初级课",
      type: "video",
      url: "https://v.qq.com/x/cover/mzc00200dqlc0ar.html",
      source: "腾讯视频，古琴艺术家杨青",
      description: "94集课程：从零起步学古琴、指法、曲目讲解",
    },
    {
      title: "王鹏古琴教学",
      type: "video",
      url: "https://v.qq.com/x/cover/6j0a3rnysi7ty9n.html",
      source: "腾讯视频，非遗传承人、斫琴师王鹏",
      description: "23集课程：指法、斫琴工艺、经典曲目教学",
    },
    {
      title: "古琴艺术非遗介绍",
      type: "article",
      url: "https://www.gov.cn/ztzl/whycr/content_638408.htm",
      source: "中国政府网 非物质文化遗产专题",
      description: "古琴艺术历史与保护概述",
    },
  ],
  景泰蓝: [
    {
      title: "【文化中国行】景泰蓝：釉彩生辉 掐丝成画",
      type: "video",
      url: "https://news.cctv.com/2025/06/15/ARTIdUKJAOJEc37psNQE1OzF250615.shtml",
      source: "中央广播电视总台 央视新闻",
      description: "景泰蓝制作工艺全流程介绍",
    },
    {
      title: "《探索·发现》景泰蓝点蓝工艺",
      type: "video",
      url: "https://tv.cctv.com/2021/03/02/VIDE0nNyBRUT2YtuTu1WsUbT210302.shtml",
      source: "中央广播电视总台 CCTV-10",
      description: "点蓝核心技艺详细展示",
    },
    {
      title: "景泰蓝制作技艺",
      type: "article",
      url: "https://www.bjdch.gov.cn/",
      source: "北京市东城区人民政府",
      description: "景泰蓝非遗项目与工艺流程介绍",
    },
  ],
  龙泉青瓷: [
    {
      title: "龙泉青瓷烧制技艺",
      type: "article",
      url: "https://www.ihchina.cn/project_details/20103.html",
      source: "中国非物质文化遗产网·中国非物质文化遗产数字博物馆",
      description: "龙泉青瓷历史、工艺流程与传承人介绍",
    },
    {
      title: "龙泉青瓷传统烧制技艺专题",
      type: "article",
      url: "https://www.ihchina.cn/longquanyao.html",
      source: "中国非物质文化遗产网",
      description: "全球首个陶瓷类人类非遗项目详细介绍",
    },
  ],
  皮影戏: [
    {
      title: "如何制作皮影",
      type: "article",
      url: "https://chiculture.org.hk/sc/china-five-thousand-years/1825",
      source: "中国文化研究院·灿烂的中国文明",
      description: "皮影制作八道工序：选皮、制皮、画稿、镂刻、敷彩等",
    },
    {
      title: "工美云课堂·皮影",
      type: "video",
      url: "https://z.hangzhou.com.cn/",
      source: "杭州工艺美术博物馆",
      description: "皮影制作与表演入门教学",
    },
    {
      title: "海宁皮影创新保护",
      type: "article",
      url: "https://www.ihchina.cn/project_details/10162.html",
      source: "中国非物质文化遗产网",
      description: "海宁皮影传承与传习班介绍",
    },
  ],
  宣纸制作技艺: [
    {
      title: "【文化中国行】宣纸：轻似蝉翼白如雪",
      type: "video",
      url: "https://news.cctv.cn/2025/03/16/ARTIEHjxjW1fh77ctTTPidMp250316.shtml",
      source: "中央广播电视总台 央视新闻",
      description: "宣纸制作技艺专题纪录片",
    },
    {
      title: "宣纸传统制作技艺专题",
      type: "article",
      url: "https://www.ihchina.cn/project_details/19043.html",
      source: "中国非物质文化遗产网",
      description: "宣纸六道工序与108道细分工艺介绍",
    },
    {
      title: "宣纸制作技艺专题片",
      type: "video",
      url: "https://www.ihchina.cn/project_details/25059",
      source: "中国非物质文化遗产网，中国艺术研究院",
      description: "《宣纸制造 首在于料》等系列专题片",
    },
  ],
};

// 非遗十大分类
const HERITAGE_CATEGORIES = [
  { id: "craft", name: "传统技艺", icon: "🔧", desc: "手工制作、织造、雕刻等技艺" },
  { id: "drama", name: "传统戏剧", icon: "🎭", desc: "京剧、昆曲、地方戏等" },
  { id: "music", name: "传统音乐", icon: "🎵", desc: "古琴、民间音乐、器乐" },
  { id: "dance", name: "传统舞蹈", icon: "💃", desc: "民族舞、民间舞" },
  { id: "folklore", name: "民俗", icon: "🏮", desc: "节庆习俗、民间信仰" },
  { id: "medicine", name: "传统医药", icon: "🌿", desc: "中医、中药、针灸" },
  { id: "acrobatics", name: "杂技与竞技", icon: "🤸", desc: "武术、杂技" },
  { id: "oral", name: "口头传统", icon: "📜", desc: "传说、说唱、史诗" },
  { id: "art", name: "传统美术", icon: "🎨", desc: "剪纸、刺绣、年画" },
  { id: "calligraphy", name: "书法与篆刻", icon: "🖋️", desc: "书法、篆刻艺术" },
];

// 精选非遗项目
const FEATURED_ITEMS = [
  {
    id: 1,
    name: "苏绣",
    category: "传统技艺",
    description: "中国四大名绣之一，以针法精细、色彩雅致著称，已有两千余年历史。",
  },
  {
    id: 2,
    name: "京剧",
    category: "传统戏剧",
    description: "国粹艺术，融合唱、念、做、打，被誉为中国传统文化的重要象征。",
  },
  {
    id: 3,
    name: "剪纸",
    category: "传统美术",
    description: "用剪刀或刻刀在纸上剪刻花纹，广泛应用于节庆装饰与民俗活动。",
  },
  {
    id: 4,
    name: "古琴艺术",
    category: "传统音乐",
    description: "中国最古老的弹拨乐器之一，被联合国列入人类非物质文化遗产。",
  },
  {
    id: 5,
    name: "景泰蓝",
    category: "传统技艺",
    description: "铜胎掐丝珐琅工艺，以蓝为主色，具有浓厚的宫廷艺术风格。",
  },
  {
    id: 6,
    name: "龙泉青瓷",
    category: "传统技艺",
    description: "青瓷烧制技艺代表，以青如玉、明如镜、声如磬闻名于世。",
  },
  {
    id: 7,
    name: "皮影戏",
    category: "传统戏剧",
    description: "以兽皮或纸板做成的人物剪影表演故事，是中国民间广为流传的傀儡戏。",
  },
  {
    id: 8,
    name: "宣纸制作技艺",
    category: "传统技艺",
    description: "有纸中之王之称，质地绵韧、纹理纯净，宜书宜画。",
  },
];

// 学习路径步骤
const LEARNING_PATH = [
  { step: 1, title: "学习非遗", desc: "了解非遗知识与分类", path: "/heritage-learn" },
  { step: 2, title: "AI学艺", desc: "上传作品获取智能点评", path: "/learn" },
  { step: 3, title: "数字焕新", desc: "将纹样应用到现代产品", path: "/transform" },
];

const HeritageLearn = () => {
  const navigate = useNavigate();
  const [tutorialModalVisible, setTutorialModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setTutorialModalVisible(true);
  };

  const tutorials = selectedItem ? (TUTORIAL_RESOURCES[selectedItem.name] || []) : [];

  return (
    <div className="heritage-learn-page">
      {/* Hero */}
      <section className="heritage-hero">
        <div className="heritage-hero-bg" />
        <div className="heritage-hero-content">
          <span className="heritage-hero-badge">非遗入门</span>
          <h1 className="heritage-hero-title">学习非遗</h1>
          <p className="heritage-hero-subtitle">
            认识、理解、传承中华优秀传统文化
          </p>
        </div>
      </section>

      {/* 非遗概述 */}
      <section className="heritage-overview section-block">
        <div className="section-container">
          <h2 className="section-title">
            <ReadOutlined className="section-icon" />
            什么是非物质文化遗产
          </h2>
          <div className="overview-content">
            <p>
              非物质文化遗产（简称非遗）是指各族人民世代相传，并视为其文化遗产组成部分的各种传统文化表现形式，以及与传统文化表现形式相关的实物和场所。
            </p>
            <p>
              包括传统口头文学、传统美术、传统技艺、传统医药、民俗等。保护非遗，是对民族根脉的守护，也是文化自信的体现。通过学习和传承，让古老技艺在新时代焕发生机。
            </p>
          </div>
        </div>
      </section>

      {/* 非遗十大分类 */}
      <section className="heritage-categories section-block">
        <div className="section-container">
          <h2 className="section-title">
            <CrownOutlined className="section-icon" />
            非遗十大分类
          </h2>
          <div className="categories-grid">
            {HERITAGE_CATEGORIES.map((cat) => (
              <Card key={cat.id} className="category-card" hoverable>
                <span className="category-icon">{cat.icon}</span>
                <h3 className="category-name">{cat.name}</h3>
                <p className="category-desc">{cat.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 精选非遗项目 */}
      <section className="heritage-featured section-block">
        <div className="section-container">
          <h2 className="section-title">
            <FireOutlined className="section-icon" />
            精选非遗项目
          </h2>
          <div className="featured-grid">
            {FEATURED_ITEMS.map((item) => (
              <Card
                key={item.id}
                className="featured-card featured-card-clickable"
                hoverable
                onClick={() => handleCardClick(item)}
              >
                <div className="featured-tag">{item.category}</div>
                <h3 className="featured-name">{item.name}</h3>
                <p className="featured-desc">{item.description}</p>
                <span className="featured-hint">点击查看学习教程 →</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 学习路径 */}
      <section className="heritage-path section-block">
        <div className="section-container">
          <h2 className="section-title">
            <EnvironmentOutlined className="section-icon" />
            推荐学习路径
          </h2>
          <div className="path-steps">
            {LEARNING_PATH.map((item, index) => (
              <div key={item.step} className="path-step-wrapper">
                <div className="path-step">
                  <span className="path-step-num">{item.step}</span>
                  <h3 className="path-step-title">{item.title}</h3>
                  <p className="path-step-desc">{item.desc}</p>
                  <Button
                    type="primary"
                    className="path-step-btn"
                    onClick={() => navigate(item.path)}
                  >
                    进入 <RightOutlined />
                  </Button>
                </div>
                {index < LEARNING_PATH.length - 1 && (
                  <div className="path-arrow">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 教程弹窗 */}
      <Modal
        title={
          selectedItem ? (
            <span>
              <PlayCircleOutlined /> {selectedItem.name} 学习教程
            </span>
          ) : (
            ""
          )
        }
        open={tutorialModalVisible}
        onCancel={() => setTutorialModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTutorialModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={720}
        className="heritage-tutorial-modal"
      >
        {selectedItem && (
          <div className="tutorial-modal-content">
            <div className="tutorial-intro">
              <p>{selectedItem.description}</p>
              <p className="tutorial-intro-note">
                以下教程资源来自互联网，仅供学习参考。点击链接跳转至原作者/机构页面。
              </p>
            </div>
            <div className="tutorial-list">
              {tutorials.length > 0 ? (
                tutorials.map((t, idx) => (
                  <a
                    key={idx}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tutorial-item"
                  >
                    <span className="tutorial-item-icon">
                      {t.type === "video" ? (
                        <PlayCircleOutlined />
                      ) : (
                        <FileTextOutlined />
                      )}
                    </span>
                    <div className="tutorial-item-body">
                      <div className="tutorial-item-title">{t.title}</div>
                      <div className="tutorial-item-source">
                        <LinkOutlined /> 引用来源：{t.source}
                      </div>
                      <div className="tutorial-item-desc">{t.description}</div>
                    </div>
                    <RightOutlined className="tutorial-item-arrow" />
                  </a>
                ))
              ) : (
                <p className="tutorial-empty">暂无教程资源</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HeritageLearn;
