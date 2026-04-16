const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const HERITAGE_CATEGORIES = [
  { id: 'craft', name: '传统技艺' },
  { id: 'drama', name: '传统戏剧' },
  { id: 'music', name: '传统音乐' },
  { id: 'dance', name: '传统舞蹈' },
  { id: 'folklore', name: '民俗' },
  { id: 'medicine', name: '传统医药' },
  { id: 'acrobatics', name: '杂技与竞技' },
  { id: 'oral', name: '口头传统' },
  { id: 'art', name: '传统美术' },
  { id: 'calligraphy', name: '书法与篆刻' },
];

const CATEGORY_KEYWORDS = {
  craft: ['景泰蓝', '青瓷', '宣纸', '竹编', '工艺', '烧制', '技艺', '缂丝', '火腿', '酥饼', '瓷器'],
  drama: ['京剧', '昆曲', '戏曲', '婺剧', '越剧', '淮海戏', '皮影戏', '梨园'],
  music: ['古琴', '琴书', '乐器', '曲牌', '唱腔', '音乐'],
  dance: ['舞蹈', '舞狮', '跑马灯', '花鼓会', '竹马', '马灯舞'],
  medicine: ['中医', '医药', '针灸', '瑶医', '药', '疗法'],
  acrobatics: ['武术', '太极拳', '杂技', '竞技', '拳'],
  oral: ['传说', '史诗', '说唱', '歌谣', '故事'],
  art: ['剪纸', '年画', '刺绣', '美术', '木版', '书画'],
  calligraphy: ['书法', '篆刻', '碑帖'],
  folklore: ['中秋', '清明', '节日', '民俗', '庙会', '祭祀', '风俗', '遗产日'],
};

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return true;
  return v;
}

