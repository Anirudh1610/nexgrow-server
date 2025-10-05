import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const ForecastView = () => {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  useEffect(() => {
    fetchForecasts();
  }, [selectedYear]);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const params = { year: selectedYear };
      const nexgrowUser = JSON.parse(localStorage.getItem('nexgrow_user') || 'null');
      if (nexgrowUser?.uid) params.uid = nexgrowUser.uid;
      if (nexgrowUser?.email) params.email = nexgrowUser.email;

      const response = await axios.get(`${SERVER_API_URL}/forecasts`, { params });
      setForecasts(response.data || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };





  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <AppHeader />
      <main className="page fade-in">
        <div className="surface-card elevated">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h1 className="section-title" style={{ margin: 0 }}>View & Edit Forecasts</h1>
            <button className="btn secondary" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
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

            {forecasts.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-text-soft)' }}>
                  Total Forecasts: {forecasts.length}
                </p>
              </div>
            )}
          </div>

          {loading ? (
            <p>Loading forecasts...</p>
          ) : forecasts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--brand-text-soft)' }}>
              <p>No forecasts found for {selectedYear}.</p>
              <button className="btn" onClick={() => navigate('/forecast')}>
                Create Your First Forecast
              </button>
            </div>
          ) : (
            <div className="forecast-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
              {forecasts.map((forecast) => (
                <div
                  key={forecast.id}
                  className="forecast-card"
                  style={{
                    border: '1px solid var(--brand-border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                      {months[forecast.month - 1]} {forecast.year}
                    </h3>
                    <button
                      className="btn"
                      onClick={() => navigate(`/forecast?month=${forecast.month}&year=${forecast.year}`)}
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    >
                      Edit
                    </button>
                  </div>
                  
                  {/* Products List */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                      Forecasted Products:
                    </label>
                    {forecast.products && forecast.products.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {forecast.products.map((product, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: 'var(--brand-bg-light)',
                              borderRadius: '4px',
                              border: '1px solid var(--brand-border)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                  {product.product_name || product.product_id}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--brand-text-soft)' }}>
                                  Quantity: {product.quantity}
                                </div>
                              </div>
                              {product.dealer_name && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--brand-text-soft)', textAlign: 'right' }}>
                                  Target: {product.dealer_name}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.9rem', color: 'var(--brand-text-soft)', fontStyle: 'italic' }}>
                        No products in this forecast
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--brand-text-soft)' }}>
                    Updated: {forecast.updated_at ? new Date(forecast.updated_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForecastView;