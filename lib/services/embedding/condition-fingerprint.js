'use strict';

function normalize(s) {
  return s
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[　\s]+/g, ' ')
    .trim();
}

function extractTerm(text) {
  const t = normalize(text);
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

function extractAge(text) {
  const t = normalize(text);
  const out = new Set();
  const range = t.match(/(\d+)\s*[~～\-至到]\s*(\d+)\s*歲/g);
  if (range) for (const m of range) {
    const r = m.match(/(\d+)\s*[~～\-至到]\s*(\d+)/);
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

function extractAmount(text) {
  const t = normalize(text).replace(/新臺幣|新台幣|台幣|臺幣/g, '');
  const unitMap = { '萬': 'w', '億': 'y' };
  const out = new Set();
  const range = t.matchAll(/(\d+(?:\.\d+)?)\s*(萬|億)\s*元?\s*(?:\([^)]*\))?\s*(?:至|到|~|～|-)\s*(\d+(?:\.\d+)?)\s*(萬|億)\s*元?\s*(?:\([^)]*\))?/g);
  for (const m of range) {
    out.add(`${m[1]}${unitMap[m[2]]}-${m[3]}${unitMap[m[4]]}`);
  }
  const open = t.matchAll(/(\d+(?:\.\d+)?)\s*(萬|億)\s*元?\s*(?:\([^)]*\))?\s*(以上|以下)/g);
  for (const m of open) {
    const tag = m[3] === '以上' ? '+' : '-';
    out.add(`${m[1]}${unitMap[m[2]]}${tag}`);
  }
  return [...out];
}

function extractOccupation(text) {
  const t = normalize(text);
  const map = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' };
  const out = new Set();
  const m = t.matchAll(/第\s*([一二三四五六1-6])\s*類/g);
  for (const x of m) {
    out.add(map[x[1]] || x[1]);
  }
  return [...out];
}

const MAX_CANONICAL_LEN = 200;

function extractConditionFingerprint(text) {
  if (!text) return null;
  const parts = [];
  const age = extractAge(text); if (age.length) parts.push(`age=${age.sort().join(',')}`);
  const amount = extractAmount(text); if (amount.length) parts.push(`amount=${amount.sort().join(',')}`);
  const occ = extractOccupation(text); if (occ.length) parts.push(`occ=${occ.sort().join(',')}`);
  const term = extractTerm(text); if (term.length) parts.push(`term=${term.sort().join(',')}`);
  if (!parts.length) return null;
  const canon = parts.sort().join('|');
  if (canon.length <= MAX_CANONICAL_LEN) return canon;
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(canon).digest('hex').slice(0, 16);
  return `${canon.slice(0, MAX_CANONICAL_LEN - 17)}#${hash}`;
}

module.exports = { extractConditionFingerprint };
