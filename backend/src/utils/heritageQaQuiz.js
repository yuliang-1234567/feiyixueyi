const OpenAI = require('openai');

const HERITAGE_QA_PROMPT_VERSION = 'v1';
const DEFAULT_PROVIDER = 'qwen';
const QWEN_MODELS = {
  ADVANCED: 'qwen3.6-plus',
  BALANCED: 'qwen3.5-plus',
  FAST: 'qwen3.5-flash',
};

const HERITAGE_CATEGORIES = [
  { id: 'craft', name: '传统技艺', desc: '手工制作、织造、雕刻等技艺' },
  { id: 'drama', name: '传统戏剧', desc: '京剧、昆曲、地方戏等' },
  { id: 'music', name: '传统音乐', desc: '古琴、民间音乐、器乐' },
  { id: 'dance', name: '传统舞蹈', desc: '民族舞、民间舞' },
  { id: 'folklore', name: '民俗', desc: '节庆习俗、民间信仰' },
  { id: 'medicine', name: '传统医药', desc: '中医、中药、针灸' },
  { id: 'acrobatics', name: '杂技与竞技', desc: '武术、杂技' },
  { id: 'oral', name: '口头传统', desc: '传说、说唱、史诗' },
  { id: 'art', name: '传统美术', desc: '剪纸、刺绣、年画' },
  { id: 'calligraphy', name: '书法与篆刻', desc: '书法、篆刻艺术' }
];

const CATEGORY_QUIZ_PROMPT_RULES = {
  craft: {
    focus: '手工技艺流程、工序逻辑、材料与工具认知、传承方式',
    angles: '工序先后、工具用途、材料特性、师徒传承规范',
    avoid: '纯地理常识题、与技艺无关的历史冷知识题'
  },
  drama: {
    focus: '传统戏剧行当、声腔、程式、代表剧种与舞台规范',
    angles: '行当识别、唱念做打、声腔特点、剧种辨析',
    avoid: '影视娱乐八卦、现代流行文化题'
  },
  music: {
    focus: '传统音乐乐器类别、曲种风格、演奏形态与审美特征',
    angles: '乐器辨识、曲种特征、演奏场景、传承方式',
    avoid: '西方古典乐理细节、与非遗无关的流行音乐题'
  },
  dance: {
    focus: '传统舞蹈动作特征、礼俗场景、表演结构与传承语境',
    angles: '动作语汇、舞种辨识、表演场景、礼仪意义',
    avoid: '现代竞技舞套路题、纯体育训练题'
  },
  folklore: {
    focus: '岁时节令、民间信俗、礼仪习惯、社区传承功能',
    angles: '节俗含义、礼仪流程、场景匹配、习俗辨析',
    avoid: '行政区划冷知识、和民俗无关的时政题'
  },
  medicine: {
    focus: '传统医药基础理论、常见技法、养生观念与传承规范',
    angles: '概念辨析、基础方法、常识判断、风险意识',
    avoid: '具体疾病处方与剂量、替代专业医疗建议'
  },
  acrobatics: {
    focus: '杂技与竞技项目特征、基本功体系、表演安全与传承',
    angles: '项目识别、训练逻辑、安全原则、表演形态',
    avoid: '极限危险动作细节、鼓励冒险内容'
  },
  oral: {
    focus: '口头传统体裁、叙事方式、传唱场景与文化功能',
    angles: '体裁辨识、叙事特征、语言风格、传播方式',
    avoid: '纯文学理论术语堆砌、与口头传统无关题'
  },
  art: {
    focus: '传统美术门类、纹样寓意、工艺手法与审美语汇',
    angles: '门类识别、图案寓意、技法对应、材料与工艺',
    avoid: '现代设计软件操作题、与非遗美术无关题'
  },
  calligraphy: {
    focus: '书法与篆刻的书体特征、章法意识、工具材料与传承',
    angles: '书体辨析、用笔常识、印章基础、审美判断',
    avoid: '超细节考据题、与书法篆刻无关的泛艺术题'
  },
};

function extractJsonText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

