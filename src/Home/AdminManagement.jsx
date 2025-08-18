import React, { useState, useEffect, useCallback } from 'react';
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_API_URL}/orders/admin/${activeTab}`);
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
          default:
            console.warn(`Unknown tab: ${activeTab}`);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setModalType('create');
    setSelectedItem(null);
    setFormData(formTemplates[activeTab]);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalType('edit');
    setSelectedItem(item);
    // Exclude immutable identifiers from editable form state
    const { _id, id, __v, ...rest } = item;
    setFormData(rest);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`${SERVER_API_URL}/orders/admin/${activeTab}/${id}`, {
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
        ? `${SERVER_API_URL}/orders/admin/${activeTab}`
        : `${SERVER_API_URL}/orders/admin/${activeTab}/${selectedItem.id || selectedItem._id}`;
      const method = modalType === 'create' ? 'POST' : 'PUT';

      // Build payload without immutable id fields
      const { _id, id, __v, ...payload } = formData;

      // Optional: coerce numeric fields
      Object.keys(payload).forEach(k => {
        if (typeof formTemplates[activeTab][k] === 'number' && payload[k] !== '' && payload[k] !== null) {
          const num = Number(payload[k]);
            if (!Number.isNaN(num)) payload[k] = num;
        }
      });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
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
    container: { display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--brand-bg)', color:'var(--brand-text)' },
    header: { textAlign:'center', marginBottom:'1.25rem' },
    title: { fontSize:'1.55rem', fontWeight:700, letterSpacing:'.5px', margin:0, background:'linear-gradient(90deg,#128d3b,#2fbf62)', WebkitBackgroundClip:'text', color:'transparent' },
    tabs: { display:'flex', justifyContent:'center', gap:'.75rem', marginBottom:'1.25rem', flexWrap:'wrap' },
    tab: { padding:'.65rem 1.1rem', background:'#fff', color:'var(--brand-green-dark)', border:'1px solid var(--brand-green)', borderRadius:'var(--radius-md)', cursor:'pointer', fontSize:'.75rem', fontWeight:600, letterSpacing:'.65px', transition:'var(--transition-base)' },
    activeTab: { background:'var(--brand-green)', color:'#fff', boxShadow:'var(--brand-shadow-sm)' },
    content: { background:'var(--brand-surface)', border:'1px solid var(--brand-border)', borderRadius:'var(--radius-lg)', padding:'1.75rem 1.5rem 2rem', maxWidth:'1200px', margin:'0 auto', width:'100%', boxShadow:'var(--brand-shadow-sm)' },
    createButton: { background:'var(--brand-green)', color:'#fff', border:'1px solid var(--brand-green)', padding:'.7rem 1.2rem', borderRadius:'var(--radius-md)', fontSize:'.8rem', fontWeight:600, letterSpacing:'.5px', cursor:'pointer', boxShadow:'var(--brand-shadow-sm)', transition:'var(--transition-base)' },
    tableContainer: { overflowX:'auto', marginTop:'.5rem' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:'.75rem' },
    th: { background:'var(--brand-surface-alt)', padding:'.6rem .75rem', textAlign:'left', borderBottom:'1px solid var(--brand-border)', fontWeight:600, fontSize:'.6rem', letterSpacing:'.8px', textTransform:'uppercase', color:'var(--brand-text-soft)' },
    tr: { borderBottom:'1px solid var(--brand-border)' },
    td: { padding:'.6rem .75rem', verticalAlign:'middle' },
    editButton: { background:'var(--brand-green)', color:'#fff', border:'none', padding:'.45rem .7rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.65rem', fontWeight:600, marginRight:'.4rem' },
    deleteButton: { background:'#d83545', color:'#fff', border:'none', padding:'.45rem .7rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.65rem', fontWeight:600 },
    modal: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
    modalContent: { background:'#fff', padding:'1.75rem 1.5rem 2rem', borderRadius:'var(--radius-xl)', maxWidth:'520px', width:'95%', maxHeight:'85vh', overflow:'auto', boxShadow:'var(--brand-shadow-lg)' },
    form: { display:'flex', flexDirection:'column', gap:'.85rem', marginTop:'.75rem' },
    formGroup: { display:'flex', flexDirection:'column', gap:'.35rem' },
    label: { fontSize:'.65rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'var(--brand-text-soft)' },
    input: { padding:'.65rem .75rem', border:'1px solid var(--brand-border)', borderRadius:'var(--radius-md)', fontSize:'.75rem', background:'#fff', color:'var(--brand-text)' },
    formActions: { display:'flex', gap:'.65rem', justifyContent:'flex-end', marginTop:'.5rem' },
    submitButton: { background:'var(--brand-green)', color:'#fff', border:'1px solid var(--brand-green)', padding:'.6rem 1.15rem', borderRadius:'var(--radius-md)', cursor:'pointer', fontSize:'.7rem', fontWeight:600, letterSpacing:'.5px' },
    cancelButton: { background:'#6c757d', color:'#fff', border:'1px solid #6c757d', padding:'.6rem 1.15rem', borderRadius:'var(--radius-md)', cursor:'pointer', fontSize:'.7rem', fontWeight:600 },
    backButton: { position:'absolute', top:'18px', left:'18px', background:'var(--brand-green)', color:'#fff', border:'1px solid var(--brand-green)', padding:'.55rem .95rem', borderRadius:'var(--radius-md)', cursor:'pointer', fontSize:'.65rem', fontWeight:600, letterSpacing:'.5px', boxShadow:'var(--brand-shadow-sm)' },
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
          Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
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
