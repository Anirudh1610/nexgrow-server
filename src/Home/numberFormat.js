// Utility for Indian number formatting
export const formatINR = (value, {decimals=2, allowZeroDecimals=false} = {}) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  const opts = { maximumFractionDigits: decimals, minimumFractionDigits: allowZeroDecimals ? decimals : 0 }; 
  return new Intl.NumberFormat('en-IN', opts).format(num);
};

export const formatPercent = (value, {decimals=2} = {}) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(num);
};

// Helpers to build display order IDs
const parseObjectIdTime = (id) => {
  if (typeof id === 'string' && id.length >= 8) {
    try { return new Date(parseInt(id.substring(0,8),16) * 1000); } catch { return null; }
  }
  return null;
};

export const coerceDate = (order) => {
  const raw = order?.created_at || order?.createdAt || order?.updated_at || order?.date || order?.timestamp || null;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return parseObjectIdTime(order?._id || order?.id) || new Date();
};

export const fiscalYearCode = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // Apr (3) to Mar
  const nextYY = String((fyStartYear + 1) % 100).padStart(2, '0');
  return `fy${fyStartYear}-${nextYY}`;
};

export const stateCode = (state) => {
  if (!state) return 'na';
  return String(state).toLowerCase().replace(/[^a-z]/g, '') || 'na';
};

const simpleHash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const deriveSequence = (order) => {
  if (order && (order.sequence || order.seq)) {
    const n = Number(order.sequence || order.seq);
    if (!Number.isNaN(n)) return n % 1000; // keep last 3 digits
  }
  const base = order?._id || order?.id || JSON.stringify(order || {});
  const h = simpleHash(String(base));
  return h % 1000; // 0..999
};

export const formatOrderDisplayId = (order, opts = {}) => {
  const d = coerceDate(order);
  const fy = fiscalYearCode(d);
  const state = stateCode(order?.state);
  const seq = (opts && typeof opts.seq === 'number') ? opts.seq : deriveSequence(order);
  const seqStr = String(Math.max(1, seq)).padStart(4, '0'); // 0001+
  return `nxg-${fy}-${state}-${seqStr}`;
};

export const computeDisplaySeqMap = (orders) => {
  const arr = Array.isArray(orders) ? orders.slice() : [];
  // Group by fiscal year + state
  const groups = new Map();
  for (const o of arr) {
    const d = coerceDate(o);
    const fy = fiscalYearCode(d);
    const st = stateCode(o?.state);
    const key = `${fy}::${st}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  const result = {};
  for (const [, list] of groups.entries()) {
    // Oldest first gets 1, then increasing
    list.sort((a,b) => coerceDate(a) - coerceDate(b));
    list.forEach((o, i) => {
      const idKey = String(o?._id || o?.id || i);
      result[idKey] = i + 1; // 1-based
    });
  }
  return result;
};