function getCategoryMeta(categoryId, categoryName) {
  const matched = HERITAGE_CATEGORIES.find((item) => item.id === String(categoryId || ''));
  if (matched) return matched;

  if (categoryName) {
    return {
      id: String(categoryId || 'custom'),
      name: String(categoryName),
      desc: '非遗学习分类'
    };
  }

  return HERITAGE_CATEGORIES[0];
}

function getQuizPromptRuleByCategory(categoryId) {
  const key = String(categoryId || '').trim();
  return CATEGORY_QUIZ_PROMPT_RULES[key] || {
    focus: '非遗分类核心知识、学习路径与传承实践',
    angles: '概念辨析、场景匹配、传承方法、常识判断',
    avoid: '与非遗主题弱相关或无关的题目'
  };
}

function createQwenClient() {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey || /^your_/i.test(apiKey)) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  });
}

function withTimeout(promise, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('QWEN_TIMEOUT'));
      }, timeoutMs);
    }),
  ]);
}

async function createQwenCompletion(openai, payload) {
  try {
    return await openai.chat.completions.create({
      ...payload,
      response_format: { type: 'json_object' }
    });
  } catch (error) {
    const msg = error?.message || '';
    if (!/response_format|json_object|not supported/i.test(msg)) {
      throw error;
    }

    return openai.chat.completions.create(payload);
  }
}

function hashText(text) {
  const value = String(text || '');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % 100000;
  }
  return hash;
}

function isComplexQuestion(text) {
  const content = String(text || '');
  if (!content) return false;

  const complexKeywords = [
    '分析', '比较', '区别', '原因', '影响', '体系', '如何', '为什么', '请给出', '详细',
    '方案', '路径', '步骤', '原理', '推导', '联系', '评价', '综合', '论证', '案例'
  ];

  const hitCount = complexKeywords.reduce(
    (acc, word) => (content.includes(word) ? acc + 1 : acc),
    0
  );

  return content.length >= 28 || hitCount >= 2;
}

function getModelCandidatesByComplexity({ isComplex, seedText }) {
  if (!isComplex) {
    return [QWEN_MODELS.FAST, QWEN_MODELS.BALANCED, QWEN_MODELS.ADVANCED];
  }

  const hash = hashText(seedText);
  const primary = hash % 2 === 0 ? QWEN_MODELS.ADVANCED : QWEN_MODELS.BALANCED;
  const secondary = primary === QWEN_MODELS.ADVANCED ? QWEN_MODELS.BALANCED : QWEN_MODELS.ADVANCED;
  return [primary, secondary, QWEN_MODELS.FAST];
}

