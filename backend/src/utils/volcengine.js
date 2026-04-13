const axios = require('axios');
const signModule = require('@volcengine/openapi/lib/base/sign');
const Signer = signModule.default;
const queryParamsToString = signModule.queryParamsToString;

/**
 * 火山引擎即梦AI封装（使用官方 SDK Signer 签名）
 *
 * 说明：
 * - 使用 @volcengine/openapi 的 Signer 进行签名，确保与火山引擎标准一致
 * - 针对即梦文生图3.0与图生图3.0智能参考
 */

function getBaseConfig() {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY;
  const secretKey = process.env.VOLCENGINE_SECRET_KEY;
  const region = process.env.VOLCENGINE_REGION || 'cn-north-1';
  const service = process.env.VOLCENGINE_SERVICE || 'visual';
  const securityToken = process.env.VOLCENGINE_TOKEN;
  const endpoint =
    process.env.VOLCENGINE_ENDPOINT ||
    process.env.VOLCENGINE_JIMENG_ENDPOINT ||
    'https://visual.volcengineapi.com';

  if (!accessKey || !secretKey) {
    throw new Error(
      'VOLCENGINE_ACCESS_KEY 或 VOLCENGINE_SECRET_KEY 未配置，请在 backend/.env 中设置后重启服务。'
    );
  }

  const url = new URL(endpoint);
  return {
    accessKey,
    secretKey,
    region,
    service,
    securityToken,
    host: url.host,
    scheme: url.protocol.replace(':', '') || 'https',
  };
}

/**
 * 构造并发送签名请求（使用官方 Signer）
 */
async function signedRequest({
  method,
  path,
  query = {},
  body = {},
  timeoutMs = 15000,
  maxRetries = 1,
}) {
  const { accessKey, secretKey, region, service, securityToken, host, scheme } =
    getBaseConfig();

  const bodyString = body && Object.keys(body).length > 0 ? JSON.stringify(body) : '';
  const params = { ...query };
  Object.keys(params).forEach((k) => {
    if (params[k] === undefined || params[k] === null) delete params[k];
  });

  const requestObj = {
    region,
    method: method.toUpperCase(),
    pathname: path || '/',
    params,
    headers: {
      Host: host,
      'Content-Type': 'application/json',
    },
    body: bodyString,
  };

  const signer = new Signer(requestObj, service);
  const credentials = {
    accessKeyId: accessKey,
    secretKey,
    sessionToken: securityToken || undefined,
  };
  signer.addAuthorization(credentials);

  const queryStr = queryParamsToString(params);
  const url =
    queryStr.length > 0
      ? `${scheme}://${host}${path || '/'}?${queryStr}`
      : `${scheme}://${host}${path || '/'}`;

  const axiosConfig = {
    method: method.toLowerCase(),
    url,
    headers: requestObj.headers,
    timeout: timeoutMs,
    data: bodyString || undefined,
  };

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await axios(axiosConfig);
      const data = resp.data;

      // 按火山标准返回结构兜底检查 ResponseMetadata.Error
      if (
        data &&
        data.ResponseMetadata &&
        data.ResponseMetadata.Error &&
        data.ResponseMetadata.Error.Code
      ) {
        const errMeta = data.ResponseMetadata.Error;
        const msg = `火山引擎接口返回错误：${errMeta.Code} - ${errMeta.Message || '未知错误'}`;
        const error = new Error(msg);
        error.code = errMeta.Code;
        error.requestId = data.ResponseMetadata.RequestId;
        throw error;
      }

      return data;
    } catch (err) {
      lastError = err;

      const status = err.response?.status;
      const isRetryableStatus =
        status >= 500 || status === 429 || status === 408 || status === 504;
      const isNetworkError =
        err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND' || err.code === 'ECONNRESET';

      const respData = err.response?.data;
      console.error('❌ [Volcengine] 请求失败:', {
        attempt,
        maxRetries,
        status,
        code: err.code,
        message: err.message,
        responseData: respData,
        requestId: respData?.ResponseMetadata?.RequestId,
        apiError: respData?.ResponseMetadata?.Error,
      });

      // 非可重试错误直接抛出（例如 4xx 参数错误）
      if (!isRetryableStatus && !isNetworkError) {
        break;
      }

      // 已达最大重试次数
      if (attempt === maxRetries) {
        break;
      }

      // 简单指数退避
      const delayMs = 300 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const respData = lastError?.response?.data;
  const apiErr = respData?.ResponseMetadata?.Error;
  const apiCode = apiErr?.Code || lastError?.code;
  const apiMsg = apiErr?.Message || respData?.ResponseMetadata?.Error?.Message;
  const requestId = respData?.ResponseMetadata?.RequestId || lastError?.requestId;

  let friendlyMessage = apiMsg
    ? `火山引擎即梦接口错误 [${apiCode}]: ${apiMsg}`
    : '调用火山引擎即梦服务失败，请稍后重试或检查 AK/SK、网络与请求参数是否正确。';
  if (apiCode === 'InvalidTimestamp') {
    friendlyMessage += ' 请确认本机系统时间已与互联网同步（设置 → 时间和语言 → 自动设置时间）。';
  }

  console.error('❌ [Volcengine] 请求最终失败，兜底日志:', {
    message: lastError?.message,
    code: apiCode,
    status: lastError?.response?.status,
    requestId,
    apiError: apiErr,
    fullResponse: respData,
  });
  const error = new Error(friendlyMessage);
  error.code = apiCode;
  error.cause = lastError;
  throw error;
}

