/**
 * 一笔成纹：按「主体 + 场景 + 风格 + 镜头 + 氛围 + 细节」拼装正向提示词，并附带 Negative prompt。
 * 风格关键词只出现一次（写入【定义风格】），不再经 buildEditPrompt 二次追加「风格偏好」。
 */

const { getStyleByKey } = require("./styleSystem");

function dedupeOrdered(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const t = String(line || "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 与画面质量/简笔画污染相关的否定提示（中文短语，逗号分隔） */
const HERITAGE_NEGATIVE_PROMPT =
  "模糊，低清晰度，强噪点，强颗粒，jpeg压缩伪影，低分辨率，" +
  "畸形，比例失调，奇怪形状，结构错误，不对称，扭曲透视，" +
  "机械复刻草图轮廓，儿童简笔画外形，草图线条感过重，" +
  "边缘未闭合，轮廓不流畅，连接关系不合理，" +
  "多余结构，多余肢体，破损，软塌变形，" +
  "杂乱背景，文字，水印，logo" +
  "噪点纹理，脏污纹理，随机斑点，颗粒化背景，腐蚀质感，锈蚀效果，脏旧表面，高频纹理污染";
/**
 * @param {Object} p
 * @param {string} [p.description]
 * @param {string} [p.baseDescription]
 * @param {string} [p.currentDescription]
 * @param {string} [p.additionalDescription]
 * @param {string} [p.styleKey]
 * @param {string} [p.resolvedStylePrompt] 已由 getStylePrompt / buildStylePrompt 得到的英文或自定义风格串（只拼一次）
 * @param {boolean} [p.hasProductBase] 是否有产品底图（双图模式）；否则为仅笔触单图
 * @returns {{ aiPrompt: string, negativePrompt: string }}
 */
function buildHeritageSketchPromptBundle(p = {}) {
  const {
    description = "",
    baseDescription = "",
    currentDescription = "",
    additionalDescription = "",
    styleKey = "",
    resolvedStylePrompt = "",
    hasProductBase = false,
  } = p;

  const styleMeta = getStyleByKey(styleKey);
  const styleLabel =
    styleMeta?.label || String(styleKey || "").trim() || "非遗";

  const userBits = dedupeOrdered([
    currentDescription,
    description,
    additionalDescription,
    baseDescription,
  ]);

  const subject = userBits.length
    ? `参考草图所表达的产品类别、摆放方向和构图意图生成产品；
     不直接照搬草图轮廓，而是基于真实商品结构进行专业重建与优化；
     自动修正草图中不合理的比例与形状，保证结构合理、对称、规整、可制造；
     ${userBits.join("；")}`
    : "文创产品电商展示图，结构合理、比例协调、符合真实商品设计";

  const scene = hasProductBase
    ? "简洁电商背景，光线均匀柔和，主体突出，适度留白，无杂乱道具，背景干净专业,背景无噪点"
    : "干净白底或极简影棚背景，主体居中；草图笔触仅作纹样与配色意向，需结合文字生成合理产品造型,背景无噪点";

  const styleLine = [styleLabel, String(resolvedStylePrompt || "").trim()]
    .filter(Boolean)
    .join(" · ");

  const camera = "中近景，产品完整入画，透视准确，结构真实可信，构图稳定平衡";

  const mood = "精致、真实材质感、高级商业氛围、商品级质感";

  const details =
    "高分辨率清晰细节，边缘利落，轮廓清晰闭合，光影自然；" +
    "结构严谨，比例协调，符合真实产品设计逻辑；" +
    "纹样精致克制，服务于产品设计；" +
    "画面无文字、水印与 logo";

  const positive = [
    `【主体】${subject}`,
    `【场景】${scene}`,
    `【定义风格】${styleLine}`,
    `【镜头语言】${camera}`,
    `【氛围词】${mood}`,
    `【细节修饰】${details}`,
  ].join("\n");

  const aiPrompt = `${positive}\n\nNegative prompt: ${HERITAGE_NEGATIVE_PROMPT}`;

  return {
    aiPrompt,
    negativePrompt: HERITAGE_NEGATIVE_PROMPT,
  };
}

module.exports = {
  buildHeritageSketchPromptBundle,
  HERITAGE_NEGATIVE_PROMPT,
};
