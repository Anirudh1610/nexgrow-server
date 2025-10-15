import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const ForecastForm = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [products, setProducts] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [me, setMe] = useState(null);
  
  // Product entries like in OrderForm
  const [productEntries, setProductEntries] = useState([
    { 
      product: '', 
      quantity: '', 
      dealer: ''
    }
  ]);
  
  const navigate = useNavigate();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  // Default to next month
  const getNextMonth = () => {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    return { month: nextMonth, year: nextYear };
  };

  useEffect(() => {
    // Initialize with next month by default
    const nextMonth = getNextMonth();
    if (!showCustomDate) {
      setSelectedMonth(nextMonth.month);
      setSelectedYear(nextMonth.year);
    }
    
    // Fetch initial data
    fetchProducts();
    fetchMe();
  }, [showCustomDate]);

  const fetchMe = async () => {
    try {
      const nexgrowUser = JSON.parse(localStorage.getItem('nexgrow_user') || 'null');
      const params = {};
      if (nexgrowUser?.uid) params.uid = nexgrowUser.uid;
      if (nexgrowUser?.email) params.email = nexgrowUser.email;
      
      const response = await axios.get(`${SERVER_API_URL}/orders/me`, { params });
      const meData = response.data || {};
      setMe(meData);
      
      // Fetch dealers for this salesman
      if (meData._id || meData.id) {
        await fetchDealers(meData._id || meData.id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMe(null);
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

  const fetchDealers = async (salesmanId) => {
    if (!salesmanId) {
      setDealers([]);
      return;
    }

    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/dealers/${salesmanId}`);
      setDealers(response.data || []);
    } catch (error) {
      console.error('Error fetching dealers:', error);
      setDealers([]);
    }
  };

  const addProductEntry = () => {
    setProductEntries([
      ...productEntries,
      { product: '', quantity: '', dealer: '' }
    ]);
  };

  const removeProductEntry = (index) => {
    if (productEntries.length > 1) {
      setProductEntries(productEntries.filter((_, i) => i !== index));
    }
  };

  const updateProductEntry = (index, field, value) => {
    const updated = [...productEntries];
    updated[index] = { ...updated[index], [field]: value };
    setProductEntries(updated);
  };



  const saveForecast = async () => {
    setSaving(true);
    try {
      // Validate product entries
      const validEntries = productEntries.filter(entry => 
        entry.product && entry.quantity && parseFloat(entry.quantity) > 0
      );

      if (validEntries.length === 0) {
        alert('Please add at least one product with valid quantity');
        setSaving(false);
        return;
      }

      // Build products array for API
      const forecastProducts = validEntries.map(entry => ({
        product_id: entry.product,
        quantity: parseFloat(entry.quantity),
        dealer_id: entry.dealer || null
      }));

      const params = {};
      const nexgrowUser = JSON.parse(localStorage.getItem('nexgrow_user') || 'null');
      if (nexgrowUser?.uid) params.uid = nexgrowUser.uid;
      if (nexgrowUser?.email) params.email = nexgrowUser.email;

      await axios.post(`${SERVER_API_URL}/forecasts`, {
        year: selectedYear,
        month: selectedMonth,
        products: forecastProducts
      }, { params });

      alert('Forecast saved successfully!');
      
      // Reset form
      setProductEntries([{ product: '', quantity: '', dealer: '' }]);
      
      // Reset to next month if not using custom date
      if (!showCustomDate) {
        const nextMonth = getNextMonth();
        setSelectedMonth(nextMonth.month);
        setSelectedYear(nextMonth.year);
      }
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Error saving forecast. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <AppHeader />
      <main className="page fade-in">
        <div className="surface-card elevated">
          <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 className="section-title mobile-center" style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>Create Sales Forecast</h1>
            <button className="btn secondary mobile-full-width" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={showCustomDate}
                  onChange={(e) => setShowCustomDate(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                Set forecast for a different month/year
              </label>
            </div>

            {showCustomDate && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Month:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--brand-border)',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    {months.map((month, index) => {
                      // Only allow current or future months for the selected year
                      const isPast = (selectedYear < currentYear) || (selectedYear === currentYear && (index + 1) < currentMonth);
                      return (
                        <option key={index + 1} value={index + 1} disabled={isPast}>{month}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Year:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--brand-border)',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ 
              border: '1px solid var(--brand-border)', 
              borderRadius: '8px', 
              padding: '1.5rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                Forecast for {months[selectedMonth - 1]} {selectedYear}
              </h3>

              {/* Product Entries */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontWeight: '600', fontSize: '1rem' }}>Products:</label>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={addProductEntry}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Add Product
                  </button>
                </div>

                {productEntries.map((entry, index) => (
                  <div key={index} style={{ 
                    border: '1px solid var(--brand-border)', 
                    borderRadius: '6px', 
                    padding: '1rem', 
                    marginBottom: '1rem',
                    backgroundColor: 'var(--brand-bg-light)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Product {index + 1}</span>
                      {productEntries.length > 1 && (
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => removeProductEntry(index)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                          Product: *
                        </label>
                        <select
                          value={entry.product}
                          onChange={(e) => updateProductEntry(index, 'product', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--brand-border)',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                          }}
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product.id || product._id} value={product.id || product._id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                          Quantity: *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          value={entry.quantity}
                          onChange={(e) => updateProductEntry(index, 'quantity', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--brand-border)',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                          Target Dealer:
                        </label>
                        <select
                          value={entry.dealer}
                          onChange={(e) => updateProductEntry(index, 'dealer', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--brand-border)',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                          }}
                        >
                          <option value="">Select Dealer (Optional)</option>
                          {dealers.map(dealer => (
                            <option key={dealer.id || dealer._id} value={dealer.id || dealer._id}>
                              {dealer.name}
                            </option>
                          ))}
                        </select>
                      </div>


                    </div>


                  </div>
                ))}
              </div>



              <button
                className="btn"
                onClick={saveForecast}
                disabled={saving}
                style={{ width: '100%', fontSize: '1rem' }}
              >
                {saving ? 'Saving...' : 'Save Forecast'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForecastForm;