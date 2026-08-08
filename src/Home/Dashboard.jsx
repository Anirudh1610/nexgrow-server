import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { SERVER_API_URL } from '../Auth/APIConfig';
import AppHeader from '../components/AppHeader';
import AnalyticsView from './analytics/AnalyticsView';
import '../components/UITheme.css';

const Dashboard = () => {
	const navigate = useNavigate();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);

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

	return (
		<div className="app-shell">
			<AppHeader />
			<main className="page fade-in">
				<div className="mobile-stack" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                    <h1 className="section-title mobile-center" style={{margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.5rem)'}}>Analytics</h1>
                    <button className="btn secondary mobile-full-width" onClick={() => navigate('/home')}>Back to Home</button>
                </div>

				{loading ? (
					<div style={{textAlign: 'center', padding: '4rem', color: 'var(--brand-text-soft)'}}>Loading analytics…</div>
				) : (
					<AnalyticsView orders={orders} sections={['trend', 'product', 'region', 'salesman']} />
				)}
			</main>
		</div>
	);
};

export default Dashboard;
