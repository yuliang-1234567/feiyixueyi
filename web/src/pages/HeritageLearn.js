import React, { useState } from "react";
import { Button, Card, Checkbox, Empty, Input, message, Modal, Radio, Select, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import {
  BookOpenText,
  ChevronRight,
  Crown,
  FileText,
  Flame,
  Dumbbell,
  Landmark,
  Leaf,
  Link as LinkIcon,
  MapPin,
  Music,
  PenTool,
  PersonStanding,
  Play,
  ScrollText,
  Send,
  Theater,
  Trophy,
  Wrench,
  Palette,
} from "lucide-react";
import "./HeritageLearn.css";
import { LucideIcon } from "../components/icons/lucide";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";

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
  {
    id: "craft",
    name: "传统技艺",
    icon: Wrench,
    desc: "手工制作、织造、雕刻等技艺",
  },
  {
    id: "drama",
    name: "传统戏剧",
    icon: Theater,
    desc: "京剧、昆曲、地方戏等",
  },
  { id: "music", name: "传统音乐", icon: Music, desc: "古琴、民间音乐、器乐" },
  {
    id: "dance",
    name: "传统舞蹈",
    icon: PersonStanding,
    desc: "民族舞、民间舞",
  },
  { id: "folklore", name: "民俗", icon: Landmark, desc: "节庆习俗、民间信仰" },
  { id: "medicine", name: "传统医药", icon: Leaf, desc: "中医、中药、针灸" },
  { id: "acrobatics", name: "杂技与竞技", icon: Dumbbell, desc: "武术、杂技" },
  { id: "oral", name: "口头传统", icon: ScrollText, desc: "传说、说唱、史诗" },
  { id: "art", name: "传统美术", icon: Palette, desc: "剪纸、刺绣、年画" },
  {
    id: "calligraphy",
    name: "书法与篆刻",
    icon: PenTool,
    desc: "书法、篆刻艺术",
  },
];

