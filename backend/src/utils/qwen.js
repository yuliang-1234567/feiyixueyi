/**
 * Qwen API 工具
 * 使用阿里 DashScope OpenAI 兼容接口，为 AI 学艺输出结构化建议。
 */

const OpenAI = require('openai');

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

function normalizeLearningPlan(plan) {
  return {
    direction: plan?.direction || '继续深入学习传统技艺，夯实基础能力',
    professional: plan?.professional || '建议结合经典案例拆解专业技法',
    skills: plan?.skills || '围绕线条、构图与节奏感进行专项训练',
    mentor: plan?.mentor || '建议跟随传承人课程或线下工坊持续练习',
  };
}

async function createQwenCompletion(openai, payload) {
  try {
    return await openai.chat.completions.create({
      ...payload,
      response_format: { type: 'json_object' },
    });
  } catch (error) {
    const msg = error?.message || '';
    if (!/response_format|json_object|not supported/i.test(msg)) {
      throw error;
    }

    return openai.chat.completions.create(payload);
  }
}

/**
 * 使用 Qwen 生成 AI 学艺分析
 * @param {Object} params
 * @param {string} params.skillName
 * @param {number} params.similarity 0-1
 * @param {string} params.referenceTitle
 * @param {string} [params.referenceDescription]
 * @param {string[]} [params.localHints]
 * @returns {Promise<Object|null>}
 */
async function generateQwenLearnAnalysis({
  skillName,
  similarity,
  referenceTitle,
  referenceDescription = '',
  localHints = [],
}) {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey || /^your_/i.test(apiKey)) {
    console.log('⚠️ [Qwen] 未配置 QWEN_API_KEY，跳过大模型分析');
    return null;
  }

  const model = process.env.QWEN_MODEL || 'qwen3.6-plus';
  const baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const accuracy = Math.min(100, Math.max(0, Math.round((similarity || 0) * 100)));

  const systemPrompt = `你是一位资深非遗传承导师与评审专家。请基于评分与作品上下文，输出专业、具体、可执行的学习分析。\n\n必须只返回 JSON，不要返回 markdown，不要返回多余文字。\nJSON 结构必须为：\n{\n  "summary": "一句话总评",\n  "details": ["分析点1", "分析点2", "分析点3"],\n  "suggestions": ["建议1", "建议2", "建议3", "建议4"],\n  "strengths": ["优势1", "优势2", "优势3"],\n  "improvements": ["改进点1", "改进点2", "改进点3"],\n  "learningPlan": {\n    "direction": "今后方向",\n    "professional": "专业建议",\n    "skills": "学习技艺",\n    "mentor": "导师建议"\n  },\n  "score": 0-100\n}`;

  const userPrompt = `技艺：${skillName || '传统技艺'}\n评分：${accuracy}\n参考作品：${referenceTitle || '无参考作品'}\n参考描述：${referenceDescription ? referenceDescription.slice(0, 260) : '无'}\n\n已有算法提示（可参考，不要照抄）：\n${(localHints || []).slice(0, 4).map((item, idx) => `${idx + 1}. ${item}`).join('\n') || '无'}\n\n请输出严格 JSON。`;

  try {
    const openai = new OpenAI({
      apiKey,
      baseURL,
    });

    const completion = await createQwenCompletion(openai, {
      model,
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content;
    const jsonText = extractJsonText(content);
    if (!jsonText) {
      console.warn('⚠️ [Qwen] 返回内容为空');
      return null;
    }

    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed?.suggestions) || !Array.isArray(parsed?.strengths) || !Array.isArray(parsed?.improvements)) {
      console.warn('⚠️ [Qwen] 返回结构缺少核心字段');
      return null;
    }

    return {
      provider: 'qwen',
      model,
      summary: parsed.summary || '',
      details: Array.isArray(parsed.details) ? parsed.details.slice(0, 5) : [],
      suggestions: parsed.suggestions.slice(0, 4),
      strengths: parsed.strengths.slice(0, 3),
      improvements: parsed.improvements.slice(0, 4),
      learningPlan: normalizeLearningPlan(parsed.learningPlan),
      score: Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : accuracy,
    };
  } catch (error) {
    console.error('❌ [Qwen] 调用失败:', error.message);
    return null;
  }
}

module.exports = {
  generateQwenLearnAnalysis,
};
