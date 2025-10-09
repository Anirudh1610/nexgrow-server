import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import axios from 'axios';
import { SERVER_API_URL, API_BASE_URL } from '../Auth/APIConfig';
import AppHeader from '../components/AppHeader';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('guest');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        if (user?.uid || user?.email) {
          const params = { uid: user.uid, email: user.email };
          let roleVal = 'guest';
          try {
            const res = await axios.get(`${SERVER_API_URL}/orders/me`, { params });
            roleVal = res.data?.role || 'guest';
          } catch (err) {
            const status = err?.response?.status;
            if (status === 404 || status === 405) {
              const res2 = await axios.get(`${API_BASE_URL}/orders/me`, { params });
              roleVal = res2.data?.role || 'guest';
            } else {
              throw err;
            }
          }
          setRole(roleVal);
        } else {
          setRole('guest');
        }
      } catch {
        setRole('guest');
      }
    };
    fetchRole();
  }, [user]);

  return (
    <div className="app-shell fade-in">
      <AppHeader />
      <main className="page">
        <h1
          className="section-title mobile-center"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 700,
            marginBottom: '2rem'
          }}
        >
          Welcome, {user?.displayName?.split(' ')[0] || 'User'}!
        </h1>
        
        {role === 'director' && (
          <div className="tiles">
            <div className="tile" onClick={() => navigate('/admin/discount-approvals')}>
              <h3>Discount Approvals</h3>
              <p>Review, approve or reject requested order discounts.</p>
            </div>
            <div className="tile" onClick={() => navigate('/admin/orders')}>
              <h3>All Orders</h3>
              <p>Monitor every order, its status and discount performance.</p>
            </div>
            <div className="tile" onClick={() => navigate('/admin/management')}>
              <h3>Data Management</h3>
              <p>Maintain salesmen, dealers and product catalog entries.</p>
            </div>
            <div className="tile" onClick={() => navigate('/admin/forecasts')}>
              <h3>Sales Forecasts</h3>
              <p>View sales forecasts and targets by salesman.</p>
            </div>
            <div className="tile" onClick={() => navigate('/dashboard')}>
              <h3>Dashboard</h3>
              <p>High level metrics & quick sales insights (beta).</p>
            </div>
          </div>
        )}
        
        {role === 'salesman' && (
          <div className="tiles">
            <div className="tile" onClick={() => navigate('/order-form')}>
              <h3>Create Order</h3>
              <p>Build a multi-product order with instant pricing.</p>
            </div>
            <div className="tile" onClick={() => navigate('/orders')}>
              <h3>My Orders</h3>
              <p>Track submitted orders and discount statuses.</p>
            </div>
            <div className="tile" onClick={() => navigate('/forecast')}>
              <h3>Sales Forecast</h3>
              <p>Set your sales targets for upcoming months.</p>
            </div>
            <div className="tile" onClick={() => navigate('/forecast-view')}>
              <h3>View/Edit Forecasts</h3>
              <p>Review and modify your existing forecasts.</p>
            </div>
          </div>
        )}

        {(role === 'sales_manager' || role === 'admin') && (
          <div className="tiles">
            <div className="tile" onClick={() => navigate('/order-form')}>
              <h3>Create Order</h3>
              <p>Build a multi-product order with instant pricing.</p>
            </div>
            <div className="tile" onClick={() => navigate('/manager')}>
              <h3>Team Orders</h3>
              <p>View and edit your team's orders.</p>
            </div>
            <div className="tile" onClick={() => navigate('/orders')}>
              <h3>My Orders</h3>
              <p>Quick link to your personal orders list.</p>
            </div>
            <div className="tile" onClick={() => navigate('/forecast')}>
              <h3>Sales Forecast</h3>
              <p>Set your sales targets for upcoming months.</p>
            </div>
            <div className="tile" onClick={() => navigate('/forecast-view')}>
              <h3>View/Edit Forecasts</h3>
              <p>Review and modify your existing forecasts.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;

