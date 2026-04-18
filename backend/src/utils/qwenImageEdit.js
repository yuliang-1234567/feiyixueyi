/**
 * 数字焕新图像增强（DashScope）
 *
 * 策略：
 * - 生图优先：wan2.6-image > qwen-image-2.0（失败时兜底 qwen-image-2.0）
 * - 精修优先：qwen-image-edit-plus（编辑能力）
 * - 每个模型按“OpenAI兼容接口 -> DashScope原生异步任务接口”双通道尝试
 * - 任一通道成功即返回；全部失败则业务层回退本地算法
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const OpenAI = require("openai");

const DEFAULT_ALLOWED_MODELS = [
  "wan2.6-image",
  "qwen-image-2.0",
  "wanx-v1",
];

function parseAllowedModels() {
  const raw = String(process.env.QWEN_IMAGE_ALLOWED_MODELS || "").trim();
  const fromEnv = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_MODELS;
}

function isModelAllowed(model, allowedModels) {
  const name = String(model || "").trim();
  if (!name) return false;
  if (/free|trial/i.test(name)) return false;
  return allowedModels.includes(name);
}

function getQwenImageConfig() {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  const baseURL =
    process.env.QWEN_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const performanceOrder = [
    "wan2.6-image",
    "qwen-image-2.0",
  ];
  const modelChainRaw =
    process.env.QWEN_IMAGE_MODEL_CHAIN ||
    process.env.TRANSFORM_QWEN_IMAGE_MODEL_CHAIN ||
    "";
  const allowedModels = parseAllowedModels();

  const chainFromEnv = modelChainRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const candidateModels =
    chainFromEnv.length > 0 ? chainFromEnv : performanceOrder;

  // 去重并保持顺序
  const modelChain = [];
  for (const m of candidateModels) {
    if (isModelAllowed(m, allowedModels) && !modelChain.includes(m)) {
      modelChain.push(m);
    }
  }

  if (modelChain.length === 0) {
    for (const m of performanceOrder) {
      if (isModelAllowed(m, allowedModels) && !modelChain.includes(m)) {
        modelChain.push(m);
      }
    }
  }

  return { apiKey, baseURL, modelChain, allowedModels };
}

function getDashScopeOrigin(baseURL) {
  try {
    const parsed = new URL(baseURL);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return "https://dashscope.aliyuncs.com";
  }
}

function isPrivateOrLocalhostUrl(url) {
  try {
    const parsed = new URL(url);
    const host = String(parsed.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0")
      return true;
    // 常见私网/链路本地地址（不做过度复杂的 IP 段判断，先覆盖主要情况）
    if (host.endsWith(".local")) return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

function toBufferFromB64(data) {
  if (!data || typeof data !== "string") {
    return null;
  }
  return Buffer.from(data, "base64");
}

async function toBufferFromUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }

  const resp = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(resp.data);
}

function toDataUrlFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };

  const mime = mimeMap[ext] || "image/png";
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function parseHttpError(error) {
  const data = error?.response?.data || null;
  const requestId =
    data?.request_id || data?.requestId || data?.output?.request_id || null;
  const code = data?.code || data?.error?.code || data?.output?.code || null;
  const message =
    data?.message || data?.error?.message || error?.message || "unknown";

  return {
    message,
    status: error?.response?.status || null,
    code,
    requestId,
    data,
  };
}

function isRateLimitCode(code) {
  return (
    typeof code === "string" && /Throttling|RateQuota|rate.?limit/i.test(code)
  );
}

function isUrlValidationError(parsed) {
  const msg = String(parsed?.message || "").toLowerCase();
  const code = String(parsed?.code || "").toLowerCase();
  return (
    msg.includes("url error") ||
    msg.includes("invalid url") ||
    msg.includes("download image failed") ||
    code.includes("invalidurl")
  );
}

function extractTaskId(respData) {
  return (
    respData?.output?.task_id ||
    respData?.output?.taskId ||
    respData?.task_id ||
    respData?.taskId ||
    null
  );
}

function extractImageResultFromTask(data) {
  const choiceContents = data?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(choiceContents)) {
    for (const item of choiceContents) {
      if (item?.image && typeof item.image === 'string') {
        return { url: item.image };
      }
    }
  }

  const candidates = [
    data?.output?.results,
    data?.output?.result,
    data?.output?.images,
    data?.output?.image,
    data?.results,
  ];

  for (const item of candidates) {
    if (Array.isArray(item) && item.length > 0) {
      const first = item[0];
      if (typeof first === "string") return { url: first };
      if (first?.url) return { url: first.url };
      if (first?.image_url) return { url: first.image_url };
      if (first?.b64_json) return { b64: first.b64_json };
      if (first?.base64_data) return { b64: first.base64_data };
    }

    if (item && typeof item === "object") {
      if (item.url) return { url: item.url };
      if (item.image_url) return { url: item.image_url };
      if (item.b64_json) return { b64: item.b64_json };
      if (item.base64_data) return { b64: item.base64_data };
    }
  }

  return null;
}

function extractQwenImageFromMultimodalResponse(data) {
  const contents = data?.output?.choices?.[0]?.message?.content;
  if (!Array.isArray(contents)) {
    return null;
  }

  for (const item of contents) {
    if (item?.image) {
      return item.image;
    }
  }

  return null;
}

function isQwenImageFamilyModel(model) {
  return /^qwen-image/i.test(String(model || ""));
}

function isWanFamilyModel(model) {
  return /^wan/i.test(String(model || ''));
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeneratorModelCandidates(allowedModels) {
  const explicitModel = String(process.env.QWEN_IMAGE_GENERATE_MODEL || '').trim();
  const chainRaw = String(
    process.env.QWEN_IMAGE_GENERATE_MODEL_CHAIN ||
    process.env.TRANSFORM_QWEN_IMAGE_GENERATE_MODEL_CHAIN ||
    ''
  ).trim();

  const defaults = ['wan2.6-image', 'qwen-image-2.0', 'wanx-v1'];
  const fromChain = chainRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const preferred = [];
  if (explicitModel) preferred.push(explicitModel);
  preferred.push(...fromChain);
  if (preferred.length === 0) preferred.push(...defaults);

  const deduped = [];
  for (const model of preferred) {
    if (!isModelAllowed(model, allowedModels)) continue;
    if (!isWanFamilyModel(model) && model !== 'qwen-image-2.0') continue;
    if (!deduped.includes(model)) deduped.push(model);
  }

  return deduped;
}

function getEnhancerModel(modelChain, allowedModels) {
  const explicit = String(process.env.QWEN_IMAGE_ENHANCE_MODEL || '').trim();
  if (explicit && isModelAllowed(explicit, allowedModels)) {
    return explicit;
  }

  const candidates = [
    'qwen-image-edit-plus',
    ...modelChain,
    ...allowedModels,
  ];

  for (const model of candidates) {
    if (!isModelAllowed(model, allowedModels)) continue;
    if (!isQwenImageFamilyModel(model)) continue;
    return model;
  }

  return null;
}

function getTaskPollConfig() {
  const maxPollsRaw = Number(process.env.QWEN_IMAGE_TASK_MAX_POLLS || 80);
  const intervalMsRaw = Number(process.env.QWEN_IMAGE_TASK_POLL_INTERVAL_MS || 1500);
  const maxPolls = Number.isFinite(maxPollsRaw) ? Math.max(1, Math.min(240, Math.floor(maxPollsRaw))) : 80;
  const intervalMs = Number.isFinite(intervalMsRaw) ? Math.max(500, Math.min(5000, Math.floor(intervalMsRaw))) : 1500;
  return { maxPolls, intervalMs };
}

async function resolveDashScopeImageFromSubmitData(submitData, apiKey, dashScopeOrigin) {
  const { maxPolls, intervalMs } = getTaskPollConfig();
  const immediate = extractImageResultFromTask(submitData);
  if (immediate?.b64) return toBufferFromB64(immediate.b64);
  if (immediate?.url) return toBufferFromUrl(immediate.url);

  const taskId = extractTaskId(submitData);
  if (!taskId) {
    return null;
  }

  for (let i = 0; i < maxPolls; i++) {
    const pollResp = await axios.get(`${dashScopeOrigin}/api/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
    });

    const status = pollResp?.data?.output?.task_status || pollResp?.data?.output?.taskStatus;
    if (status === 'SUCCEEDED') {
      const extracted = extractImageResultFromTask(pollResp.data);
      if (extracted?.b64) return toBufferFromB64(extracted.b64);
      if (extracted?.url) return toBufferFromUrl(extracted.url);
      return null;
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      return null;
    }

    await sleep(intervalMs);
  }

  return null;
}

async function generateImageWithDashScopeNative(model, prompt, apiKey, dashScopeOrigin) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-DashScope-Async': 'enable',
  };

  const requestVariants = [
    ...(model === 'wan2.6-image' ? [
      {
        name: 'image-generation.messages.interleave',
        url: `${dashScopeOrigin}/api/v1/services/aigc/image-generation/generation`,
        body: {
          model,
          input: {
            messages: [
              {
                role: 'user',
                content: [{ text: prompt }],
              },
            ],
          },
          parameters: { n: 1, size: '1024*1024', enable_interleave: true },
        },
      },
    ] : []),
    {
      name: 'text2image.prompt',
      url: `${dashScopeOrigin}/api/v1/services/aigc/text2image/image-synthesis`,
      body: {
        model,
        input: { prompt },
        parameters: { size: '1024*1024' },
      },
    },
    {
      name: 'text2image.text',
      url: `${dashScopeOrigin}/api/v1/services/aigc/text2image/image-synthesis`,
      body: {
        model,
        input: { text: prompt },
        parameters: { size: '1024*1024' },
      },
    },
    {
      name: 'image-generation.prompt',
      url: `${dashScopeOrigin}/api/v1/services/aigc/image-generation/generation`,
      body: {
        model,
        input: { prompt },
        parameters: { n: 1, size: '1024*1024' },
      },
    },
  ];

  let lastError = null;
  for (const variant of requestVariants) {
    try {
      const submitResp = await axios.post(variant.url, variant.body, {
        headers,
        timeout: 45000,
      });

      const buffer = await resolveDashScopeImageFromSubmitData(submitResp.data, apiKey, dashScopeOrigin);
      if (buffer && buffer.length > 0) {
        console.log(`✅ [Qwen-Image] 原生文生图成功: model=${model}, variant=${variant.name}`);
        return buffer;
      }
      console.warn(`⚠️ [Qwen-Image] 原生文生图为空: model=${model}, variant=${variant.name}`);
    } catch (error) {
      lastError = error;
      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 原生文生图失败: model=${model}, variant=${variant.name}, status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'}, requestId=${parsed.requestId || 'N/A'}, msg=${parsed.message}`);
      if (isRateLimitCode(parsed.code)) {
        const throttleError = new Error(parsed.message || 'DashScope 请求频率受限');
        throttleError.stopChain = true;
        throttleError.code = parsed.code;
        throw throttleError;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

function tryRemoveFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`⚠️ [Qwen-Image] 清理临时文件失败: ${error.message}`);
  }
}

function saveBufferAsTempPng(buffer, prefix = "qwen-temp") {
  const filename = `${prefix}-${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}.png`;
  const filePath = path.join(
    process.cwd(),
    "backend",
    "uploads",
    "temp",
    filename
  );
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function buildEditPrompt({ productType, stylePrompt, aiPrompt }) {
  const basePrompt =
    aiPrompt && String(aiPrompt).trim()
      ? String(aiPrompt).trim()
      : `将图像优化为高质量电商效果图，产品类型为${
          productType || "文创产品"
        }，保留核心纹样元素，增强层次、质感、光影和真实感，背景简洁干净。`;

  if (stylePrompt && String(stylePrompt).trim()) {
    return `${basePrompt}\n风格偏好：${String(stylePrompt).trim()}`;
  }

  return basePrompt;
}

/**
 * 使用 DashScope 图像模型增强图片（按模型链路依次尝试）
 * @param {Object} params
 * @param {string} params.baseImagePath - 待增强的底图路径
 * @param {string} [params.productType]
 * @param {string} [params.stylePrompt]
 * @param {string} [params.aiPrompt]
 * @returns {Promise<{buffer: Buffer, provider: string, model: string, triedModels: string[]}|null>}
 */
