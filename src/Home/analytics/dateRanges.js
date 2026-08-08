// Date range presets and period-bucketing helpers shared by every analytics view.

export const PRESETS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

const startOfDay = (d) => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const endOfDay = (d) => { const n = new Date(d); n.setHours(23, 59, 59, 999); return n; };

export const getPresetRange = (preset, custom) => {
  const now = new Date();
  switch (preset) {
    case 'thisMonth':
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    case 'thisQuarter': {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return { from: startOfDay(new Date(now.getFullYear(), qStartMonth, 1)), to: endOfDay(now) };
    }
    case 'ytd':
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
    case 'custom':
      return {
        from: custom?.from ? startOfDay(new Date(custom.from)) : startOfDay(new Date(now.getFullYear(), 0, 1)),
        to: custom?.to ? endOfDay(new Date(custom.to)) : endOfDay(now),
      };
    default:
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
  }
};

export const filterOrdersByRange = (orders, from, to) =>
  orders.filter((o) => {
    const d = new Date(o.created_at);
    return !isNaN(d) && d >= from && d <= to;
  });

const dayKey = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
const monthKey = (d) => d.toISOString().slice(0, 7); // YYYY-MM
const weekKey = (d) => {
  // ISO-ish week key: year + week number (Monday-start)
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

// Auto-picks day/week/month granularity based on the span of the range, then
// buckets order revenue into a chart-ready array of { key, label, revenue, orders }.
export const bucketOrdersByPeriod = (orders, from, to) => {
  const spanDays = Math.max(1, Math.round((to - from) / 86400000));
  const granularity = spanDays <= 31 ? 'day' : spanDays <= 180 ? 'week' : 'month';
  const keyFn = granularity === 'day' ? dayKey : granularity === 'week' ? weekKey : monthKey;

  const buckets = new Map();
  for (const o of orders) {
    const d = new Date(o.created_at);
    if (isNaN(d)) continue;
    const key = keyFn(d);
    const revenue = Number(o.discounted_total ?? o.total_price ?? 0);
    const existing = buckets.get(key) || { key, revenue: 0, orders: 0 };
    existing.revenue += revenue;
    existing.orders += 1;
    buckets.set(key, existing);
  }

  return { granularity, data: Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key)) };
};
