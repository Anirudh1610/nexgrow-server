import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import AnalyticsView from './analytics/AnalyticsView';
import { PRESETS, getPresetRange, filterOrdersByRange } from './analytics/dateRanges';
import { summaryTotals, aggregateByProduct, aggregateByRegion, aggregateBySalesman } from './analytics/aggregations';
import { formatINR } from './numberFormat';
import '../components/UITheme.css';

const Dashboard = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [dashPreset, setDashPreset] = useState('thisMonth');
	const [dashRegion, setDashRegion] = useState('');

	useEffect(() => {
		const fetchOrders = async () => {
			setLoading(true);
			try {
				const params = {};
				try { const u = JSON.parse(localStorage.getItem('nexgrow_user') || 'null'); if (u?.uid) params.uid = u.uid; if (u?.email) params.email = u.email; } catch {}
				const res = await axios.get(`${SERVER_API_URL}/orders/admin/orders`, { params });
				setOrders(res.data || []);
			} catch {
				setOrders([]);
			}
			setLoading(false);
		};
		fetchOrders();
	}, []);

	const regionOptions = useMemo(
		() => Array.from(new Set(orders.map((o) => o.state).filter(Boolean))).sort(),
		[orders]
	);

	const { from, to } = useMemo(() => getPresetRange(dashPreset), [dashPreset]);

	const dashFiltered = useMemo(() => {
		let result = filterOrdersByRange(orders, from, to);
		if (dashRegion) result = result.filter((o) => o.state === dashRegion);
		return result;
	}, [orders, from, to, dashRegion]);

	const dashTotals = useMemo(() => summaryTotals(dashFiltered), [dashFiltered]);
	const productBars = useMemo(() => aggregateByProduct(dashFiltered).slice(0, 5), [dashFiltered]);
	const byRegion = useMemo(() => aggregateByRegion(dashFiltered), [dashFiltered]);
	const bySalesman = useMemo(() => aggregateBySalesman(dashFiltered), [dashFiltered]);
	const maxProductRevenue = Math.max(1, ...productBars.map((p) => p.revenue));

	return (
		<div>
			{loading ? (
				<div style={{ textAlign: 'center', padding: '4rem', color: 'var(--brand-text-soft)' }}>Loading analytics…</div>
			) : (
				<>
					<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
						<div>
							<label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.3px' }}>Date Range</label>
							<select className="input" value={dashPreset} onChange={(e) => setDashPreset(e.target.value)} style={{ minWidth: 180 }}>
								{PRESETS.filter((p) => p.value !== 'custom').map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
							</select>
						</div>
						<div>
							<label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.3px' }}>Region</label>
							<select className="input" value={dashRegion} onChange={(e) => setDashRegion(e.target.value)} style={{ minWidth: 180 }}>
								<option value="">All Regions</option>
								{regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
							</select>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 22 }}>
						<div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 18, padding: '20px 22px', color: '#fff', boxShadow: 'var(--brand-shadow-md)' }}>
							<div style={{ fontSize: 12, fontWeight: 600, opacity: .85, marginBottom: 8 }}>Total Revenue</div>
							<div style={{ fontSize: 26, fontWeight: 800 }}>₹{formatINR(dashTotals.totalRevenue, { decimals: 0 })}</div>
						</div>
						<div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 18, padding: '20px 22px' }}>
							<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-text-muted)', marginBottom: 8 }}>Total Orders</div>
							<div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand-text)' }}>{dashTotals.totalOrders}</div>
						</div>
						<div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 18, padding: '20px 22px' }}>
							<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-text-muted)', marginBottom: 8 }}>Avg Order Value</div>
							<div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand-text)' }}>₹{formatINR(dashTotals.avgOrderValue, { decimals: 0 })}</div>
						</div>
					</div>

					<div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 18, padding: 22, marginBottom: 18 }}>
						<div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--brand-text)', marginBottom: 16 }}>Revenue by Product</div>
						{productBars.length === 0 ? (
							<div style={{ textAlign: 'center', color: 'var(--brand-text-soft)', padding: '1rem' }}>No orders in this range.</div>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
								{productBars.map((pb) => (
									<div key={pb.name}>
										<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--brand-text)', marginBottom: 5 }}>
											<span style={{ fontWeight: 600 }}>{pb.name}</span>
											<span style={{ color: 'var(--brand-text-soft)' }}>₹{formatINR(pb.revenue, { decimals: 0 })}</span>
										</div>
										<div style={{ height: 9, background: 'var(--brand-surface-alt)', borderRadius: 6, overflow: 'hidden' }}>
											<div style={{ height: '100%', width: `${Math.round((pb.revenue / maxProductRevenue) * 100)}%`, background: 'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius: 6 }} />
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: '2rem' }}>
						<div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 18, padding: 22 }}>
							<div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--brand-text)', marginBottom: 14 }}>By Region</div>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
								<thead><tr>
									<th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--brand-text-muted)', borderBottom: '2px solid var(--brand-surface-alt)' }}>Region</th>
									<th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--brand-text-muted)', borderBottom: '2px solid var(--brand-surface-alt)' }}>Orders</th>
									<th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--brand-text-muted)', borderBottom: '2px solid var(--brand-surface-alt)' }}>Revenue</th>
								</tr></thead>
								<tbody>
									{byRegion.map((r) => (
										<tr key={r.code}>
											<td style={{ padding: '8px 6px', borderBottom: '1px solid var(--brand-surface-alt)', color: 'var(--brand-text)' }}>{r.name}</td>
											<td style={{ padding: '8px 6px', borderBottom: '1px solid var(--brand-surface-alt)', textAlign: 'right', color: 'var(--brand-text)' }}>{r.orders}</td>
											<td style={{ padding: '8px 6px', borderBottom: '1px solid var(--brand-surface-alt)', textAlign: 'right', color: 'var(--brand-text)', fontWeight: 600 }}>₹{formatINR(r.revenue, { decimals: 0 })}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 18, padding: 22 }}>
							<div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--brand-text)', marginBottom: 14 }}>By Salesman</div>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
								<thead><tr>
									<th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--brand-text-muted)', borderBottom: '2px solid var(--brand-surface-alt)' }}>Salesman</th>
									<th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--brand-text-muted)', borderBottom: '2px solid var(--brand-surface-alt)' }}>Orders</th>
									<th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--brand-text-muted)', borderBottom: '2px solid var(--brand-surface-alt)' }}>Revenue</th>
								</tr></thead>
								<tbody>
									{bySalesman.map((s) => (
										<tr key={s.name}>
											<td style={{ padding: '8px 6px', borderBottom: '1px solid var(--brand-surface-alt)', color: 'var(--brand-text)' }}>{s.name}</td>
											<td style={{ padding: '8px 6px', borderBottom: '1px solid var(--brand-surface-alt)', textAlign: 'right', color: 'var(--brand-text)' }}>{s.orders}</td>
											<td style={{ padding: '8px 6px', borderBottom: '1px solid var(--brand-surface-alt)', textAlign: 'right', color: 'var(--brand-text)', fontWeight: 600 }}>₹{formatINR(s.revenue, { decimals: 0 })}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<AnalyticsView orders={orders} sections={['trend', 'product', 'region', 'salesman']} title="Detailed Analytics" />
				</>
			)}
		</div>
	);
};

export default Dashboard;
