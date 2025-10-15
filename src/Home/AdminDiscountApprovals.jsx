import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AppHeader from '../components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { formatINR, formatPercent, formatOrderDisplayId, computeDisplaySeqMap, calculateGST } from './numberFormat';
import '../components/UITheme.css';


const AdminDiscountApprovals = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesmanMap, setSalesmanMap] = useState({});
  const [dealerMap, setDealerMap] = useState({});
  const [productMap, setProductMap] = useState({});
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const toggleOrderExpansion = (orderNumber) => {
    const newExpandedOrders = new Set(expandedOrders);
    if (newExpandedOrders.has(orderNumber)) {
      newExpandedOrders.delete(orderNumber);
    } else {
      newExpandedOrders.add(orderNumber);
    }
    setExpandedOrders(newExpandedOrders);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      try { const u = JSON.parse(localStorage.getItem('nexgrow_user')||'null'); if (u?.uid) params.uid = u.uid; if (u?.email) params.email = u.email; } catch {}
      const [ordersRes, salesmenRes, dealersRes, productsRes] = await Promise.all([
        axios.get(`${SERVER_API_URL}/orders/admin/discount-approvals`, { params }),
        axios.get(`${SERVER_API_URL}/orders/admin/salesmen`, { params }),
        axios.get(`${SERVER_API_URL}/orders/admin/dealers`, { params }),
        axios.get(`${SERVER_API_URL}/orders/admin/products`, { params })
      ]);
      
      let data = ordersRes.data || [];
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
      
      // Create robust mapping that handles different possible field names
      const smap = {};
      (salesmenRes.data || []).forEach(s => {
        const id = s.id || s._id || s.salesman_id;
        const name = s.name || s.salesman_name || s.full_name;
        if (id && name) {
          smap[id] = name;
          smap[String(id)] = name; // Handle both string and number IDs
        }
      });
      setSalesmanMap(smap);

      const dmap = {};
      (dealersRes.data || []).forEach(d => {
        const id = d.id || d._id || d.dealer_id;
        const name = d.name || d.dealer_name || d.full_name;
        if (id && name) {
          dmap[id] = name;
          dmap[String(id)] = name; // Handle both string and number IDs
        }
      });
      setDealerMap(dmap);

      const pmap = {};
      (productsRes.data || []).forEach(p => {
        const id = p.id || p._id || p.product_id;
        const name = p.name || p.product_name || p.title;
        if (id && name) {
          pmap[id] = name;
          pmap[String(id)] = name; // Handle both string and number IDs
        }
      });
      setProductMap(pmap);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleApprove = (orderId) => updateDiscountStatus(orderId, 'approved');
  const handleReject = (orderId) => updateDiscountStatus(orderId, 'rejected');

  const updateDiscountStatus = async (orderId, status) => {
    try {
      const params = {};
      try { const u = JSON.parse(localStorage.getItem('nexgrow_user')||'null'); if (u?.uid) params.uid = u.uid; if (u?.email) params.email = u.email; } catch {}
      const path = status === 'approved' ? 'approve-discount' : 'reject-discount';
      await axios.post(`${SERVER_API_URL}/orders/admin/${path}/${orderId}`, null, { params });
      alert(`Discount ${status} successfully.`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Failed to ${status} discount.`);
    }
  };

  if (loading) {
    return <div className="app-shell"> <main className="page fade-in"> <div className="surface-card elevated"> <p>Loading...</p> </div> </main> </div>;
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page fade-in">
        <div className="surface-card elevated">
          <div className="mobile-stack" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
            <h1 className="section-title mobile-center" style={{margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.5rem)'}}>Pending Discount Approvals</h1>
            <button className="btn secondary mobile-full-width" onClick={() => navigate('/home')}>Back to Home</button>
          </div>
          {loading ? <p>Loading approvals...</p> : orders.length===0 ? <p>No pending discount approvals.</p> : (
            <div className="order-list">
              {(() => { const seqMap = computeDisplaySeqMap(orders); return orders.map(order => {
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
                const badgeClass = status==='approved'? 'badge success' : status==='pending'? 'badge warning' : status==='rejected'? 'badge danger':'badge';
                // Try multiple possible field names for salesman
                const salesmanId = order.salesman_id || order.salesmanId || order.salesman;
                const salesmanName = order.salesman_name || order.salesmanName || 
                                   salesmanMap[salesmanId] || salesmanMap[String(salesmanId)] || 'N/A';
                
                // Try multiple possible field names for dealer  
                const dealerId = order.dealer_id || order.dealerId || order.dealer;
                const dealerName = order.dealer_name || order.dealerName || 
                                 dealerMap[dealerId] || dealerMap[String(dealerId)] || 'N/A';
        const seq = seqMap[String(order._id || order.id)] || 1;
        const orderId = order._id || order.id;
        const isExpanded = expandedOrders.has(orderId);
        
        return (
                  <div key={orderId} className="order-card">
                    <div 
                      style={{cursor: 'pointer'}} 
                      onClick={() => toggleOrderExpansion(orderId)}
                    >
                      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <strong style={{fontSize:'1rem'}}>{order.order_code || formatOrderDisplayId(order, { seq })}</strong>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <span className={badgeClass}>{status.toUpperCase()}</span>
                          <span style={{fontSize: '0.8rem', color: 'var(--brand-text-soft)'}}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </header>
                      
                      {/* Condensed view - always visible */}
                      <div style={{fontSize:'.9rem', margin: '0.5rem 0', display: 'flex', flexWrap: 'wrap', gap: '1rem'}}>
                        <span><strong>Salesman:</strong> {salesmanName}</span>
                        <span><strong>Discount:</strong> {formatPercent(effectivePct,{decimals:1})}%</span>
                        <span><strong>Discount Amt:</strong> {formatINR(totalDiscountAmtExact)}</span>
                        <span><strong>Subtotal:</strong> {formatINR(totalAfter)}</span>
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
                                <span><strong>GST:</strong> {formatINR(gstTotal)}</span>
                                <span><strong>Grand Total:</strong> {formatINR(grandTotal)}</span>
                              </>
                            );
                          }
                          return <span><strong>Final Total:</strong> {formatINR(totalAfter)}</span>;
                        })()}
                      </div>
                    </div>

                    {/* Expanded details - only when clicked */}
                    {isExpanded && (
                      <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--brand-border)'}}>
                        <div style={{fontSize:'.85rem',color:'var(--brand-text-soft)',display:'flex',flexWrap:'wrap',gap:'1.5rem', margin: '0.5rem 0'}}>
                          <span><strong>Dealer:</strong> {dealerName}</span>
                          {order.state && <span><strong>State:</strong> {order.state}</span>}
                        </div>
                        
                        {computedLines.length>0 && (
                          <div>
                            <h4 style={{fontSize: '0.9rem', margin: '1rem 0 0.5rem 0', color: 'var(--brand-text)'}}>Products:</h4>
                            <ul style={{margin:'0 0 0 1rem',padding:0,fontSize:'.8rem',listStyle:'disc'}}>
                              {computedLines.map((p,i)=>{
                                // Try multiple possible field names for product
                                const productId = p.product_id || p.productId || p.id;
                                const name = p.product_name || p.productName || p.name || 
                                           productMap[productId] || productMap[String(productId)] || 'Product';
                                return (
                                  <li key={i} style={{margin:'4px 0'}}>
                                    {name} - Qty: {p.quantity} - Base: {formatINR(p.base)}{p.pct>0 && <> - {formatPercent(p.pct,{decimals:1})}% → <strong>{formatINR(p.discounted)}</strong></>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        
                        <div className="order-metrics" style={{marginTop: '1rem'}}>
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
                        
                        <div style={{marginTop:'1rem',display:'flex',gap:'.75rem'}}>
                          <button className="btn" onClick={(e) => {e.stopPropagation(); handleApprove(orderId);}}>Approve</button>
                          <button className="btn danger" onClick={(e) => {e.stopPropagation(); handleReject(orderId);}}>Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }); })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDiscountApprovals;
