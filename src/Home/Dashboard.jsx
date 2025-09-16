import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { formatINR, formatPercent } from './numberFormat';
import '../components/UITheme.css';

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

	const totalSales = orders.reduce((sum, order) => {
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
		<div className="app-shell">
			<AppHeader />
			<main className="page fade-in">
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h1 className="section-title" style={{margin: 0}}>Dashboard</h1>
                    <button className="btn secondary" onClick={() => navigate('/home')}>Back to Home</button>
                </div>

				<div className="stat-grid">
					<div className="surface-card stat">
						<h4>Total Sales</h4>
						<div className="value">{formatINR(totalSales)}</div>
					</div>
					<div className="surface-card stat">
						<h4>Discount Savings</h4>
						<div className="value">{formatINR(discountSavings)}</div>
					</div>
					<div className="surface-card stat">
						<h4>Approved Discounts</h4>
						<div className="value">{approvedDiscounts}</div>
					</div>
					<div className="surface-card stat">
						<h4>Total Orders</h4>
						<div className="value">{orders.length}</div>
					</div>
				</div>

				<div className="surface-card elevated" style={{ marginTop: '1.5rem' }}>
					<h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Recent Orders</h2>
					{loading ? <p>Loading orders...</p> : orders.length === 0 ? <p>No orders found.</p> : (
						<div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>State</th>
                                        <th>Salesman</th>
                                        <th>Dealer</th>
                                        <th>Total</th>
                                        <th>Discount</th>
                                        <th>Final Price</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.slice(0, 8).map((order, i) => {
                                        const total = order.total_price || 0;
                                        const discount = order.discount || 0;
                                        const discounted = order.discounted_total != null ? order.discounted_total : total - (total * discount / 100);
                                        return (
                                            <tr key={order._id || order.id || i}>
                                                <td>{order._id || order.id || (i + 1)}</td>
                                                <td>{order.state || 'N/A'}</td>
                                                <td>{order.salesman_name || order.salesman_id || 'N/A'}</td>
                                                <td>{order.dealer_name || order.dealer_id || 'N/A'}</td>
                                                <td>{formatINR(total)}</td>
                                                <td>{formatPercent(discount, { decimals: 2 })}%</td>
                                                <td>{formatINR(discounted)}</td>
                                                <td>
                                                    <span className={`badge ${order.discount_status === 'approved' ? 'success' : order.discount_status === 'pending' ? 'warning' : order.discount_status === 'rejected' ? 'danger' : ''}`}>
                                                        {(order.discount_status || 'N/A').toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
					)}
				</div>
			</main>
		</div>
	);
};

export default Dashboard;
