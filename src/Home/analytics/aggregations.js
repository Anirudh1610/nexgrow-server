// Pure aggregation helpers over the raw order[] shape returned by
// /orders/admin/orders, /orders/my-orders and /orders/manager/orders.
import { INDIAN_STATES } from '../../constants/indianStates';

const STATE_NAME_BY_CODE = INDIAN_STATES.reduce((acc, s) => { acc[s.code] = s.name; return acc; }, {});

const orderRevenue = (order) => Number(order.discounted_total ?? order.total_price ?? 0);
const lineRevenue = (line) => Number(line.discounted_price ?? line.price ?? 0);

export const summaryTotals = (orders) => {
  const totalRevenue = orders.reduce((sum, o) => sum + orderRevenue(o), 0);
  const totalOrders = orders.length;
  return {
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  };
};

export const aggregateByProduct = (orders) => {
  const map = new Map();
  for (const order of orders) {
    for (const line of order.products || []) {
      const name = line.product_name || line.product_id || 'Unknown product';
      const existing = map.get(name) || { name, quantity: 0, revenue: 0 };
      existing.quantity += Number(line.quantity) || 0;
      existing.revenue += lineRevenue(line);
      map.set(name, existing);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
};

export const aggregateByRegion = (orders) => {
  const map = new Map();
  for (const order of orders) {
    const code = order.state || 'Unknown';
    const existing = map.get(code) || { code, name: STATE_NAME_BY_CODE[code] || code, revenue: 0, orders: 0 };
    existing.revenue += orderRevenue(order);
    existing.orders += 1;
    map.set(code, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
};

export const aggregateBySalesman = (orders) => {
  const map = new Map();
  for (const order of orders) {
    const name = order.salesman_name || order.salesman_id || 'Unknown';
    const existing = map.get(name) || { name, revenue: 0, orders: 0 };
    existing.revenue += orderRevenue(order);
    existing.orders += 1;
    map.set(name, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
};
