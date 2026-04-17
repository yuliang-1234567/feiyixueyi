/**
 * 非遗风格映射表：将前端选择的 styleKey 统一转换为 prompt 片段
 *
 * 注意：后端的 Qwen 图像增强会在 buildEditPrompt() 中追加：
 *   风格偏好：${stylePrompt}
 */

const { STYLE_SYSTEM, buildStylePrompt } = require('./styleSystem');

// 保持旧文件名对外兼容，但内部来源切到全局 StyleSystem
const heritageStyleMap = STYLE_SYSTEM.styles
  .filter((s) => Array.isArray(s.scenes) && s.scenes.includes('heritage-sketch'))
  .reduce((acc, item) => {
    acc[item.key] = { stylePromptParts: item.promptParts || [] };
    return acc;
  }, {});

function getStylePrompt(styleKey, customStylePrompt) {
  return buildStylePrompt({ styleKey, customStylePrompt });
}

module.exports = {
  heritageStyleMap,
  getStylePrompt,
};

