import React, { useState, useEffect } from 'react';
import { auth } from '../Auth/AuthConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { SERVER_API_URL } from '../Auth/APIConfig';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatINR, formatPercent, calculateGST, calculateTotalWithGST } from './numberFormat';

const OrderForm = ({ onSignOut }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [salesmen, setSalesmen] = useState([]); // no longer used for selection, retained for minimal changes
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(false); // no longer used
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [me, setMe] = useState(null); // holds role and profile
  // loadingProducts removed as it's not used in the UI

  // Multiple products state
  const [productEntries, setProductEntries] = useState([
    { product: '', packingSizes: [], productSize: '', quantity: '', priceDetails: null, loadingPackingSizes: false, discount: 0 }
  ]);

  const [formData, setFormData] = useState({
    state: '',
    salesman: '',
    dealer: ''
  });

  // Add discount state
  // const [discount, setDiscount] = useState(0); // REMOVED: moving discount to per-product
  const [orderSummary, setOrderSummary] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Persist minimal auth reference (uid) for soft refresh continuity
        try { localStorage.setItem('nexgrow_uid', currentUser.uid); } catch {}
  fetchProducts();
  fetchMe(currentUser);
      } else {
        // If no firebase user, attempt soft restore or redirect
        const storedUid = localStorage.getItem('nexgrow_uid');
        if (!storedUid) {
          navigate('/');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Salesmen fetching no longer needed for selection

  const initFromMe = async (fbUser, meObj) => {
    const myState = meObj?.state || '';
    const myId = meObj?._id || meObj?.id || '';
    setFormData(prev => ({ ...prev, state: myState, salesman: myId }));
    if (meObj?.role === 'sales_manager') {
      await fetchTeamDealers(fbUser?.uid, fbUser?.email);
    } else if (myId) {
      await fetchDealers(myId);
    } else {
      setDealers([]);
    }
  };

  const fetchMe = async (fbUser) => {
    try {
      const params = new URLSearchParams();
      if (fbUser?.uid) params.append('uid', fbUser.uid);
      if (fbUser?.email) params.append('email', fbUser.email);
      const response = await axios.get(`${SERVER_API_URL}/orders/me?${params.toString()}`);
      let meObj = response.data || null;
      // If backend still says guest, try linking then refetch once
      if (!meObj || meObj.role === 'guest') {
        try {
          if (fbUser?.uid && fbUser?.email) {
            await axios.post(`${SERVER_API_URL}/orders/link-uid`, { uid: fbUser.uid, email: fbUser.email });
            const refetch = await axios.get(`${SERVER_API_URL}/orders/me?${params.toString()}`);
            meObj = refetch.data || meObj;
          }
        } catch {}
      }
      setMe(meObj);
      await initFromMe(fbUser, meObj);
    } catch (e) {
      setMe(null);
    }
  };

  const fetchDealers = async (salesmanId) => {
    if (!salesmanId) {
      setDealers([]);
      return;
    }

    setLoadingDealers(true);
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/dealers/${salesmanId}`);
      setDealers(response.data || []);
    } catch (error) {
      console.error('Error fetching dealers:', error);
      setDealers([]);
    } finally {
      setLoadingDealers(false);
    }
  };

  // For sales managers: fetch all dealers across team
  const fetchTeamDealers = async (uid, email) => {
  setLoadingDealers(true);
  try {
      const params = new URLSearchParams();
        if (uid) params.append('uid', uid);
        if (email) params.append('email', email);
      const response = await axios.get(`${SERVER_API_URL}/orders/manager/team/dealers?${params.toString()}`);
      setDealers(response.data || []);
  } catch (e) {
      setDealers([]);
  } finally { setLoadingDealers(false); }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/products`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchPackingSizes = async (productId, entryIdx) => {
    if (!productId) return;
    const selectedProduct = products.find(p => (p._id || p.id) === productId);
    if (!selectedProduct) return;
    const productName = selectedProduct.name;

    setProductEntries(prev => {
      const updated = [...prev];
      updated[entryIdx].loadingPackingSizes = true;
      return updated;
    });

    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/products/${encodeURIComponent(productName)}/packing`);
      let packingData = [];
      if (Array.isArray(response.data)) {
        packingData = response.data;
      }
      setProductEntries(prev => {
        const updated = [...prev];
        updated[entryIdx].packingSizes = packingData;
        updated[entryIdx].loadingPackingSizes = false;
        return updated;
      });
    } catch (error) {
      setProductEntries(prev => {
        const updated = [...prev];
        updated[entryIdx].packingSizes = [];
        updated[entryIdx].loadingPackingSizes = false;
        return updated;
      });
    }
  };

  const fetchPrice = async (productId, quantity, entryIdx) => {
    if (!productId || !quantity) {
      setProductEntries(prev => {
        const updated = [...prev];
        updated[entryIdx].priceDetails = null;
        return updated;
      });
      return;
    }
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/products/${productId}/price`, {
        params: { quantity },
      });
      setProductEntries(prev => {
        const updated = [...prev];
        updated[entryIdx].priceDetails = response.data;
        return updated;
      });
    } catch (error) {
      setProductEntries(prev => {
        const updated = [...prev];
        updated[entryIdx].priceDetails = null;
        return updated;
      });
    }
  };

  // Handle changes for main form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Only dealer selection remains interactive
  };

  // Removed preloading team dealers on state-only; managers must pick themselves to see team dealers

  // Handle changes for product entries
  const handleProductEntryChange = (idx, field, value) => {
    setProductEntries(prev => {
      const updated = [...prev];
      if (field === 'discount') {
        // Clamp discount 0-30
        let v = value === '' ? '' : Number(value);
        if (v !== '' && !isNaN(v)) {
          v = Math.min(Math.max(v, 0), 30);
        }
        updated[idx][field] = v;
        return updated; // no dependent fetches
      }
      updated[idx][field] = value;
      // Reset dependent fields
      if (field === 'product') {
        updated[idx].productSize = '';
        updated[idx].packingSizes = [];
        updated[idx].priceDetails = null;
        fetchPackingSizes(value, idx);
      }
      if (field === 'productSize' || field === 'quantity') {
        const productId = field === 'productSize' ? value : updated[idx].productSize;
        const quantity = field === 'quantity' ? value : updated[idx].quantity;
        fetchPrice(productId, quantity, idx);
      }
      return updated;
    });
  };

  // Add new product entry
  const handleAddProductEntry = () => {
    setProductEntries(prev => [
      ...prev,
      { product: '', packingSizes: [], productSize: '', quantity: '', priceDetails: null, loadingPackingSizes: false, discount: 0 }
    ]);
  };

  // Remove product entry
  const handleRemoveProductEntry = (idx) => {
    setProductEntries(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculate totals & per-product discounts with GST
  const totalPrice = productEntries.reduce((sum, entry) => sum + (entry.priceDetails?.total_price || 0), 0);
  const totalDiscountAmount = productEntries.reduce((sum, entry) => {
    if (!entry.priceDetails) return sum;
    const pct = Number(entry.discount) || 0;
    return sum + (entry.priceDetails.total_price * Math.min(Math.max(pct,0),30) / 100);
  }, 0);
  const discountedTotal = totalPrice - totalDiscountAmount;
  
  // Calculate GST on discounted amounts
  const totalGSTAmount = productEntries.reduce((sum, entry) => {
    if (!entry.priceDetails || !entry.product) return sum;
    const selectedProduct = products.find(p => (p._id || p.id) === entry.product);
    const gstPercentage = selectedProduct?.gst_percentage || 0;

    const baseAmount = entry.priceDetails.total_price;
    const discountAmount = baseAmount * Math.min(Math.max(Number(entry.discount) || 0, 0), 30) / 100;
    const discountedAmount = baseAmount - discountAmount;
    const gstAmount = calculateGST(discountedAmount, gstPercentage);

    return sum + gstAmount;
  }, 0);
  
  const grandTotal = discountedTotal + totalGSTAmount;
  const aggregateDiscountPct = totalPrice > 0 ? (totalDiscountAmount / totalPrice) * 100 : 0;
  const anyDiscount = productEntries.some(e => (Number(e.discount) || 0) > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dealer = formData.dealer;
    const state = me?.state || formData.state || '';
    const salesman = me?._id || formData.salesman || '';
    if (!dealer) {
      alert('Please choose a dealer.');
      return;
    }
    // Validate product entries
    for (const entry of productEntries) {
      if (!entry.product || !entry.productSize || !entry.quantity || !entry.priceDetails) {
        alert('Please fill all product fields and ensure price is calculated.');
        return;
      }
      if (entry.discount !== '' && (Number(entry.discount) < 0 || Number(entry.discount) > 30)) {
        alert('Each product discount must be between 0 and 30%.');
        return;
      }
    }
    // Prepare order data (store base price per line; overall discount aggregated)
    const orderProducts = productEntries.map(entry => {
      const selectedProduct = products.find(p => (p._id || p.id) === entry.product);
      const gstPercentage = selectedProduct?.gst_percentage || 0;
      const basePrice = entry.priceDetails.total_price;
      const discountAmount = basePrice * (Number(entry.discount) || 0) / 100;
      const discountedPrice = basePrice - discountAmount;
      const gstAmount = calculateGST(discountedPrice, gstPercentage);
      
      return {
        product_id: entry.productSize,
        quantity: entry.quantity,
        price: basePrice,
        discount_pct: Number(entry.discount) || 0,
        discounted_price: discountedPrice,
        gst_percentage: gstPercentage,
        gst_amount: gstAmount,
        total_with_gst: discountedPrice + gstAmount
      };
    });
    const resolvedSalesmanId = me?._id || salesman;
    const orderData = {
      state,
      salesman_id: resolvedSalesmanId,
      dealer_id: dealer,
      products: orderProducts,
      total_price: totalPrice,
      discount: Number(aggregateDiscountPct.toFixed(2)),
      discounted_total: discountedTotal,
      gst_total: totalGSTAmount,
      grand_total: grandTotal,
      discount_status: anyDiscount ? 'pending' : 'approved'
    };
    try {
      await axios.post(`${SERVER_API_URL}/orders/make-order`, orderData);
      const summaryProducts = productEntries.map(entry => {
        const productObj = (products || []).find(p => (p._id || p.id) === entry.product) || {};
        const packingObj = entry.packingSizes.find(ps => (ps._id || ps.id) === entry.productSize) || {};
        const gstPercentage = productObj?.gst_percentage || 0;
        const base = entry.priceDetails?.total_price || 0;
        const pct = Number(entry.discount) || 0;
        const lineDiscountAmt = base * pct / 100;
        const after = base - lineDiscountAmt;
        const gstAmount = calculateGST(after, gstPercentage);
        const totalWithGst = after + gstAmount;
        return {
          name: productObj.name || 'Product',
          packing: packingObj.packing_size || packingObj.size || packingObj.name || '',
          quantity: entry.quantity,
          unitPrice: entry.priceDetails?.unit_price || 0,
          lineTotal: base,
          discountPct: pct,
          discountedLineTotal: after,
          gstPercentage,
          gstAmount,
          totalWithGst
        };
      });
      setOrderSummary({
        state,
        salesman: (me?.name || me?.email || 'Me'),
        dealer: (dealers.find(d => (d._id || d.id) === dealer)?.name) || dealer,
        discount: Number(aggregateDiscountPct.toFixed(2)),
        totalPrice,
        discountedTotal,
        gstTotal: totalGSTAmount,
        grandTotal,
        totalDiscountAmount,
        products: summaryProducts,
        discountStatus: anyDiscount ? 'pending' : 'approved'
      });
      // Reset form basics
      setProductEntries([{ product: '', packingSizes: [], productSize: '', quantity: '', priceDetails: null, loadingPackingSizes: false, discount: 0 }]);
      setFormData(prev => ({ ...prev, dealer: '' }));
    } catch (error) {
      alert('Failed to submit the order. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (onSignOut) {
        onSignOut();
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleViewOrders = () => {
    navigate('/orders');
  };

  const handleBack = () => {
    navigate('/home');
  };

  const handleCloseSummary = () => {
    setOrderSummary(null);
    navigate('/home');
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--brand-gradient)',
      padding: '20px',
    },
    formContainer: {
      backgroundColor: '#ffffffee',
      backdropFilter: 'blur(4px)',
      padding: '2rem',
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      width: '100%',
      maxWidth: '560px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: 'var(--brand-green-dark)',
      margin: 0,
      marginBottom: '0.5rem',
    },
    welcomeText: {
      fontSize: '1.1rem',
      color: '#2f4f3a',
      margin: 0,
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    label: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1d382c',
    },
    select: {
      padding: '12px',
      fontSize: '1rem',
      border: '2px solid #d0e4d6',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      color: '#1d382c',
      cursor: 'pointer',
      transition: 'border-color 0.3s ease, box-shadow 0.3s',
    },
    submitButton: {
      padding: '14px 32px',
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#ffffff',
      backgroundColor: 'var(--brand-green)',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    signOutButton: {
      padding: '10px 18px',
      fontSize: '0.9rem',
      fontWeight: '600',
      color: 'var(--brand-green-dark)',
      backgroundColor: '#ffffff',
      border: '2px solid var(--brand-green)',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '1rem',
    },
    summaryModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    summaryContent: {
      background: '#ffffff',
      borderRadius: '18px',
      padding: '2rem',
      width: '90%',
      maxWidth: '520px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
      maxHeight: '85vh',
      overflowY: 'auto',
    },
    summaryHeader: {
      marginTop: 0,
      color: 'var(--brand-green-dark)',
    },
    summaryList: {
      margin: '8px 0 0 18px',
      padding: 0,
    },
    summaryItem: {
      marginBottom: 4,
    },
    summaryTotal: {
      marginTop: 16,
      fontWeight: 600,
    },
    closeButton: {
      marginTop: 24,
      background: 'var(--brand-green)',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '10px',
      fontWeight: 600,
      cursor: 'pointer',
    },
  };

  if (!user) {
    return (
      <div className="app-shell" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div className="surface-card elevated" style={{padding:'2rem 2.25rem',textAlign:'center'}}>
          <p style={{margin:0,fontWeight:600,letterSpacing:'.5px'}}>Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__logo" onClick={()=>navigate('/home')}>NEXGROW</div>
        <div className="app-header__actions">
          <span style={{fontSize:'.8rem', fontWeight: 500}}>{user.displayName || user.email}</span>
          <button className="btn danger" onClick={async()=>{ await signOut(auth); try { localStorage.removeItem('nexgrow_uid'); } catch {}; navigate('/'); }}>Sign Out</button>
        </div>
      </header>
      <main className="page narrow fade-in">
        <div className="surface-card elevated" style={{marginBottom:'1.5rem'}}>
          <h1 className="section-title">Create New Order</h1>
          <p style={{margin:'-0.5rem 0 1.5rem',fontSize:'.9rem',color:'var(--brand-text-soft)'}}>
            Apply discounts per product line. Any discount {'>'} 0% requires admin approval.
          </p>
          <form onSubmit={handleSubmit} className="form-grid" style={{gap:'1.5rem'}}>
            {/* State and Salesman are auto-filled from the current user */}
            <div className="form-row">
              <label htmlFor="dealer">Dealer</label>
              <select id="dealer" name="dealer" value={formData.dealer} onChange={handleInputChange} className="input" required disabled={loadingDealers}>
                <option value="">{loadingDealers ? 'Loading dealers...' : 'Choose a dealer'}</option>
                {Array.isArray(dealers) && dealers.map(d => (<option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>))}
              </select>
            </div>
            
            <div className="form-row" style={{gridColumn:'1 / -1'}}>
              <label style={{marginBottom:'.25rem'}}>Products</label>
              <div className="stack-md" style={{marginTop:'.5rem', display: 'grid', gap: '1rem'}}>
                {productEntries.map((entry, idx)=> {
                  const base = entry.priceDetails?.total_price || 0;
                  const pct = Number(entry.discount) || 0;
                  const lineDiscountAmt = base * pct / 100;
                  const after = base - lineDiscountAmt;
                  const selectedProduct = (products || []).find(p => (p._id || p.id) === entry.product) || {};
                  return (
                  <div key={idx} className="surface-card" style={{padding:'1.25rem', boxShadow:'var(--brand-shadow-md)', border: '1px solid var(--brand-border)'}}>
                    <div className="form-grid four-col">
                      <div className="form-row">
                        <label htmlFor={`product-${idx}`}>Product</label>
                        <select id={`product-${idx}`} value={entry.product} onChange={e=>handleProductEntryChange(idx,'product',e.target.value)} className="input" required>
                          <option value="">Choose product</option>
                          {products.map(p=>(<option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label htmlFor={`productSize-${idx}`}>Size</label>
                        <select id={`productSize-${idx}`} value={entry.productSize} onChange={e=>handleProductEntryChange(idx,'productSize',e.target.value)} className="input" required disabled={!entry.product || entry.loadingPackingSizes}>
                          <option value="">{!entry.product ? 'Select product' : entry.loadingPackingSizes ? 'Loading...' : 'Choose size'}</option>
                          {entry.packingSizes.map(p=> {
                            const packingText = (p.packing_size || p.size || p.name || '').toString();
                            const cat = (selectedProduct.category || '').toString();
                            const isPowderLike = /granule|powder|bag|kg|sachet|pack/i.test(`${cat} ${packingText}`);
                            const itemUnitLabel = isPowderLike ? 'packs' : 'bottles';
                            const vol = (p.bottle_volume ?? '').toString();
                            const showVol = vol && vol.toLowerCase() !== 'unit';
                            return (
                              <option key={p._id || p.id} value={p._id || p.id}>
                                {packingText}
                                {p.bottles_per_case ? ` - ${p.bottles_per_case} ${itemUnitLabel}` : ''}
                                {showVol ? ` x ${vol}` : ''}
                                {p.moq ? ` | MOQ: ${p.moq}` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="form-row">
                        <label htmlFor={`quantity-${idx}`}>Quantity</label>
                        <input id={`quantity-${idx}`} type="number" min="1" value={entry.quantity || ''} onChange={e=>handleProductEntryChange(idx,'quantity',e.target.value)} className="input" placeholder="Qty" required />
                      </div>
                      <div className="form-row">
                        <label htmlFor={`discount-${idx}`}>Discount %</label>
                        <input id={`discount-${idx}`} type="number" min="0" max="30" step="0.1" value={entry.discount === '' ? '' : entry.discount} onChange={e=>handleProductEntryChange(idx,'discount',e.target.value)} className="input" placeholder="0-30%" />
                      </div>
                    </div>
                    {entry.priceDetails && (
                      <div style={{marginTop:'.75rem',fontSize:'.8rem',fontWeight:600,color:'var(--brand-text)'}}>
                        <div>
                          Line Total: {formatINR(base)}{pct>0 && <span style={{color: '#b91c1c'}}> - {pct}% ({formatINR(lineDiscountAmt)})</span>} → <span style={{color:'var(--brand-green-dark)', fontWeight: 700}}>{formatINR(after)}</span>
                        </div>
                        {(() => {
                          const selectedProduct = products.find(p => (p._id || p.id) === entry.product);
                          const gstPercentage = selectedProduct?.gst_percentage || 0;
                          if (gstPercentage > 0) {
                            const gstAmount = calculateGST(after, gstPercentage);
                            const totalWithGst = after + gstAmount;
                            return (
                              <div style={{marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--brand-text-soft)'}}>
                                GST ({gstPercentage}%): {formatINR(gstAmount)} | <strong>Total: {formatINR(totalWithGst)}</strong>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                    <div className="btn-group" style={{marginTop:'1rem'}}>
                      {productEntries.length > 1 && (
                        <button type="button" className="btn danger" onClick={()=>handleRemoveProductEntry(idx)}>Remove</button>
                      )}
                      {idx === productEntries.length -1 && (
                        <button type="button" className="btn secondary" onClick={handleAddProductEntry}>Add Another Product</button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>
            <div className="surface-card" style={{gridColumn:'1 / -1',display:'flex',flexWrap:'wrap',gap:'1rem',alignItems:'center',padding:'1.25rem', background: 'var(--brand-surface-alt)'}}>
              <div style={{fontSize:'.9rem',fontWeight:600,color:'var(--brand-text-soft)'}}>Total Before Discount: <span style={{color: 'var(--brand-text)', fontWeight: 700}}>{formatINR(totalPrice)}</span></div>
              {anyDiscount && <div style={{fontSize:'.9rem',fontWeight:600,color:'#b91c1c'}}>Total Discount: {formatINR(totalDiscountAmount)}</div>}
              <div style={{fontSize:'.9rem',fontWeight:600,color:'var(--brand-text-soft)'}}>Subtotal: <span style={{color: 'var(--brand-text)', fontWeight: 700}}>{formatINR(discountedTotal)}</span></div>
              {totalGSTAmount > 0 && <div style={{fontSize:'.9rem',fontWeight:600,color:'var(--brand-text-soft)'}}>GST: <span style={{color: 'var(--brand-text)', fontWeight: 700}}>{formatINR(totalGSTAmount)}</span></div>}
              <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--brand-green-dark)'}}>Grand Total: {formatINR(grandTotal)}</div>
            </div>
            <div style={{gridColumn:'1 / -1',display:'flex',gap:'.75rem',marginTop:'.5rem'}}>
              <button type="submit" className="btn" style={{flex: 1}}>Submit Order</button>
              <button type="button" className="btn outline" onClick={()=>navigate('/orders')}>View My Orders</button>
              <button type="button" className="btn secondary" onClick={()=>navigate('/home')}>Back to Home</button>
            </div>
          </form>
        </div>
        {orderSummary && (
          <div className="modal-backdrop" onClick={handleCloseSummary}>
            <div className="modal-panel" onClick={e=>e.stopPropagation()}>
              <h2 className="section-title">Order Submitted Successfully!</h2>
              <div style={{display:'grid', rowGap: 8, fontSize:'.9rem', marginBottom:'1.5rem', background: 'var(--brand-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-md)'}}>
                <span><strong>State:</strong> {orderSummary.state}</span>
                <span><strong>Salesman:</strong> {orderSummary.salesman}</span>
                <span><strong>Dealer:</strong> {orderSummary.dealer}</span>
                <span><strong>Status:</strong> <span style={{fontWeight: 'bold', color: orderSummary.discountStatus === 'pending' ? '#f59e0b' : 'var(--brand-green-dark)'}}>{orderSummary.discountStatus}</span></span>
                <span><strong>Aggregate Discount:</strong> {orderSummary.discount}%</span>
              </div>
              <div style={{marginBottom:'1.5rem'}}>
                <strong style={{fontSize:'.9rem'}}>Products Ordered</strong>
                <ul style={{margin:'8px 0 0', paddingLeft: '20px', fontSize:'.85rem', listStyle: 'disc'}}>
                  {orderSummary.products.map((p,i)=>(
                    <li key={i} style={{marginBottom: '8px'}}>
                      {p.name}{p.packing?` (${p.packing})`:''} - Qty: {p.quantity} @ {formatINR(p.unitPrice)} = {formatINR(p.lineTotal)}
                      {p.discountPct>0 && <> - {p.discountPct}% → <strong>{formatINR(p.discountedLineTotal)}</strong></>}
                      {p.gstPercentage > 0 && (
                        <div style={{fontSize: '0.8rem', color: 'var(--brand-text-soft)', marginTop: '2px'}}>
                          GST ({p.gstPercentage}%): {formatINR(p.gstAmount)} | Total: <strong>{formatINR(p.totalWithGst)}</strong>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{fontSize:'1rem',fontWeight:600,display:'grid',rowGap:6, background: 'var(--brand-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-md)'}}>
                <span>Total Before Discount: {formatINR(orderSummary.totalPrice)}</span>
                {orderSummary.totalDiscountAmount>0 && <span style={{color: '#b91c1c'}}>Total Discount: -{formatINR(orderSummary.totalDiscountAmount)}</span>}
                <span>Subtotal: {formatINR(orderSummary.discountedTotal)}</span>
                {orderSummary.gstTotal > 0 && <span>GST: {formatINR(orderSummary.gstTotal)}</span>}
                <span style={{fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-green-dark)'}}>Grand Total: {formatINR(orderSummary.grandTotal)}</span>
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={handleCloseSummary}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderForm;