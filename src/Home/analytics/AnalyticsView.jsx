import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PRESETS, getPresetRange, filterOrdersByRange, bucketOrdersByPeriod } from './dateRanges';
import { summaryTotals, aggregateByProduct, aggregateByRegion, aggregateBySalesman } from './aggregations';
import { formatINR } from '../numberFormat';
import MultiSelectDropdown from './MultiSelectDropdown';

const GREEN = '#16a34a';
const TOP_N = 10;

const styles = {
  filterBar: { display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '.35rem' },
  filterLabel: { fontSize: '.8rem', fontWeight: 600, color: 'var(--brand-text-soft)' },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--brand-shadow-sm)' },
  statLabel: { fontSize: '.85rem', color: 'var(--brand-text-soft)', marginBottom: '.35rem' },
  statValue: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-text)' },
  section: { background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--brand-shadow-sm)' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-text)', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem', marginTop: '1rem' },
  th: { textAlign: 'left', padding: '.6rem .75rem', borderBottom: '2px solid var(--brand-border)', color: 'var(--brand-text-soft)', fontWeight: 600 },
  td: { padding: '.6rem .75rem', borderBottom: '1px solid var(--brand-border)', color: 'var(--brand-text)' },
  empty: { textAlign: 'center', color: 'var(--brand-text-soft)', padding: '2rem' },
};

const periodLabel = (key, granularity) => {
  if (granularity === 'day') {
    const d = new Date(key);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
  if (granularity === 'week') return key;
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

export default function AnalyticsView({ orders, sections, title }) {
  const [preset, setPreset] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState([]);

  const showRegionSection = sections.includes('region');
  const showSalesmanSection = sections.includes('salesman');

  const { from, to } = useMemo(
    () => getPresetRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo]
  );

  const regionOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.state).filter(Boolean))).sort(),
    [orders]
  );
  const salesmanOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.salesman_name).filter(Boolean))).sort(),
    [orders]
  );

  const filtered = useMemo(() => {
    let result = filterOrdersByRange(orders, from, to);
    if (regionFilter) result = result.filter((o) => o.state === regionFilter);
    if (salesmanFilter.length > 0) result = result.filter((o) => salesmanFilter.includes(o.salesman_name));
    return result;
  }, [orders, from, to, regionFilter, salesmanFilter]);

  const totals = useMemo(() => summaryTotals(filtered), [filtered]);
  const trend = useMemo(() => bucketOrdersByPeriod(filtered, from, to), [filtered, from, to]);
  const byProduct = useMemo(() => aggregateByProduct(filtered), [filtered]);
  const byRegion = useMemo(() => (showRegionSection ? aggregateByRegion(filtered) : []), [filtered, showRegionSection]);
  const bySalesman = useMemo(() => (showSalesmanSection ? aggregateBySalesman(filtered) : []), [filtered, showSalesmanSection]);

  const trendChartData = trend.data.map((d) => ({ ...d, label: periodLabel(d.key, trend.granularity) }));

  return (
    <div>
      {title && <h1 className="section-title" style={{ marginBottom: '1.25rem' }}>{title}</h1>}

      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Date Range</label>
          <select className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>
            {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {preset === 'custom' && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>From</label>
              <input className="input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>To</label>
              <input className="input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}
        {showRegionSection && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Region</label>
            <select className="input" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              <option value="">All regions</option>
              {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        {showSalesmanSection && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Salesman</label>
            <MultiSelectDropdown label="Salesmen" options={salesmanOptions} selected={salesmanFilter} onChange={setSalesmanFilter} />
          </div>
        )}
      </div>

      <div style={styles.cardsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Revenue</div>
          <div style={styles.statValue}>{formatINR(totals.totalRevenue)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Orders</div>
          <div style={styles.statValue}>{totals.totalOrders}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Avg Order Value</div>
          <div style={styles.statValue}>{formatINR(totals.avgOrderValue)}</div>
        </div>
      </div>

      {sections.includes('trend') && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Sales Over Time</div>
          {trendChartData.length === 0 ? (
            <div style={styles.empty}>No orders in this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v, { decimals: 0 })} width={90} />
                <Tooltip formatter={(v) => formatINR(v)} cursor={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {sections.includes('product') && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>By Product</div>
          {byProduct.length === 0 ? (
            <div style={styles.empty}>No orders in this range.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.min(400, 50 + byProduct.slice(0, TOP_N).length * 36)}>
                <BarChart data={byProduct.slice(0, TOP_N)} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={180} />
                  <Tooltip formatter={(v) => formatINR(v)} cursor={false} isAnimationActive={false} />
                  <Bar dataKey="revenue" fill={GREEN} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
              <table style={styles.table}>
                <thead>
                  <tr><th style={styles.th}>Product</th><th style={styles.th}>Quantity</th><th style={styles.th}>Revenue</th></tr>
                </thead>
                <tbody>
                  {byProduct.map((p) => (
                    <tr key={p.name}>
                      <td style={styles.td}>{p.name}</td>
                      <td style={styles.td}>{p.quantity}</td>
                      <td style={styles.td}>{formatINR(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {showRegionSection && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>By Region</div>
          {byRegion.length === 0 ? (
            <div style={styles.empty}>No orders in this range.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.min(400, 50 + byRegion.length * 36)}>
                <BarChart data={byRegion} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip formatter={(v) => formatINR(v)} cursor={false} isAnimationActive={false} />
                  <Bar dataKey="revenue" fill={GREEN} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
              <table style={styles.table}>
                <thead>
                  <tr><th style={styles.th}>Region</th><th style={styles.th}>Orders</th><th style={styles.th}>Revenue</th></tr>
                </thead>
                <tbody>
                  {byRegion.map((r) => (
                    <tr key={r.code}>
                      <td style={styles.td}>{r.name}</td>
                      <td style={styles.td}>{r.orders}</td>
                      <td style={styles.td}>{formatINR(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {showSalesmanSection && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>By Salesman</div>
          {bySalesman.length === 0 ? (
            <div style={styles.empty}>No orders in this range.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.min(400, 50 + bySalesman.slice(0, TOP_N).length * 36)}>
                <BarChart data={bySalesman.slice(0, TOP_N)} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip formatter={(v) => formatINR(v)} cursor={false} isAnimationActive={false} />
                  <Bar dataKey="revenue" fill={GREEN} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
              <table style={styles.table}>
                <thead>
                  <tr><th style={styles.th}>Salesman</th><th style={styles.th}>Orders</th><th style={styles.th}>Revenue</th></tr>
                </thead>
                <tbody>
                  {bySalesman.map((s) => (
                    <tr key={s.name}>
                      <td style={styles.td}>{s.name}</td>
                      <td style={styles.td}>{s.orders}</td>
                      <td style={styles.td}>{formatINR(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
