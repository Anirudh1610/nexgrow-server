import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${SERVER_API_URL}/orders`);
        setOrders(response.data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleBackToOrderForm = () => {
    navigate('/');
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
    ordersContainer: {
      backgroundColor: '#ffffff',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)',
      width: '100%',
      maxWidth: '600px',
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
    backButton: {
      padding: '12px 32px',
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
  };

  return (
    <div style={styles.container}>
      <div style={styles.ordersContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>Orders</h1>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Loading orders...</p>
        ) : orders.length > 0 ? (
          <div style={styles.ordersList}>
            {orders.map((order, index) => (
              <div key={index} style={styles.orderItem}>
                <p><strong>Order ID:</strong> {order.id}</p>
                <p><strong>State:</strong> {order.state}</p>
                <p><strong>Salesman:</strong> {order.salesman_name}</p>
                <p><strong>Dealer:</strong> {order.dealer_name}</p>
                <p><strong>Product:</strong> {order.product_name}</p>
                <p><strong>Quantity:</strong> {order.quantity}</p>
                <p><strong>Total Price:</strong> ₹{order.total_price}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#666' }}>No orders found.</p>
        )}

        <button
          onClick={handleBackToOrderForm}
          style={styles.backButton}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#333333';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#000000';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          Back to Order Form
        </button>
      </div>
    </div>
  );
};

export default Orders;
