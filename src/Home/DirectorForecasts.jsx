import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const DirectorForecasts = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalesman, setSelectedSalesman] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    if (selectedSalesman) {
      fetchForecasts();
    } else {
      setForecasts([]);
    }
  }, [selectedSalesman, selectedYear]);

  const fetchSalesmen = async () => {
    try {
      const response = await axios.get(`${SERVER_API_URL}/orders/admin/salesmen`);
      setSalesmen(response.data || []);
    } catch (error) {
      console.error('Error fetching salesmen:', error);
      setSalesmen([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecasts = async () => {
    try {
      const params = { 
        year: selectedYear,
        salesman_id: selectedSalesman
      };
      const response = await axios.get(`${SERVER_API_URL}/admin/forecasts`, { params });
      setForecasts(response.data || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      setForecasts([]);
    }
  };

  const getForecastForMonth = (month) => {
    return forecasts.find(f => f.month === month);
  };

  const getTotalProducts = () => {
    return forecasts.reduce((total, forecast) => {
      return total + (forecast.products ? forecast.products.length : 0);
    }, 0);
  };

  const getSelectedSalesmanName = () => {
    const salesman = salesmen.find(s => s._id === selectedSalesman);
    return salesman ? salesman.name : '';
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <AppHeader />
      <main className="page fade-in">
        <div className="surface-card elevated">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h1 className="section-title" style={{ margin: 0 }}>Sales Forecasts - Director View</h1>
            <button className="btn secondary" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select Salesman:
              </label>
              <select
                value={selectedSalesman}
                onChange={(e) => setSelectedSalesman(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--brand-border)',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Select a Salesman --</option>
                {salesmen.map(salesman => (
                  <option key={salesman._id} value={salesman._id}>
                    {salesman.name} ({salesman.state || 'No State'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select Year:
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

          {loading ? (
            <p>Loading salesmen...</p>
          ) : !selectedSalesman ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--brand-text-soft)' }}>
              <p>Please select a salesman to view their forecasts.</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--brand-bg-soft)', borderRadius: '8px' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                  {getSelectedSalesmanName()} - {selectedYear} Forecasts
                </h2>
                {forecasts.length > 0 && (
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--brand-green)' }}>
                    Total Forecasts: {forecasts.length} months, {getTotalProducts()} products
                  </p>
                )}
              </div>

              {forecasts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--brand-text-soft)' }}>
                  <p>No forecasts found for the selected salesman and year.</p>
                </div>
              ) : (
                <div className="forecast-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {months.map((monthName, index) => {
                    const month = index + 1;
                    const forecast = getForecastForMonth(month);
                    
                    return (
                      <div
                        key={month}
                        className="forecast-card"
                        style={{
                          border: '1px solid var(--brand-border)',
                          borderRadius: '8px',
                          padding: '1rem',
                          backgroundColor: forecast ? 'white' : 'var(--brand-bg-light)',
                          opacity: forecast ? 1 : 0.6
                        }}
                      >
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                          {monthName} {selectedYear}
                        </h3>
                        
                        {forecast ? (
                          <div>
                            <div style={{ marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.9rem', color: 'var(--brand-text-soft)' }}>
                                Products ({forecast.products ? forecast.products.length : 0}):
                              </span>
                              {forecast.products && forecast.products.length > 0 ? (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {forecast.products.slice(0, 3).map((product, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        padding: '0.5rem',
                                        backgroundColor: 'var(--brand-bg-light)',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      <div style={{ fontWeight: '600' }}>
                                        {product.product_name || product.product_id}
                                      </div>
                                      <div style={{ color: 'var(--brand-text-soft)' }}>
                                        Qty: {product.quantity}
                                        {product.dealer_name && ` → ${product.dealer_name}`}
                                      </div>
                                    </div>
                                  ))}
                                  {forecast.products.length > 3 && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--brand-text-soft)', textAlign: 'center' }}>
                                      +{forecast.products.length - 3} more products
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.9rem', color: 'var(--brand-text-soft)', fontStyle: 'italic' }}>
                                  No products forecasted
                                </div>
                              )}
                            </div>
                            
                            <div style={{ fontSize: '0.8rem', color: 'var(--brand-text-soft)' }}>
                              Updated: {forecast.updated_at ? new Date(forecast.updated_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--brand-text-soft)' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>No forecast set</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DirectorForecasts;