const { readFile } = require('fs/promises');
const path = require('path');
const { File } = require('node:buffer');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3100/api';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing TEST_EMAIL or TEST_PASSWORD env vars.');
  process.exit(1);
}

async function postJson(url, body, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${data.message || 'Request failed'}`);
  }
  return data;
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${data.message || 'Request failed'}`);
  }
  return data;
}

async function postForm(url, form, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return text;
}

async function buildFileForm(fieldName, filePath, contentType) {
  const buffer = await readFile(filePath);
  const file = new File([buffer], path.basename(filePath), { type: contentType });
  const form = new FormData();
  form.append(fieldName, file);
  return form;
}

async function main() {
  const results = {};

  const login = await postJson(`${BASE_URL}/auth/login`, {
    email: EMAIL,
    password: PASSWORD,
    loginType: 'user',
  });
  const token = login?.data?.token;
  if (!token) {
    throw new Error('Login failed: no token returned');
  }

  results.qa = await postJson(`${BASE_URL}/ai/ask-heritage`, {
    question: 'What are the key features of Chinese paper-cutting? Provide a brief overview.',
    categoryId: 'craft',
  }, token);

  const learnPath = path.join(__dirname, '../../web/public/images/works/phone1.jpg');
  const learnForm = await buildFileForm('image', learnPath, 'image/jpeg');
  learnForm.append('skill', 'paper-cutting');
  learnForm.append('skillName', '剪纸');
  results.learn = await postForm(`${BASE_URL}/ai/learn`, learnForm, token);

  const transformPath = path.join(__dirname, '../../web/public/images/works/bag1.jpg');
  const transformForm = await buildFileForm('pattern', transformPath, 'image/jpeg');
  transformForm.append('productType', '手机壳');
  results.transform = await postForm(`${BASE_URL}/ai/transform`, transformForm, token);

  const sketchPath = path.join(__dirname, '../../web/public/images/works/cup1.jpg');
  const sketchBuffer = await readFile(sketchPath);
  const sketchBase64 = sketchBuffer.toString('base64');
  results.sketch = await postJson(`${BASE_URL}/ai/heritage-sketch-generate`, {
    sketchBase64: `data:image/jpeg;base64,${sketchBase64}`,
    styleKey: 'paper-cutting',
  }, token);

  results.quiz = await getJson(`${BASE_URL}/ai/quiz/challenge/start?categoryId=craft&difficulty=hard`, token);

  const recognizePath = path.join(__dirname, '../../web/public/images/works/T-shirt1.jpg');
  const recognizeForm = await buildFileForm('image', recognizePath, 'image/jpeg');
  results.recognize = await postForm(`${BASE_URL}/ar/recognize`, recognizeForm, null);

  console.log(JSON.stringify({
    qa: Boolean(results.qa?.success),
    learn: Boolean(results.learn),
    transform: Boolean(results.transform),
    sketch: Boolean(results.sketch?.success),
    quiz: Boolean(results.quiz?.success),
    recognize: Boolean(results.recognize),
  }, null, 2));
}

main().catch((error) => {
  console.error('TEST_AI_MONITOR_FAILED', error.message);
  process.exit(1);
});