// 精选非遗项目
const FEATURED_ITEMS = [
  {
    id: 1,
    name: "苏绣",
    category: "传统技艺",
    description:
      "中国四大名绣之一，以针法精细、色彩雅致著称，已有两千余年历史。",
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
    description:
      "以兽皮或纸板做成的人物剪影表演故事，是中国民间广为流传的傀儡戏。",
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
  {
    step: 1,
    title: "学习非遗",
    desc: "了解非遗知识与分类",
    path: "/heritage-learn",
  },
  { step: 2, title: "AI学艺", desc: "上传作品获取智能点评", path: "/learn" },
  {
    step: 3,
    title: "数字焕新",
    desc: "将纹样应用到现代产品",
    path: "/transform",
  },
];

const HeritageLearn = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tutorialModalVisible, setTutorialModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [qaModalVisible, setQaModalVisible] = useState(false);
  const [qaEntryMode, setQaEntryMode] = useState("qa");
  const [qaCategoryId, setQaCategoryId] = useState(HERITAGE_CATEGORIES[0].id);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const [qaHistoryLoading, setQaHistoryLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizSessionId, setQuizSessionId] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setTutorialModalVisible(true);
  };

  const currentCategory =
    HERITAGE_CATEGORIES.find((item) => item.id === qaCategoryId) ||
    HERITAGE_CATEGORIES[0];

  const categoryOptions = HERITAGE_CATEGORIES.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  const requireLoginBeforeAction = () => {
    if (user) return false;
    message.warning("请先登录后使用问答与闯关");
    navigate(`/login?redirect=${encodeURIComponent("/heritage-learn")}`);
    return true;
  };

  const resetQuizState = () => {
    setQuizSessionId(null);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const loadQaHistory = async (categoryId = qaCategoryId) => {
    if (requireLoginBeforeAction()) return;
    setQaHistoryLoading(true);
    try {
      const res = await api.get("/ai/heritage-qa-history", {
        params: {
          categoryId,
          limit: 20,
        },
      });
      if (res.data?.success) {
        setQaHistory(res.data?.data?.list || []);
      }
    } catch (error) {
      message.error("加载问答历史失败");
    } finally {
      setQaHistoryLoading(false);
    }
  };

  const openQaModal = async (mode = "qa") => {
    if (requireLoginBeforeAction()) return;
    setQaEntryMode(mode);
    setQaModalVisible(true);
    if (mode === "qa") {
      loadQaHistory(qaCategoryId);
      return;
    }
    resetQuizState();
  };

  const handleAskQuestion = async () => {
    const question = qaQuestion.trim();
    if (!question) {
      message.warning("请输入你的问题");
      return;
    }

    setQaSubmitting(true);
    try {
      const res = await api.post("/ai/ask-heritage", {
        categoryId: currentCategory.id,
        categoryName: currentCategory.name,
        question,
        historyLimit: 20,
      });
      if (res.data?.success) {
        setQaQuestion("");
        setQaHistory(res.data?.data?.history || []);
        message.success("已生成回答");
      } else {
        message.error(res.data?.message || "提问失败");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "提问失败，请稍后重试");
    } finally {
      setQaSubmitting(false);
    }
  };

  const startQuizChallenge = async () => {
    if (requireLoginBeforeAction()) return;
    setQuizLoading(true);
    try {
      const res = await api.get("/ai/quiz/challenge/start", {
        params: {
          categoryId: currentCategory.id,
          categoryName: currentCategory.name,
          difficulty: "medium",
        },
      });
      if (res.data?.success) {
        const payload = res.data.data || {};
        setQuizSessionId(payload.sessionId);
        setQuizQuestions(payload.questions || []);
        setQuizAnswers({});
        setQuizResult(null);
      } else {
        message.error(res.data?.message || "开始闯关失败");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "开始闯关失败");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectQuizOption = (questionId, selectedOption) => {
    const text = Array.isArray(selectedOption)
      ? [...new Set(selectedOption.map((item) => String(item).toUpperCase()))].sort().join("")
      : String(selectedOption || "").toUpperCase().trim();

    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const normalizeQuestionType = (item) => {
    const type = String(item?.questionType || "single").toLowerCase();
    if (["single", "multiple", "judge"].includes(type)) return type;
    return "single";
  };

  const isSelectionValidForType = (question, answer) => {
    const type = normalizeQuestionType(question);
    const text = String(answer || "").toUpperCase().trim();
    const optionKeys = Object.keys(question.options || {});
    if (!text) return false;

    if (type === "multiple") {
      const chars = [...new Set(text.replace(/[^A-F]/g, "").split(""))];
      if (chars.length < 2) return false;
      return chars.every((ch) => optionKeys.includes(ch));
    }

    if (text.length !== 1) return false;
    return optionKeys.includes(text);
  };

  const getAnsweredCount = () =>
    quizQuestions.filter((item) => isSelectionValidForType(item, quizAnswers[item.questionId])).length;

  const formatAnswerByType = (questionType, answer) => {
    const text = String(answer || "").toUpperCase().trim();
    if (!text) return "未作答";
    if (questionType === "judge") {
      if (text === "A") return "正确";
      if (text === "B") return "错误";
    }
    if (questionType === "multiple") {
      return text.split("").join("、");
    }
    return text;
  };

  const submitQuizChallenge = async () => {
    if (!quizSessionId || quizQuestions.length === 0) {
      message.warning("请先开始闯关");
      return;
    }

    const invalidQuestions = quizQuestions.filter(
      (item) => !isSelectionValidForType(item, quizAnswers[item.questionId])
    );
    if (invalidQuestions.length > 0) {
      const first = invalidQuestions[0];
      const qType = normalizeQuestionType(first);
      const tips =
        qType === "multiple"
          ? "多选题请至少选择2项"
          : qType === "judge"
            ? "判断题请选择“正确”或“错误”"
            : "单选题请选择且仅选择1项";
      message.warning(`第 ${first.number} 题未按格式作答：${tips}`);
      return;
    }

    setQuizSubmitting(true);
    try {
      const res = await api.post("/ai/quiz/challenge/submit", {
        sessionId: quizSessionId,
        answers: quizQuestions.map((item) => ({
          questionId: item.questionId,
          selectedOption: String(quizAnswers[item.questionId] || "").toUpperCase(),
        })),
      });
      if (res.data?.success) {
        setQuizResult(res.data?.data || null);
        message.success("闯关完成，已显示标准答案");
      } else {
        message.error(res.data?.message || "提交失败");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "提交失败，请稍后重试");
    } finally {
      setQuizSubmitting(false);
    }
  };

  const canSubmitQuiz =
    quizQuestions.length > 0 &&
    quizQuestions.every((item) => isSelectionValidForType(item, quizAnswers[item.questionId]));

  const tutorials = selectedItem
    ? TUTORIAL_RESOURCES[selectedItem.name] || []
    : [];
  const orderedTutorials = tutorials.slice();
  // 推荐顺序：优先视频入门，再文章补全（简单规则，避免空洞“列表”）
  orderedTutorials.sort((a, b) => {
    const aw = a.type === "video" ? 0 : 1;
    const bw = b.type === "video" ? 0 : 1;
    return aw - bw;
  });

  return (
    <div className="heritage-learn-page">
      {/* Hero */}
      <section className="heritage-hero">
        <div className="heritage-hero-bg">
          <img
            src="/images/heritageLearn/heritage-learn-bg.png"
            alt="非遗传承"
            className="heritage-hero-bg-image"
          />
        </div>
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
            <LucideIcon icon={BookOpenText} className="section-icon" />
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
          <div className="section-title-row">
            <h2 className="section-title">
              <LucideIcon icon={Crown} className="section-icon" />
              非遗十大分类
            </h2>
            <div className="qa-entry-actions">
              <Button
                type="primary"
                className="qa-entry-btn"
                onClick={() => openQaModal("qa")}
              >
                非遗问答
              </Button>
              <Button
                type="primary"
                className="qa-entry-btn"
                onClick={() => openQaModal("quiz")}
              >
                答题闯关
              </Button>
            </div>
          </div>
          <div className="categories-grid">
            {HERITAGE_CATEGORIES.map((cat) => (
              <Card key={cat.id} className="category-card" hoverable>
                <span className="category-icon" aria-hidden="true">
                  <LucideIcon icon={cat.icon} size={22} strokeWidth={1.6} />
                </span>
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
            <LucideIcon icon={Flame} className="section-icon" />
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
            <LucideIcon icon={MapPin} className="section-icon" />
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
                    进入 <LucideIcon icon={ChevronRight} />
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
        title={qaEntryMode === "quiz" ? "答题闯关" : "非遗问答"}
        open={qaModalVisible}
        onCancel={() => setQaModalVisible(false)}
        footer={null}
        width={980}
        className="heritage-qa-modal"
        destroyOnClose
      >
        <div className="qa-hub-content">
          <div className="qa-hub-top">
            <div className="qa-entry-mode-indicator">
              {qaEntryMode === "quiz" ? "答题闯关（10题）" : "AI自由问答"}
            </div>
            <Select
              value={qaCategoryId}
              options={categoryOptions}
              onChange={(value) => {
                setQaCategoryId(value);
                if (qaEntryMode === "qa") {
                  loadQaHistory(value);
                } else {
                  resetQuizState();
                }
              }}
              style={{ minWidth: 180 }}
            />
          </div>

          {qaEntryMode === "qa" ? (
            <div className="qa-mode-panel">
              <div className="qa-input-wrap">
                <Input.TextArea
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="输入你想问的非遗问题，例如：昆曲水磨腔的学习路径应该怎么安排？"
                />
                <div className="qa-input-actions">
                  <Button
                    type="primary"
                    icon={<LucideIcon icon={Send} />}
                    loading={qaSubmitting}
                    onClick={handleAskQuestion}
                  >
                    发送问题
                  </Button>
                </div>
              </div>

              <div className="qa-history-wrap">
                <div className="qa-history-title">历史对话</div>
                {qaHistoryLoading ? (
                  <p className="qa-loading-text">加载中...</p>
                ) : qaHistory.length === 0 ? (
                  <Empty description="暂无问答记录，先提一个问题吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div className="qa-message-list">
                    {qaHistory.map((item) => (
                      <div key={item.id} className="qa-message-item">
                        <div className="qa-question">问：{item.question}</div>
                        <div className="qa-answer">答：{item.answer}</div>
                        <div className="qa-meta">
                          <Tag>{item.categoryName}</Tag>
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="quiz-mode-panel">
              {!quizSessionId && !quizResult ? (
                <div className="quiz-start-box">
                  <p>当前将按「{currentCategory.name}」生成并下发 10 道混合题（单选+多选+判断）。</p>
                  <p>规则：必须全部答完后，才显示正确答案与解析。</p>
                  <Button type="primary" loading={quizLoading} onClick={startQuizChallenge}>
                    开始10题闯关
                  </Button>
                </div>
              ) : null}

              {quizSessionId && !quizResult ? (
                <div className="quiz-questions-wrap">
                  <div className="quiz-progress">
                    已作答 {getAnsweredCount()} / {quizQuestions.length}
                  </div>
                  {quizQuestions.map((item) => (
                    <div key={item.questionId} className="quiz-question-item">
                      <div className="quiz-stem">
                        {item.number}. {item.stem}
                        <Tag className="quiz-type-tag" color={
                          item.questionType === "multiple"
                            ? "purple"
                            : item.questionType === "judge"
                              ? "geekblue"
                              : "gold"
                        }>
                          {item.questionType === "multiple"
                            ? "多选题"
                            : item.questionType === "judge"
                              ? "判断题"
                              : "单选题"}
                        </Tag>
                      </div>
                      {item.questionType === "multiple" ? (
                        <Checkbox.Group
                          value={String(quizAnswers[item.questionId] || "").split("").filter(Boolean)}
                          onChange={(vals) => handleSelectQuizOption(item.questionId, vals)}
                        >
                          <div className="quiz-options">
                            {Object.entries(item.options || {}).map(([optionKey, optionText]) => (
                              <Checkbox key={optionKey} value={optionKey}>
                                {optionKey}. {optionText}
                              </Checkbox>
                            ))}
                          </div>
                        </Checkbox.Group>
                      ) : item.questionType === "judge" ? (
                        <div className="quiz-judge-actions">
                          <Button
                            className={`quiz-judge-btn ${quizAnswers[item.questionId] === "A" ? "active" : ""}`}
                            type={quizAnswers[item.questionId] === "A" ? "primary" : "default"}
                            onClick={() => handleSelectQuizOption(item.questionId, "A")}
                          >
                            正确
                          </Button>
                          <Button
                            className={`quiz-judge-btn ${quizAnswers[item.questionId] === "B" ? "active" : ""}`}
                            type={quizAnswers[item.questionId] === "B" ? "primary" : "default"}
                            onClick={() => handleSelectQuizOption(item.questionId, "B")}
                          >
                            错误
                          </Button>
                        </div>
                      ) : (
                        <Radio.Group
                          value={quizAnswers[item.questionId]}
                          onChange={(e) => handleSelectQuizOption(item.questionId, e.target.value)}
                        >
                          <div className="quiz-options">
                            {Object.entries(item.options || {}).map(([optionKey, optionText]) => (
                              <Radio key={optionKey} value={optionKey}>
                                {optionKey}. {optionText}
                              </Radio>
                            ))}
                          </div>
                        </Radio.Group>
                      )}
                    </div>
                  ))}
                  <div className="quiz-submit-row">
                    <Button
                      type="primary"
                      loading={quizSubmitting}
                      disabled={!canSubmitQuiz}
                      onClick={submitQuizChallenge}
                    >
                      提交并查看正确答案
                    </Button>
                  </div>
                </div>
              ) : null}

              {quizResult ? (
                <div className="quiz-result-wrap">
                  <div className="quiz-score-box">
                    <LucideIcon icon={Trophy} />
                    <span>
                      本次得分：{quizResult.score} 分（答对 {quizResult.correctCount} / {quizResult.totalQuestions || 10}）
                    </span>
                  </div>
                  <div className="quiz-result-list">
                    {(quizResult.answers || []).map((item, idx) => (
                      <div key={item.questionId} className="quiz-result-item">
                        <div className="quiz-stem">
                          {idx + 1}. {item.stem}
                        </div>
                        <div className="quiz-result-line">
                          你的答案：{formatAnswerByType(item.questionType, item.selectedOption)}
                        </div>
                        <div className="quiz-result-line">
                          正确答案：{formatAnswerByType(item.questionType, item.correctAnswer || item.correctOption)}
                        </div>
                        <div className="quiz-result-line">解析：{item.explanation}</div>
                        <Tag color={item.isCorrect ? "success" : "error"}>
                          {item.isCorrect ? "正确" : "错误"}
                        </Tag>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      resetQuizState();
                    }}
                  >
                    再来一轮
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={
          selectedItem ? (
            <span>
              <LucideIcon icon={Play} /> {selectedItem.name} 学习教程
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
          selectedItem ? (
            <Button
              key="practice"
              type="primary"
              onClick={() => {
                setTutorialModalVisible(false);
                navigate(
                  `/learn?skillName=${encodeURIComponent(selectedItem.name)}`
                );
              }}
            >
              去 AI 学艺上传练习
            </Button>
          ) : null,
          selectedItem ? (
            <Button
              key="search"
              onClick={() => {
                setTutorialModalVisible(false);
                navigate(`/search?q=${encodeURIComponent(selectedItem.name)}`);
              }}
            >
              在地图/搜索中查看相关
            </Button>
          ) : null,
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
            <div className="tutorial-recommend">
              <div className="tutorial-recommendTitle">推荐顺序</div>
              <ol className="tutorial-recommendSteps">
                <li>先看：入门视频，建立手感与节奏</li>
                <li>再练：跟练一遍，拍照/录制保存</li>
                <li>后拓展：阅读文章与纪录片，补全体系</li>
              </ol>
            </div>
            <div className="tutorial-list">
              {orderedTutorials.length > 0 ? (
                orderedTutorials.map((t, idx) => (
                  <a
                    key={idx}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tutorial-item"
                  >
                    <span className="tutorial-item-rank" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="tutorial-item-icon">
                      {t.type === "video" ? (
                        <LucideIcon icon={Play} />
                      ) : (
                        <LucideIcon icon={FileText} />
                      )}
                    </span>
                    <div className="tutorial-item-body">
                      <div className="tutorial-item-title">{t.title}</div>
                      <div className="tutorial-item-source">
                        <LucideIcon icon={LinkIcon} /> 引用来源：{t.source}
                      </div>
                      <div className="tutorial-item-desc">{t.description}</div>
                    </div>
                    <LucideIcon
                      icon={ChevronRight}
                      className="tutorial-item-arrow"
                    />
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
