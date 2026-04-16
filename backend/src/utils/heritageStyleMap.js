/**
 * 非遗风格映射表：将前端选择的 styleKey 统一转换为 prompt 片段
 *
 * 注意：后端的 Qwen 图像增强会在 buildEditPrompt() 中追加：
 *   风格偏好：${stylePrompt}
 */

const heritageStyleMap = {
  'paper-cutting': {
    // 剪纸
    stylePromptParts: ['red paper-cut', 'symmetrical', 'hollow pattern'],
  },
  'blue-white-porcelain': {
    // 青花瓷
    stylePromptParts: ['blue white porcelain', 'ceramic texture'],
  },
  embroidery: {
    // 刺绣
    stylePromptParts: ['embroidery', 'silk thread'],
  },
  custom: {
    // 自定义由 front-end 传入 customStylePrompt
    stylePromptParts: [],
  },
};

function getStylePrompt(styleKey, customStylePrompt) {
  const key = String(styleKey || '').trim();

  if (key === 'custom') {
    return String(customStylePrompt || '').trim();
  }

  const entry = heritageStyleMap[key];
  if (!entry) return '';

  return (entry.stylePromptParts || []).filter(Boolean).join(', ');
}

module.exports = {
  heritageStyleMap,
  getStylePrompt,
};

