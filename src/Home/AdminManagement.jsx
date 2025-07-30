import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_API_URL } from '../Auth/APIConfig';

const AdminManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('salesmen');
  const [salesmen, setSalesmen] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Form templates for different entities
  const formTemplates = {
    salesmen: {
      name: '',
      email: '',
      phone: '',
      state: '',
      admin: false
    },
    dealers: {
      name: '',
      phone: '',
      state: '',
      sales_man_id: '',
      credit_limit: 100000
    },
    products: {
      name: '',
      category: '',
      packing_size: '',
      bottles_per_case: 1,
      bottle_volume: '',
      moq: '',
      dealer_price_per_bottle: 0,
      gst_percentage: 18,
      billing_price_per_bottle: 0,
      mrp_per_bottle: 0,
      product_details: ''
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_API_URL}/admin/${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        switch (activeTab) {
          case 'salesmen':
            setSalesmen(data);
            break;
          case 'dealers':
            setDealers(data);
            break;
          case 'products':
            setProducts(data);
            break;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setModalType('create');
    setSelectedItem(null);
    setFormData(formTemplates[activeTab]);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalType('edit');
    setSelectedItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`${SERVER_API_URL}/admin/${activeTab}/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error(`Error deleting ${activeTab.slice(0, -1)}:`, error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = modalType === 'create' 
        ? `${SERVER_API_URL}/admin/${activeTab}`
        : `${SERVER_API_URL}/admin/${activeTab}/${selectedItem.id || selectedItem._id}`;
      
      const method = modalType === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error(`Error ${modalType === 'create' ? 'creating' : 'updating'} ${activeTab.slice(0, -1)}:`, error);
    }
  };

  const renderTable = () => {
    let data, columns;
    
    switch (activeTab) {
      case 'salesmen':
        data = salesmen;
        columns = ['Name', 'Email', 'Phone', 'State', 'Admin', 'Actions'];
        break;
      case 'dealers':
        data = dealers;
        columns = ['Name', 'Phone', 'State', 'Credit Limit', 'Actions'];
        break;
      case 'products':
        data = products;
        columns = ['Name', 'Category', 'Packing Size', 'Price per Bottle', 'GST %', 'Actions'];
        break;
      default:
        return null;
    }

    return (
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id || item._id} style={styles.tr}>
                {activeTab === 'salesmen' && (
                  <>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.email}</td>
                    <td style={styles.td}>{item.phone || 'N/A'}</td>
                    <td style={styles.td}>{item.state || 'N/A'}</td>
                    <td style={styles.td}>{item.admin ? 'Yes' : 'No'}</td>
                  </>
                )}
                {activeTab === 'dealers' && (
                  <>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.phone || 'N/A'}</td>
                    <td style={styles.td}>{item.state || 'N/A'}</td>
                    <td style={styles.td}>₹{item.credit_limit?.toLocaleString()}</td>
                  </>
                )}
                {activeTab === 'products' && (
                  <>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.category}</td>
                    <td style={styles.td}>{item.packing_size}</td>
                    <td style={styles.td}>₹{item.dealer_price_per_bottle}</td>
                    <td style={styles.td}>{item.gst_percentage}%</td>
                  </>
                )}
                <td style={styles.td}>
                  <button 
                    style={styles.editButton} 
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </button>
                  <button 
                    style={styles.deleteButton} 
                    onClick={() => handleDelete(item.id || item._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderForm = () => {
    const fields = Object.keys(formTemplates[activeTab]);
    
    return (
      <form onSubmit={handleSubmit} style={styles.form}>
        {fields.map(field => {
          if (field === 'admin' && activeTab === 'salesmen') {
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>
                  <input
                    type="checkbox"
                    checked={formData[field] || false}
                    onChange={(e) => setFormData({...formData, [field]: e.target.checked})}
                  />
                  Admin
                </label>
              </div>
            );
          }
          
          if (field === 'sales_man_id' && activeTab === 'dealers') {
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>Salesman:</label>
                <select
                  value={formData[field] || ''}
                  onChange={(e) => setFormData({...formData, [field]: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Select Salesman</option>
                  {salesmen.map(salesman => (
                    <option key={salesman.id || salesman._id} value={salesman.id || salesman._id}>
                      {salesman.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          
          const fieldType = typeof formTemplates[activeTab][field] === 'number' ? 'number' : 
                           field.includes('email') ? 'email' : 'text';
          
          return (
            <div key={field} style={styles.formGroup}>
              <label style={styles.label}>
                {field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}:
              </label>
              <input
                type={fieldType}
                value={formData[field] || ''}
                onChange={(e) => setFormData({...formData, [field]: e.target.value})}
                style={styles.input}
                required={field !== 'phone' && field !== 'product_details'}
              />
            </div>
          );
        })}
        
        <div style={styles.formActions}>
          <button type="submit" style={styles.submitButton}>
            {modalType === 'create' ? 'Create' : 'Update'}
          </button>
          <button 
            type="button" 
            onClick={() => setShowModal(false)} 
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#000',
      color: '#fff',
      padding: '20px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
    },
    tabs: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '2rem',
      gap: '1rem',
    },
    tab: {
      padding: '12px 24px',
      backgroundColor: 'transparent',
      color: '#fff',
      border: '2px solid #fff',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
      transition: 'all 0.3s',
    },
    activeTab: {
      backgroundColor: '#fff',
      color: '#000',
    },
    content: {
      backgroundColor: '#fff',
      color: '#000',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
    },
    createButton: {
      backgroundColor: '#000',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      marginBottom: '1rem',
    },
    tableContainer: {
      overflowX: 'auto',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '1rem',
    },
    th: {
      backgroundColor: '#f5f5f5',
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #ddd',
      fontWeight: 'bold',
    },
    tr: {
      borderBottom: '1px solid #ddd',
    },
    td: {
      padding: '12px',
      verticalAlign: 'middle',
    },
    editButton: {
      backgroundColor: '#007bff',
      color: '#fff',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '8px',
      fontSize: '0.9rem',
    },
    deleteButton: {
      backgroundColor: '#dc3545',
      color: '#fff',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.9rem',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '12px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    label: {
      marginBottom: '0.5rem',
      fontWeight: '600',
      color: '#000',
    },
    input: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '1rem',
    },
    formActions: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'flex-end',
      marginTop: '1rem',
    },
    submitButton: {
      backgroundColor: '#000',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: '#6c757d',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
    },
    backButton: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      backgroundColor: '#fff',
      color: '#000',
      border: '2px solid #fff',
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
    },
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/home')}>
        ← Back to Home
      </button>
      
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Management</h1>
      </div>

      <div style={styles.tabs}>
        <button 
          style={{...styles.tab, ...(activeTab === 'salesmen' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('salesmen')}
        >
          Salesmen
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'dealers' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('dealers')}
        >
          Dealers
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'products' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
      </div>

      <div style={styles.content}>
        <button style={styles.createButton} onClick={handleCreate}>
          Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}
        </button>
        
        {loading ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>Loading...</div>
        ) : (
          renderTable()
        )}
      </div>

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>{modalType === 'create' ? 'Create' : 'Edit'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}</h3>
            {renderForm()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
