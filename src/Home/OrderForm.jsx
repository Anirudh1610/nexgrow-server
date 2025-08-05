import React, { useState, useEffect } from 'react';
import { auth } from '../Auth/AuthConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { SERVER_API_URL } from '../Auth/APIConfig';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const OrderForm = ({ onSignOut }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [salesmen, setSalesmen] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(false);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Multiple products state
  const [productEntries, setProductEntries] = useState([
    { product: '', packingSizes: [], productSize: '', quantity: '', priceDetails: null, loadingPackingSizes: false }
  ]);

  const [formData, setFormData] = useState({
    state: '',
    salesman: '',
    dealer: ''
  });

  // Add discount state
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProducts();
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
    setLoadingProducts(true);
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/products`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
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
      { product: '', packingSizes: [], productSize: '', quantity: '', priceDetails: null, loadingPackingSizes: false }
    ]);
  };

  // Remove product entry
  const handleRemoveProductEntry = (idx) => {
    setProductEntries(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculate total price and discounted total
  const totalPrice = productEntries.reduce((sum, entry) => {
    return sum + (entry.priceDetails?.total_price || 0);
  }, 0);

  const discountAmount = Math.min(Math.max(Number(discount), 0), 30) / 100 * totalPrice;
  const discountedTotal = totalPrice - discountAmount;

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
    }
    // Validate discount
    if (discount < 0 || discount > 30) {
      alert('Discount must be between 0 and 30%');
      return;
    }
    // Prepare order data
    const products = productEntries.map(entry => ({
      product_id: entry.productSize,
      quantity: entry.quantity,
      price: entry.priceDetails.total_price
    }));
    const orderData = {
      state,
      salesman_id: salesman,
      dealer_id: dealer,
      products,
      total_price: totalPrice,
      discount: Number(discount),
      discounted_total: discountedTotal,
      discount_status: discount > 0 ? 'pending' : 'approved'
    };
    try {
      await axios.post(`${SERVER_API_URL}/orders/make-order`, orderData);
      alert('Order submitted successfully!');
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

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#000000',
      padding: '20px',
    },
    formContainer: {
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)',
      width: '100%',
      maxWidth: '500px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#000000',
      margin: 0,
      marginBottom: '0.5rem',
    },
    welcomeText: {
      fontSize: '1.1rem',
      color: '#666666',
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
      color: '#333333',
    },
    select: {
      padding: '12px',
      fontSize: '1rem',
      border: '2px solid #e0e0e0',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      color: '#333333',
      cursor: 'pointer',
      transition: 'border-color 0.3s ease',
    },
    submitButton: {
      padding: '14px 32px',
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#ffffff',
      backgroundColor: '#000000',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '1rem',
    },
    signOutButton: {
      padding: '8px 16px',
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#666666',
      backgroundColor: 'transparent',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '1rem',
    },
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '2rem',
          color: '#fff',
          backgroundColor: '#000',
          textAlign: 'center',
          marginBottom: '1.5rem',
          marginTop: '0',
          cursor: 'pointer',
          letterSpacing: '2px',
          padding: '1.2rem 0 1.2rem 0',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span style={{ flex: 1, cursor: 'pointer' }} onClick={handleBack}>
          NEXGROW
        </span>
        <button
          style={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={async () => {
            await signOut(auth);
            navigate('/');
          }}
        >
          Sign Out
        </button>
      </div>
      <div style={{ ...styles.container, paddingTop: '5rem' }}>
        <div style={styles.formContainer}>
          <div style={styles.header}>
            <h1 style={styles.title}>nexfarm</h1>
            <p style={styles.welcomeText}>Welcome, {user.displayName}!</p>
          </div>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Select State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="">Choose a state</option>
                <option value="AP">AP</option>
                <option value="TG">TG</option>
                <option value="TN">TN</option>
                <option value="UP">UP</option>
                <option value="WB">WB</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Salesman</label>
              <select
                name="salesman"
                value={formData.salesman}
                onChange={handleInputChange}
                style={styles.select}
                required
                disabled={!formData.state || loadingSalesmen}
              >
                <option value="">
                  {!formData.state 
                    ? "Please select a state first" 
                    : loadingSalesmen 
                    ? "Loading salesmen..." 
                    : "Choose a salesman"}
                </option>
                {Array.isArray(salesmen) && salesmen.map((salesman) => (
                  <option key={salesman._id || salesman.id} value={salesman._id || salesman.id}>
                    {salesman.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Dealer</label>
              <select
                name="dealer"
                value={formData.dealer}
                onChange={handleInputChange}
                style={styles.select}
                required
                disabled={!formData.salesman || loadingDealers}
              >
                <option value="">
                  {!formData.salesman 
                    ? "Please select a salesman first" 
                    : loadingDealers 
                    ? "Loading dealers..." 
                    : "Choose a dealer"}
                </option>
                {Array.isArray(dealers) && dealers.map((dealer) => (
                  <option key={dealer._id || dealer.id} value={dealer._id || dealer.id}>
                    {dealer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Multiple products section */}
            <div>
              <label style={styles.label}>Products</label>
              {productEntries.map((entry, idx) => (
                <div key={idx} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Product</label>
                    <select
                      name="product"
                      value={entry.product}
                      onChange={e => handleProductEntryChange(idx, 'product', e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Choose a product</option>
                      {Array.isArray(products) && products.map((product) => (
                        <option key={product._id || product.id} value={product._id || product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Product Size</label>
                    <select
                      name="productSize"
                      value={entry.productSize}
                      onChange={e => handleProductEntryChange(idx, 'productSize', e.target.value)}
                      style={styles.select}
                      required
                      disabled={!entry.product || entry.loadingPackingSizes}
                    >
                      <option value="">
                        {!entry.product
                          ? "Please select a product first"
                          : entry.loadingPackingSizes
                          ? "Loading packing sizes..."
                          : "Choose product size"}
                      </option>
                      {Array.isArray(entry.packingSizes) && entry.packingSizes.map((packing) => (
                        <option key={packing._id || packing.id} value={packing._id || packing.id}>
                          {packing.packing_size || packing.size || packing.name}
                          {packing.bottles_per_case ? ` - ${packing.bottles_per_case} bottles` : ""}
                          {packing.bottle_volume ? ` x ${packing.bottle_volume}` : ""}
                          {packing.moq ? ` | MOQ: ${packing.moq}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Enter Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={entry.quantity || ''}
                      onChange={e => handleProductEntryChange(idx, 'quantity', e.target.value)}
                      style={{
                        ...styles.select,
                        padding: '12px',
                        fontSize: '1rem',
                      }}
                      min="1"
                      placeholder="Enter quantity"
                      required
                    />
                  </div>
                  {entry.priceDetails && (
                    <div style={styles.formGroup}>
                      <p style={{ color: '#333', fontSize: '1rem', fontWeight: '600' }}>
                        Total Price: ₹{entry.priceDetails.total_price} (Unit Price: ₹{entry.priceDetails.unit_price})
                      </p>
                    </div>
                  )}
                  {productEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProductEntry(idx)}
                      style={{
                        ...styles.signOutButton,
                        color: '#c00',
                        borderColor: '#c00',
                        marginTop: '0.5rem'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddProductEntry}
                style={{
                  ...styles.signOutButton,
                  backgroundColor: '#eee',
                  color: '#333',
                  marginBottom: '1rem'
                }}
              >
                Add Another Product
              </button>
            </div>

            {/* Discount field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Discount (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                style={{
                  ...styles.select,
                  width: '100%',
                }}
                placeholder="Enter discount (max 30%)"
              />
              {discount > 0 && (
                <span style={{ color: '#c00', fontSize: '0.95rem' }}>
                  Discount will require admin approval.
                </span>
              )}
            </div>

            {/* Show total price and discounted total */}
            <div style={styles.formGroup}>
              <p style={{ color: '#333', fontSize: '1.1rem', fontWeight: 'bold' }}>
                Grand Total: ₹{totalPrice}
              </p>
              {discount > 0 && (
                <p style={{ color: '#007b00', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Discounted Total: ₹{discountedTotal}
                </p>
              )}
            </div>

            <button
              type="submit"
              style={styles.submitButton}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#333333';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#000000';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Submit Order
            </button>
          </form>

          <button
            onClick={handleSignOut}
            style={styles.signOutButton}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f5f5f5';
              e.target.style.borderColor = '#cccccc';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#e0e0e0';
            }}
          >
            Sign Out
          </button>

          <button
            onClick={handleViewOrders}
            style={{
              ...styles.signOutButton,
              marginTop: '1rem',
              backgroundColor: '#000000',
              color: '#ffffff',
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#333333';
              e.target.style.color = '#ffffff';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#000000';
              e.target.style.color = '#ffffff';
            }}
          >
            View Orders
          </button>

          <button
            onClick={handleBack}
            style={{
              ...styles.signOutButton,
              marginTop: '1rem',
              backgroundColor: '#eee',
              color: '#333',
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#ddd';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#eee';
            }}
          >
            Back
          </button>
          <button
            style={{
              ...styles.signOutButton,
              marginTop: '1rem',
              backgroundColor: '#fff',
              color: '#000',
              border: '2px solid #000',
            }}
            onClick={() => navigate('/home')}
            onMouseOver={e => { e.target.style.backgroundColor = '#eee'; }}
            onMouseOut={e => { e.target.style.backgroundColor = '#fff'; }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </>
  );
};

export default OrderForm;