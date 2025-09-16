import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { auth } from '../Auth/AuthConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { formatINR, formatPercent, formatOrderDisplayId, computeDisplaySeqMap } from './numberFormat';
import AppHeader from '../components/AppHeader';

const SalesManager = () => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({}); // orderId -> boolean
  const [drafts, setDrafts] = useState({}); // orderId -> partial update
  const [role, setRole] = useState('guest');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const fetchOrders = async (uid) => {
    setLoading(true);
    try {
      const res = await axios.get(`${SERVER_API_URL}/orders/manager/orders`, { params: { uid } });
      let data = Array.isArray(res.data) ? res.data : [];
      const getTs = (o) => {
        const raw = o.created_at || o.createdAt || o.updated_at || o.date || o.timestamp || null;
        const t = raw ? new Date(raw).getTime() : 0;
        if (t && !isNaN(t)) return t;
        if (o._id && typeof o._id === 'string' && o._id.length >= 8) {
          try { return parseInt(o._id.substring(0,8),16) * 1000; } catch { return 0; }
        }
        return 0;
      };
      const withTs = data.map(o => ({ __ts: getTs(o), o }));
      withTs.sort((a,b)=> b.__ts - a.__ts);
      const allZero = withTs.every(x=>x.__ts===0);
      data = allZero ? data.slice().reverse() : withTs.map(x=>x.o);
      setOrders(data);
    } catch (e) {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.uid) fetchOrders(user.uid);
  }, [user]);

  // TEST MODE: Allow all users to access Sales Manager view
  useEffect(() => {
    const checkRole = async () => {
      try {
        if (user?.uid || user?.email) {
          const res = await axios.get(`${SERVER_API_URL}/orders/me`, { params: { uid: user.uid, email: user.email } }).catch(()=>({data:{role:'sales_manager'}}));
          const r = res.data?.role || 'sales_manager';
          setRole(r);
        }
      } catch {
        setRole('sales_manager');
      }
    };
    checkRole();
  }, [user]);

  const startEdit = (order) => {
    setEditing((e) => ({ ...e, [order._id || order.id]: true }));
    setDrafts((d) => ({
      ...d,
      [order._id || order.id]: {
        discount_status: order.discount_status || 'pending',
        products: order.products?.map((p) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: p.quantity,
          price: p.price,
          discount_pct: p.discount_pct,
          discounted_price: p.discounted_price,
        })) || []
      }
    }));
  };

  const cancelEdit = (orderId) => {
    setEditing((e) => ({ ...e, [orderId]: false }));
    setDrafts((d) => { const nd = { ...d }; delete nd[orderId]; return nd; });
  };

  const saveEdit = async (orderId) => {
    const payload = drafts[orderId] || {};
    try {
      await axios.put(`${SERVER_API_URL}/orders/manager/orders/${orderId}`, payload, { params: { uid: user.uid } });
      cancelEdit(orderId);
      fetchOrders(user.uid);
    } catch (e) {
      alert('Failed to save: ' + (e?.response?.data?.detail || e.message));
    }
  };

  const handleProductChange = (orderId, index, field, value) => {
    setDrafts((d) => {
      const draft = d[orderId] || { products: [] };
      const products = [...(draft.products || [])];
      products[index] = { ...products[index], [field]: value };
      return { ...d, [orderId]: { ...draft, products } };
    });
  };

  const handleHeaderChange = (orderId, field, value) => {
    setDrafts((d) => ({ ...d, [orderId]: { ...(d[orderId] || {}), [field]: value } }));
  };

  const renderOrder = (order) => {
    const id = order._id || order.id;
    const isEditing = !!editing[id];
    const draft = drafts[id] || {};

    // Recompute metrics for display from draft or original
    const lines = (isEditing ? draft.products : order.products) || [];
    let totalBase = 0, totalDiscountAmt = 0;
    const computed = lines.map((p) => {
      const base = Number(p.price) || 0;
      let pct = p.discount_pct != null ? Number(p.discount_pct) : null;
      let discounted = p.discounted_price != null ? Number(p.discounted_price) : null;
      if (pct == null && discounted != null && base > 0) pct = ((base - discounted) / base) * 100;
      if (discounted == null && pct != null) discounted = base - (base * pct / 100);
      if (pct == null) pct = 0; if (discounted == null) discounted = base;
      const dAmt = base - discounted;
      totalBase += base; totalDiscountAmt += dAmt;
      return { ...p, base, pct, discounted, dAmt };
    });
    const totalAfter = totalBase - totalDiscountAmt;
    const effPct = totalBase > 0 ? (totalDiscountAmt / totalBase) * 100 : 0;

    return (
      <li key={id} className="order-card">
        <header>
          <strong style={{ fontSize: '.9rem' }}>{order.order_code || formatOrderDisplayId(order, { seq: seqMap[id] })}</strong>
          {isEditing ? (
            <select value={draft.discount_status || 'pending'} onChange={(e)=>handleHeaderChange(id,'discount_status',e.target.value)}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          ) : (
            <span className={`badge ${ (order.discount_status||'n/a')==='approved'?'success':(order.discount_status==='pending'?'warning':(order.discount_status==='rejected'?'danger':'')) }`}>
              {(order.discount_status||'n/a').toUpperCase()}
            </span>
          )}
        </header>
        <div style={{ fontSize: '.8rem', color: 'var(--brand-text-soft)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <span><strong style={{ color: 'var(--brand-text)' }}>Salesman:</strong> {order.salesman_name || order.salesman_id || 'N/A'}</span>
          <span><strong style={{ color: 'var(--brand-text)' }}>Dealer:</strong> {order.dealer_name || order.dealer_id || 'N/A'}</span>
          <span><strong style={{ color: 'var(--brand-text)' }}>State:</strong> {order.state || 'N/A'}</span>
        </div>
        <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, fontSize: '.75rem', listStyle: 'disc' }}>
          {computed.map((p, i) => (
            <li key={i} style={{ margin: '2px 0' }}>
              {p.product_name || p.product_id || 'Product'} - Qty: {formatINR(p.quantity,{decimals:0})} - Base: ₹{formatINR(p.base)}
              {isEditing ? (
                <>
                  {' '}| Disc %: <input type="number" step="0.01" style={{width:'5rem'}} value={p.pct} onChange={(e)=>handleProductChange(id,i,'discount_pct',e.target.value)} />
                  {' '}| Disc Price: <input type="number" step="0.01" style={{width:'6rem'}} value={p.discounted} onChange={(e)=>handleProductChange(id,i,'discounted_price',e.target.value)} />
                </>
              ) : (
                p.pct>0 && <> - {formatPercent(p.pct,{decimals:2})}% (₹{formatINR(p.dAmt)}) → <strong>₹{formatINR(p.discounted)}</strong></>
              )}
            </li>
          ))}
        </ul>
        <div className="order-metrics" style={{ marginTop: '.85rem' }}>
          <span>Total: ₹{formatINR(totalBase)}</span>
          <span>Discount Amt: ₹{formatINR(totalDiscountAmt)}</span>
          <span>After Discount: ₹{formatINR(totalAfter)}</span>
          <span>Effective %: {formatPercent(effPct,{decimals:2})}%</span>
        </div>
        <div style={{ marginTop: '.75rem', display: 'flex', gap: '.5rem' }}>
          {isEditing ? (
            <>
              <button className="btn" onClick={()=>saveEdit(id)}>Save</button>
              <button className="btn secondary" onClick={()=>cancelEdit(id)}>Cancel</button>
            </>
          ) : (
            <button className="btn" onClick={()=>startEdit(order)}>Edit</button>
          )}
        </div>
      </li>
    );
  };

  const sortedOrders = useMemo(() => {
    const getTs = (o) => {
      const raw = o.created_at || o.createdAt || o.updated_at || o.date || o.timestamp || null;
      const t = raw ? new Date(raw).getTime() : 0;
      if (t && !isNaN(t)) return t;
      if (o._id && typeof o._id === 'string' && o._id.length >= 8) {
        try { return parseInt(o._id.substring(0,8),16) * 1000; } catch { return 0; }
      }
      return 0;
    };
    const withTs = (orders||[]).map(o => ({ __ts: getTs(o), o }));
    withTs.sort((a,b)=> b.__ts - a.__ts);
    const allZero = withTs.every(x=>x.__ts===0);
    return allZero ? (orders||[]).slice().reverse() : withTs.map(x=>x.o);
  }, [orders]);

  const seqMap = useMemo(() => computeDisplaySeqMap(sortedOrders), [sortedOrders]);

  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
  <AppHeader />
      <main className="page narrow fade-in">
        <div className="surface-card elevated" style={{ marginBottom: '1.25rem' }}>
          <h1 className="section-title" style={{ fontSize: '1.4rem' }}>Team Orders</h1>
          {loading ? (
            <p style={{ margin: 0 }}>Loading orders...</p>
          ) : sortedOrders.length === 0 ? (
            <p style={{ margin: 0 }}>No orders found.</p>
          ) : (
            <ul className="order-list">
              {sortedOrders.map(renderOrder)}
            </ul>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.75rem' }}>
            <button className="btn secondary" onClick={() => navigate('/home')}>Back</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SalesManager;
