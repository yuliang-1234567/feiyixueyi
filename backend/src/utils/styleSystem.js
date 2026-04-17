/**
 * 全局风格系统（单一事实来源）
 *
 * 目标：
 * - Web/小程序/后端使用同一份风格 key 与展示 label
 * - 后端统一维护 key -> prompt 片段（用于 Qwen 图像增强/生成）
 *
 * 说明：
 * - “scene”用于不同页面过滤可选项（transform / heritage-sketch / gallery 等）
 * - promptParts 为英文/关键词片段；会拼接为 stylePrompt 传入 buildEditPrompt()
 */

const STYLE_SYSTEM = {
  version: 'v1',
  styles: [
    // —— 数字焕新（偏审美风格）——
    {
      key: 'ink-wash',
      label: '水墨',
      scenes: ['transform'],
      promptParts: ['ink wash', 'minimal', 'elegant', 'oriental painting'],
    },
    {
      key: 'watercolor',
      label: '水彩',
      scenes: ['transform'],
      promptParts: ['watercolor', 'soft gradient', 'hand-painted texture'],
    },
    {
      key: 'guochao',
      label: '国潮',
      scenes: ['transform'],
      promptParts: ['guochao', 'modern chinese style', 'bold color', 'poster design'],
    },
    {
      key: 'gongbi',
      label: '工笔',
      scenes: ['transform'],
      promptParts: ['gongbi', 'fine line', 'delicate details', 'traditional chinese painting'],
    },

    // —— 非遗风格（跨页面可复用）——
    {
      key: 'paper-cutting',
      label: '剪纸',
      scenes: ['transform', 'heritage-sketch'],
      promptParts: ['red paper-cut', 'symmetrical', 'hollow pattern'],
    },
    {
      key: 'blue-white-porcelain',
      label: '青花瓷',
      scenes: ['heritage-sketch'],
      promptParts: ['blue white porcelain', 'ceramic texture'],
    },
    {
      key: 'embroidery',
      label: '刺绣',
      scenes: ['heritage-sketch', 'gallery'],
      promptParts: ['embroidery', 'silk thread'],
    },
    {
      key: 'cloisonne',
      label: '景泰蓝釉彩',
      scenes: ['transform'],
      promptParts: ['cloisonne enamel', 'glossy', 'fine metal wire', 'vivid color'],
    },

    // —— 自定义 ——（各场景均可开启）
    {
      key: 'custom',
      label: '自定义',
      scenes: ['transform', 'heritage-sketch'],
      promptParts: [],
    },
  ],
};

function getStylesForScene(scene) {
  const key = String(scene || '').trim();
  return STYLE_SYSTEM.styles.filter((s) => Array.isArray(s.scenes) && s.scenes.includes(key));
}

function getStyleByKey(styleKey) {
  const key = String(styleKey || '').trim();
  return STYLE_SYSTEM.styles.find((s) => s.key === key) || null;
}

function buildStylePrompt({ styleKey, customStylePrompt }) {
  const key = String(styleKey || '').trim();
  if (key === 'custom') {
    return String(customStylePrompt || '').trim();
  }
  const style = getStyleByKey(key);
  if (!style) return '';
  return (style.promptParts || []).filter(Boolean).join(', ');
}

module.exports = {
  STYLE_SYSTEM,
  getStylesForScene,
  getStyleByKey,
  buildStylePrompt,
};

