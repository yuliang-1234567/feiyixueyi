/**
 * DeepSeek API 工具
 * 用于 AI 学艺功能生成个性化学习建议
 * DeepSeek 兼容 OpenAI API 格式
 */

const OpenAI = require('openai');

/**
 * 调用 DeepSeek 生成非遗作品学习建议
 * @param {Object} params - 参数
 * @param {string} params.skillName - 技艺名称（如 剪纸、书法）
 * @param {number} params.similarity - 相似度 0-1
 * @param {string} params.referenceTitle - 参考作品标题
 * @param {string} [params.referenceDescription] - 参考作品描述
 * @returns {Promise<Object|null>} 结构化建议对象，失败返回 null
 */
async function generateLearnAdvice({ skillName, similarity, referenceTitle, referenceDescription = '' }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    console.log('⚠️ [DeepSeek] DEEPSEEK_API_KEY 未配置，跳过 AI 建议生成');
    return null;
  }

  const accuracy = Math.round(similarity * 100);

  const systemPrompt = `你是一位专业的非物质文化遗产传承导师，擅长${skillName}等传统技艺的指导。请根据用户作品与参考作品的相似度评分，给出专业、具体、可操作的学习建议。

必须严格按以下 JSON 格式返回，不要包含任何其他文字或 markdown 标记：
{
  "suggestions": ["建议1", "建议2", "建议3", "建议4"],
  "strengths": ["优势1", "优势2", "优势3"],
  "improvements": ["改进点1", "改进点2", "改进点3"],
  "learningPlan": {
    "direction": "学习方向建议",
    "professional": "专业提升建议",
    "skills": "技艺练习重点",
    "mentor": "导师与资源建议"
  }
}`;

  const userPrompt = `用户上传了${skillName}作品，与参考作品「${referenceTitle}」的相似度为 ${accuracy}%。
${referenceDescription ? `参考作品描述：${referenceDescription.slice(0, 200)}` : ''}

请针对该评分给出针对性的学习建议。`;

  try {
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      console.warn('⚠️ [DeepSeek] 返回内容为空');
      return null;
    }

    // 尝试解析 JSON（可能被 markdown 代码块包裹）
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);

    // 校验必要字段
    if (
      !Array.isArray(result.suggestions) ||
      !Array.isArray(result.strengths) ||
      !Array.isArray(result.improvements) ||
      !result.learningPlan ||
      typeof result.learningPlan !== 'object'
    ) {
      console.warn('⚠️ [DeepSeek] 返回格式不完整:', result);
      return null;
    }

    // 确保 learningPlan 包含所需字段
    const learningPlan = {
      direction: result.learningPlan.direction || '继续深入学习传统技艺',
      professional: result.learningPlan.professional || '建议参考大师作品',
      skills: result.learningPlan.skills || '重点练习基础技法',
      mentor: result.learningPlan.mentor || '可以寻找专业导师指导',
    };

    return {
      suggestions: result.suggestions.slice(0, 4),
      strengths: result.strengths.slice(0, 3),
      improvements: result.improvements.slice(0, 4),
      learningPlan,
    };
  } catch (error) {
    console.error('❌ [DeepSeek] 调用失败:', error.message);
    return null;
  }
}

module.exports = {
  generateLearnAdvice,
};