async function createQwenCompletionWithModelFallback(openai, payloadWithoutModel, models) {
  let lastError = null;

  for (const model of models) {
    try {
      const completion = await createQwenCompletion(openai, {
        ...payloadWithoutModel,
        model,
      });

      return {
        completion,
        model,
      };
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ [Qwen] 模型 ${model} 调用失败，将尝试回退:`, error.message);
    }
  }

  throw lastError || new Error('全部模型调用失败');
}

function fallbackQaAnswer(categoryMeta, question) {
  return `你问的是“${question}”。\n\n这是“${categoryMeta.name}”方向的学习建议：\n1. 先了解该门类的起源、核心技法和代表性传承人。\n2. 先从基础动作/基础工序练习，再进阶到完整作品。\n3. 建议结合权威资料（中国非遗网、博物馆公开课）进行交叉验证。\n\n当前 AI 服务可能暂时不可用，你可以稍后重试。`;
}

async function generateHeritageQaAnswer({ categoryId, categoryName, question }) {
  const categoryMeta = getCategoryMeta(categoryId, categoryName);
  const openai = createQwenClient();
  const complex = isComplexQuestion(question);
  const modelCandidates = getModelCandidatesByComplexity({
    isComplex: complex,
    seedText: question,
  });

  if (!openai) {
    return {
      answer: fallbackQaAnswer(categoryMeta, question),
      provider: 'local-fallback',
      model: null,
      promptVersion: HERITAGE_QA_PROMPT_VERSION,
      category: categoryMeta,
      latencyMs: 0
    };
  }

  const systemPrompt = `你是一位“非遗学艺”平台的导师助手，专注中文讲解。\n回答目标：准确、可学、可实践。\n约束：\n- 仅回答与非遗学习相关内容。\n- 内容要简洁，优先给步骤和要点。\n- 如问题存在不确定性，请明确“可能/建议进一步核实”。\n- 结尾加一句“仅供学习参考，请以权威资料与传承人指导为准”。\n- 只返回 JSON。\nJSON 格式：{\"answer\":\"...\"}`;

  const userPrompt = `分类：${categoryMeta.name}（${categoryMeta.desc}）\n问题：${String(question || '').trim()}\n\n请按指定 JSON 输出。`;

  const startedAt = Date.now();

  try {
    const { completion, model } = await createQwenCompletionWithModelFallback(openai, {
      temperature: 0.4,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }, modelCandidates);

    const content = completion?.choices?.[0]?.message?.content;
    const jsonText = extractJsonText(content);
    const parsed = jsonText ? JSON.parse(jsonText) : null;
    const answer = parsed?.answer && String(parsed.answer).trim()
      ? String(parsed.answer).trim()
      : fallbackQaAnswer(categoryMeta, question);

    return {
      answer,
      provider: DEFAULT_PROVIDER,
      model,
      promptVersion: HERITAGE_QA_PROMPT_VERSION,
      category: categoryMeta,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    console.error('❌ [Heritage QA] 调用失败:', error.message);
    return {
      answer: fallbackQaAnswer(categoryMeta, question),
      provider: 'local-fallback',
      model: modelCandidates[0],
      promptVersion: HERITAGE_QA_PROMPT_VERSION,
      category: categoryMeta,
      latencyMs: Date.now() - startedAt
    };
  }
}

function normalizeQuizQuestion(raw, index, defaults) {
  const getText = (value, fallback) => {
    const text = String(value || '').trim();
    return text || fallback;
  };

  const normalized = {
    categoryId: defaults.category.id,
    categoryName: defaults.category.name,
    difficulty: defaults.difficulty,
    questionType: 'single',
    stem: getText(raw?.stem, `第${index + 1}题：关于${defaults.category.name}的基础知识，下列说法正确的是？`),
    optionA: getText(raw?.optionA, '选项A'),
    optionB: getText(raw?.optionB, '选项B'),
    optionC: getText(raw?.optionC, '选项C'),
    optionD: getText(raw?.optionD, '选项D'),
    optionE: null,
    optionF: null,
    correctOption: String(raw?.correctOption || 'A').toUpperCase(),
    correctAnswer: String(raw?.correctOption || 'A').toUpperCase(),
    explanation: getText(raw?.explanation, '该题用于帮助理解非遗基础知识。'),
    sourceType: defaults.sourceType,
    sourceRef: defaults.sourceRef,
    status: defaults.status
  };

  if (!['A', 'B', 'C', 'D'].includes(normalized.correctOption)) {
    normalized.correctOption = 'A';
  }

  return normalized;
}

function buildFallbackQuizQuestions({ category, count, difficulty, sourceType, sourceRef, status }) {
  const templates = [
    {
      stem: `${category.name}的核心价值更强调以下哪一项？`,
      optionA: '口耳相传与实践传承',
      optionB: '完全依赖现代工业流程',
      optionC: '只保留外观不保留技法',
      optionD: '脱离文化语境独立存在',
      correctOption: 'A',
      explanation: '非遗的核心在于活态传承与实践。'
    },
    {
      stem: `学习${category.name}时，以下哪种路径更合理？`,
      optionA: '先学高难技法后补基础',
      optionB: '先夯实基础再逐步进阶',
      optionC: '只看短视频不做练习',
      optionD: '完全不参考传统范式',
      correctOption: 'B',
      explanation: '非遗技艺学习通常遵循基础到进阶的路径。'
    },
    {
      stem: `关于${category.name}的学习资料，哪类来源更建议优先参考？`,
      optionA: '匿名论坛片段',
      optionB: '未经核实的二手转载',
      optionC: '权威机构与传承人公开资料',
      optionD: '无出处的营销文案',
      correctOption: 'C',
      explanation: '权威机构和传承人资料更可靠。'
    }
  ];

  const results = [];
  for (let i = 0; i < count; i += 1) {
    const t = templates[i % templates.length];
    results.push(normalizeQuizQuestion(t, i, { category, difficulty, sourceType, sourceRef, status }));
  }
  return results;
}

async function generateAiQuizQuestions({
  categoryId,
  categoryName,
  count = 10,
  difficulty = 'medium',
  timeoutMs = 1600,
}) {
  const categoryMeta = getCategoryMeta(categoryId, categoryName);
  const categoryRule = getQuizPromptRuleByCategory(categoryMeta.id);
  const openai = createQwenClient();
  const isComplex = difficulty !== 'easy';
  const modelCandidates = getModelCandidatesByComplexity({
    isComplex,
    seedText: `${categoryId}-${difficulty}-${Date.now()}`,
  });

  if (!openai) {
    return {
      provider: 'local-fallback',
      model: null,
      questions: buildFallbackQuizQuestions({
        category: categoryMeta,
        count,
        difficulty,
        sourceType: 'ai',
        sourceRef: 'local-fallback',
        status: 'published'
      })
    };
  }

  const systemPrompt = `你是一位非遗考试命题助手。请生成单选题。\n要求：\n- 每题 4 个选项，且只有一个正确答案。\n- 题目围绕指定分类，不要超纲。\n- 表述清晰，避免歧义。\n- 只返回 JSON。\nJSON 格式：{\"questions\":[{\"stem\":\"\",\"optionA\":\"\",\"optionB\":\"\",\"optionC\":\"\",\"optionD\":\"\",\"correctOption\":\"A|B|C|D\",\"explanation\":\"\"}]}\n`;

  const userPrompt = `分类：${categoryMeta.name}\n分类说明：${categoryMeta.desc}\n难度：${difficulty}\n题量：${count}\n请直接输出 JSON。`;

  const maxTokens = Math.max(900, Math.min(2200, count * 220));

  try {
    const { completion, model } = await withTimeout(
      createQwenCompletionWithModelFallback(openai, {
        temperature: 0.4,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }, modelCandidates),
      timeoutMs
    );

    const content = completion?.choices?.[0]?.message?.content;
    const jsonText = extractJsonText(content);
    const parsed = jsonText ? JSON.parse(jsonText) : null;
    const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];

    if (!rawQuestions.length) {
      return {
        provider: 'local-fallback',
        model: modelCandidates[0],
        questions: buildFallbackQuizQuestions({
          category: categoryMeta,
          count,
          difficulty,
          sourceType: 'ai',
          sourceRef: 'qwen-fallback-empty',
          status: 'published'
        })
      };
    }

    const questions = rawQuestions
      .slice(0, count)
      .map((item, idx) => normalizeQuizQuestion(item, idx, {
        category: categoryMeta,
        difficulty,
        sourceType: 'ai',
        sourceRef: `qwen:${model}`,
        status: 'published'
      }));

    while (questions.length < count) {
      questions.push(...buildFallbackQuizQuestions({
        category: categoryMeta,
        count: 1,
        difficulty,
        sourceType: 'ai',
        sourceRef: `qwen:${model}:pad`,
        status: 'published'
      }));
    }

    return {
      provider: DEFAULT_PROVIDER,
      model,
      questions: questions.slice(0, count)
    };
  } catch (error) {
    const timeoutHit = String(error?.message || '').includes('QWEN_TIMEOUT');
    if (timeoutHit) {
      console.warn('⚠️ [Heritage Quiz AI] 生成超时，使用快速回退题目');
    } else {
      console.error('❌ [Heritage Quiz AI] 生成失败:', error.message);
    }
    return {
      provider: 'local-fallback',
      model: modelCandidates[0],
      questions: buildFallbackQuizQuestions({
        category: categoryMeta,
        count,
        difficulty,
        sourceType: 'ai',
        sourceRef: timeoutHit ? 'local-fallback-timeout' : 'local-fallback-error',
        status: 'published'
      })
    };
  }
}

module.exports = {
  HERITAGE_CATEGORIES,
  HERITAGE_QA_PROMPT_VERSION,
  getCategoryMeta,
  generateHeritageQaAnswer,
  generateAiQuizQuestions
};
