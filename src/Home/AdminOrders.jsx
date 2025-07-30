import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import { useNavigate } from 'react-router-dom';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${SERVER_API_URL}/orders/admin/orders`);
        setOrders(res.data || []);
      } catch {
        setOrders([]);
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

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
      <div style={{ padding: '6rem 2rem 2rem 2rem' }}>
        <h2>All Orders</h2>
        {loading ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <ul>
            {orders.map(order => (
              <li key={order._id || order.id} style={{ marginBottom: 24, border: '1px solid #ccc', padding: 16 }}>
                <div><strong>Order ID:</strong> {order._id || order.id}</div>
                <div><strong>Salesman:</strong> {order.salesman_name || order.salesman_id}</div>
                <div><strong>Dealer:</strong> {order.dealer_name || order.dealer_id}</div>
                <div><strong>State:</strong> {order.state}</div>
                <div><strong>Total Price:</strong> ₹{order.total_price}</div>
                <div><strong>Discount:</strong> {order.discount || 0}%</div>
                <div><strong>Discounted Total:</strong> ₹{order.discounted_total || order.total_price}</div>
                <div><strong>Discount Status:</strong> {order.discount_status || 'approved'}</div>
                <div>
                  <strong>Products:</strong>
                  <ul>
                    {order.products && order.products.map((p, i) => (
                      <li key={i}>
                        {p.product_name || p.product_id} - Qty: {p.quantity} - ₹{p.price}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          style={{
            marginTop: '2rem',
            padding: '12px 32px',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#fff',
            backgroundColor: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
          onClick={() => navigate('/home')}
          onMouseOver={e => { e.target.style.backgroundColor = '#333'; }}
          onMouseOut={e => { e.target.style.backgroundColor = '#000'; }}
        >
          Back
        </button>
      </div>
    </>
  );
};

export default AdminOrders;
