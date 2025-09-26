import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import { formatINR, formatPercent, formatOrderDisplayId, computeDisplaySeqMap } from './numberFormat';
import AppHeader from '../components/AppHeader';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Fetch only the current user's orders
        let params = {};
        const nexgrowUser = JSON.parse(localStorage.getItem('nexgrow_user')||'null');
        if (nexgrowUser?.uid) params.uid = nexgrowUser.uid;
        if (nexgrowUser?.email) params.email = nexgrowUser.email;
        const response = await axios.get(`${SERVER_API_URL}/orders/my-orders`, { params });
        let data = response.data || [];
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
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page fade-in">
        <div className="surface-card elevated">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h1 className="section-title" style={{margin: 0}}>My Orders</h1>
            <button className="btn" onClick={() => navigate('/order-form')}>Create New Order</button>
          </div>
          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p>No orders found. <span onClick={() => navigate('/order-form')} style={{color: 'var(--brand-green)', cursor: 'pointer', fontWeight: '600'}}>Create one now.</span></p>
          ) : (
            <div className="order-list">
              {(() => { const seqMap = computeDisplaySeqMap(orders); return orders.map((order, idx) => {
                // ... (rest of the mapping logic is complex and preserved)
                const productsArr = Array.isArray(order.products) ? order.products : [];
                let totalBase = 0; let totalDiscountAmtExact = 0; let hasExplicitLineDiscount = false;
                let computedLines = productsArr.map(p => {
                  const base = Number(p.price) || 0;
                  let pct = (p.discount_pct !== undefined && p.discount_pct !== null) ? Number(p.discount_pct) : null;
                  let discounted = (p.discounted_price !== undefined && p.discounted_price !== null) ? Number(p.discounted_price) : null;
                  if (pct === null && discounted !== null && base > 0) {
                    pct = ((base - discounted) / base) * 100;
                  }
                  if (discounted === null && pct !== null) {
                    discounted = base - (base * pct / 100);
                  }
                  if (pct !== null && pct > 0) hasExplicitLineDiscount = true;
                  if (pct === null) pct = 0;
                  if (discounted === null) discounted = base;
                  const lineDiscountAmt = base - discounted;
                  totalBase += base;
                  totalDiscountAmtExact += lineDiscountAmt;
                  return { ...p, base, pct, discounted, lineDiscountAmt };
                });
                // Fallback approximate distribution for legacy orders
                let fallbackApplied = false;
                if (!hasExplicitLineDiscount && totalBase > 0) {
                  let aggregateDiscountAmt = 0;
                  if (order.discounted_total != null && order.discounted_total < totalBase) {
                    aggregateDiscountAmt = totalBase - Number(order.discounted_total);
                  } else if (order.discount && order.discount > 0) {
                    aggregateDiscountAmt = totalBase * (Number(order.discount) / 100);
                  }
                  if (aggregateDiscountAmt > 0) {
                    fallbackApplied = true;
                    totalDiscountAmtExact = aggregateDiscountAmt;
                    computedLines = computedLines.map(line => {
                      const proportional = line.base / totalBase;
                      const lineDiscountAmt = aggregateDiscountAmt * proportional;
                      const discounted = line.base - lineDiscountAmt;
                      const pct = line.base > 0 ? (lineDiscountAmt / line.base) * 100 : 0;
                      return { ...line, pct, discounted, lineDiscountAmt };
                    });
                  }
                }
                const totalAfter = totalBase - totalDiscountAmtExact;
                const effectivePct = totalBase > 0 ? (totalDiscountAmtExact / totalBase) * 100 : 0;
                const status = order.discount_status || 'n/a';
                const badgeClass = status === 'approved' ? 'badge success' : status === 'pending' ? 'badge warning' : status === 'rejected' ? 'badge danger' : 'badge';
        const seq = seqMap[String(order._id || order.id)] || (idx + 1);
        return (
                  <div key={order._id || order.id || idx} className="order-card">
                    <header>
          <strong style={{ fontSize: '1rem' }}>{order.order_code || formatOrderDisplayId(order, { seq })}</strong>
                      <span className={badgeClass}>{status.toUpperCase()}</span>
                    </header>
                    <div style={{ fontSize: '.85rem', color: 'var(--brand-text-soft)', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', margin: '0.5rem 0' }}>
                      <span><strong>Salesman:</strong> {order.salesman_name || 'N/A'}</span>
                      <span><strong>Dealer:</strong> {order.dealer_name || 'N/A'}</span>
                      <span><strong>State:</strong> {order.state || 'N/A'}</span>
                    </div>
                    {computedLines.length > 0 && (
                      <ul style={{ margin: '0.75rem 0 0 1rem', padding: 0, fontSize: '.8rem', listStyle: 'disc' }}>
                        {computedLines.map((p, i) => (
                          <li key={i} style={{ margin: '4px 0' }}>
                            {p.product_name || 'Product'} - Qty: {formatINR(p.quantity,{decimals:0})} - Base: {formatINR(p.base)}{p.pct>0 && <> - {formatPercent(p.pct,{decimals:1})}% → <strong>{formatINR(p.discounted)}</strong></>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="order-metrics">
                      <span>Total: {formatINR(totalBase)}</span>
                      <span>Discount: {formatINR(totalDiscountAmtExact)}</span>
                      <span>Final: {formatINR(totalAfter)}</span>
                      <span>Effective: {formatPercent(effectivePct,{decimals:1})}%</span>
                    </div>
                  </div>
                );
              }); })()}
            </div>
          )}
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn secondary" onClick={() => navigate('/home')}>Back to Home</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Orders;
