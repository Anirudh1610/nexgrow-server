import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { auth } from '../Auth/AuthConfig';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { formatINR } from './numberFormat';

const TILE_DEFS = [
  { key: 'admin/discount-approvals', title: 'Approvals', desc: 'Review, approve or reject requested order discounts.', color: '#f59e0b' },
  { key: 'admin/orders', title: 'All Orders', desc: 'Monitor every order, its status and discount performance.', color: '#16a34a' },
  { key: 'admin/management', title: 'Data Management', desc: 'Maintain salesmen, dealers and product catalog entries.', color: '#0ea5e9' },
  { key: 'admin/forecasts', title: 'Sales Forecasts', desc: 'View sales forecasts and targets by salesman.', color: '#8b5cf6' },
  { key: 'dashboard', title: 'Dashboard', desc: 'High level metrics & quick sales insights.', color: '#16a34a' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [ordersRes, salesmenRes] = await Promise.all([
          axios.get(`${SERVER_API_URL}/orders/admin/orders`),
          axios.get(`${SERVER_API_URL}/orders/admin/salesmen`),
        ]);
        setOrders(ordersRes.data || []);
        setSalesmen(salesmenRes.data || []);
      } catch {
        setOrders([]);
        setSalesmen([]);
      }
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  const pendingApprovals = orders.filter((o) => (o.discount_status || '').toLowerCase() === 'pending').length;
  const activeSalesmen = salesmen.filter((s) => s.active !== false).length;
  const revenue = orders.reduce((sum, o) => sum + (o.grand_total ?? o.discounted_total ?? o.total_price ?? 0), 0);

  const homeStats = [
    { label: 'Total Orders', value: String(orders.length) },
    { label: 'Pending Approvals', value: String(pendingApprovals) },
    { label: 'Active Salesmen', value: String(activeSalesmen) },
    { label: 'Revenue', value: `₹${formatINR(revenue, { decimals: 0 })}` },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--brand-text)' }}>
        Welcome back, {user?.displayName?.split(' ')[0] || 'Admin'}
      </h1>
      <p style={{ margin: '0 0 26px', fontSize: 14, color: 'var(--brand-text-soft)' }}>
        Here's what's happening across your dealer network today.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 30 }}>
        {homeStats.map((st) => (
          <div key={st.label} style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--brand-shadow-sm)' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
              {st.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-text)' }}>
              {loadingStats ? '…' : st.value}
            </div>
          </div>
        ))}
      </div>

      <div className="tiles">
        {TILE_DEFS.map((tile) => (
          <div key={tile.key} className="tile" onClick={() => navigate(`/${tile.key}`)}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${tile.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 14, height: 14, borderRadius: 5, background: tile.color, display: 'inline-block' }} />
            </div>
            <h3 style={{ margin: '14px 0 6px' }}>{tile.title}</h3>
            <p>{tile.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