function normalizeLine(line) {
  return String(line || '')
    .replace(/\u3000/g, ' ')
    .replace(/[\t\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeQuestionStart(line) {
  return /^\d+[\.、]\s*.+/.test(line);
}

function normalizeQuestionType(type) {
  const text = String(type || '').trim().toLowerCase();
  if (['single', 'multiple', 'judge'].includes(text)) {
    return text;
  }
  return 'single';
}

function detectTypeFromSection(line) {
  const text = normalizeLine(line);
  if (/单选题/.test(text)) return 'single';
  if (/多选题/.test(text)) return 'multiple';
  if (/判断题/.test(text)) return 'judge';
  return null;
}

function normalizeAnswerByType(answer, questionType) {
  const raw = String(answer || '').trim().toUpperCase();
  if (!raw) return null;

  if (questionType === 'judge') {
    if (raw === 'A' || raw.includes('正确') || raw === 'TRUE') return 'A';
    if (raw === 'B' || raw.includes('错误') || raw === 'FALSE') return 'B';
    return null;
  }

  const letters = Array.from(raw.replace(/[^A-F]/g, ''));
  if (!letters.length) return null;
  const uniqSorted = [...new Set(letters)].sort().join('');

  if (questionType === 'multiple') {
    return uniqSorted.length >= 2 ? uniqSorted : null;
  }

  return uniqSorted.length === 1 ? uniqSorted : null;
}

function getCategoryNameById(categoryId) {
  const hit = HERITAGE_CATEGORIES.find((item) => item.id === categoryId);
  return hit ? hit.name : '民俗';
}

function classifyCategoryByText(item, defaults) {
  if (defaults.forceCategory) {
    return {
      categoryId: defaults.categoryId,
      categoryName: defaults.categoryName,
    };
  }

  const fullText = [
    item.stem,
    item.optionA,
    item.optionB,
    item.optionC,
    item.optionD,
    item.optionE,
    item.optionF,
    item.explanation,
  ]
    .map((v) => String(v || '').trim())
    .join(' ')
    .toLowerCase();

  let best = { id: defaults.categoryId, score: 0 };

  Object.entries(CATEGORY_KEYWORDS).forEach(([categoryId, words]) => {
    let score = 0;
    words.forEach((word) => {
      const w = String(word || '').toLowerCase();
      if (w && fullText.includes(w)) {
        score += 1;
      }
    });
    if (score > best.score) {
      best = { id: categoryId, score };
    }
  });

  return {
    categoryId: best.id,
    categoryName: getCategoryNameById(best.id),
  };
}

function parseRawQuestions(rawText) {
  const lines = String(rawText || '')
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.length > 0);

  const questions = [];
  let current = null;
  let currentType = 'single';

  const startNewQuestion = (line) => {
    const m = line.match(/^(\d+)[\.、]\s*(.+)$/);
    if (!m) return false;

    if (current) {
      questions.push(current);
    }

    current = {
      num: Number(m[1]),
      questionType: currentType,
      stem: m[2],
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      optionE: '',
      optionF: '',
      correctOption: '',
      correctAnswer: '',
      explanation: '',
      _inExplanation: false,
    };
    return true;
  };

  const pushIntoStem = (line) => {
    if (!current) return;
    if (/^\d+$/.test(line)) return;
    current.stem = `${current.stem} ${line}`.trim();
  };

  for (const line of lines) {
    const sectionType = detectTypeFromSection(line);
    if (sectionType) {
      currentType = sectionType;
      continue;
    }

    if (looksLikeQuestionStart(line)) {
      startNewQuestion(line);
      continue;
    }

    if (!current) {
      continue;
    }

    const optionMatch = line.match(/^([A-F])[、,，\.．:：\)]\s*(.+)$/i);
    if (optionMatch) {
      const key = optionMatch[1].toUpperCase();
      const value = optionMatch[2].trim();
      if (key === 'A') current.optionA = value;
      if (key === 'B') current.optionB = value;
      if (key === 'C') current.optionC = value;
      if (key === 'D') current.optionD = value;
      if (key === 'E') current.optionE = value;
      if (key === 'F') current.optionF = value;
      continue;
    }

    const answerMatch = line.match(/^答案[：:]\s*(.+)$/i);
    if (answerMatch) {
      current.correctAnswer = answerMatch[1].trim().toUpperCase();
      current._inExplanation = false;
      continue;
    }

    const explanationMatch = line.match(/^解析[：:]\s*(.*)$/i);
    if (explanationMatch) {
      current.explanation = explanationMatch[1].trim();
      current._inExplanation = true;
      continue;
    }

    if (current._inExplanation) {
      if (/^\d+[\.、]/.test(line)) {
        startNewQuestion(line);
      } else {
        current.explanation = `${current.explanation} ${line}`.trim();
      }
      continue;
    }

    pushIntoStem(line);
  }

  if (current) {
    questions.push(current);
  }

  return questions;
}

function sanitizeQuestion(item, defaults) {
  const questionType = normalizeQuestionType(item.questionType);
  const normalize = (v) => String(v || '').trim();

  let optionA = normalize(item.optionA);
  let optionB = normalize(item.optionB);
  const optionC = normalize(item.optionC) || null;
  const optionD = normalize(item.optionD) || null;
  const optionE = normalize(item.optionE) || null;
  const optionF = normalize(item.optionF) || null;

  if (questionType === 'judge') {
    optionA = optionA || '正确';
    optionB = optionB || '错误';
  }

  const correctAnswer = normalizeAnswerByType(
    normalize(item.correctAnswer || item.correctOption),
    questionType
  );

  const category = classifyCategoryByText(item, defaults);

  const result = {
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    difficulty: defaults.difficulty,
    questionType,
    stem: normalize(item.stem),
    optionA,
    optionB,
    optionC,
    optionD,
    optionE,
    optionF,
    correctOption: questionType === 'single' ? correctAnswer : null,
    correctAnswer,
    explanation: normalize(item.explanation) || '暂无解析',
    sourceType: 'competition',
    sourceRef: defaults.sourceRef,
    status: 'published',
  };

  const baseOk = result.stem && result.optionA && result.optionB && result.correctAnswer;
  const singleOk =
    questionType !== 'single' ||
    (result.optionC && ['A', 'B', 'C', 'D', 'E', 'F'].includes(result.correctAnswer));
  const multipleOk = questionType !== 'multiple' || result.correctAnswer.length >= 2;
  const judgeOk = questionType !== 'judge' || ['A', 'B'].includes(result.correctAnswer);

  const ok = baseOk && singleOk && multipleOk && judgeOk;

  return ok ? result : null;
}

async function main() {
  const inputPath = getArg('input');
  if (!inputPath) {
    console.error('请传入 --input 原始题库文本路径');
    process.exit(1);
  }

  const fullInputPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(process.cwd(), inputPath);

  if (!fs.existsSync(fullInputPath)) {
    console.error('输入文件不存在:', fullInputPath);
    process.exit(1);
  }

  const rawText = fs.readFileSync(fullInputPath, 'utf8');

  const defaults = {
    categoryId: getArg('categoryId', 'folklore'),
    categoryName: getArg('categoryName', '民俗'),
    difficulty: getArg('difficulty', 'medium'),
    sourceRef: getArg('sourceRef', '2025年全国非物质文化遗产知识竞赛（用户提供）'),
    forceCategory: Boolean(getArg('force-category', false)),
  };

  const parsed = parseRawQuestions(rawText);
  const valid = parsed
    .map((q) => sanitizeQuestion(q, defaults))
    .filter(Boolean);

  const invalidCount = parsed.length - valid.length;

  const outputPath = getArg(
    'output',
    path.join(path.dirname(fullInputPath), 'competition-questions.normalized.json')
  );

  fs.writeFileSync(outputPath, JSON.stringify(valid, null, 2), 'utf8');

  const typeStats = valid.reduce(
    (acc, q) => {
      const t = q.questionType || 'single';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    },
    { single: 0, multiple: 0, judge: 0 }
  );

  const categoryStats = valid.reduce((acc, q) => {
    const k = `${q.categoryName}(${q.categoryId})`;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  console.log('解析完成');
  console.log('总题数:', parsed.length);
  console.log('有效题数:', valid.length);
  console.log('无效题数:', invalidCount);
  console.log('题型统计:', typeStats);
  console.log('分类统计:', categoryStats);
  console.log('输出文件:', outputPath);

  const dryRun = Boolean(getArg('dry-run', false));
  if (dryRun) {
    console.log('dry-run 模式，不执行导入');
    return;
  }

  const apiBase = getArg('api', process.env.API_BASE || 'http://localhost:3100/api');
  const token = getArg('token', process.env.ADMIN_TOKEN || '');
  if (!token) {
    console.log('未提供 token，跳过导入。你可以用 --token 或环境变量 ADMIN_TOKEN');
    return;
  }

  const resp = await axios.post(
    `${apiBase.replace(/\/$/, '')}/ai/quiz/questions/import-official`,
    {
      sourceType: 'competition',
      questions: valid,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 120000,
    }
  );

  console.log('导入完成:', resp.data);
}

main().catch((err) => {
  console.error('执行失败:', err.response?.data || err.message);
  process.exit(1);
});
