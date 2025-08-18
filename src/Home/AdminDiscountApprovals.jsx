import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import { useNavigate } from 'react-router-dom';
import { formatINR, formatPercent } from './numberFormat';

const AdminDiscountApprovals = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesmanMap, setSalesmanMap] = useState({});
  const [dealerMap, setDealerMap] = useState({});
  const [productMap, setProductMap] = useState({});
  const navigate = useNavigate();

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const [approvalsRes, salesmenRes, dealersRes, productsRes] = await Promise.all([
        axios.get(`${SERVER_API_URL}/orders/admin/discount-approvals`),
        axios.get(`${SERVER_API_URL}/orders/admin/salesmen`).catch(()=>({data:[]})),
        axios.get(`${SERVER_API_URL}/orders/admin/dealers`).catch(()=>({data:[]})),
        axios.get(`${SERVER_API_URL}/orders/admin/products`).catch(()=>({data:[]})),
      ]);
      setOrders(approvalsRes.data || []);
      const smMap = {}; (salesmenRes.data||[]).forEach(s=>{ smMap[s._id||s.id] = s.name; });
      const dMap = {}; (dealersRes.data||[]).forEach(d=>{ dMap[d._id||d.id] = d.name; });
      const pMap = {}; (productsRes.data||[]).forEach(p=>{ pMap[p._id||p.id] = p.name; });
      setSalesmanMap(smMap); setDealerMap(dMap); setProductMap(pMap);
    } catch { setOrders([]); }
    setLoading(false);
  };
  useEffect(()=>{ fetchApprovals(); },[]);

  const handleApprove = async id => { await axios.post(`${SERVER_API_URL}/orders/admin/approve-discount/${id}`); fetchApprovals(); };
  const handleReject = async id => { await axios.post(`${SERVER_API_URL}/orders/admin/reject-discount/${id}`); fetchApprovals(); };

  return (
    <div className="app-shell" style={{minHeight:'100vh'}}>
      <header className="app-header">
        <div className="app-header__logo" onClick={()=>navigate('/home')}>NEXGROW</div>
        <div className="app-header__actions">
          <button className="btn danger" onClick={async()=>{ await signOut(auth); try { localStorage.removeItem('nexgrow_uid'); } catch {}; navigate('/'); }}>Sign Out</button>
        </div>
      </header>
      <main className="page fade-in">
        <h1 className="section-title" style={{fontSize:'1.5rem'}}>Discount Approvals</h1>
        <div className="surface-card elevated">
          {loading ? <p>Loading...</p> : orders.length===0 ? <p>No pending discount approvals.</p> : (
            <ul className="order-list">
              {orders.map(order => {
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
                // Fallback: if no explicit per-line discounts but aggregate discount present, approximate distribution
                let fallbackApplied = false;
                if (!hasExplicitLineDiscount && totalBase > 0) {
                  // Prefer explicit discounted_total over discount percentage for accuracy
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
                const salesmanName = order.salesman_name || salesmanMap[order.salesman_id] || order.salesman_id || 'N/A';
                const dealerName = order.dealer_name || dealerMap[order.dealer_id] || order.dealer_id || 'N/A';
                return (
                  <li key={order._id || order.id} className="order-card">
                    <header>
                      <strong style={{fontSize:'.85rem',letterSpacing:'.5px'}}>{order.order_code ? order.order_code : `Order: ${order._id || order.id}`}</strong>
                      <span className={badgeClass}>{status.toUpperCase()}</span>
                    </header>
                    <div style={{fontSize:'.75rem',color:'var(--brand-text-soft)',display:'flex',flexWrap:'wrap',gap:'.85rem'}}>
                      <span><strong style={{color:'var(--brand-text)'}}>Salesman:</strong> {salesmanName}</span>
                      <span><strong style={{color:'var(--brand-text)'}}>Dealer:</strong> {dealerName}</span>
                      {order.state && <span><strong style={{color:'var(--brand-text)'}}>State:</strong> {order.state}</span>}
                    </div>
                    {computedLines.length>0 && (
                      <ul style={{margin:'.5rem 0 0 1rem',padding:0,fontSize:'.7rem',listStyle:'disc'}}>
                        {computedLines.map((p,i)=>{
                          const name = p.product_name || productMap[p.product_id] || p.product_id || 'Product';
                          return (
                            <li key={i} style={{margin:'2px 0'}}>
                              {name} - Qty: {p.quantity} - Base: ₹{formatINR(p.base)}{p.pct>0 && <> - {formatPercent(p.pct,{decimals:2})}% (₹{formatINR(p.lineDiscountAmt)}) → <strong>₹{formatINR(p.discounted)}</strong></>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="order-metrics" style={{marginTop:'.75rem'}}>
                      <span>Total: ₹{formatINR(totalBase)}</span>
                      <span>Discount Amt: ₹{formatINR(totalDiscountAmtExact)}</span>
                      <span>After Discount: ₹{formatINR(totalAfter)}</span>
                      <span>Effective %: {formatPercent(effectivePct,{decimals:2})}%</span>
                    </div>
                    <div style={{marginTop:'.85rem',display:'flex',gap:'.6rem'}}>
                      <button className="btn" onClick={()=>handleApprove(order._id || order.id)}>Approve</button>
                      <button className="btn danger" onClick={()=>handleReject(order._id || order.id)}>Reject</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div style={{marginTop:'1.5rem'}}>
            <button className="btn secondary" onClick={()=>navigate('/home')}>Back</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDiscountApprovals;
