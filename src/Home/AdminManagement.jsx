import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { formatINR } from './numberFormat';

const AdminManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('salesmen');
  const [salesmen, setSalesmen] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [directors, setDirectors] = useState([]);
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
  // NEW: form error for duplicate validation
  const [formError, setFormError] = useState('');
  // For Sales Manager team multi-select UI
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const pretty = (t) => (t || '').replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());

  // Reset filters when tab changes
  useEffect(() => { 
    setFilters({}); 
    setFilterSelections({}); 
    setOpenFilter(null);
    setTeamDropdownOpen(false);
    setTeamSearch('');
  }, [activeTab]);

  useEffect(() => {
    if (openFilter) {
      setTempSelection(filterSelections[openFilter] ? [...filterSelections[openFilter]] : []);
      setFilterSearch('');
    }
  }, [openFilter, filterSelections]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('.excel-filter-dropdown') && !e.target.closest('.excel-filter-trigger')) {
        setOpenFilter(null);
      }
      if (!e.target.closest('.team-multi-select')) {
        setTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Form templates for different entities
  const formTemplates = {
    salesmen: {
      name: '',
      email: '',
      phone: '',
      state: '',
  role: 'salesman',
      admin: false,
      sales_manager: '',
      active: true
    },
  // Show state first and add salesmen_ids for team linkage
  sales_managers: { state:'', name:'', email:'', phone:'', salesmen_ids:[], active:true },
  directors: { name:'', email:'', phone:'', active:true },
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
          case 'sales_managers':
            setSalesManagers(data);
            break;
          case 'directors':
            setDirectors(data);
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

  // Ensure salesmen list is available for dealers/manager forms and team display
  useEffect(() => {
    const loadSalesmen = async () => {
      try {
        const resp = await fetch(`${SERVER_API_URL}/orders/admin/salesmen`);
        if (resp.ok) {
          const data = await resp.json();
          setSalesmen(data);
        }
      } catch (e) { console.error('Error preloading salesmen:', e); }
    };
    // Preload when viewing tabs that depend on salesmen or on initial mount
    if (activeTab === 'sales_managers' || activeTab === 'dealers') {
      loadSalesmen();
    }
  }, [activeTab]);

  const handleCreate = () => {
    setModalType('create');
    setSelectedItem(null);
    setFormData(formTemplates[activeTab]);
    setFormError('');
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalType('edit');
    setSelectedItem(item);
    const { _id, id, __v, ...rest } = item;
    // Merge defaults to ensure new fields like salesmen_ids exist
    setFormData({ ...formTemplates[activeTab], ...rest });
    setFormError('');
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

  const normalize = (v) => (v ?? '').toString().trim().toLowerCase();

  const hasDuplicate = () => {
    const currentId = selectedItem && (selectedItem.id || selectedItem._id);
    const list = activeTab === 'salesmen' ? salesmen 
      : activeTab === 'sales_managers' ? salesManagers
      : activeTab === 'directors' ? directors
      : activeTab === 'dealers' ? dealers : products;
    const others = list.filter(x => (x.id || x._id) !== currentId);

    if (activeTab === 'salesmen') {
      const email = normalize(formData.email);
      if (email && others.some(x => normalize(x.email) === email)) {
        setFormError('A salesman with this email already exists.');
        return true;
      }
      const phone = normalize(formData.phone);
      if (phone && others.some(x => normalize(x.phone) === phone)) {
        setFormError('A salesman with this phone already exists.');
        return true;
      }
      return false;
    }

    if (activeTab === 'sales_managers') {
      // Do not block on email duplicates for Sales Managers
      const phone = normalize(formData.phone);
      if (phone && others.some(x => normalize(x.phone) === phone)) {
        setFormError(`An entry with this phone already exists.`);
        return true;
      }
      return false;
    }

    if (activeTab === 'directors') {
      const email = normalize(formData.email);
      if (email && others.some(x => normalize(x.email) === email)) {
        setFormError(`An entry with this email already exists.`);
        return true;
      }
      const phone = normalize(formData.phone);
      if (phone && others.some(x => normalize(x.phone) === phone)) {
        setFormError(`An entry with this phone already exists.`);
        return true;
      }
      return false;
    }

    if (activeTab === 'dealers') {
      const name = normalize(formData.name);
      const state = normalize(formData.state);
      if (name && others.some(x => normalize(x.name) === name && normalize(x.state) === state)) {
        setFormError('A dealer with this name already exists in the selected state.');
        return true;
      }
      const phone = normalize(formData.phone);
      if (phone && others.some(x => normalize(x.phone) === phone)) {
        setFormError('A dealer with this phone already exists.');
        return true;
      }
      return false;
    }

    // products
    const pname = normalize(formData.name);
    const psize = normalize(formData.packing_size);
    if (pname && others.some(x => normalize(x.name) === pname && normalize(x.packing_size) === psize)) {
      setFormError('A product with this name and packing size already exists.');
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    // Special merge logic for Sales Managers: if creating and a manager already exists (by email/name),
    // merge the team into the existing record instead of creating a new one (preserve original state).
    if (activeTab === 'sales_managers' && modalType === 'create') {
      const norm = (v) => (v ?? '').toString().trim().toLowerCase();
      const email = norm(formData.email);
      const name = norm(formData.name);
      const phone = norm(formData.phone);
      const existing = (salesManagers || []).find(x => {
        const xe = norm(x.email);
        const xn = norm(x.name);
        const xp = norm(x.phone);
        return (email && xe === email) || (phone && xp === phone) || (!email && !phone && name && xn === name);
      });
      if (existing) {
        try {
          const id = existing.id || existing._id;
          const exIds = Array.isArray(existing.salesmen_ids) ? existing.salesmen_ids.map(String) : [];
          const newIds = Array.isArray(formData.salesmen_ids) ? formData.salesmen_ids.map(String) : [];
          const mergedIds = Array.from(new Set([...exIds, ...newIds]));
          const { _id, id: rid, __v, ...restExisting } = existing;
          const putPayload = { ...restExisting, salesmen_ids: mergedIds };
          // Normalize numeric fields according to template types
          Object.keys(putPayload).forEach(k => {
            if (typeof formTemplates[activeTab][k] === 'number' && putPayload[k] !== '' && putPayload[k] !== null) {
              const num = Number(putPayload[k]);
              if (!Number.isNaN(num)) putPayload[k] = num;
            }
          });
          const url = `${SERVER_API_URL}/orders/admin/${activeTab}/${id}`;
          const response = await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(putPayload) });
          if (response.ok) {
            setShowModal(false);
            fetchData();
          } else {
            const errorText = await response.text();
            console.error('Merge update failed:', response.status, errorText);
            setFormError('Save failed. Please try again.');
          }
        } catch (err) {
          console.error('Error merging manager team:', err);
          setFormError('Unexpected error. Please try again.');
        }
        return; // stop normal create flow
      }
    }
    // Duplicate guard (after merge handling)
    if (hasDuplicate()) return;
    try {
      const url = modalType === 'create' 
        ? `${SERVER_API_URL}/orders/admin/${activeTab}`
        : `${SERVER_API_URL}/orders/admin/${activeTab}/${selectedItem.id || selectedItem._id}`;
      const method = modalType === 'create' ? 'POST' : 'PUT';
      const { _id, id, __v, ...payload } = formData;
      Object.keys(payload).forEach(k => {
        if (typeof formTemplates[activeTab][k] === 'number' && payload[k] !== '' && payload[k] !== null) {
          const num = Number(payload[k]);
          if (!Number.isNaN(num)) payload[k] = num;
        }
      });
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        setFormError('Save failed. Please try again.');
      }
    } catch (error) {
      console.error(`Error ${modalType === 'create' ? 'creating' : 'updating'} ${activeTab.slice(0, -1)}:`, error);
      setFormError('Unexpected error. Please try again.');
    }
  };

  const renderTable = () => {
    let data, columnConfig;
    // Define column configs with field mapping & type
    const configs = {
      salesmen: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Role', field:'role', type:'text' }, { label:'Admin', field:'admin', type:'boolean' }, { label:'Sales Manager', field:'sales_manager', type:'text' } ],
      // Add Team column (non-filterable) for managers
      sales_managers: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Team', field:'salesmen_ids', type:'team' } ],
      directors: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' } ],
      dealers: [ { label:'Name', field:'name', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Credit Limit', field:'credit_limit', type:'number' } ],
      products: [ { label:'Name', field:'name', type:'text' }, { label:'Category', field:'category', type:'text' }, { label:'Packing Size', field:'packing_size', type:'text' }, { label:'Price per Bottle', field:'dealer_price_per_bottle', type:'number' }, { label:'GST %', field:'gst_percentage', type:'number' } ]
    };
    switch (activeTab) { 
      case 'salesmen': data = salesmen; columnConfig = configs.salesmen; break; 
      case 'sales_managers': data = salesManagers; columnConfig = configs.sales_managers; break;
      case 'directors': data = directors; columnConfig = configs.directors; break;
      case 'dealers': data = dealers; columnConfig = configs.dealers; break; 
      case 'products': data = products; columnConfig = configs.products; break; 
      default: return null; 
    }

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
  <h4 style={styles.sectionTitle}>Active {pretty(activeTab)}</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              {columnConfig.map(c => {
                const active = filterSelections[c.field] && filterSelections[c.field].length > 0;
                const values = c.type === 'team' ? [] : (openFilter === c.field ? getUniqueValues(c.field) : []);
                const filteredValues = values.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
                return (
                  <th key={c.field} style={styles.th}>
                    <div style={styles.headerCell}>
                      <span>{c.label}</span>
                      {c.type !== 'team' && (
                        <button type="button" className="excel-filter-trigger" style={{ ...styles.filterTrigger, ...(active ? styles.filterTriggerActive : {}) }} onClick={() => setOpenFilter(o => o === c.field ? null : c.field)} title={active ? 'Modify filter' : 'Filter'}>▼</button>
                      )}
                    </div>
                    {openFilter === c.field && c.type !== 'team' && (
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
                  if (c.field === 'credit_limit') display = `₹${formatINR(display, { decimals: 0 })}`;
                  if (c.field === 'admin') display = item.admin ? 'Yes' : 'No';
                  if (c.field === 'role') display = item.role || (item.admin ? 'admin' : 'salesman');
                  if (c.field === 'dealer_price_per_bottle') display = `₹${display}`;
                  if (c.field === 'gst_percentage') display = `${display}%`;
                  if (c.type === 'team') {
                    const ids = Array.isArray(item.salesmen_ids) ? item.salesmen_ids : [];
                    const map = new Map((salesmen || []).map(s => [String(s.id || s._id), s.name]));
                    const names = ids.map(id => map.get(String(id))).filter(Boolean);
                    const shown = names.slice(0, 3);
                    const extra = names.length - shown.length;
                    return (
                      <td key={c.field} style={styles.td}>
                        <div style={styles.chipsWrap}>
                          {shown.map(n => <span key={n} style={styles.chip}>{n}</span>)}
                          {extra > 0 && <span style={styles.chipMuted}>+{extra}</span>}
                          {names.length === 0 && <span style={{ color: 'var(--brand-text-soft)' }}>—</span>}
                        </div>
                      </td>
                    );
                  }
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
    if (activeTab === 'salesmen') data = salesmen; 
    else if (activeTab === 'sales_managers') data = salesManagers;
    else if (activeTab === 'directors') data = directors;
    else if (activeTab === 'dealers') data = dealers; 
  else if (activeTab === 'products') data = products;
    const inactive = data.filter(it => it.active === false);
    if (inactive.length === 0) return null;
  const cols = { 
    salesmen:['Name','Email','Phone','State','Role','Admin','Sales Manager'], 
    sales_managers:['Name','Email','Phone','State','Team'], 
    directors:['Name','Email','Phone'], 
    dealers:['Name','Phone','State','Credit Limit'], 
    products:['Name','Category','Packing Size','Price per Bottle','GST %'] 
  }[activeTab];
    return (
      <div style={{ marginTop:'2rem' }}>
  <h4 style={styles.sectionTitle}>Inactive {pretty(activeTab)}</h4>
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
                  <td style={styles.td}>{item.role || (item.admin ? 'admin' : 'salesman')}</td>
                  <td style={styles.td}>{item.admin ? 'Yes':'No'}</td>
                  <td style={styles.td}>{item.sales_manager || 'N/A'}</td>
                </>)}
                {activeTab === 'dealers' && (<>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.phone || 'N/A'}</td>
                  <td style={styles.td}>{item.state || 'N/A'}</td>
                  <td style={styles.td}>₹{formatINR(item.credit_limit, { decimals: 0 })}</td>
                </>)}
                {activeTab === 'sales_managers' && (<>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.email}</td>
                  <td style={styles.td}>{item.phone || 'N/A'}</td>
                  <td style={styles.td}>{item.state || 'N/A'}</td>
                  <td style={styles.td}>
                    {(() => {
                      const ids = Array.isArray(item.salesmen_ids) ? item.salesmen_ids : [];
                      const map = new Map((salesmen || []).map(s => [String(s.id || s._id), s.name]));
                      const names = ids.map(id => map.get(String(id))).filter(Boolean);
                      const shown = names.slice(0, 3);
                      const extra = names.length - shown.length;
                      return (
                        <div style={styles.chipsWrap}>
                          {shown.map(n => <span key={n} style={styles.chip}>{n}</span>)}
                          {extra > 0 && <span style={styles.chipMuted}>+{extra}</span>}
                          {names.length === 0 && <span style={{ color: 'var(--brand-text-soft)' }}>—</span>}
                        </div>
                      );
                    })()}
                  </td>
                </>)}
                {activeTab === 'directors' && (<>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.email}</td>
                  <td style={styles.td}>{item.phone || 'N/A'}</td>
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
    const selectedState = (formData && formData.state) ? String(formData.state).toLowerCase() : '';
    // Salesmen filtered by selected state for manager team assignment
    const salesmenInState = (salesmen || [])
      .filter(s => (s.active !== false))
      .filter(s => selectedState ? String(s.state || '').toLowerCase() === selectedState : true)
      .sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, { sensitivity:'base' }));
    // Sales managers available from salesmen table (role-based, no state dependency)
    const managersFromSalesmen = (salesmen || [])
      .filter(s => (s.active !== false))
      .filter(s => (s.role || (s.admin ? 'admin' : 'salesman')) === 'sales_manager')
      .sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, { sensitivity:'base' }));
    // Unique list of states from salesmen for dropdown
    const salesmenStates = Array.from(new Set(
      (salesmen || [])
        .map(s => (s.state || '').toString().trim())
        .filter(Boolean)
    )).sort((a,b)=> a.localeCompare(b, undefined, { sensitivity:'base' }));
    const currentTeam = Array.isArray(formData.salesmen_ids) ? formData.salesmen_ids.map(String) : [];
    const toggleTeamMember = (id) => {
      const sid = String(id);
      setFormData(prev => ({
        ...prev,
        salesmen_ids: currentTeam.includes(sid)
          ? currentTeam.filter(x => x !== sid)
          : [...currentTeam, sid]
      }));
    };
    
    return (
      <form onSubmit={handleSubmit} style={styles.form}>
        {formError && <div style={styles.errorText}>{formError}</div>}
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

          if (field === 'role' && activeTab === 'salesmen') {
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>Role:</label>
                <select
                  value={formData[field] || 'salesman'}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  style={styles.input}
                  required
                >
                  <option value="salesman">Salesman</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            );
          }

          // Team assignment for Sales Managers
          if (activeTab === 'sales_managers' && field === 'salesmen_ids') {
            const selectedNames = currentTeam
              .map(id => (salesmen || []).find(s => String(s.id || s._id) === String(id)))
              .filter(Boolean)
              .map(s => s.name);
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>Salesmen (filtered by State):</label>
                <div style={{ ...styles.multiSelectContainer, ...(selectedState ? {} : { opacity:.7 }) }} className="team-multi-select">
                  <div style={styles.multiSelectDisplay} onClick={() => setTeamDropdownOpen(o => !o)}>
                    {selectedNames.length === 0 && (
                      <span style={{ color: 'var(--brand-text-soft)' }}>
                        {selectedState ? 'Select salesmen' : 'Select state first'}
                      </span>
                    )}
                    {selectedNames.length > 0 && (
                      <div style={styles.chipsWrap}>
                        {selectedNames.slice(0, 3).map(n => <span key={n} style={styles.chip}>{n}</span>)}
                        {selectedNames.length > 3 && <span style={styles.chipMuted}>+{selectedNames.length - 3}</span>}
                      </div>
                    )}
                    <span style={styles.caret}>▼</span>
                  </div>
                  {teamDropdownOpen && selectedState && (
                    <div style={styles.multiSelectDropdown} className="excel-filter-dropdown">
                      <input
                        placeholder="Search salesmen..."
                        value={teamSearch}
                        onChange={e => setTeamSearch(e.target.value)}
                        style={styles.filterSearch}
                      />
                      <div style={styles.filterValues}>
                        {salesmenInState
                          .filter(s => (s.name || '').toLowerCase().includes(teamSearch.toLowerCase()))
                          .map(s => {
                            const sid = String(s.id || s._id);
                            const checked = currentTeam.includes(sid);
                            return (
                              <label key={sid} style={styles.filterValueRow}>
                                <input type="checkbox" checked={checked} onChange={() => toggleTeamMember(sid)} />
                                <span style={styles.filterValueText}>{s.name}</span>
                              </label>
                            );
                          })}
                        {salesmenInState.length === 0 && (
                          <div style={styles.noValues}>No salesmen found for selected state.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // State dropdown for Sales Managers with 'Others' option
          if (activeTab === 'sales_managers' && field === 'state') {
            const current = (formData.state || '').toString();
            const match = salesmenStates.find(s => s.toLowerCase() === current.toLowerCase());
            const selectValue = current === '' ? '' : (match ? match : '__other__');
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>State:</label>
                <select
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__other__') {
                      setTeamDropdownOpen(false);
                      setTeamSearch('');
                      // keep existing custom state if any, just clear team
                      setFormData(prev => ({ ...prev, salesmen_ids: [] }));
                    } else {
                      setTeamDropdownOpen(false);
                      setTeamSearch('');
                      setFormData(prev => ({ ...prev, state: v, salesmen_ids: [] }));
                    }
                  }}
                  style={styles.input}
                  required
                >
                  <option value="">Select State</option>
                  {salesmenStates.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__other__">Others</option>
                </select>
                {selectValue === '__other__' && (
                  <input
                    placeholder="Enter state"
                    value={formData.state || ''}
                    onChange={(e) => {
                      setTeamDropdownOpen(false);
                      setTeamSearch('');
                      setFormData(prev => ({ ...prev, state: e.target.value, salesmen_ids: [] }));
                    }}
                    style={{ ...styles.input, marginTop: '.5rem' }}
                    required
                  />
                )}
              </div>
            );
          }

          // Name dropdown for Sales Managers (from salesmen in selected state)
          if (activeTab === 'sales_managers' && field === 'name') {
            const selectedId = (() => {
              const match = managersFromSalesmen.find(s => (s.name || '') === (formData.name || ''));
              return match ? String(match.id || match._id) : '';
            })();
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>Sales Manager Name:</label>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    if (!sid) {
                      setFormData(prev => ({ ...prev, name:'', email:'', phone:'' }));
                      return;
                    }
                    const s = managersFromSalesmen.find(x => String(x.id || x._id) === String(sid));
                    if (s) {
                      setFormData(prev => ({ ...prev, name: s.name || '', email: s.email || '', phone: s.phone || '' }));
                    }
                  }}
                  style={styles.input}
                  required
                  disabled={managersFromSalesmen.length === 0}
                >
                  <option value="">Select Sales Manager</option>
                  {managersFromSalesmen.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
                  ))}
                </select>
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
          
          // Only show sales_manager for salesmen
          if (field === 'sales_manager' && activeTab !== 'salesmen') return null;
          // Hide 'active' from all create/edit forms; managed via Activate/Deactivate in tables
          if (field === 'active') return null;
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
                onChange={(e) => {
                  // Clear team when state changes
                  if (activeTab === 'sales_managers' && field === 'state') {
                    setTeamDropdownOpen(false);
                    setTeamSearch('');
                    setFormData({ ...formData, state: e.target.value, salesmen_ids: [] });
                  } else {
                    setFormData({ ...formData, [field]: e.target.value });
                  }
                }}
                style={styles.input}
                required={!['phone','product_details','sales_manager'].includes(field)}
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
    sectionTitle: { fontSize:'.85rem', fontWeight:600, margin:'1rem 0 .5rem', color:'var(--brand-text)' },
  errorText: { color:'#d83545', background:'#fdecee', border:'1px solid #f7c2c7', padding:'.5rem .65rem', borderRadius:'6px', fontSize:'.72rem' },
  // Chips and multi-select styles
  chipsWrap: { display:'flex', gap:'.3rem', flexWrap:'wrap' },
  chip: { background:'var(--brand-surface-alt)', border:'1px solid var(--brand-border)', borderRadius:'999px', padding:'.15rem .5rem', fontSize:'.65rem', color:'var(--brand-text)' },
  chipMuted: { background:'#e9f7ef', border:'1px solid #cdeed8', borderRadius:'999px', padding:'.15rem .5rem', fontSize:'.65rem', color:'#128d3b' },
  multiSelectContainer: { position:'relative' },
  multiSelectDisplay: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.5rem', minHeight:'38px', padding:'.45rem .6rem', border:'1px solid var(--brand-border)', borderRadius:'var(--radius-md)', cursor:'pointer', background:'#fff' },
  caret: { fontSize:'.6rem', color:'var(--brand-text-soft)' },
  multiSelectDropdown: { position:'absolute', top:'100%', left:0, right:0, zIndex:60, background:'#fff', border:'1px solid var(--brand-border)', borderRadius:'6px', boxShadow:'0 8px 20px rgba(0,0,0,0.12)', padding:'.5rem', marginTop:'.35rem' }
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
          style={{...styles.tab, ...(activeTab === 'sales_managers' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('sales_managers')}
        >
          Sales Managers
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'directors' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('directors')}
        >
          Directors
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
          {(() => {
            const singular = { salesmen: 'Salesman', sales_managers: 'Sales Manager', directors: 'Director', dealers: 'Dealer', products: 'Product' }[activeTab] || pretty(activeTab);
            return `Add New ${singular}`;
          })()}
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
            {(() => { const singular = { salesmen: 'Salesman', sales_managers:'Sales Manager', directors:'Director', dealers: 'Dealer', products: 'Product' }[activeTab] || activeTab; return (
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
