import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${SERVER_API_URL}/orders`);
        setOrders(response.data || []);
      } catch (error) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Calculate total sales amount
  const totalSales = orders.reduce((sum, order) => {
    // If order has total_price, use it; else sum product prices
    if (order.total_price) return sum + order.total_price;
    if (order.products && Array.isArray(order.products)) {
      return sum + order.products.reduce((pSum, p) => pSum + (p.price || 0), 0);
    }
    return sum;
  }, 0);

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#000',
      padding: '20px',
    },
    dashboard: {
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
      width: '100%',
      maxWidth: '700px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#000',
      margin: 0,
      marginBottom: '0.5rem',
    },
    totalSales: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '1.5rem',
      textAlign: 'center',
    },
    ordersList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    orderItem: {
      padding: '1rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
    },
  };

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
        <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate('/home')}>
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
        <div style={styles.dashboard}>
          <div style={styles.header}>
            <h1 style={styles.title}>Dashboard</h1>
          </div>
          <div style={styles.totalSales}>
            Total Sales: ₹{totalSales}
          </div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Loading orders...</p>
          ) : orders.length > 0 ? (
            <div style={styles.ordersList}>
              {orders.map((order, idx) => (
                <div key={idx} style={styles.orderItem}>
                  <p><strong>Order ID:</strong> {order.id || order._id}</p>
                  <p><strong>State:</strong> {order.state}</p>
                  <p><strong>Salesman:</strong> {order.salesman_name}</p>
                  <p><strong>Dealer:</strong> {order.dealer_name}</p>
                  {/* Show products if available */}
                  {order.products && Array.isArray(order.products) ? (
                    <div>
                      <strong>Products:</strong>
                      <ul>
                        {order.products.map((p, i) => (
                          <li key={i}>
                            {p.product_name || p.product_id} - Qty: {p.quantity} - ₹{p.price}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <>
                      <p><strong>Product:</strong> {order.product_name}</p>
                      <p><strong>Quantity:</strong> {order.quantity}</p>
                    </>
                  )}
                  <p><strong>Total Price:</strong> ₹{order.total_price}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No orders found.</p>
          )}
          <button
            onClick={() => navigate('/home')}
            style={{
              ...styles.ordersList,
              padding: '12px 32px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#fff',
              backgroundColor: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '2rem',
              textAlign: 'center',
            }}
            onMouseOver={e => {
              e.target.style.backgroundColor = '#333';
            }}
            onMouseOut={e => {
              e.target.style.backgroundColor = '#000';
            }}
          >
            Back
          </button>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
