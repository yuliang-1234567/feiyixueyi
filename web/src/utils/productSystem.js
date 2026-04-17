import api from './api';

const CACHE_KEY = 'feiyixueyi:productSystem:v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.ts || !parsed.data) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
}

export async function fetchProductSystem({ scene } = {}) {
  const cached = readCache();
  if (cached) return cached;

  const res = await api.get('/ai/product-system', { params: scene ? { scene } : {} });
  if (res?.data?.success && res?.data?.data) {
    writeCache(res.data.data);
    return res.data.data;
  }
  return null;
}

export function buildProductOptions(products = []) {
  return (Array.isArray(products) ? products : []).map((p) => ({
    value: p.label,
    label: p.label,
  }));
}

export function buildCategoryOptions(products = []) {
  const labels = (Array.isArray(products) ? products : [])
    .map((p) => p.label)
    .filter(Boolean);
  const uniq = Array.from(new Set(labels));
  return uniq.map((x) => ({ value: x, label: x }));
}

