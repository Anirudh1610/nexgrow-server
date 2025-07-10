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
  const [packingSizes, setPackingSizes] = useState([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(false);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPackingSizes, setLoadingPackingSizes] = useState(false);
  const [formData, setFormData] = useState({
    state: '',
    salesman: '',
    dealer: '',
    product: '',
    productSize: ''
  });
  const [priceDetails, setPriceDetails] = useState(null); // New state for price details

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

  const fetchPackingSizes = async (productId) => {
    if (!productId) {
      setPackingSizes([]);
      return;
    }

    const selectedProduct = products.find(p => (p._id || p.id) === productId);
    if (!selectedProduct) {
      console.error('Product not found for packing size fetch');
      setPackingSizes([]);
      return;
    }

    const productName = selectedProduct.name;

    setLoadingPackingSizes(true);
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/products/${encodeURIComponent(productName)}/packing`);

      let packingData = [];

      if (Array.isArray(response.data)) {
        packingData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.packing_size) {
          packingData = [{
            _id: response.data._id || `packing_${productId}`,
            size: response.data.packing_size,
            name: response.data.packing_size,
            bottles_per_case: response.data.bottles_per_case,
            bottle_volume: response.data.bottle_volume,
            moq: response.data.moq,
            dealer_price_per_bottle: response.data.dealer_price_per_bottle,
            gst_percentage: response.data.gst_percentage,
            billing_price_per_bottle: response.data.billing_price_per_bottle,
            mrp_per_bottle: response.data.mrp_per_bottle
          }];
        } else if (response.data.packing_sizes) {
          packingData = response.data.packing_sizes;
        }
      }

      setPackingSizes(packingData);
    } catch (error) {
      console.error('Error fetching packing sizes:', error);
      setPackingSizes([]);
    } finally {
      setLoadingPackingSizes(false);
    }
  };

  const fetchPrice = async (productId, quantity) => {
    if (!productId || !quantity) {
      setPriceDetails(null);
      return;
    }

    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/products/${productId}/price`, {
        params: { quantity },
      });
      setPriceDetails(response.data);
    } catch (error) {
      console.error('Error fetching price:', error);
      setPriceDetails(null);
    }
  };

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

    if (name === 'product') {
      setFormData(prev => ({
        ...prev,
        productSize: ''
      }));
      fetchPackingSizes(value);
    }

    if (name === 'productSize' || name === 'quantity') {
      const productId = name === 'productSize' ? value : formData.productSize;
      const quantity = name === 'quantity' ? value : formData.quantity;
      fetchPrice(productId, quantity);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { state, salesman, dealer, productSize, quantity } = formData;

    if (!state || !salesman || !dealer || !productSize || !quantity || !priceDetails) {
      alert('Please fill in all fields and ensure the price is calculated.');
      return;
    }

    const orderData = {
      state,
      salesman_id: salesman, // Correct key
      dealer_id: dealer,     // Correct key
      product_id: productSize, // Use product ID from the packing size field
      quantity,
      price: priceDetails.total_price, // Use the total price from priceDetails
    };

    try {
      const response = await axios.post(`${SERVER_API_URL}/orders/make-order`, orderData);
      console.log('Order submitted successfully:', response.data);
      alert('Order submitted successfully!');
    } catch (error) {
      console.error('Error submitting order:', error);
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
    <div style={styles.container}>
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

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Product</label>
            <select
              name="product"
              value={formData.product}
              onChange={handleInputChange}
              style={styles.select}
              required
              disabled={loadingProducts}
            >
              <option value="">
                {loadingProducts 
                  ? "Loading products..." 
                  : "Choose a product"}
              </option>
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
              value={formData.productSize}
              onChange={handleInputChange}
              style={styles.select}
              required
              disabled={!formData.product || loadingPackingSizes}
            >
              <option value="">
                {!formData.product 
                  ? "Please select a product first" 
                  : loadingPackingSizes 
                  ? "Loading packing sizes..." 
                  : "Choose product size"}
              </option>
              {Array.isArray(packingSizes) && packingSizes.map((packing) => (
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
              value={formData.quantity || ''}
              onChange={handleInputChange}
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

          {priceDetails && (
            <div style={styles.formGroup}>
              <p style={{ color: '#333', fontSize: '1rem', fontWeight: '600' }}>
                Total Price: ₹{priceDetails.total_price} (Unit Price: ₹{priceDetails.unit_price})
              </p>
            </div>
          )}

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
      </div>
    </div>
  );
};

export default OrderForm;