/**
 * 即梦文生图 3.0 调用封装
 * 主要用于「根据描述生成产品」场景
 *
 * @param {Object} params
 * @param {string} params.prompt - 正向提示词
 * @param {string} [params.negativePrompt] - 反向提示词
 * @param {number} [params.width] - 宽，默认根据官方推荐
 * @param {number} [params.height] - 高
 * @param {string} [params.modelVersion] - 模型版本
 * @param {Object} [params.extra] - 透传给 req 的其他配置
 * @returns {Promise<{images: string[], raw: any}>} images 为 base64 数组
 */
async function generateImageFromText(params) {
  const {
    prompt,
    negativePrompt,
    width,
    height,
    modelVersion,
    extra = {},
  } = params || {};

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('generateImageFromText 需要传入非空的 prompt 字符串');
  }

  const action =
    process.env.VOLCENGINE_JIMENG_TEXT2IMG_ACTION || 'SubmitImageGenerateTask';
  const version = process.env.VOLCENGINE_JIMENG_TEXT2IMG_VERSION || '2022-08-31';

  // 按即梦文生图3.0接口结构构造 req，字段名称以官方文档为准
  const req = {
    text_prompts: [
      {
        text: prompt,
        weight: 1,
      },
    ],
    negative_prompt: negativePrompt || undefined,
    width: width || undefined,
    height: height || undefined,
    model_version: modelVersion || undefined,
    ...extra,
  };

  const body = { req };

  const data = await signedRequest({
    method: 'POST',
    path: '/',
    query: {
      Action: action,
      Version: version,
    },
    body,
    timeoutMs: 60000,
    maxRetries: 2,
  });

  const images = extractImagesFromResponse(data);

  if (!images || images.length === 0) {
    throw new Error(
      '即梦文生图返回中未找到图片结果，请检查请求参数是否符合文档。'
    );
  }

  return { images, raw: data };
}

/**
 * 即梦图生图 3.0 智能参考封装
 * 主要用于「根据纹样生成产品」或「纹样+描述生成产品」场景
 *
 * @param {Object} params
 * @param {string} params.imageBase64 - 参考图（纹样）Base64（不含 data: 前缀）
 * @param {string} [params.prompt] - 文本描述，可选
 * @param {Object} [params.extra] - 透传给 req 的其他配置
 * @returns {Promise<{images: string[], raw: any}>}
 */
async function generateImageFromImage(params) {
  const { imageBase64, prompt, extra = {} } = params || {};

  if (!imageBase64) {
    throw new Error('generateImageFromImage 需要传入 imageBase64');
  }

  const action =
    process.env.VOLCENGINE_JIMENG_IMG2IMG_ACTION || 'SubmitImageInspireTask';
  const version = process.env.VOLCENGINE_JIMENG_IMG2IMG_VERSION || '2022-08-31';

  // 按即梦图生图3.0智能参考接口结构构造 req，字段名称以官方文档为准
  const req = {
    // 参考图字段名以官方文档为准，这里使用常见写法 ref_image
    ref_image: imageBase64,
    prompt: prompt || undefined,
    ...extra,
  };

  const body = { req };

  const data = await signedRequest({
    method: 'POST',
    path: '/',
    query: {
      Action: action,
      Version: version,
    },
    body,
    timeoutMs: 60000,
    maxRetries: 2,
  });

  const images = extractImagesFromResponse(data);

  if (!images || images.length === 0) {
    throw new Error(
      '即梦图生图返回中未找到图片结果，请检查请求参数是否符合文档。'
    );
  }

  return { images, raw: data };
}

/**
 * 从即梦返回结构中尽量提取 Base64 图片结果
 * 不同接口/版本字段可能不同，这里做了几种常见兜底。
 */
function extractImagesFromResponse(data) {
  if (!data) return [];

  // 常见结构 1：ResultImage / ResultImageList
  if (data.ResultImage) {
    if (Array.isArray(data.ResultImage)) return data.ResultImage;
    return [data.ResultImage];
  }
  if (data.ResultImageList && Array.isArray(data.ResultImageList)) {
    return data.ResultImageList;
  }

  // 常见结构 2：data.images / data.ImageUrls 等
  if (data.data) {
    if (Array.isArray(data.data.images)) {
      return data.data.images;
    }
    if (Array.isArray(data.data.ImageUrls)) {
      return data.data.ImageUrls;
    }
  }

  if (Array.isArray(data.Images)) return data.Images;
  if (Array.isArray(data.ImageUrls)) return data.ImageUrls;

  return [];
}

/**
 * 业务层封装：根据「纹样或文本」生成产品图
 *
 * - 仅有 prompt：调用文生图3.0
 * - 有 imageBase64（可选 prompt）：调用图生图3.0智能参考
 */
async function generateProductFromPatternOrText({ imageBase64, prompt, options = {} }) {
  if (!imageBase64 && !prompt) {
    throw new Error('至少需要提供纹样图片或文本描述中的一种');
  }

  if (imageBase64) {
    return generateImageFromImage({
      imageBase64,
      prompt,
      extra: options,
    });
  }

  // 只有 prompt 的情况
  return generateImageFromText({
    prompt,
    extra: options,
  });
}

module.exports = {
  signedRequest,
  generateImageFromText,
  generateImageFromImage,
  generateProductFromPatternOrText,
};

