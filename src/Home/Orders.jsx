import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import { formatINR, formatPercent, formatOrderDisplayId, computeDisplaySeqMap, calculateGST } from './numberFormat';
import AppHeader from '../components/AppHeader';

const Orders = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  
  const ORDERS_PER_PAGE = 10;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch all orders first (for sorting), then we'll paginate client-side
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
      
      // Sort orders by timestamp (most recent first)
      const withTs = data.map(o => ({ __ts: getTs(o), o }));
      withTs.sort((a,b)=> b.__ts - a.__ts);
      const allZero = withTs.every(x=>x.__ts===0);
      const sortedData = allZero ? data.slice().reverse() : withTs.map(x=>x.o);
      
      // Store all orders
      setAllOrders(sortedData);
      
      // Display only the first 10 orders
      setDisplayedOrders(sortedData.slice(0, ORDERS_PER_PAGE));
      setDisplayCount(ORDERS_PER_PAGE);
      setHasMore(sortedData.length > ORDERS_PER_PAGE);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAllOrders([]);
      setDisplayedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreOrders = () => {
    setLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const newDisplayCount = displayCount + ORDERS_PER_PAGE;
      const newDisplayedOrders = allOrders.slice(0, newDisplayCount);
      
      setDisplayedOrders(newDisplayedOrders);
      setDisplayCount(newDisplayCount);
      setHasMore(newDisplayCount < allOrders.length);
      setLoadingMore(false);
    }, 300);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page fade-in">
        <div className="surface-card elevated">
          <div className="mobile-stack" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
            <h1 className="section-title" style={{margin: 0}}>My Orders</h1>
            <button className="btn mobile-full-width" onClick={() => navigate('/order-form')}>Create New Order</button>
          </div>
          {loading ? (
            <p>Loading orders...</p>
          ) : displayedOrders.length === 0 ? (
            <p>No orders found. <span onClick={() => navigate('/order-form')} style={{color: 'var(--brand-green)', cursor: 'pointer', fontWeight: '600'}}>Create one now.</span></p>
          ) : (
            <div className="order-list">
              {(() => { const seqMap = computeDisplaySeqMap(displayedOrders); return displayedOrders.map((order, idx) => {
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
                      <span>Subtotal: {formatINR(totalAfter)}</span>
                      {(() => {
                        // Calculate GST - use stored value or calculate from product data
                        let gstTotal = order.gst_total || 0;
                        let grandTotal = order.grand_total || totalAfter;
                        
                        // If no stored GST, try to calculate from products
                        if (gstTotal === 0 && computedLines.length > 0) {
                          gstTotal = computedLines.reduce((sum, line) => {
                            // Try to get GST percentage from product data
                            const gstPercentage = line.gst_percentage || 0;
                            if (gstPercentage > 0) {
                              const gstAmount = calculateGST(line.discounted, gstPercentage);
                              return sum + gstAmount;
                            }
                            return sum;
                          }, 0);
                          grandTotal = totalAfter + gstTotal;
                        }
                        
                        if (gstTotal > 0) {
                          return (
                            <>
                              <span>GST: {formatINR(gstTotal)}</span>
                              <span><strong>Grand Total: {formatINR(grandTotal)}</strong></span>
                            </>
                          );
                        }
                        return <span>Final: {formatINR(totalAfter)}</span>;
                      })()}
                      <span>Effective: {formatPercent(effectivePct,{decimals:1})}%</span>
                    </div>
                  </div>
                );
              }); })()}
            </div>
          )}
          
          {/* Load More Button */}
          {!loading && displayedOrders.length > 0 && hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button 
                className="btn secondary mobile-full-width" 
                onClick={loadMoreOrders}
                disabled={loadingMore}
                style={{ minWidth: '150px' }}
              >
                {loadingMore ? 'Loading...' : 'Load More Orders'}
              </button>
            </div>
          )}
          
          {/* Show total loaded count */}
          {!loading && displayedOrders.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--brand-text-soft)' }}>
              Showing {displayedOrders.length} of {allOrders.length} orders {!hasMore && '(all loaded)'}
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
