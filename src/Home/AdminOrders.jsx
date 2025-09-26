import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import AppHeader from '../components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { formatINR, formatPercent, formatOrderDisplayId, computeDisplaySeqMap } from './numberFormat';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = {};
        try { const u = JSON.parse(localStorage.getItem('nexgrow_user')||'null'); if (u?.uid) params.uid = u.uid; if (u?.email) params.email = u.email; } catch {}
        const res = await axios.get(`${SERVER_API_URL}/orders/admin/orders`, { params });
        let data = res.data || [];
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
      } catch {
        setOrders([]);
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <AppHeader
        centerContent={
          <div className="header-nav" style={{ display:'flex', gap:'.5rem', marginRight:'.5rem' }}>
          </div>
        }
      />
      <main className="page fade-in">
        <h1 className="section-title" style={{ fontSize: '1.5rem' }}>
          All Orders
        </h1>
        <div className="surface-card elevated">
          {loading ? (
            <p>Loading...</p>
          ) : orders.length === 0 ? (
            <p>No orders found.</p>
          ) : (
            <ul className="order-list">
              {(() => {
                const seqMap = computeDisplaySeqMap(orders);
                return orders.map((order) => {
                const total = order.total_price || 0;
                const discountPct = order.discount || 0;
                const discounted =
                  order.discounted_total != null
                    ? order.discounted_total
                    : total - (total * discountPct) / 100;
                const discountAmt = total - discounted;
                const status = order.discount_status || 'n/a';
                const badgeClass =
                  status === 'approved'
                    ? 'badge success'
                    : status === 'pending'
                    ? 'badge warning'
                    : status === 'rejected'
                    ? 'badge danger'
                    : 'badge';
                  const seq = seqMap[String(order._id || order.id)] || 1;
                return (
                  <li key={order._id || order.id} className="order-card">
                    <header>
                      <strong
                        style={{
                          fontSize: '.85rem',
                          letterSpacing: '.5px',
                        }}
                      >
                        {order.order_code ? order.order_code : formatOrderDisplayId(order, { seq })}
                      </strong>
                      <span className={badgeClass}>
                        {status.toUpperCase()}
                      </span>
                    </header>
                    <div
                      style={{
                        fontSize: '.75rem',
                        color: 'var(--brand-text-soft)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '.85rem',
                      }}
                    >
                      <span>
                        <strong style={{ color: 'var(--brand-text)' }}>
                          Salesman:
                        </strong>{' '}
                        {order.salesman_name || order.salesman_id}
                      </span>
                      <span>
                        <strong style={{ color: 'var(--brand-text)' }}>
                          Dealer:
                        </strong>{' '}
                        {order.dealer_name || order.dealer_id}
                      </span>
                      <span>
                        <strong style={{ color: 'var(--brand-text)' }}>
                          State:
                        </strong>{' '}
                        {order.state}
                      </span>
                    </div>
                    {order.products && order.products.length > 0 && (
                      <ul
                        style={{
                          margin: '.5rem 0 0 1rem',
                          padding: 0,
                          fontSize: '.7rem',
                          listStyle: 'disc',
                        }}
                      >
                        {order.products.map((p, i) => (
                          <li key={i} style={{ margin: '2px 0' }}>
                            {p.product_name || p.product_id} - Qty: {formatINR(p.quantity,{decimals:0})} {p.price ? `- ₹${formatINR(p.price)}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div
                      className="order-metrics"
                      style={{ marginTop: '.75rem' }}
                    >
                      <span>Total: ₹{formatINR(total)}</span>
                      <span>Discount %: {formatPercent(discountPct,{decimals:2})}</span>
                      <span>Discount Amt: ₹{formatINR(discountAmt)}</span>
                      <span>After Discount: ₹{formatINR(discounted)}</span>
                    </div>
                  </li>
                );
                });
              })()}
            </ul>
          )}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn secondary"
              onClick={() => navigate('/home')}
            >
              Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminOrders;
