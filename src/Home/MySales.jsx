import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { auth } from '../Auth/AuthConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AnalyticsView from './analytics/AnalyticsView';
import '../components/UITheme.css';

const MySales = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid && !user?.email) return;
    const params = {};
    if (user.uid) params.uid = user.uid;
    if (user.email) params.email = user.email;

    const load = async () => {
      setLoading(true);
      try {
        const meRes = await axios.get(`${SERVER_API_URL}/orders/me`, { params }).catch(() => ({ data: { role: 'salesman' } }));
        const resolvedRole = meRes.data?.role || 'salesman';
        setRole(resolvedRole);

        const endpoint = resolvedRole === 'sales_manager' ? '/orders/manager/orders' : '/orders/my-orders';
        const res = await axios.get(`${SERVER_API_URL}${endpoint}`, { params });
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch {
        setOrders([]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page fade-in">
        <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="section-title mobile-center" style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.5rem)' }}>{role === 'sales_manager' ? 'Team Sales' : 'My Sales'}</h1>
          <button className="btn secondary mobile-full-width" onClick={() => navigate('/home')}>Back to Home</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--brand-text-soft)' }}>Loading your sales…</div>
        ) : (
          <AnalyticsView orders={orders} sections={['trend', 'product']} />
        )}
      </main>
    </div>
  );
};

export default MySales;
