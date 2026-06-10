'use strict';

const crypto = require('crypto');

function normalize(s) {
  return s
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[　\s]+/g, ' ')
    .trim();
}

// 每個 extractor 接收「已 normalize 的字串」，由 extractConditionFingerprint 入口統一 normalize 一次

function extractTerm(t) {
  const out = new Set();
  if (/躉繳/.test(t)) out.add('躉繳');
  const matchN = t.match(/(\d+)\s*年期/g);
  if (matchN) for (const m of matchN) {
    const n = m.match(/(\d+)/)[1];
    out.add(`${n}年`);
  }
  // 繳別：必須帶「依/以/採/採用」前綴 或「方式/繳費/繳別/投保」後綴，
  // 避免「年繳保費 / 月繳保額」這種名詞修飾被誤抽
  const prefixPattern = /(?:依|以|採用?)\s*(半年繳|月繳|季繳|年繳)/g;
  const suffixPattern = /(半年繳|月繳|季繳|年繳)\s*(?:方式|繳費|繳別|投保)/g;
  for (const m of t.matchAll(prefixPattern)) out.add(m[1]);
  for (const m of t.matchAll(suffixPattern)) out.add(m[1]);
  return [...out];
}

function extractAge(t) {
  const out = new Set();
  // 首數字後可選帶「歲」（涵蓋「0 歲~60 歲」「0 歲至 73 歲」與「56~70 歲」兩種寫法）
  const range = t.match(/(\d+)\s*歲?\s*[~～\-至到]\s*(\d+)\s*歲/g);
  if (range) for (const m of range) {
    const r = m.match(/(\d+)\s*歲?\s*[~～\-至到]\s*(\d+)/);
    out.add(`${r[1]}-${r[2]}`);
  }
  const open = t.match(/(\d+)\s*歲\s*(?:[（(]\s*含\s*[)）])?\s*(以上|以下|含)/g);
  if (open) for (const m of open) {
    const r = m.match(/(\d+)\s*歲\s*(?:[（(]\s*含\s*[)）])?\s*(以上|以下|含)/);
    const tag = r[2] === '以下' ? `${r[1]}-` : r[2] === '以上' ? `${r[1]}+` : `${r[1]}=`;
    out.add(tag);
  }
  return [...out];
}

function extractAmount(t) {
  // 幣別 prefix 為 amount 維度專屬、入口 normalize 不處理
  const stripped = t.replace(/新臺幣|新台幣|台幣|臺幣/g, '');
  const unitMap = { '萬': 'w', '億': 'y' };
  const out = new Set();
  const range = stripped.matchAll(/(\d+(?:\.\d+)?)\s*(萬|億)\s*元?\s*(?:\([^)]*\))?\s*(?:至|到|~|～|-)\s*(\d+(?:\.\d+)?)\s*(萬|億)\s*元?\s*(?:\([^)]*\))?/g);
  for (const m of range) {
    out.add(`${m[1]}${unitMap[m[2]]}-${m[3]}${unitMap[m[4]]}`);
  }
  const open = stripped.matchAll(/(\d+(?:\.\d+)?)\s*(萬|億)\s*元?\s*(?:\([^)]*\))?\s*(以上|以下)/g);
  for (const m of open) {
    const tag = m[3] === '以上' ? '+' : '-';
    out.add(`${m[1]}${unitMap[m[2]]}${tag}`);
  }
  return [...out];
}

function extractOccupation(t) {
  const map = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' };
  const out = new Set();
  const m = t.matchAll(/第\s*([一二三四五六1-6])\s*類/g);
  for (const x of m) {
    out.add(map[x[1]] || x[1]);
  }
  return [...out];
}

// 產品代碼：限定括號內、2-5 大寫字母 + 3-6 數字、允許 / 分隔多代碼
// 例：(NTIW1202) → ['NTIW1202']、(NTIW1502/NTIW1702/NTIW1802) → ['NTIW1502','NTIW1702','NTIW1802']
function extractProductCode(t) {
  const out = new Set();
  const matches = t.matchAll(/[（(]\s*([A-Z]{2,5}\d{3,6}(?:\s*\/\s*[A-Z]{2,5}\d{3,6})*)\s*[)）]/g);
  for (const m of matches) {
    for (const code of m[1].split('/')) {
      out.add(code.trim());
    }
  }
  return [...out];
}

// 表驅動 dimension：新增維度只動這一張表
const DIMENSIONS = [
  ['age', extractAge],
  ['amount', extractAmount],
  ['occ', extractOccupation],
  ['product', extractProductCode],
  ['term', extractTerm],
];

const MAX_CANONICAL_LEN = 200;

function extractConditionFingerprint(text) {
  if (!text) return null;
  const t = normalize(text);
  const parts = [];
  for (const [key, fn] of DIMENSIONS) {
    const vals = fn(t);
    if (vals.length) parts.push(`${key}=${vals.sort().join(',')}`);
  }
  if (!parts.length) return null;
  const canon = parts.sort().join('|');
  if (canon.length <= MAX_CANONICAL_LEN) return canon;
  const hash = crypto.createHash('sha256').update(canon).digest('hex').slice(0, 16);
  return `${canon.slice(0, MAX_CANONICAL_LEN - 17)}#${hash}`;
}

module.exports = { extractConditionFingerprint };
