const API_BASE_URL = 'https://feiyixueyi.cn/api';
const LEARNING_RECORDS_KEY = 'learning_records_v1';

Page({
  data: {
    currentStep: 1,
    selectedSkill: null,
    userWork: null,
    analyzing: false,
    analysisResult: null,
    aiAdvice: null,
    aiMeta: null,
    skills: [
      { id: 'peking-opera', name: '京剧', icon: '🎭' },
      { id: 'paper-cutting', name: '剪纸', icon: '✂️' },
      { id: 'guqin', name: '古琴', icon: '🎵' },
      { id: 'embroidery', name: '刺绣', icon: '🧵' },
      { id: 'pottery', name: '陶艺', icon: '🏺' },
      { id: 'calligraphy', name: '书法', icon: '🖋️' }
    ]
  },

  selectSkill(e) {
    const skill = e.currentTarget.dataset.skill;
    this.setData({
      selectedSkill: skill,
      currentStep: 2
    });
  },

  chooseImage() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/ai-learn/ai-learn')
        });
      }, 1000);
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({ userWork: tempFilePath, currentStep: 3 });
        this.analyzeWork(tempFilePath);
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  async analyzeWork(filePath) {
    const { selectedSkill } = this.data;
    if (!selectedSkill) {
      wx.showToast({ title: '请先选择技艺', icon: 'none' });
      this.setData({ currentStep: 1 });
      return;
    }

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ analyzing: true });

    try {
      const baseUrl = API_BASE_URL.replace('/api', '');
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${baseUrl}/api/ai/learn`,
          filePath,
          name: 'image',
          formData: {
            skill: selectedSkill.id,
            skillName: selectedSkill.name
          },
          header: { Authorization: `Bearer ${token}` },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (data.success) resolve(data);
              else reject(new Error(data.message || '分析失败'));
            } catch (error) {
              reject(new Error('解析响应失败'));
            }
          },
          fail: (err) => reject(err)
        });
      });

      const backendData = uploadRes.data || {};
      const aiAdvice = this.handleGetAdvice(backendData);
      const analysisResult = {
        ...backendData,
        similarity: aiAdvice?.score || backendData?.similarity || 0
      };

      this.saveLearningRecord({
        skillName: selectedSkill.name,
        score: analysisResult.similarity,
        imageUrl: filePath
      });

      this.setData({
        analysisResult,
        aiAdvice,
        aiMeta: backendData?.ai || null,
        analyzing: false,
        currentStep: 4
      });
      wx.showToast({ title: '分析完成', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '分析失败，请重试', icon: 'none' });
      this.setData({ analyzing: false, currentStep: 2 });
    }
  },

  saveLearningRecord(record) {
    const raw = wx.getStorageSync(LEARNING_RECORDS_KEY);
    const list = Array.isArray(raw) ? raw : [];
    list.unshift({
      id: `learn-${Date.now()}`,
      skillName: record.skillName,
      score: Number(record.score) || 0,
      imageUrl: record.imageUrl,
      createdAt: new Date().toISOString()
    });
    wx.setStorageSync(LEARNING_RECORDS_KEY, list.slice(0, 100));
  },

  restart() {
    this.setData({
      currentStep: 1,
      selectedSkill: null,
      userWork: null,
      analysisResult: null,
      aiAdvice: null,
      aiMeta: null,
      analyzing: false
    });
  },

  handleGetAdvice(analysisData) {
    try {
      if (analysisData?.advice) return analysisData.advice;

      const scoreFromBackend = Number(analysisData?.accuracy || analysisData?.score || 60);
      const stableScore = Math.max(0, Math.min(100, Math.round(scoreFromBackend)));
      const scoreBand = stableScore >= 80 ? 'high' : stableScore >= 60 ? 'mid' : 'low';

      const strengthsByBand = {
        high: ['作品整体结构完整', '传统元素运用得当', '细节处理较为精细'],
        mid: ['作品主题表达清晰', '基础技法较为扎实', '整体风格较为统一'],
        low: ['完成度较高', '尝试了传统元素表达', '具备继续提升的基础']
      };

      const improvementsByBand = {
        high: ['可进一步强化个人风格辨识度', '尝试更高难度的细节层次', '加强文化意象表达深度'],
        mid: ['建议加强线条的流畅性', '细节处理可以更加精细', '构图可以更加合理'],
        low: ['建议先稳固基础技法训练', '注意作品整体比例与节奏', '建议从经典临摹开始逐步进阶']
      };

      const plansByBand = {
        high: {
          direction: '继续深入学习传统技艺，并形成个人表达体系',
          professional: '建议对标代表性大师作品进行专题研习',
          skills: '围绕精细化刻画与文化叙事进行专项训练',
          mentor: '建议参加传承人工作坊并接受阶段性点评'
        },
        mid: {
          direction: '先稳固核心技法，再逐步尝试创新表达',
          professional: '建议结合教材与案例进行系统化训练',
          skills: '重点练习构图、线条与层次关系',
          mentor: '建议加入同领域学习社群进行互评'
        },
        low: {
          direction: '以基础能力建立为主，循序渐进提升完成度',
          professional: '建议从经典作品拆解技法路径',
          skills: '优先训练基础手法与规范流程',
          mentor: '建议寻找入门导师进行阶段性指导'
        }
      };

      return {
        score: stableScore,
        strengths: strengthsByBand[scoreBand],
        improvements: improvementsByBand[scoreBand],
        learningPlan: plansByBand[scoreBand]
      };
    } catch (error) {
      return null;
    }
  },

  goBack() {
    const { currentStep } = this.data;
    if (currentStep === 4 || currentStep === 3) {
      this.setData({ currentStep: 2, analyzing: false });
      return;
    }
    if (currentStep === 2) {
      this.setData({ currentStep: 1 });
      return;
    }
    wx.navigateBack();
  }
});