async function enhanceImageWithQwen(params) {
  const {
    baseImagePath,
    baseImageUrl,
    referenceImagePaths,
    referenceImageUrls,
    productType,
    stylePrompt,
    aiPrompt,
    modelChain: forceModelChain,
  } = params || {};
  const config = getQwenImageConfig();
  const { apiKey, baseURL, allowedModels } = config;
  const requestedChain =
    Array.isArray(forceModelChain) && forceModelChain.length > 0
      ? forceModelChain
      : config.modelChain;
  const modelChain = requestedChain.filter((m) =>
    isModelAllowed(m, allowedModels)
  );

  if (!apiKey || /^your_/i.test(apiKey)) {
    console.log("⚠️ [Qwen-Image] 未配置 QWEN_API_KEY，跳过 AI 图像增强");
    return null;
  }

  if (!baseImagePath || !fs.existsSync(baseImagePath)) {
    console.warn("⚠️ [Qwen-Image] baseImagePath 不存在，跳过 AI 图像增强");
    return null;
  }

  if (modelChain.length === 0) {
    console.warn(
      "⚠️ [Qwen-Image] 当前模型链为空（可能被 allowlist 过滤），跳过 AI 图像增强"
    );
    return null;
  }

  const prompt = buildEditPrompt({ productType, stylePrompt, aiPrompt });
  const triedModels = [];

  const client = new OpenAI({ apiKey, baseURL });
  const dashScopeOrigin = getDashScopeOrigin(baseURL);

  const tryOpenAICompatible = async (model) => {
    const result = await client.images.edit({
      model,
      image: fs.createReadStream(baseImagePath),
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const item = result?.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;
    if (b64) {
      return toBufferFromB64(b64);
    }
    if (url) {
      return toBufferFromUrl(url);
    }
    return null;
  };

  // 官方推荐：qwen-image-* 走 multimodal-generation 端点
  const tryQwenImageMultimodal = async (model) => {
    // 重要：DashScope 会对 localhost/内网 URL 做 SSRF 拦截。开发环境默认走 data-url 内联。
    const canUseUrl =
      baseImageUrl &&
      /^https?:\/\//i.test(baseImageUrl) &&
      !isPrivateOrLocalhostUrl(baseImageUrl);
    const imageInput = canUseUrl
      ? baseImageUrl
      : toDataUrlFromFile(baseImagePath);

    const normalizedRefUrls = Array.isArray(referenceImageUrls)
      ? referenceImageUrls.map((u) => String(u || "").trim()).filter(Boolean)
      : [];
    const normalizedRefPaths = Array.isArray(referenceImagePaths)
      ? referenceImagePaths.map((p) => String(p || "").trim()).filter(Boolean)
      : [];

    const refContents = [];
    for (const url of normalizedRefUrls) {
      const ok = /^https?:\/\//i.test(url) && !isPrivateOrLocalhostUrl(url);
      if (!ok) continue;
      refContents.push({ image: url });
    }
    for (const p of normalizedRefPaths) {
      if (!p || !fs.existsSync(p)) continue;
      refContents.push({ image: toDataUrlFromFile(p) });
    }

    const promptContent = {
      model,
      input: {
        messages: [
          {
            role: "user",
            content: [
              { image: imageInput },
              ...refContents,
              { text: prompt },
            ],
          },
        ],
      },
      parameters: {
        n: 1,
        watermark: false,
        prompt_extend: false,
        size: "1024*1024",
      },
    }

    const resp = await axios.post(
      `${dashScopeOrigin}/api/v1/services/aigc/multimodal-generation/generation`,
      {
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [
                { image: imageInput },
                ...refContents,
                { text: prompt },
              ],
            },
          ],
        },
        parameters: {
          n: 1,
          watermark: false,
          prompt_extend: true,
          size: "1024*1024",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 90000,
      }
    );

    const imageUrl = extractQwenImageFromMultimodalResponse(resp.data);
    if (!imageUrl) {
      return null;
    }

    return toBufferFromUrl(imageUrl);
  };

  const tryDashScopeNativeTask = async (model) => {
    const { maxPolls, intervalMs } = getTaskPollConfig();
    // 原生 image2image 接口对 URL 校验更严格；localhost/私网 URL 一律不要传，避免 SSRF/URL error
    const canUseUrl =
      baseImageUrl &&
      /^https?:\/\//i.test(baseImageUrl) &&
      !isPrivateOrLocalhostUrl(baseImageUrl);
    const imageUrl = canUseUrl ? baseImageUrl : null;
    const imageDataUrl = toDataUrlFromFile(baseImagePath);

    if (!imageUrl) {
      console.warn(
        "⚠️ [Qwen-Image] 原生接口未提供可用公网 URL（localhost/私网会被拦截），将只尝试 data-url 兜底变体"
      );
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    };

    const payloadVariants = [
      ...(imageUrl
        ? [
            {
              name: "image_url:http(s)",
              body: {
                model,
                input: { prompt, image_url: imageUrl },
                parameters: { size: "1024*1024" },
              },
            },
            {
              name: "image:http(s)",
              body: {
                model,
                input: { prompt, image: imageUrl },
                parameters: { size: "1024*1024" },
              },
            },
          ]
        : []),
    ];

    // 内联数据策略：
    // - QWEN_IMAGE_ENABLE_INLINE_DATA=true  强制开启
    // - QWEN_IMAGE_ENABLE_INLINE_DATA=false 强制关闭
    // - 默认 auto：当图片 <= 7MB 时追加 1 个 data-url 变体，避免 URL 抓取失败
    const inlineMode = String(
      process.env.QWEN_IMAGE_ENABLE_INLINE_DATA || "auto"
    ).toLowerCase();
    const fileSize = fs.statSync(baseImagePath).size;
    const shouldTryInline =
      inlineMode === "true" ||
      (inlineMode !== "false" && fileSize > 0 && fileSize <= 7 * 1024 * 1024);

    if (shouldTryInline) {
      payloadVariants.push({
        name: "image:data-url",
        body: {
          model,
          input: { prompt, image: imageDataUrl },
          parameters: { size: "1024*1024" },
        },
      });
      console.log(
        `ℹ️ [Qwen-Image] 启用内联图片兜底: mode=${inlineMode}, size=${fileSize}`
      );
    }

    let submitResp = null;
    let lastError = null;
    let sawUrlError = false;

    for (const variant of payloadVariants) {
      try {
        submitResp = await axios.post(
          `${dashScopeOrigin}/api/v1/services/aigc/image2image/image-synthesis`,
          variant.body,
          {
            headers,
            timeout: 45000,
          }
        );
        console.log(
          `✅ [Qwen-Image] 原生接口提交成功: model=${model}, variant=${variant.name}`
        );
        break;
      } catch (error) {
        const parsed = parseHttpError(error);
        lastError = error;
        console.warn(
          `⚠️ [Qwen-Image] 原生接口提交失败: model=${model}, variant=${
            variant.name
          }, status=${parsed.status || "N/A"}, code=${
            parsed.code || "N/A"
          }, requestId=${parsed.requestId || "N/A"}, msg=${parsed.message}`
        );
        if (isUrlValidationError(parsed)) {
          sawUrlError = true;
        }
        if (isRateLimitCode(parsed.code)) {
          const throttleError = new Error(
            parsed.message || "DashScope 请求频率受限"
          );
          throttleError.stopChain = true;
          throttleError.code = parsed.code;
          throw throttleError;
        }
      }
    }

    if (!submitResp) {
      if (sawUrlError && !shouldTryInline) {
        console.warn(
          "⚠️ [Qwen-Image] 当前为 URL 校验失败，且未启用内联图片兜底。可设置 QWEN_IMAGE_ENABLE_INLINE_DATA=true 再试。"
        );
      }
      throw lastError || new Error("DashScope 原生接口提交失败");
    }

    const taskId = extractTaskId(submitResp.data);
    if (!taskId) {
      const immediate = extractImageResultFromTask(submitResp.data);
      if (immediate?.b64) return toBufferFromB64(immediate.b64);
      if (immediate?.url) return toBufferFromUrl(immediate.url);
      return null;
    }

    for (let i = 0; i < maxPolls; i++) {
      const pollResp = await axios.get(`${dashScopeOrigin}/api/v1/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      });

      const status =
        pollResp?.data?.output?.task_status ||
        pollResp?.data?.output?.taskStatus;
      if (status === "SUCCEEDED") {
        const extracted = extractImageResultFromTask(pollResp.data);
        if (extracted?.b64) return toBufferFromB64(extracted.b64);
        if (extracted?.url) return toBufferFromUrl(extracted.url);
        return null;
      }

      if (status === "FAILED" || status === "CANCELED") {
        return null;
      }

      await sleep(intervalMs);
    }

    return null;
  };

  for (const model of modelChain) {
    triedModels.push(model);

    // 通道0（优先）：qwen-image 系列官方端点
    if (isQwenImageFamilyModel(model)) {
      try {
        const buffer = await tryQwenImageMultimodal(model);
        if (buffer && buffer.length > 0) {
          console.log(`[Qwen-Image] 模型 ${model} 官方端点返回成功`);
          return {
            buffer,
            provider: "dashscope-multimodal-generation",
            model,
            triedModels,
          };
        }
        console.warn(
          `⚠️ [Qwen-Image] 模型 ${model} 官方端点返回为空，继续后续通道`
        );
      } catch (error) {
        const parsed = parseHttpError(error);
        console.warn(
          `⚠️ [Qwen-Image] 模型 ${model} 官方端点失败: ${
            parsed.message
          } (status=${parsed.status || "N/A"}, code=${
            parsed.code || "N/A"
          }, requestId=${parsed.requestId || "N/A"})`
        );
        if (parsed.data) {
          console.warn(
            "⚠️ [Qwen-Image] 官方端点失败详情:",
            JSON.stringify(parsed.data).slice(0, 1200)
          );
        }
        if (isRateLimitCode(parsed.code)) {
          console.error(
            "❌ [Qwen-Image] 官方端点命中频率限制，停止后续模型尝试"
          );
          break;
        }
      }
    }

    // 通道1：OpenAI兼容接口
    try {
      const buffer = await tryOpenAICompatible(model);

      if (!buffer || buffer.length === 0) {
        console.warn(
          `⚠️ [Qwen-Image] 模型 ${model} 兼容接口返回为空，尝试原生接口`
        );
      } else {
        return {
          buffer,
          provider: "dashscope-openai-compatible",
          model,
          triedModels,
        };
      }
    } catch (error) {
      const parsed = parseHttpError(error);
      console.warn(
        `⚠️ [Qwen-Image] 模型 ${model} 兼容接口失败: ${
          parsed.message
        } (status=${parsed.status || "N/A"}, code=${
          parsed.code || "N/A"
        }, requestId=${parsed.requestId || "N/A"})`
      );
      if (parsed.data) {
        console.warn(
          "⚠️ [Qwen-Image] 兼容接口失败详情:",
          JSON.stringify(parsed.data).slice(0, 1200)
        );
      }
      if (isRateLimitCode(parsed.code)) {
        console.error(
          "❌ [Qwen-Image] 命中频率限制，停止后续模型尝试，避免继续消耗配额"
        );
        break;
      }
    }

    // 通道2：DashScope原生异步任务接口
    try {
      // wanx/wan2.* 等模型如果没有公网 URL，大概率会被 URL 校验卡住；此时跳过以减少噪声与无效请求
      if (
        !isQwenImageFamilyModel(model) &&
        (!baseImageUrl || isPrivateOrLocalhostUrl(baseImageUrl))
      ) {
        console.warn(
          `⚠️ [Qwen-Image] 模型 ${model} 需要公网 URL；当前为 localhost/私网，跳过原生接口尝试`
        );
        continue;
      }

      const buffer = await tryDashScopeNativeTask(model);
      if (!buffer || buffer.length === 0) {
        console.warn(
          `⚠️ [Qwen-Image] 模型 ${model} 原生接口返回为空，继续尝试下一个模型`
        );
        continue;
      }

      return {
        buffer,
        provider: "dashscope-native-task",
        model,
        triedModels,
      };
    } catch (error) {
      if (error?.stopChain) {
        console.error("❌ [Qwen-Image] 原生接口命中频率限制，停止后续模型尝试");
        break;
      }

      const parsed = parseHttpError(error);
      console.warn(
        `⚠️ [Qwen-Image] 模型 ${model} 原生接口失败: ${
          parsed.message
        } (status=${parsed.status || "N/A"}, code=${
          parsed.code || "N/A"
        }, requestId=${parsed.requestId || "N/A"})`
      );
      if (parsed.data) {
        console.warn(
          "⚠️ [Qwen-Image] 原生接口失败详情:",
          JSON.stringify(parsed.data).slice(0, 1200)
        );
      }
      if (isRateLimitCode(parsed.code)) {
        console.error(
          "❌ [Qwen-Image] 命中频率限制，停止后续模型尝试，避免继续消耗配额"
        );
        break;
      }
    }
  }

  console.error("❌ [Qwen-Image] 模型链全部失败，回退本地算法");
  return null;
}

async function generateImageWithCompatibleApi(model, prompt, client) {
  const result = await client.images.generate({
    model,
    prompt,
    n: 1,
    size: "1024x1024",
  });

  const item = result?.data?.[0];
  const b64 = item?.b64_json;
  const url = item?.url;
  if (b64) {
    return toBufferFromB64(b64);
  }
  if (url) {
    return toBufferFromUrl(url);
  }
  return null;
}

/**
 * 两阶段策略：先用 wan2.6-image / qwen-image-2.0 生图，再用 qwen-image-edit 精修。
 * - 第一阶段全部失败：返回 null
 * - 第二阶段失败：优先兜底 qwen-image-2.0；仍失败则回退第一阶段结果
 */
async function generateThenEnhanceWithQwen(params) {
  const { productType, stylePrompt, aiPrompt } = params || {};

  const { apiKey, baseURL, allowedModels, modelChain } = getQwenImageConfig();
  if (!apiKey || /^your_/i.test(apiKey)) {
    console.log("⚠️ [Qwen-Image] 未配置 QWEN_API_KEY，跳过两阶段图像生成");
    return null;
  }

  const generatorCandidates = getGeneratorModelCandidates(allowedModels);
  const enhancerModel = getEnhancerModel(modelChain, allowedModels);
  if (generatorCandidates.length === 0 || !enhancerModel) {
    console.warn('⚠️ [Qwen-Image] 两阶段候选模型为空（可能被 allowlist 过滤），已跳过');
    return null;
  }

  const client = new OpenAI({ apiKey, baseURL });
  const dashScopeOrigin = getDashScopeOrigin(baseURL);
  const prompt = buildEditPrompt({ productType, stylePrompt, aiPrompt });
  const directFallbackModel = 'qwen-image-2.0';
  const directFallbackEnabled = isModelAllowed(directFallbackModel, allowedModels);

  let generatedBuffer = null;
  let stage1Model = null;
  let stage1Provider = null;
  const triedStage1Models = [];

  for (const generatorModel of generatorCandidates) {
    triedStage1Models.push(generatorModel);

    try {
      generatedBuffer = await generateImageWithDashScopeNative(
        generatorModel,
        prompt,
        apiKey,
        dashScopeOrigin
      );
      if (generatedBuffer && generatedBuffer.length > 0) {
        stage1Model = generatorModel;
        stage1Provider = 'dashscope-native-text2image';
        break;
      }
    } catch (error) {
      if (error?.stopChain) {
        console.warn('⚠️ [Qwen-Image] 第一阶段命中频率限制，停止后续模型尝试');
        break;
      }

      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 第一阶段原生通道失败: model=${generatorModel}, ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'})`);
    }

    if (!generatedBuffer) {
      try {
        generatedBuffer = await generateImageWithCompatibleApi(generatorModel, prompt, client);
        if (generatedBuffer && generatedBuffer.length > 0) {
          stage1Model = generatorModel;
          stage1Provider = 'dashscope-openai-generate';
          break;
        }
      } catch (error) {
        const parsed = parseHttpError(error);
        console.warn(`⚠️ [Qwen-Image] 第一阶段兼容通道失败: model=${generatorModel}, ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'})`);
      }
    }
  }

  if ((!generatedBuffer || generatedBuffer.length === 0) && directFallbackEnabled && !triedStage1Models.includes(directFallbackModel)) {
    triedStage1Models.push(directFallbackModel);
    try {
      generatedBuffer = await generateImageWithDashScopeNative(
        directFallbackModel,
        prompt,
        apiKey,
        dashScopeOrigin
      );
      if (generatedBuffer && generatedBuffer.length > 0) {
        stage1Model = directFallbackModel;
        stage1Provider = 'dashscope-native-text2image-fallback';
      }
    } catch (error) {
      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 兜底生图原生通道失败: model=${directFallbackModel}, ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'})`);
    }

    if (!generatedBuffer) {
      try {
        generatedBuffer = await generateImageWithCompatibleApi(directFallbackModel, prompt, client);
        if (generatedBuffer && generatedBuffer.length > 0) {
          stage1Model = directFallbackModel;
          stage1Provider = 'dashscope-openai-generate-fallback';
        }
      } catch (error) {
        const parsed = parseHttpError(error);
        console.warn(`⚠️ [Qwen-Image] 兜底生图兼容通道失败: model=${directFallbackModel}, ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'})`);
      }
    }
  }

  if (!generatedBuffer || generatedBuffer.length === 0) {
    console.warn('⚠️ [Qwen-Image] 第一阶段所有候选模型生成失败，跳过两阶段策略');
    return null;
  }

  const tempPath = saveBufferAsTempPng(generatedBuffer, "wan-generated");
  try {
    let enhanced = null;
    try {
      enhanced = await enhanceImageWithQwen({
        baseImagePath: tempPath,
        productType,
        stylePrompt,
        aiPrompt: `${prompt}\n请在不改变主体语义的前提下，进一步提升清晰度、细节层次、材质质感和边缘干净度。`,
        modelChain: [enhancerModel],
      });
    } catch (error) {
      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 第二阶段精修失败，将尝试 qwen-image-2.0 兜底: ${parsed.message}`);
    }

    if (enhanced && enhanced.buffer && enhanced.buffer.length > 0) {
      return {
        buffer: enhanced.buffer,
        provider: "two-stage-qwen",
        model: enhancerModel,
        triedModels: [...triedStage1Models, enhancerModel],
        pipeline: {
          stage1: stage1Model,
          stage1Provider,
          stage2: enhancerModel,
          stage2Applied: true,
        },
      };
    }

    if (directFallbackEnabled && stage1Model !== directFallbackModel) {
      let directBuffer = null;
      try {
        directBuffer = await generateImageWithDashScopeNative(
          directFallbackModel,
          prompt,
          apiKey,
          dashScopeOrigin
        );
      } catch (error) {
        const parsed = parseHttpError(error);
        console.warn(`⚠️ [Qwen-Image] 第二阶段失败后 qwen-image-2.0 原生兜底失败: ${parsed.message}`);
      }

      if (!directBuffer) {
        try {
          directBuffer = await generateImageWithCompatibleApi(directFallbackModel, prompt, client);
        } catch (error) {
          const parsed = parseHttpError(error);
          console.warn(`⚠️ [Qwen-Image] 第二阶段失败后 qwen-image-2.0 兼容兜底失败: ${parsed.message}`);
        }
      }

      if (directBuffer && directBuffer.length > 0) {
        return {
          buffer: directBuffer,
          provider: 'two-stage-fallback-qwen-image-2.0',
          model: directFallbackModel,
          triedModels: [...triedStage1Models, enhancerModel, directFallbackModel],
          pipeline: {
            stage1: stage1Model,
            stage1Provider,
            stage2: enhancerModel,
            stage2Applied: false,
            fallbackDirect: directFallbackModel,
          },
        };
      }
    }

    return {
      buffer: generatedBuffer,
      provider: 'two-stage-qwen-fallback-stage1',
      model: stage1Model,
      triedModels: [...triedStage1Models, enhancerModel],
      pipeline: {
        stage1: stage1Model,
        stage1Provider,
        stage2: enhancerModel,
        stage2Applied: false,
      },
    };
  } finally {
    tryRemoveFile(tempPath);
  }
}

/**
 * 直接生图兜底：优先 qwen-image-2.0，其次 wan2.6-image
 */
async function generateDirectImageFallback(params) {
  const {
    productType,
    stylePrompt,
    aiPrompt,
  } = params || {};

  const { apiKey, baseURL, allowedModels } = getQwenImageConfig();
  if (!apiKey || /^your_/i.test(apiKey)) {
    return null;
  }

  const client = new OpenAI({ apiKey, baseURL });
  const dashScopeOrigin = getDashScopeOrigin(baseURL);
  const prompt = buildEditPrompt({ productType, stylePrompt, aiPrompt });

  const candidates = ['qwen-image-2.0', 'wan2.6-image'];
  const triedModels = [];

  for (const model of candidates) {
    if (!isModelAllowed(model, allowedModels)) continue;
    triedModels.push(model);

    try {
      const nativeBuffer = await generateImageWithDashScopeNative(model, prompt, apiKey, dashScopeOrigin);
      if (nativeBuffer && nativeBuffer.length > 0) {
        return {
          buffer: nativeBuffer,
          provider: 'direct-fallback-native',
          model,
          triedModels,
          pipeline: {
            directFallback: true,
          },
        };
      }
    } catch (error) {
      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 直接生图原生失败: model=${model}, ${parsed.message}`);
    }

    try {
      const compatBuffer = await generateImageWithCompatibleApi(model, prompt, client);
      if (compatBuffer && compatBuffer.length > 0) {
        return {
          buffer: compatBuffer,
          provider: 'direct-fallback-compatible',
          model,
          triedModels,
          pipeline: {
            directFallback: true,
          },
        };
      }
    } catch (error) {
      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 直接生图兼容失败: model=${model}, ${parsed.message}`);
    }
  }

  return null;
}

module.exports = {
  enhanceImageWithQwen,
  generateThenEnhanceWithQwen,
  generateDirectImageFallback,
};
