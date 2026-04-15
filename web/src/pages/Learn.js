import React, { useEffect, useRef, useState } from "react";
import { Button, message, Upload, Modal } from "antd";
import {
  CheckCircle2,
  Music,
  PenTool,
  Scissors,
  Shapes,
  Sparkles,
  Theater,
  Upload as UploadIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";
import "./Learn.css";
import { LucideIcon } from "../components/icons/lucide";

const Learn = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [userWork, setUserWork] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [adviceModalVisible, setAdviceModalVisible] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisHint, setAnalysisHint] = useState("正在准备分析…");
  const progressTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  // 非遗技艺列表
  const skills = [
    { id: "peking-opera", name: "京剧", icon: Theater },
    { id: "paper-cutting", name: "剪纸", icon: Scissors },
    { id: "guqin", name: "古琴", icon: Music },
    { id: "embroidery", name: "刺绣", icon: Sparkles },
    { id: "pottery", name: "陶艺", icon: Shapes },
    { id: "calligraphy", name: "书法", icon: PenTool },
  ];

  // 第一步：选择技艺
  const handleSelectSkill = (skill) => {
    setSelectedSkill(skill);
    setCurrentStep(2);
  };

  // 第二步：上传作品
  const handleUploadWork = async (file) => {
    if (!user) {
      message.warning("请先登录");
      navigate("/login");
      return;
    }

    setUserWork(file);
    setCurrentStep(3);

    // 自动开始AI分析，传入最新的file和selectedSkill
    handleAnalyze(file, selectedSkill);
  };

  // 第三步：AI分析
  const handleAnalyze = async (workFile = null, skill = null) => {
    // 使用传入的参数，如果没有则使用状态值
    const fileToAnalyze = workFile || userWork;
    const skillToUse = skill || selectedSkill;

    if (!fileToAnalyze || !skillToUse) {
      message.warning("请先选择技艺并上传作品");
      return;
    }

    // 检查用户是否登录
    if (!user) {
      message.warning("请先登录");
      navigate("/login");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisProgress(0);
    setAnalysisHint("正在比对纹样细节…");

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    const hintStages = [
      { at: 12, text: "正在比对纹样细节…" },
      { at: 36, text: "正在评估线条节奏与结构…" },
      { at: 62, text: "正在校准风格一致性…" },
      { at: 82, text: "正在生成改进建议…" },
    ];

    progressTimerRef.current = window.setInterval(() => {
      setAnalysisProgress((p) => {
        const next = Math.min(
          90,
          p + Math.max(1, Math.round((90 - p) * 0.06))
        );
        const stage = [...hintStages].reverse().find((s) => next >= s.at);
        if (stage) setAnalysisHint(stage.text);
        return next;
      });
    }, 260);

    try {
      const formData = new FormData();
      formData.append("image", fileToAnalyze);
      formData.append("skill", skillToUse.id);
      formData.append("skillName", skillToUse.name);

      console.log("[AI分析] 发送请求:", {
        skill: skillToUse.id,
        skillName: skillToUse.name,
        fileName: fileToAnalyze.name,
        fileSize: fileToAnalyze.size,
        fileType: fileToAnalyze.type,
      });

      const response = await api.post("/ai/learn", formData, {
        timeout: 120000,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setAnalysisResult(response.data.data);
        setAnalysisProgress(100);
        setAnalysisHint("分析完成");
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        setCurrentStep(4);
        // 自动获取AI建议
        handleGetAdvice(response.data.data);
      } else {
        message.error(response.data.message || "AI分析失败");
      }
    } catch (error) {
      console.error("[AI分析] 失败:", error);
      
      // 提供更详细的错误信息
      if (error.response) {
        // 服务器返回了响应，但状态码不是 2xx
        const status = error.response.status;
        const errorMsg = error.response.data?.message || error.message;
        
        if (status === 404) {
          message.error("API接口不存在，请检查后端服务是否正常运行");
        } else if (status === 401) {
          message.error("认证失败，请重新登录");
          navigate("/login");
        } else if (status === 400) {
          message.error(errorMsg || "请求参数错误");
        } else if (status === 500) {
          message.error("服务器内部错误，请稍后重试");
        } else {
          message.error(errorMsg || `请求失败 (${status})`);
        }
      } else if (error.request) {
        // 请求已发出，但没有收到响应
        message.error("无法连接到服务器，请检查后端服务是否运行");
      } else {
        // 其他错误
        message.error(error.message || "AI分析失败，请重试");
      }
    } finally {
      setAnalyzing(false);
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
  };

  // 第四步：获得AI建议（使用后端返回的 10 套模板随机建议）
  const handleGetAdvice = (analysisData) => {
    try {
      if (analysisData?.advice) {
        setAiAdvice(analysisData.advice);
      } else {
        setAiAdvice({
          score: analysisData?.similarity ?? analysisData?.accuracy ?? 0,
          strengths: ["作品整体结构完整", "细节处理较为精细", "传统元素运用得当"],
          improvements: ["建议加强线条的流畅性", "可以尝试更丰富的色彩搭配", "注意保持传统风格的统一性"],
          learningPlan: {
            direction: "继续深入学习传统技艺",
            professional: "建议参考大师作品",
            skills: "重点练习基础技法",
            mentor: "可以寻找专业导师指导",
          },
        });
      }
    } catch (error) {
      console.error("获取建议失败:", error);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedSkill(null);
    setUserWork(null);
    setAnalysisResult(null);
    setAiAdvice(null);
  };

  return (
    <div
      className="ai-learn-page"
      style={{
        backgroundImage: `url(${
          process.env.PUBLIC_URL || ""
        }/images/aixueyi/bg.png)`,
        backgroundPosition: "center center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-frame">
          <h1 className="page-title">AI学艺</h1>
          <p className="page-subtitle">传习非遗,与AI共谱新章。</p>
        </div>
      </div>

      {/* 四步流程 */}
      <div className="steps-container">
        {/* 第一步：选择技艺 */}
        <div
          className={`step-card ${currentStep >= 1 ? "active" : ""} ${
            currentStep > 1 ? "completed" : ""
          }`}
          style={{
            backgroundImage: `url(${
              process.env.PUBLIC_URL || ""
            }/images/aixueyi/1.png)`,
          }}
        >
          <div className="step-content">
            <h3 className="step-title">第一步: 选择技艺</h3>
            <p className="step-description">
              浏览并选择您感兴趣的非遗技艺，如京剧、剪纸、古琴等，开始您的学习之旅。
            </p>
            {currentStep === 1 && (
              <div className="skills-grid">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="skill-card"
                    onClick={() => handleSelectSkill(skill)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectSkill(skill);
                    }}
                  >
                    <div className="skill-icon" aria-hidden="true">
                      <LucideIcon icon={skill.icon} size={22} strokeWidth={1.6} />
                    </div>
                    <div className="skill-name">{skill.name}</div>
                  </div>
                ))}
              </div>
            )}
            {currentStep > 1 && selectedSkill && (
              <div className="selected-skill">
                <LucideIcon icon={CheckCircle2} className="check-icon" />
                已选择：{selectedSkill.name}
              </div>
            )}
            {currentStep === 1 && (
              <Button
                type="primary"
                className="step-action-btn"
                onClick={() => {
                  if (selectedSkill) {
                    setCurrentStep(2);
                  } else {
                    message.warning("请先选择一项技艺");
                  }
                }}
                disabled={!selectedSkill}
              >
                开始选择
              </Button>
            )}
          </div>
        </div>

        {/* 连接线 */}
        <div className="step-connector">
          <img
            src={`${process.env.PUBLIC_URL || ""}/images/aixueyi/line.png`}
            alt="连接线"
            className="connector-line"
          />
        </div>

        {/* 第二步：上传作品 */}
        <div
          className={`step-card ${currentStep >= 2 ? "active" : ""} ${
            currentStep > 2 ? "completed" : ""
          }`}
          style={{
            backgroundImage: `url(${
              process.env.PUBLIC_URL || ""
            }/images/aixueyi/2.png)`,
          }}
        >
          <div className="step-content">
            <h3 className="step-title">第二步: 上传作品</h3>
            <p className="step-description">
              拍摄或录制您的练习作品，支持图片、视频或音频格式，轻松上传至平台。
            </p>
            {currentStep === 2 && (
              <div className="upload-section">
                <Upload
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith("image/");
                    const isVideo = file.type.startsWith("video/");
                    const isAudio = file.type.startsWith("audio/");
                    if (!isImage && !isVideo && !isAudio) {
                      message.error("只支持图片、视频或音频格式！");
                      return false;
                    }
                    handleUploadWork(file);
                    return false;
                  }}
                  showUploadList={false}
                  accept="image/*,video/*,audio/*"
                >
                  <div
                    className="upload-zone"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const btn = e.currentTarget.closest(".ant-upload");
                        btn?.click();
                      }
                    }}
                  >
                    <LucideIcon icon={UploadIcon} className="upload-icon" />
                    <p>点击或拖拽文件至此上传作品</p>
                    <p className="upload-hint">支持 PNG, JPG, MP4, MP3 格式</p>
                  </div>
                </Upload>
              </div>
            )}
            {currentStep > 2 && userWork && (
              <div className="uploaded-work">
                <LucideIcon icon={CheckCircle2} className="check-icon" />
                已上传：{userWork.name}
              </div>
            )}
          </div>
        </div>

        {/* 连接线 */}
        <div className="step-connector">
          <img
            src={`${process.env.PUBLIC_URL || ""}/images/aixueyi/line.png`}
            alt="连接线"
            className="connector-line"
          />
        </div>

        {/* 第三步：AI分析 */}
        <div
          className={`step-card ${currentStep >= 3 ? "active" : ""} ${
            currentStep > 3 ? "completed" : ""
          }`}
          style={{
            backgroundImage: `url(${
              process.env.PUBLIC_URL || ""
            }/images/aixueyi/3.png)`,
          }}
        >
          <div className="step-content">
            <h3 className="step-title">第三步: AI分析</h3>
            <p className="step-description">
              我们的AI系统将综合专家知识库，深入分析您的作品，识别关键细节与提升空间。
            </p>
            {currentStep === 3 && analyzing && (
              <div className="analysis-progress">
                <div className="progress-text">{analysisHint}</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 连接线 */}
        <div className="step-connector">
          <img
            src={`${process.env.PUBLIC_URL || ""}/images/aixueyi/line.png`}
            alt="连接线"
            className="connector-line"
          />
        </div>

        {/* 第四步：获得AI建议 */}
        <div
          className={`step-card ${currentStep >= 4 ? "active" : ""}`}
          style={{
            backgroundImage: `url(${
              process.env.PUBLIC_URL || ""
            }/images/aixueyi/4.png)`,
          }}
        >
          <div className="step-content">
            <h3 className="step-title">第四步: 获得AI的建议</h3>
            <p className="step-description">
              获取个性化、专业的指导建议与学习计划，助力您在非遗技艺上不断精进。
            </p>
            {currentStep === 4 && aiAdvice && (
              <div className="advice-trigger">
                <p className="advice-trigger-text">AI 已为您生成个性化学习建议</p>
                <Button
                  type="primary"
                  className="step-action-btn advice-open-btn"
                  onClick={() => setAdviceModalVisible(true)}
                >
                  查看详细建议
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI建议弹框 - 详细信息 */}
      <Modal
        open={adviceModalVisible}
        onCancel={() => setAdviceModalVisible(false)}
        footer={null}
        width={720}
        className="advice-modal"
        closable={true}
        centered
        destroyOnClose
        maskClosable={true}
        wrapClassName="advice-modal-wrap"
      >
        {aiAdvice && (
          <div className="advice-modal-inner">
            <div className="advice-modal-header">
              <span className="advice-modal-icon" aria-hidden="true">
                <LucideIcon icon={Sparkles} size={22} strokeWidth={1.6} />
              </span>
              <h2 className="advice-modal-title">AI 学习建议</h2>
              <p className="advice-modal-subtitle">传习非遗，与 AI 共谱新章</p>
            </div>
            <div className="advice-modal-content">
              {aiAdvice.score != null && (
                <div className="advice-modal-score advice-anim-block">
                  <span className="score-label">综合评分</span>
                  <span className="score-value">{aiAdvice.score}%</span>
                </div>
              )}
              <div className="advice-section advice-anim-block">
                <h4><span className="section-icon">●</span> 优势分析</h4>
                <ul>
                  {aiAdvice.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="advice-section advice-anim-block">
                <h4><span className="section-icon">●</span> 改进建议</h4>
                <ul>
                  {aiAdvice.improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>
              <div className="advice-section learning-plan advice-anim-block">
                <h4><span className="section-icon">●</span> 学习计划</h4>
                <div className="plan-items">
                  <div className="plan-item">
                    <strong>今后方向：</strong>
                    {aiAdvice.learningPlan.direction}
                  </div>
                  <div className="plan-item">
                    <strong>专业：</strong>
                    {aiAdvice.learningPlan.professional}
                  </div>
                  <div className="plan-item">
                    <strong>学习技艺：</strong>
                    {aiAdvice.learningPlan.skills}
                  </div>
                  <div className="plan-item">
                    <strong>导师：</strong>
                    {aiAdvice.learningPlan.mentor}
                  </div>
                </div>
              </div>
            </div>
            <div className="advice-modal-footer">
              <Button
                type="primary"
                className="advice-close-btn"
                onClick={() => setAdviceModalVisible(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 重置按钮 */}
      {currentStep > 1 && (
        <div className="reset-section">
          <Button onClick={handleReset} type="default">
            重新开始
          </Button>
        </div>
      )}
    </div>
  );
};

export default Learn;
