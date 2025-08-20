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
  const [sortAsc, setSortAsc] = useState(true);
  // NEW: per-column filters state
  const [filters, setFilters] = useState({}); // legacy (kept if needed)
  // NEW excel-style filter state
  const [filterSelections, setFilterSelections] = useState({}); // { field: [values] }
  const [openFilter, setOpenFilter] = useState(null); // current column field
  const [tempSelection, setTempSelection] = useState([]); // working selection for open dropdown
  const [filterSearch, setFilterSearch] = useState('');

  // Reset filters when tab changes
  useEffect(() => { setFilters({}); setFilterSelections({}); setOpenFilter(null); }, [activeTab]);

  useEffect(() => {
    if (openFilter) {
      setTempSelection(filterSelections[openFilter] ? [...filterSelections[openFilter]] : []);
      setFilterSearch('');
    }
  }, [openFilter, filterSelections]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('.excel-filter-dropdown') && !e.target.closest('.excel-filter-trigger')) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Form templates for different entities
  const formTemplates = {
    salesmen: { name:'', email:'', phone:'', state:'', admin:false, active:true },
    dealers: { name:'', phone:'', state:'', sales_man_id:'', credit_limit:100000, active:true },
    products: { name:'', category:'', packing_size:'', bottles_per_case:1, bottle_volume:'', moq:'', dealer_price_per_bottle:0, gst_percentage:18, billing_price_per_bottle:0, mrp_per_bottle:0, product_details:'', active:true }
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
    setFormData(formTemplates[activeTab]); // includes active:true
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

  const toggleActive = async (item, next) => {
    try {
      const id = item.id || item._id;
      const url = `${SERVER_API_URL}/orders/admin/${activeTab}/${id}`;
      // Build full payload (safer for backends expecting all fields)
      const { _id, id:rid, __v, ...rest } = item;
      const payload = { ...rest, active: next };
      const response = await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        fetchData();
      } else {
        console.error('Failed to toggle active');
      }
    } catch (e) { console.error('Error toggling active:', e); }
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
    let data, columnConfig;
    // Define column configs with field mapping & type
    const configs = {
      salesmen: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Admin', field:'admin', type:'boolean' } ],
      dealers: [ { label:'Name', field:'name', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Credit Limit', field:'credit_limit', type:'number' } ],
      products: [ { label:'Name', field:'name', type:'text' }, { label:'Category', field:'category', type:'text' }, { label:'Packing Size', field:'packing_size', type:'text' }, { label:'Price per Bottle', field:'dealer_price_per_bottle', type:'number' }, { label:'GST %', field:'gst_percentage', type:'number' } ]
    };
    switch (activeTab) { case 'salesmen': data = salesmen; columnConfig = configs.salesmen; break; case 'dealers': data = dealers; columnConfig = configs.dealers; break; case 'products': data = products; columnConfig = configs.products; break; default: return null; }

    const activeData = data.filter(it => it.active !== false); // treat undefined as active

    // Build sequential filtering like Excel: apply all active filters
    const filteredData = activeData.filter(item => {
      return Object.entries(filterSelections).every(([field, selected]) => {
        if (!selected || selected.length === 0) return true;
        const raw = item[field];
        const valStr = field === 'admin' ? (raw ? 'Yes' : 'No') : String(raw ?? '');
        return selected.includes(valStr);
      });
    });

    // Sort by name
    const sortedData = [...filteredData].sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, { sensitivity:'base' }));
    if (!sortAsc) sortedData.reverse();

    // Helper to get unique values for a field based on current filters excluding that field (Excel behavior)
    const getUniqueValues = field => {
      const partialFiltered = activeData.filter(item => {
        return Object.entries(filterSelections).every(([f, sel]) => {
          if (f === field) return true; // ignore current field
          if (!sel || sel.length === 0) return true;
          const raw = item[f];
          const valStr = f === 'admin' ? (raw ? 'Yes' : 'No') : String(raw ?? '');
          return sel.includes(valStr);
        });
      });
      const set = new Set();
      partialFiltered.forEach(it => { const raw = it[field]; const valStr = field === 'admin' ? (raw ? 'Yes' : 'No') : String(raw ?? ''); set.add(valStr); });
      return Array.from(set).sort((a,b)=>a.localeCompare(b, undefined, { sensitivity:'base' }));
    };

    const toggleTemp = (value) => {
      setTempSelection(prev => prev.includes(value) ? prev.filter(v=>v!==value) : [...prev, value]);
    };

    const applyFilter = (field) => {
      setFilterSelections(prev => ({ ...prev, [field]: [...tempSelection] }));
      setOpenFilter(null);
    };

    const clearFilter = (field) => {
      setFilterSelections(prev => ({ ...prev, [field]: [] }));
      setTempSelection([]);
      setOpenFilter(null);
    };

    return (
      <div style={styles.tableContainer}>
        <h4 style={styles.sectionTitle}>Active {activeTab.charAt(0).toUpperCase()+activeTab.slice(1)}</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              {columnConfig.map(c => {
                const active = filterSelections[c.field] && filterSelections[c.field].length > 0;
                const values = openFilter === c.field ? getUniqueValues(c.field) : [];
                const filteredValues = values.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
                return (
                  <th key={c.field} style={styles.th}>
                    <div style={styles.headerCell}>
                      <span>{c.label}</span>
                      <button type="button" className="excel-filter-trigger" style={{ ...styles.filterTrigger, ...(active ? styles.filterTriggerActive : {}) }} onClick={() => setOpenFilter(o => o === c.field ? null : c.field)} title={active ? 'Modify filter' : 'Filter'}>▼</button>
                    </div>
                    {openFilter === c.field && (
                      <div className="excel-filter-dropdown" style={styles.filterDropdown}>
                        <div style={styles.filterSearchWrap}><input style={styles.filterSearch} placeholder="Search..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} /></div>
                        <div style={styles.filterValues}>
                          <label style={styles.filterValueRow}>
                            <input type="checkbox" checked={filteredValues.length>0 && filteredValues.every(v => tempSelection.includes(v))} onChange={(e)=> { if (e.target.checked) { setTempSelection(prev => Array.from(new Set([...prev, ...filteredValues])));} else { setTempSelection(prev => prev.filter(v => !filteredValues.includes(v))); } }} />
                            <span style={styles.filterValueText}>Select All</span>
                          </label>
                          {filteredValues.map(v => (
                            <label key={v} style={styles.filterValueRow}>
                              <input type="checkbox" checked={tempSelection.includes(v)} onChange={()=>setTempSelection(prev => prev.includes(v)? prev.filter(x=>x!==v): [...prev, v])} />
                              <span style={styles.filterValueText}>{v === '' ? '(Blank)' : v}</span>
                            </label>
                          ))}
                          {filteredValues.length === 0 && <div style={styles.noValues}>No values</div>}
                        </div>
                        <div style={styles.filterActionsBar}>
                          <button type="button" style={styles.smallBtn} onClick={()=>{ setFilterSelections(prev => ({ ...prev, [c.field]: [...tempSelection] })); setOpenFilter(null); }}>Apply</button>
                          <button type="button" style={styles.smallBtnSecondary} onClick={()=>{ setFilterSelections(prev => ({ ...prev, [c.field]: [] })); setTempSelection([]); setOpenFilter(null); }}>Clear</button>
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(item => (
              <tr key={item.id || item._id} style={styles.tr}>
                {columnConfig.map(c => {
                  let display = item[c.field];
                  if (c.field === 'credit_limit') display = `₹${(display ?? 0).toLocaleString()}`;
                  if (c.field === 'admin') display = item.admin ? 'Yes' : 'No';
                  if (c.field === 'dealer_price_per_bottle') display = `₹${display}`;
                  if (c.field === 'gst_percentage') display = `${display}%`;
                  return <td key={c.field} style={styles.td}>{display ?? 'N/A'}</td>;
                })}
                <td style={styles.td}>
                  <button style={styles.editButton} onClick={() => handleEdit(item)}>Edit</button>
                  <button style={styles.deactivateButton} onClick={() => toggleActive(item, false)}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInactiveSection = () => {
    let data = [];
    if (activeTab === 'salesmen') data = salesmen; else if (activeTab === 'dealers') data = dealers; else if (activeTab === 'products') data = products;
    const inactive = data.filter(it => it.active === false);
    if (inactive.length === 0) return null;
    const cols = { salesmen:['Name','Email','Phone','State','Admin'], dealers:['Name','Phone','State','Credit Limit'], products:['Name','Category','Packing Size','Price per Bottle','GST %'] }[activeTab];
    return (
      <div style={{ marginTop:'2rem' }}>
        <h4 style={styles.sectionTitle}>Inactive {activeTab.charAt(0).toUpperCase()+activeTab.slice(1)}</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              {cols.map(h => <th key={h} style={styles.th}>{h}</th>)}
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inactive.map(item => (
              <tr key={item.id || item._id} style={styles.tr}>
                {activeTab === 'salesmen' && (<>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.email}</td>
                  <td style={styles.td}>{item.phone || 'N/A'}</td>
                  <td style={styles.td}>{item.state || 'N/A'}</td>
                  <td style={styles.td}>{item.admin ? 'Yes':'No'}</td>
                </>)}
                {activeTab === 'dealers' && (<>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.phone || 'N/A'}</td>
                  <td style={styles.td}>{item.state || 'N/A'}</td>
                  <td style={styles.td}>₹{item.credit_limit?.toLocaleString()}</td>
                </>)}
                {activeTab === 'products' && (<>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.category}</td>
                  <td style={styles.td}>{item.packing_size}</td>
                  <td style={styles.td}>₹{item.dealer_price_per_bottle}</td>
                  <td style={styles.td}>{item.gst_percentage}%</td>
                </>)}
                <td style={styles.td}>
                  <button style={styles.activateButton} onClick={() => toggleActive(item, true)}>Activate</button>
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
    th: { background:'var(--brand-surface-alt)', padding:'.6rem .75rem', textAlign:'left', borderBottom:'1px solid var(--brand-border)', fontWeight:600, fontSize:'.6rem', letterSpacing:'.8px', textTransform:'uppercase', color:'var(--brand-text-soft)', position:'relative' },
    tr: { borderBottom:'1px solid var(--brand-border)' },
    td: { padding:'.6rem .75rem', verticalAlign:'middle' },
    editButton: { background:'var(--brand-green)', color:'#fff', border:'none', padding:'.45rem .7rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.65rem', fontWeight:600, marginRight:'.4rem' },
    deactivateButton: { background:'#ff9800', color:'#fff', border:'none', padding:'.45rem .7rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.65rem', fontWeight:600 },
    activateButton: { background:'#17a2b8', color:'#fff', border:'none', padding:'.45rem .7rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.65rem', fontWeight:600 },
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
    sortButton: { background:'#0f7030', color:'#fff', border:'1px solid #0f7030', padding:'.7rem 1.1rem', borderRadius:'var(--radius-md)', fontSize:'.7rem', fontWeight:600, cursor:'pointer', marginLeft:'.6rem' },
    // NEW styles for excel filter
    headerCell: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.4rem' },
    filterTrigger: { background:'#fff', border:'1px solid var(--brand-border)', borderRadius:'3px', padding:'0 .25rem', fontSize:'.55rem', cursor:'pointer', lineHeight:1.4, color:'var(--brand-text-soft)' },
    filterTriggerActive: { background:'var(--brand-green)', color:'#fff', borderColor:'var(--brand-green)' },
    filterDropdown: { position:'absolute', top:'100%', marginTop:'.25rem', right:0, zIndex:50, background:'#fff', border:'1px solid var(--brand-border)', borderRadius:'4px', minWidth:'190px', boxShadow:'0 4px 12px rgba(0,0,0,0.12)', padding:'.5rem', display:'flex', flexDirection:'column', gap:'.5rem' },
    filterSearchWrap: { },
    filterSearch: { width:'100%', padding:'.35rem .45rem', fontSize:'.6rem', border:'1px solid var(--brand-border)', borderRadius:'3px' },
    filterValues: { maxHeight:'180px', overflowY:'auto', border:'1px solid var(--brand-border)', borderRadius:'3px', padding:'.35rem', display:'flex', flexDirection:'column', gap:'.25rem', background:'#fafafa' },
    filterValueRow: { display:'flex', gap:'.4rem', alignItems:'center', fontSize:'.6rem', cursor:'pointer' },
    filterValueText: { },
    noValues: { fontSize:'.55rem', color:'var(--brand-text-soft)', textAlign:'center', padding:'.35rem 0' },
    filterActionsBar: { display:'flex', justifyContent:'flex-end', gap:'.4rem' },
    smallBtn: { background:'var(--brand-green)', color:'#fff', border:'1px solid var(--brand-green)', borderRadius:'3px', padding:'.35rem .55rem', fontSize:'.55rem', cursor:'pointer', fontWeight:600 },
    smallBtnSecondary: { background:'#6c757d', color:'#fff', border:'1px solid #6c757d', borderRadius:'3px', padding:'.35rem .55rem', fontSize:'.55rem', cursor:'pointer', fontWeight:600 },
    sectionTitle: { fontSize:'.85rem', fontWeight:600, margin:'1rem 0 .5rem', color:'var(--brand-text)' }
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
        <button
          style={styles.sortButton}
          onClick={() => setSortAsc(prev => !prev)}
          title={`Sort ${sortAsc ? 'Z-A' : 'A-Z'}`}
        >
          Sort {sortAsc ? 'A-Z' : 'Z-A'}
        </button>
        
        {loading ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>Loading...</div>
        ) : (
          <>
            {renderTable()}
            {renderInactiveSection()}
          </>
        )}
      </div>

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            {(() => { const singular = { salesmen: 'Salesman', dealers: 'Dealer', products: 'Product' }[activeTab] || activeTab; return (
              <h3>{modalType === 'create' ? 'Create' : 'Edit'} {singular}</h3>
            ); })()}
            {renderForm()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
