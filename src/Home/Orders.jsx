import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import { formatINR, formatPercent } from './numberFormat';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${SERVER_API_URL}/orders`);
        let data = response.data || [];
        const getTs = (o) => {
          const raw = o.created_at || o.createdAt || o.updated_at || o.date || o.timestamp || null;
          const t = raw ? new Date(raw).getTime() : 0;
          if (t && !isNaN(t)) return t;
          // Fallback: derive from Mongo ObjectId first 8 hex chars -> seconds since epoch
          if (o._id && typeof o._id === 'string' && o._id.length >= 8) {
            try { return parseInt(o._id.substring(0,8),16) * 1000; } catch { return 0; }
          }
          return 0;
        };
        const withTs = data.map(o => ({ __ts: getTs(o), o }));
        withTs.sort((a,b)=> b.__ts - a.__ts);
        // If all timestamps are 0 (no usable data), just reverse original array as a fallback
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
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <header className="app-header">
        <div className="app-header__logo" onClick={() => navigate('/home')}>NEXGROW</div>
        <div className="app-header__actions">
          <button className="btn danger" onClick={async () => { await signOut(auth); navigate('/'); }}>Sign Out</button>
        </div>
      </header>
      <main className="page narrow fade-in">
        <div className="surface-card elevated" style={{ marginBottom: '1.25rem' }}>
          <h1 className="section-title" style={{ fontSize: '1.4rem' }}>Orders</h1>
          {loading ? (
            <p style={{ margin: 0 }}>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p style={{ margin: 0 }}>No orders found.</p>
          ) : (
            <ul className="order-list">
              {orders.map((order, idx) => {
                // Compute per-line discounts (similar to admin view)
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
                return (
                  <li key={order._id || order.id || idx} className="order-card">
                    <header>
                      <strong style={{ fontSize: '.9rem', letterSpacing: '.5px' }}>{order.order_code ? order.order_code : `Order #${idx + 1}`}</strong>
                      <span className={badgeClass}>{status.toUpperCase()}</span>
                    </header>
                    <div style={{ fontSize: '.8rem', color: 'var(--brand-text-soft)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      <span><strong style={{ color: 'var(--brand-text)' }}>Salesman:</strong> {order.salesman_name || order.salesman_id || 'N/A'}</span>
                      <span><strong style={{ color: 'var(--brand-text)' }}>Dealer:</strong> {order.dealer_name || order.dealer_id || 'N/A'}</span>
                      <span><strong style={{ color: 'var(--brand-text)' }}>State:</strong> {order.state || 'N/A'}</span>
                    </div>
                    {computedLines.length>0 && (
                      <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, fontSize: '.75rem', listStyle: 'disc' }}>
                        {computedLines.map((p, i) => (
                          <li key={i} style={{ margin: '2px 0' }}>
                            {p.product_name || p.product_id || 'Product'} - Qty: {formatINR(p.quantity,{decimals:0})} - Base: ₹{formatINR(p.base)}{p.pct>0 && <> - {formatPercent(p.pct,{decimals:2})}% (₹{formatINR(p.lineDiscountAmt)}) → <strong>₹{formatINR(p.discounted)}</strong></>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="order-metrics" style={{ marginTop: '.85rem' }}>
                      <span>Total: ₹{formatINR(totalBase)}</span>
                      <span>Discount Amt: ₹{formatINR(totalDiscountAmtExact)}</span>
                      <span>After Discount: ₹{formatINR(totalAfter)}</span>
                      <span>Effective %: {formatPercent(effectivePct,{decimals:2})}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.75rem' }}>
            <button className="btn" onClick={() => navigate('/order-form')}>New Order</button>
            <button className="btn secondary" onClick={() => navigate('/home')}>Back</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Orders;
