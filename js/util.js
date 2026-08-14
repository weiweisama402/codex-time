// 分类定义：固定四大类
export const CATEGORIES = [
  { key: 'main', label: '主要工作', color: '#3b82f6' },
  { key: 'extra', label: '附加工作', color: '#f59e0b' },
  { key: 'leisure', label: '休闲', color: '#10b981' },
  { key: 'fun', label: '娱乐', color: '#ec4899' }
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
export const DAY_MS = 86400000;

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// 本地日期（不使用 UTC）
export function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function fmtMin(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分`;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
