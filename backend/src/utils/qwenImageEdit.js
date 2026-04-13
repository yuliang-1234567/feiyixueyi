/**
 * 数字焕新图像增强（DashScope）
 *
 * 策略：
 * - 按模型性能顺序尝试：qwen-image-edit-plus > wanx-v1 > wan2.6-image
 * - 每个模型按“OpenAI兼容接口 -> DashScope原生异步任务接口”双通道尝试
 * - 任一通道成功即返回；全部失败则业务层回退本地算法
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const OpenAI = require('openai');

function getQwenImageConfig() {
  const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  const baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const performanceOrder = ['qwen-image-edit-plus', 'wanx-v1', 'wan2.6-image'];
  const modelChainRaw = process.env.QWEN_IMAGE_MODEL_CHAIN || process.env.TRANSFORM_QWEN_IMAGE_MODEL_CHAIN || '';

  const chainFromEnv = modelChainRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const candidateModels = chainFromEnv.length > 0 ? chainFromEnv : performanceOrder;

  // 去重并保持顺序
  const modelChain = [];
  for (const m of candidateModels) {
    if (!modelChain.includes(m)) {
      modelChain.push(m);
    }
  }

  return { apiKey, baseURL, modelChain };
}

function getDashScopeOrigin(baseURL) {
  try {
    const parsed = new URL(baseURL);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return 'https://dashscope.aliyuncs.com';
  }
}

function toBufferFromB64(data) {
  if (!data || typeof data !== 'string') {
    return null;
  }
  return Buffer.from(data, 'base64');
}

async function toBufferFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return Buffer.from(resp.data);
}

function toDataUrlFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  const mime = mimeMap[ext] || 'image/png';
  const b64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

function parseHttpError(error) {
  const data = error?.response?.data || null;
  const requestId = data?.request_id || data?.requestId || data?.output?.request_id || null;
  const code = data?.code || data?.error?.code || data?.output?.code || null;
  const message =
    data?.message ||
    data?.error?.message ||
    error?.message ||
    'unknown';

  return {
    message,
    status: error?.response?.status || null,
    code,
    requestId,
    data,
  };
}

function isRateLimitCode(code) {
  return typeof code === 'string' && /Throttling|RateQuota|rate.?limit/i.test(code);
}

function isUrlValidationError(parsed) {
  const msg = String(parsed?.message || '').toLowerCase();
  const code = String(parsed?.code || '').toLowerCase();
  return (
    msg.includes('url error') ||
    msg.includes('invalid url') ||
    msg.includes('download image failed') ||
    code.includes('invalidurl')
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
      if (typeof first === 'string') return { url: first };
      if (first?.url) return { url: first.url };
      if (first?.image_url) return { url: first.image_url };
      if (first?.b64_json) return { b64: first.b64_json };
      if (first?.base64_data) return { b64: first.base64_data };
    }

    if (item && typeof item === 'object') {
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
  return /^qwen-image/i.test(String(model || ''));
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEditPrompt({ productType, stylePrompt, aiPrompt }) {
  const basePrompt = aiPrompt && String(aiPrompt).trim()
    ? String(aiPrompt).trim()
    : `将图像优化为高质量电商效果图，产品类型为${productType || '文创产品'}，保留核心纹样元素，增强层次、质感、光影和真实感，背景简洁干净。`;

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
  const { baseImagePath, baseImageUrl, productType, stylePrompt, aiPrompt } = params || {};
  const { apiKey, baseURL, modelChain } = getQwenImageConfig();

  if (!apiKey || /^your_/i.test(apiKey)) {
    console.log('⚠️ [Qwen-Image] 未配置 QWEN_API_KEY，跳过 AI 图像增强');
    return null;
  }

  if (!baseImagePath || !fs.existsSync(baseImagePath)) {
    console.warn('⚠️ [Qwen-Image] baseImagePath 不存在，跳过 AI 图像增强');
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
      size: '1024x1024',
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
    const imageInput = baseImageUrl && /^https?:\/\//i.test(baseImageUrl)
      ? baseImageUrl
      : toDataUrlFromFile(baseImagePath);

    const resp = await axios.post(
      `${dashScopeOrigin}/api/v1/services/aigc/multimodal-generation/generation`,
      {
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { image: imageInput },
                { text: prompt },
              ],
            },
          ],
        },
        parameters: {
          n: 1,
          watermark: false,
          prompt_extend: true,
          size: '1024*1024',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
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
    const imageUrl = baseImageUrl && /^https?:\/\//i.test(baseImageUrl)
      ? baseImageUrl
      : toDataUrlFromFile(baseImagePath);
    const imageDataUrl = toDataUrlFromFile(baseImagePath);

    if (/^data:/i.test(imageUrl)) {
      console.warn('⚠️ [Qwen-Image] 原生接口使用 data URL，若平台不接受可配置公网域名后重试');
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    };

    const payloadVariants = [
      {
        name: 'image_url:http(s)',
        body: {
          model,
          input: { prompt, image_url: imageUrl },
          parameters: { size: '1024*1024' },
        },
      },
      {
        name: 'image:http(s)',
        body: {
          model,
          input: { prompt, image: imageUrl },
          parameters: { size: '1024*1024' },
        },
      },
    ];

    // 内联数据策略：
    // - QWEN_IMAGE_ENABLE_INLINE_DATA=true  强制开启
    // - QWEN_IMAGE_ENABLE_INLINE_DATA=false 强制关闭
    // - 默认 auto：当图片 <= 7MB 时追加 1 个 data-url 变体，避免 URL 抓取失败
    const inlineMode = String(process.env.QWEN_IMAGE_ENABLE_INLINE_DATA || 'auto').toLowerCase();
    const fileSize = fs.statSync(baseImagePath).size;
    const shouldTryInline =
      inlineMode === 'true' ||
      (inlineMode !== 'false' && fileSize > 0 && fileSize <= 7 * 1024 * 1024);

    if (shouldTryInline) {
      payloadVariants.push(
        {
          name: 'image:data-url',
          body: {
            model,
            input: { prompt, image: imageDataUrl },
            parameters: { size: '1024*1024' },
          },
        }
      );
      console.log(`ℹ️ [Qwen-Image] 启用内联图片兜底: mode=${inlineMode}, size=${fileSize}`);
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
        console.log(`✅ [Qwen-Image] 原生接口提交成功: model=${model}, variant=${variant.name}`);
        break;
      } catch (error) {
        const parsed = parseHttpError(error);
        lastError = error;
        console.warn(`⚠️ [Qwen-Image] 原生接口提交失败: model=${model}, variant=${variant.name}, status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'}, requestId=${parsed.requestId || 'N/A'}, msg=${parsed.message}`);
        if (isUrlValidationError(parsed)) {
          sawUrlError = true;
        }
        if (isRateLimitCode(parsed.code)) {
          const throttleError = new Error(parsed.message || 'DashScope 请求频率受限');
          throttleError.stopChain = true;
          throttleError.code = parsed.code;
          throw throttleError;
        }
      }
    }

    if (!submitResp) {
      if (sawUrlError && !shouldTryInline) {
        console.warn('⚠️ [Qwen-Image] 当前为 URL 校验失败，且未启用内联图片兜底。可设置 QWEN_IMAGE_ENABLE_INLINE_DATA=true 再试。');
      }
      throw lastError || new Error('DashScope 原生接口提交失败');
    }

    const taskId = extractTaskId(submitResp.data);
    if (!taskId) {
      const immediate = extractImageResultFromTask(submitResp.data);
      if (immediate?.b64) return toBufferFromB64(immediate.b64);
      if (immediate?.url) return toBufferFromUrl(immediate.url);
      return null;
    }

    for (let i = 0; i < 20; i++) {
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

      await sleep(1500);
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
          return {
            buffer,
            provider: 'dashscope-multimodal-generation',
            model,
            triedModels,
          };
        }
        console.warn(`⚠️ [Qwen-Image] 模型 ${model} 官方端点返回为空，继续后续通道`);
      } catch (error) {
        const parsed = parseHttpError(error);
        console.warn(`⚠️ [Qwen-Image] 模型 ${model} 官方端点失败: ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'}, requestId=${parsed.requestId || 'N/A'})`);
        if (parsed.data) {
          console.warn('⚠️ [Qwen-Image] 官方端点失败详情:', JSON.stringify(parsed.data).slice(0, 1200));
        }
        if (isRateLimitCode(parsed.code)) {
          console.error('❌ [Qwen-Image] 官方端点命中频率限制，停止后续模型尝试');
          break;
        }
      }
    }

    // 通道1：OpenAI兼容接口
    try {
      const buffer = await tryOpenAICompatible(model);

      if (!buffer || buffer.length === 0) {
        console.warn(`⚠️ [Qwen-Image] 模型 ${model} 兼容接口返回为空，尝试原生接口`);
      } else {
        return {
          buffer,
          provider: 'dashscope-openai-compatible',
          model,
          triedModels,
        };
      }
    } catch (error) {
      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 模型 ${model} 兼容接口失败: ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'}, requestId=${parsed.requestId || 'N/A'})`);
      if (parsed.data) {
        console.warn('⚠️ [Qwen-Image] 兼容接口失败详情:', JSON.stringify(parsed.data).slice(0, 1200));
      }
      if (isRateLimitCode(parsed.code)) {
        console.error('❌ [Qwen-Image] 命中频率限制，停止后续模型尝试，避免继续消耗配额');
        break;
      }
    }

    // 通道2：DashScope原生异步任务接口
    try {
      const buffer = await tryDashScopeNativeTask(model);
      if (!buffer || buffer.length === 0) {
        console.warn(`⚠️ [Qwen-Image] 模型 ${model} 原生接口返回为空，继续尝试下一个模型`);
        continue;
      }

      return {
        buffer,
        provider: 'dashscope-native-task',
        model,
        triedModels,
      };
    } catch (error) {
      if (error?.stopChain) {
        console.error('❌ [Qwen-Image] 原生接口命中频率限制，停止后续模型尝试');
        break;
      }

      const parsed = parseHttpError(error);
      console.warn(`⚠️ [Qwen-Image] 模型 ${model} 原生接口失败: ${parsed.message} (status=${parsed.status || 'N/A'}, code=${parsed.code || 'N/A'}, requestId=${parsed.requestId || 'N/A'})`);
      if (parsed.data) {
        console.warn('⚠️ [Qwen-Image] 原生接口失败详情:', JSON.stringify(parsed.data).slice(0, 1200));
      }
      if (isRateLimitCode(parsed.code)) {
        console.error('❌ [Qwen-Image] 命中频率限制，停止后续模型尝试，避免继续消耗配额');
        break;
      }
    }
  }

  console.error('❌ [Qwen-Image] 模型链全部失败，回退本地算法');
  return null;
}

module.exports = {
  enhanceImageWithQwen,
};
