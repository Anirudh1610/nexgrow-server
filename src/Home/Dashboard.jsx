import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import { formatINR, formatPercent } from './numberFormat';

const Dashboard = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const response = await axios.get(`${SERVER_API_URL}/orders`);
				setOrders(response.data || []);
			} catch (error) {
				setOrders([]);
			} finally {
				setLoading(false);
			}
		};
		fetchOrders();
	}, []);

	// Calculate total sales amount
	const totalSales = orders.reduce((sum, order) => {
		// If order has total_price, use it; else sum product prices
		if (order.total_price) return sum + order.total_price;
		if (order.products && Array.isArray(order.products)) {
			return sum + order.products.reduce((pSum, p) => pSum + (p.price || 0), 0);
		}
		return sum;
	}, 0);

	const discountSavings = orders.reduce((sum, o) => {
		const t = o.total_price || 0;
		if (o.discounted_total != null) return sum + (t - o.discounted_total);
		const d = o.discount || 0;
		return sum + (t - (t - (t * d) / 100));
	}, 0);
	const approvedDiscounts = orders.filter(o => o.discount_status === 'approved').length;

	return (
		<div className="app-shell" style={{ minHeight: '100vh' }}>
			<header className="app-header">
				<div className="app-header__logo" onClick={() => navigate('/home')}>NEXGROW</div>
				<div className="app-header__actions">
					<button className="btn danger" onClick={async () => { await signOut(auth); navigate('/'); }}>Sign Out</button>
				</div>
			</header>
			<main className="page fade-in">
				<h1 className="section-title" style={{ fontSize: '1.55rem' }}>Dashboard</h1>
				<div className="stat-grid">
					<div className="stat">
						<h4>Total Sales (₹)</h4>
						<div className="value">₹{formatINR(totalSales)}</div>
					</div>
					<div className="stat">
						<h4>Discount Savings (₹)</h4>
						<div className="value">₹{formatINR(discountSavings)}</div>
					</div>
					<div className="stat">
						<h4>Approved Discounts</h4>
						<div className="value">{approvedDiscounts}</div>
					</div>
					<div className="stat">
						<h4>Total Orders</h4>
						<div className="value">{orders.length}</div>
					</div>
				</div>
				<div className="surface-card elevated" style={{ marginTop: '1.5rem' }}>
					<h2 className="section-title" style={{ fontSize: '1rem' }}>Recent Orders</h2>
					{loading ? <p>Loading orders...</p> : orders.length === 0 ? <p>No orders found.</p> : (
						<ul className="order-list">
							{orders.slice(0, 8).map((order, i) => {
								const total = order.total_price || 0;
								const discount = order.discount || 0;
								const discounted = order.discounted_total != null ? order.discounted_total : total - (total * discount / 100);
								return (
									<li key={order._id || order.id || i} className="order-card">
										<header>
											<strong style={{ fontSize: '.75rem' }}>Order {order._id || order.id || (i + 1)}</strong>
											<span className={order.discount_status === 'approved' ? 'badge success' : order.discount_status === 'pending' ? 'badge warning' : order.discount_status === 'rejected' ? 'badge danger' : 'badge'}>{(order.discount_status || 'N/A').toUpperCase()}</span>
										</header>
										<div style={{ fontSize: '.7rem', color: 'var(--brand-text-soft)', display: 'flex', flexWrap: 'wrap', gap: '.65rem' }}>
											<span><strong style={{ color: 'var(--brand-text)' }}>State:</strong> {order.state || 'N/A'}</span>
											<span><strong style={{ color: 'var(--brand-text)' }}>Salesman:</strong> {order.salesman_name || order.salesman_id || 'N/A'}</span>
											<span><strong style={{ color: 'var(--brand-text)' }}>Dealer:</strong> {order.dealer_name || order.dealer_id || 'N/A'}</span>
										</div>
										<div className="order-metrics" style={{ marginTop: '.55rem' }}>
											<span>Total: ₹{formatINR(total)}</span>
											<span>Discount %: {formatPercent(discount,{decimals:2})}%</span>
											<span>After: ₹{formatINR(discounted)}</span>
										</div>
									</li>
								);
							})}
						</ul>
					)}
					<div style={{ marginTop: '1.35rem' }}>
						<button className="btn secondary" onClick={() => navigate('/home')}>Back</button>
					</div>
				</div>
			</main>
		</div>
	);
};

export default Dashboard;
