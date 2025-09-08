import React, { useState, useEffect } from 'react';
import { auth } from '../Auth/AuthConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { SERVER_API_URL } from '../Auth/APIConfig';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatINR, formatPercent } from './numberFormat';

const OrderForm = ({ onSignOut }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [salesmen, setSalesmen] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(false);
  const [loadingDealers, setLoadingDealers] = useState(false);
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

  const fetchSalesmen = async (state) => {
    if (!state) {
      setSalesmen([]);
      return;
    }

    setLoadingSalesmen(true);
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/salesmen?state=${state}`);
      setSalesmen(response.data || []);
    } catch (error) {
      console.error('Error fetching salesmen:', error);
      setSalesmen([]);
    } finally {
      setLoadingSalesmen(false);
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'state') {
      setFormData(prev => ({
        ...prev,
        salesman: '',
        dealer: ''
      }));
      fetchSalesmen(value);
      setDealers([]);
    }
    if (name === 'salesman') {
      setFormData(prev => ({
        ...prev,
        dealer: ''
      }));
      fetchDealers(value);
    }
  };

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

  // Calculate totals & per-product discounts
  const totalPrice = productEntries.reduce((sum, entry) => sum + (entry.priceDetails?.total_price || 0), 0);
  const totalDiscountAmount = productEntries.reduce((sum, entry) => {
    if (!entry.priceDetails) return sum;
    const pct = Number(entry.discount) || 0;
    return sum + (entry.priceDetails.total_price * Math.min(Math.max(pct,0),30) / 100);
  }, 0);
  const discountedTotal = totalPrice - totalDiscountAmount;
  const aggregateDiscountPct = totalPrice > 0 ? (totalDiscountAmount / totalPrice) * 100 : 0;
  const anyDiscount = productEntries.some(e => (Number(e.discount) || 0) > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { state, salesman, dealer } = formData;
    if (!state || !salesman || !dealer) {
      alert('Please fill in all fields.');
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
    const orderProducts = productEntries.map(entry => ({
      product_id: entry.productSize,
      quantity: entry.quantity,
      price: entry.priceDetails.total_price,
      discount_pct: Number(entry.discount) || 0,
      discounted_price: (()=>{ const base=entry.priceDetails.total_price; const pct=Number(entry.discount)||0; return base - (base*pct/100); })()
    }));
    const orderData = {
      state,
      salesman_id: salesman,
      dealer_id: dealer,
      products: orderProducts,
      total_price: totalPrice,
      discount: Number(aggregateDiscountPct.toFixed(2)),
      discounted_total: discountedTotal,
      discount_status: anyDiscount ? 'pending' : 'approved'
    };
    try {
      await axios.post(`${SERVER_API_URL}/orders/make-order`, orderData);
      const summaryProducts = productEntries.map(entry => {
        const productObj = (products || []).find(p => (p._id || p.id) === entry.product) || {};
        const packingObj = entry.packingSizes.find(ps => (ps._id || ps.id) === entry.productSize) || {};
        const base = entry.priceDetails?.total_price || 0;
        const pct = Number(entry.discount) || 0;
        const lineDiscountAmt = base * pct / 100;
        const after = base - lineDiscountAmt;
        return {
          name: productObj.name || 'Product',
            packing: packingObj.packing_size || packingObj.size || packingObj.name || '',
          quantity: entry.quantity,
          unitPrice: entry.priceDetails?.unit_price || 0,
          lineTotal: base,
          discountPct: pct,
          discountedLineTotal: after
        };
      });
      setOrderSummary({
        state,
        salesman: (salesmen.find(s => (s._id || s.id) === salesman)?.name) || salesman,
        dealer: (dealers.find(d => (d._id || d.id) === dealer)?.name) || dealer,
        discount: Number(aggregateDiscountPct.toFixed(2)),
        totalPrice,
        discountedTotal,
        totalDiscountAmount,
        products: summaryProducts,
        discountStatus: anyDiscount ? 'pending' : 'approved'
      });
      // Reset form basics
      setProductEntries([{ product: '', packingSizes: [], productSize: '', quantity: '', priceDetails: null, loadingPackingSizes: false, discount: 0 }]);
      setFormData({ state: '', salesman: '', dealer: '' });
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
    return <div className="app-shell" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="surface-card elevated" style={{padding:'2rem 2.25rem',textAlign:'center'}}><p style={{margin:0,fontWeight:600,letterSpacing:'.5px'}}>Authenticating...</p></div></div>;
  }

  return (
    <div className="app-shell" style={{minHeight:'100vh'}}>
      <header className="app-header">
        <div className="app-header__logo" onClick={()=>navigate('/home')}>NEXGROW</div>
        <div className="app-header__actions">
          <span style={{fontSize:'.7rem',letterSpacing:'.5px',opacity:.85}}>{user.displayName || user.email}</span>
          <button className="btn danger" onClick={async()=>{ await signOut(auth); try { localStorage.removeItem('nexgrow_uid'); } catch {}; navigate('/'); }}>Sign Out</button>
        </div>
      </header>
      <main className="page narrow fade-in">
        <div className="surface-card elevated" style={{marginBottom:'1.5rem'}}>
          <h1 className="section-title" style={{fontSize:'1.4rem'}}>Create Order</h1>
          <p style={{margin:'0 0 1.25rem',fontSize:'.8rem',color:'var(--brand-text-soft)'}}>Apply discounts per product line. Any discount &gt; 0% requires admin approval.</p>
          <form onSubmit={handleSubmit} className="form-grid" style={{gap:'1.25rem'}}>
            <div className="form-row">
              <label>State</label>
              <select name="state" value={formData.state} onChange={handleInputChange} className="input" required>
                <option value="">Choose a state</option>
                <option value="AP">AP</option><option value="TG">TG</option><option value="TN">TN</option><option value="UP">UP</option><option value="WB">WB</option>
              </select>
            </div>
            <div className="form-row">
              <label>Salesman</label>
              <select name="salesman" value={formData.salesman} onChange={handleInputChange} className="input" required disabled={!formData.state || loadingSalesmen}>
                <option value="">{!formData.state ? 'Select a state first' : loadingSalesmen ? 'Loading salesmen...' : 'Choose a salesman'}</option>
                {Array.isArray(salesmen) && salesmen.map(s => (<option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="form-row">
              <label>Dealer</label>
              <select name="dealer" value={formData.dealer} onChange={handleInputChange} className="input" required disabled={!formData.salesman || loadingDealers}>
                <option value="">{!formData.salesman ? 'Select a salesman first' : loadingDealers ? 'Loading dealers...' : 'Choose a dealer'}</option>
                {Array.isArray(dealers) && dealers.map(d => (<option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>))}
              </select>
            </div>
            {/* Removed global discount field */}
            <div className="form-row" style={{gridColumn:'1 / -1'}}>
              <label style={{marginBottom:'.25rem'}}>Products</label>
              <div className="stack-md" style={{marginTop:'.25rem'}}>
                {productEntries.map((entry, idx)=> {
                  const base = entry.priceDetails?.total_price || 0;
                  const pct = Number(entry.discount) || 0;
                  const lineDiscountAmt = base * pct / 100;
                  const after = base - lineDiscountAmt;
                  const selectedProduct = (products || []).find(p => (p._id || p.id) === entry.product) || {};
                  return (
                  <div key={idx} className="surface-card" style={{padding:'1rem 1.1rem 1.15rem',boxShadow:'none',border:'1px solid var(--brand-border)'}}>
                    <div className="form-grid" style={{gap:'.9rem'}}>
                      <div className="form-row">
                        <label>Product</label>
                        <select value={entry.product} onChange={e=>handleProductEntryChange(idx,'product',e.target.value)} className="input" required>
                          <option value="">Choose product</option>
                          {products.map(p=>(<option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label>Size</label>
                        <select value={entry.productSize} onChange={e=>handleProductEntryChange(idx,'productSize',e.target.value)} className="input" required disabled={!entry.product || entry.loadingPackingSizes}>
                          <option value="">{!entry.product ? 'Select product first' : entry.loadingPackingSizes ? 'Loading sizes...' : 'Choose size'}</option>
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
                        <label>Quantity</label>
                        <input type="number" min="1" value={entry.quantity || ''} onChange={e=>handleProductEntryChange(idx,'quantity',e.target.value)} className="input" placeholder="Qty" required />
                      </div>
                      <div className="form-row">
                        <label>Discount %</label>
                        <input type="number" min="0" max="30" step="0.1" value={entry.discount === '' ? '' : entry.discount} onChange={e=>handleProductEntryChange(idx,'discount',e.target.value)} className="input" placeholder="0 - 30%" />
                      </div>
                    </div>
                    {entry.priceDetails && (
                      <div style={{marginTop:'.6rem',fontSize:'.65rem',fontWeight:600,color:'var(--brand-text)'}}>Line: ₹{formatINR(base)}{pct>0 && <> - {pct}% (₹{formatINR(lineDiscountAmt)}) → <span style={{color:'#0f732f'}}>₹{formatINR(after)}</span></>}</div>
                    )}
                    <div style={{marginTop:'.75rem',display:'flex',gap:'.5rem'}}>
                      {productEntries.length > 1 && (
                        <button type="button" className="btn danger" onClick={()=>handleRemoveProductEntry(idx)} style={{fontSize:'.65rem'}}>Remove</button>
                      )}
                      {idx === productEntries.length -1 && (
                        <button type="button" className="btn secondary" onClick={handleAddProductEntry} style={{fontSize:'.65rem'}}>Add Another</button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>
            <div className="surface-card" style={{gridColumn:'1 / -1',display:'flex',flexWrap:'wrap',gap:'1rem',alignItems:'center',padding:'1rem 1.1rem'}}>
              <div style={{fontSize:'.75rem',fontWeight:600,color:'var(--brand-text)'}}>Total Before Discount: ₹{formatINR(totalPrice)}</div>
              {anyDiscount && <div style={{fontSize:'.75rem',fontWeight:600,color:'#b34700'}}>Discount Amt: ₹{formatINR(totalDiscountAmount)}</div>}
              {anyDiscount && <div style={{fontSize:'.75rem',fontWeight:600,color:'#0f732f'}}>After Discount: ₹{formatINR(discountedTotal)}</div>}
            </div>
            <div style={{gridColumn:'1 / -1',display:'flex',gap:'.75rem',marginTop:'.5rem'}}>
              <button type="submit" className="btn" style={{flex:'0 0 auto'}}>Submit Order</button>
              <button type="button" className="btn outline" onClick={()=>navigate('/orders')}>View Orders</button>
              <button type="button" className="btn secondary" onClick={()=>navigate('/home')}>Back</button>
            </div>
          </form>
        </div>
        {orderSummary && (
          <div className="modal-backdrop" onClick={handleCloseSummary}>
            <div className="modal-panel" onClick={e=>e.stopPropagation()}>
              <h2 className="section-title" style={{fontSize:'1.25rem'}}>Order Summary</h2>
              <div style={{display:'grid',rowGap:6,fontSize:'.75rem',marginBottom:'1rem'}}>
                <span><strong>State:</strong> {orderSummary.state}</span>
                <span><strong>Salesman:</strong> {orderSummary.salesman}</span>
                <span><strong>Dealer:</strong> {orderSummary.dealer}</span>
                <span><strong>Status:</strong> {orderSummary.discountStatus}</span>
                <span><strong>Aggregate Discount %:</strong> {orderSummary.discount}</span>
              </div>
              <div style={{marginBottom:'1rem'}}>
                <strong style={{fontSize:'.7rem',letterSpacing:'.5px'}}>Products</strong>
                <ul style={{margin:'4px 0 0 18px',padding:0,fontSize:'.7rem'}}>
                  {orderSummary.products.map((p,i)=>(
                    <li key={i} style={{margin:'2px 0'}}>{p.name}{p.packing?` (${p.packing})`:''} - Qty: {p.quantity} @ ₹{formatINR(p.unitPrice)} = ₹{formatINR(p.lineTotal)}{p.discountPct>0 && <> - {p.discountPct}% → <strong>₹{formatINR(p.discountedLineTotal)}</strong></>}</li>
                  ))}
                </ul>
              </div>
              <div style={{fontSize:'.75rem',fontWeight:600,display:'grid',rowGap:4}}>
                <span>Total Before Discount: ₹{formatINR(orderSummary.totalPrice)}</span>
                {orderSummary.totalDiscountAmount>0 && <span>Total Discount: -₹{formatINR(orderSummary.totalDiscountAmount)}</span>}
                <span>Grand Total: ₹{formatINR(orderSummary.discountedTotal)}</span>
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