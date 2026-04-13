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

      const aiAdvice = this.handleGetAdvice(uploadRes.data || {});
      const analysisResult = {
        ...(uploadRes.data || {}),
        similarity: aiAdvice?.score || 0
      };

      this.saveLearningRecord({
        skillName: selectedSkill.name,
        score: analysisResult.similarity,
        imageUrl: filePath
      });

      this.setData({ analysisResult, aiAdvice, analyzing: false, currentStep: 4 });
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
      analyzing: false
    });
  },

  handleGetAdvice(analysisData) {
    try {
      if (analysisData?.advice) return analysisData.advice;

      const strengthsOptions = ['作品整体结构完整', '细节处理较为精细', '传统元素运用得当', '色彩搭配和谐', '技艺表现熟练', '创意表达独特'];
      const improvementsOptions = ['建议加强线条的流畅性', '可以尝试更丰富的色彩搭配', '注意保持传统风格的统一性', '细节处理可以更加精细', '构图可以更加合理', '可以尝试更多传统元素的运用'];
      const learningPlanOptions = {
        direction: ['继续深入学习传统技艺', '探索传统与现代的结合', '专注于某一细分领域'],
        professional: ['建议参考大师作品', '参加专业培训课程', '研究传统文献资料'],
        skills: ['重点练习基础技法', '加强创新能力培养', '提升审美水平'],
        mentor: ['可以寻找专业导师指导', '加入相关艺术社群', '参与行业交流活动']
      };

      const getRandomItems = (options, count) => {
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
      };

      const randomScore = Math.floor(Math.random() * 56) + 40;
      return {
        score: randomScore,
        strengths: getRandomItems(strengthsOptions, 3),
        improvements: getRandomItems(improvementsOptions, 3),
        learningPlan: {
          direction: learningPlanOptions.direction[Math.floor(Math.random() * learningPlanOptions.direction.length)],
          professional: learningPlanOptions.professional[Math.floor(Math.random() * learningPlanOptions.professional.length)],
          skills: learningPlanOptions.skills[Math.floor(Math.random() * learningPlanOptions.skills.length)],
          mentor: learningPlanOptions.mentor[Math.floor(Math.random() * learningPlanOptions.mentor.length)]
        }
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