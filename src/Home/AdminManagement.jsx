import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_API_URL } from '../Auth/APIConfig';
import { formatINR } from './numberFormat';
import AppHeader from '../components/AppHeader';
import StateDropdown from '../components/StateDropdown';
import { INDIAN_STATES } from '../constants/indianStates';

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
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const pretty = (t) => (t || '').replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());

  // Reset filters and search when tab changes
  useEffect(() => { 
    setFilters({}); 
    setFilterSelections({}); 
    setOpenFilter(null);
    setTeamDropdownOpen(false);
    setTeamSearch('');
    setSearchQuery('');
  }, [activeTab]);

  // Helper function to find sales manager for a given state
  const findSalesManagerForState = (state) => {
    console.log('Looking for sales manager for state:', state);
    console.log('Available sales managers:', salesManagers.map(sm => ({ name: sm.name, state: sm.state, active: sm.active })));
    const found = salesManagers.find(sm => sm.state === state && sm.active !== false);
    console.log('Found sales manager:', found);
    return found;
  };

  // Debug function to show current state-manager mapping
  const showStateMappings = () => {
    const mappings = {};
    salesManagers.forEach(sm => {
      if (sm.active !== false) {
        mappings[sm.state] = sm.name;
      }
    });
    console.log('Current State → Sales Manager mappings:', mappings);
    return mappings;
  };

  useEffect(() => {
    if (openFilter) {
      setTempSelection(filterSelections[openFilter] ? [...filterSelections[openFilter]] : []);
      setFilterSearch('');
    }
  }, [openFilter, filterSelections]);

  // Prevent horizontal scrolling on the entire page
  useEffect(() => {
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = 'auto';
    };
  }, []);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    products: { name:'', category:'', packing_size:'', quantity_per_case:1, bottle_volume:'', moq:'', dealer_price_per_bottle:0, gst_percentage:18, billing_price__unit:0, mrp_per_unit:0, product_details:'', active:true }
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
    let editFormData = { ...formTemplates[activeTab], ...rest };
    
    // For products, auto-set GST percentage based on category
    if (activeTab === 'products' && editFormData.category) {
      const category = editFormData.category;
      if (category === 'Granules' || category === 'Powders') {
        editFormData.gst_percentage = 5;
      } else if (category === 'Liquids') {
        editFormData.gst_percentage = 18;
      }
    }
    
    setFormData(editFormData);
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

  const convertLiquidToLiquids = async () => {
    try {
      setLoading(true);
      
      // Find all products with "Liquid" category (singular)
      const productsToUpdate = products.filter(product => 
        product.category === 'Liquid' && product.active !== false
      );
      
      if (productsToUpdate.length === 0) {
        window.alert('No products found with "Liquid" category to convert.');
        setLoading(false);
        return;
      }
      
      const confirmUpdate = window.confirm(
        `Found ${productsToUpdate.length} product(s) with "Liquid" category. Convert all to "Liquids"?`
      );
      
      if (!confirmUpdate) {
        setLoading(false);
        return;
      }
      
      // Update each product
      let successCount = 0;
      let errorCount = 0;
      
      for (const product of productsToUpdate) {
        try {
          const { _id, id, __v, ...productData } = product;
          const updatedProduct = { ...productData, category: 'Liquids' };
          
          const url = `${SERVER_API_URL}/orders/admin/products/${product.id || product._id}`;
          const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct)
          });
          
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to update product ${product.name}:`, await response.text());
          }
        } catch (error) {
          errorCount++;
          console.error(`Error updating product ${product.name}:`, error);
        }
      }
      
      // Show results and refresh data
      window.alert(`Conversion completed!\nSuccessful: ${successCount}\nFailed: ${errorCount}`);
      if (successCount > 0) {
        await fetchData(); // Refresh the products list
      }
      
    } catch (error) {
      console.error('Error in convertLiquidToLiquids:', error);
      window.alert('An error occurred while converting products. Please try again.');
    } finally {
      setLoading(false);
    }
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
    
    // Auto-assign sales manager for salesmen based on state
    let finalFormData = { ...formData };
    if (activeTab === 'salesmen' && finalFormData.state) {
      const assignedSalesManager = findSalesManagerForState(finalFormData.state);
      if (assignedSalesManager) {
        finalFormData.sales_manager = assignedSalesManager.name;
      }
    }
    
    try {
      const url = modalType === 'create' 
        ? `${SERVER_API_URL}/orders/admin/${activeTab}`
        : `${SERVER_API_URL}/orders/admin/${activeTab}/${selectedItem.id || selectedItem._id}`;
      const method = modalType === 'create' ? 'POST' : 'PUT';
      const { _id, id, __v, ...payload } = finalFormData;
      
      // If editing a salesman/sales_manager/director and email changed, clear firebase_uid to force re-linking
      if (modalType === 'edit' && (activeTab === 'salesmen' || activeTab === 'sales_managers' || activeTab === 'directors')) {
        const originalEmail = normalize(selectedItem?.email || '');
        const newEmail = normalize(payload.email || '');
        if (originalEmail && newEmail && originalEmail !== newEmail) {
          payload.firebase_uid = null; // Clear the Firebase UID so user can re-link with new email
          console.log(`Email changed from ${originalEmail} to ${newEmail}, clearing firebase_uid for re-linking`);
        }
      }
      
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
        
        // Show success message with additional info if email was changed
        if (modalType === 'edit' && (activeTab === 'salesmen' || activeTab === 'sales_managers' || activeTab === 'directors')) {
          const originalEmail = normalize(selectedItem?.email || '');
          const newEmail = normalize(payload.email || '');
          if (originalEmail && newEmail && originalEmail !== newEmail) {
            setTimeout(() => {
              alert(`Email updated successfully!\n\nNote: The user will need to sign in with their new Google account (${newEmail}) to access the system.`);
            }, 300);
          }
        }
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

  const renderProductsByCategory = () => {
    const activeProducts = products.filter(product => product.active !== false);
    
    // Apply search filter to products
    const searchFilteredProducts = activeProducts.filter(product => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase().trim();
      const searchFields = ['name', 'category', 'packing_size', 'product_details'];
      
      return searchFields.some(field => {
        const value = product[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
    
    // Categorize products
    const categorizeProduct = (category) => {
      const categoryLower = (category || '').toLowerCase();
      if (categoryLower.includes('granule')) return 'Granules';
      if (categoryLower.includes('powder')) return 'Powders';
      if (categoryLower.includes('liquid')) return 'Liquids';
      return 'Others'; // fallback for uncategorized
    };

    const categorizedProducts = {
      'Granules': [],
      'Powders': [],
      'Liquids': [],
      'Others': []
    };

    searchFilteredProducts.forEach(product => {
      const category = categorizeProduct(product.category);
      categorizedProducts[category].push(product);
    });

    // Sort products within each category
    Object.keys(categorizedProducts).forEach(category => {
      categorizedProducts[category].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
      if (!sortAsc) categorizedProducts[category].reverse();
    });

    const renderProductSection = (categoryName, productList) => {
      if (productList.length === 0) return null;

      return (
        <div key={categoryName} style={{ marginBottom: '2rem' }}>
          <h4 style={{ 
            ...styles.sectionTitle, 
            backgroundColor: 'var(--brand-green)', 
            color: '#fff', 
            padding: '.5rem 1rem', 
            borderRadius: '4px', 
            marginBottom: '1rem',
            position: 'sticky',
            top: '0',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {categoryName} ({productList.length})
          </h4>
          <div className="tableContainer" style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Packing Size</th>
                  <th style={styles.th}>Dealer Price</th>
                  <th style={styles.th}>GST %</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productList.map(product => (
                  <tr key={product.id || product._id} style={styles.tr}>
                    <td style={styles.td}>{product.name || 'N/A'}</td>
                    <td style={styles.td}>{product.category || 'N/A'}</td>
                    <td style={styles.td}>{product.packing_size || 'N/A'}</td>
                    <td style={styles.td}>₹{product.dealer_price_per_bottle || 'N/A'}</td>
                    <td style={styles.td}>{product.gst_percentage || 'N/A'}%</td>
                    <td style={styles.td}>
                      <button style={styles.editButton} onClick={() => handleEdit(product)}>Edit</button>
                      <button style={styles.deactivateButton} onClick={() => toggleActive(product, false)}>Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div style={{ marginTop: '.5rem' }}>
        <h4 style={styles.sectionTitle}>Active Products</h4>
        {renderProductSection('Granules', categorizedProducts.Granules)}
        {renderProductSection('Powders', categorizedProducts.Powders)}
        {renderProductSection('Liquids', categorizedProducts.Liquids)}
        {renderProductSection('Others', categorizedProducts.Others)}
      </div>
    );
  };

  const renderTable = () => {
    let data, columnConfig;
    // Define column configs with field mapping & type
    const configs = {
      salesmen: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Sales Manager', field:'sales_manager', type:'text' } ],
      // Add Team column (non-filterable) for managers
      sales_managers: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Team', field:'salesmen_ids', type:'team' } ],
      directors: [ { label:'Name', field:'name', type:'text' }, { label:'Email', field:'email', type:'text' }, { label:'Phone', field:'phone', type:'text' } ],
      dealers: [ { label:'Name', field:'name', type:'text' }, { label:'Phone', field:'phone', type:'text' }, { label:'State', field:'state', type:'text' }, { label:'Credit Limit', field:'credit_limit', type:'number' } ],
      products: [ { label:'Name', field:'name', type:'text' }, { label:'Category', field:'category', type:'text' }, { label:'Packing Size', field:'packing_size', type:'text' }, { label:'Dealer Price', field:'dealer_price_per_bottle', type:'number' }, { label:'GST %', field:'gst_percentage', type:'number' } ]
    };
    switch (activeTab) { 
      case 'salesmen': data = salesmen; columnConfig = configs.salesmen; break; 
      case 'sales_managers': data = salesManagers; columnConfig = configs.sales_managers; break;
      case 'directors': data = directors; columnConfig = configs.directors; break;
      case 'dealers': data = dealers; columnConfig = configs.dealers; break; 
      case 'products': data = products; columnConfig = configs.products; break; 
      default: return null; 
    }

    // Special handling for products - render by category
    if (activeTab === 'products') {
      return renderProductsByCategory();
    }

    const activeData = data.filter(it => it.active !== false); // treat undefined as active

    // Apply search filter first
    const searchFilteredData = activeData.filter(item => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase().trim();
      
      // Search across relevant fields based on active tab
      const searchFields = {
        salesmen: ['name', 'email', 'phone', 'state', 'sales_manager'],
        sales_managers: ['name', 'email', 'phone', 'state'],
        directors: ['name', 'email', 'phone'],
        dealers: ['name', 'phone', 'state'],
        products: ['name', 'category', 'packing_size', 'product_details']
      };
      
      const fieldsToSearch = searchFields[activeTab] || ['name'];
      
      return fieldsToSearch.some(field => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });

    // Build sequential filtering like Excel: apply all active filters to search-filtered data
    const filteredData = searchFilteredData.filter(item => {
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
      const partialFiltered = searchFilteredData.filter(item => {
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
      <div className="tableContainer" style={styles.tableContainer}>
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
    salesmen:['Name','Email','Phone','State','Sales Manager'], 
    sales_managers:['Name','Email','Phone','State','Team'], 
    directors:['Name','Email','Phone'], 
    dealers:['Name','Phone','State','Credit Limit'], 
    products:['Name','Category','Packing Size','Dealer Price','GST %'] 
  }[activeTab];
    return (
      <div className="tableContainer" style={{ marginTop:'2rem', ...styles.tableContainer }}>
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
                <label style={styles.label}>Role</label>
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
                <label style={styles.label}>Salesmen (filtered by State)</label>
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

          // State dropdown using StateDropdown component
          if (field === 'state') {
            // Special handling for sales_managers that need custom values and team management
            if (activeTab === 'sales_managers') {
              // Check if the current state value is one of the predefined Indian states
              const isCustomState = formData[field] && !INDIAN_STATES.find(state => state.code === formData[field]);
              
              return (
                <div key={field} style={styles.formGroup}>
                  <label style={styles.label}>State</label>
                  <StateDropdown
                    value={isCustomState ? '__custom__' : formData[field] || ''}
                    onChange={(value) => {
                      setTeamDropdownOpen(false);
                      setTeamSearch('');
                      if (value === '__custom__') {
                        setFormData(prev => ({ ...prev, state: formData[field] || '', salesmen_ids: [] }));
                      } else {
                        setFormData(prev => ({ ...prev, state: value, salesmen_ids: [] }));
                      }
                    }}
                    required
                    allowCustom={true}
                    customValue={isCustomState ? formData[field] || '' : ''}
                    onCustomChange={(customValue) => {
                      setTeamDropdownOpen(false);
                      setTeamSearch('');
                      setFormData(prev => ({ ...prev, state: customValue, salesmen_ids: [] }));
                    }}
                    showLabel={false}
                    style={styles.input}
                  />
                </div>
              );
            }
            
            // Standard state dropdown for other tabs
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>State</label>
                <StateDropdown
                  value={formData[field] || ''}
                  onChange={(value) => {
                    // Auto-assign sales manager for salesmen when state changes
                    if (activeTab === 'salesmen' && value) {
                      const assignedSalesManager = findSalesManagerForState(value);
                      if (assignedSalesManager) {
                        setFormData({
                          ...formData, 
                          [field]: value, 
                          sales_manager: assignedSalesManager.name
                        });
                      } else {
                        setFormData({
                          ...formData, 
                          [field]: value,
                          sales_manager: ''
                        });
                      }
                    } else {
                      setFormData({...formData, [field]: value});
                    }
                  }}
                  required
                  showLabel={false}
                  style={styles.input}
                />
                {activeTab === 'salesmen' && formData[field] && (
                  <div style={{ marginTop: '5px', fontSize: '12px' }}>
                    {(() => {
                      const assignedSalesManager = findSalesManagerForState(formData[field]);
                      return assignedSalesManager ? (
                        <span style={{ color: '#28a745' }}>
                          ✓ Auto-assigned Sales Manager: {assignedSalesManager.name}
                        </span>
                      ) : (
                        <span style={{ color: '#ffc107' }}>
                          ⚠️ No sales manager assigned to this state yet
                        </span>
                      );
                    })()}
                  </div>
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
                <label style={styles.label}>Sales Manager Name</label>
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
                <label style={styles.label}>Salesman</label>
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

          // Category dropdown for products
          if (field === 'category' && activeTab === 'products') {
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  value={formData[field] || ''}
                  onChange={(e) => {
                    const category = e.target.value;
                    let gstPercentage = 18; // default
                    
                    // Set GST based on category
                    if (category === 'Granules' || category === 'Powders') {
                      gstPercentage = 5;
                    } else if (category === 'Liquids') {
                      gstPercentage = 18;
                    }
                    
                    setFormData({
                      ...formData, 
                      [field]: category,
                      gst_percentage: gstPercentage
                    });
                  }}
                  style={styles.input}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Granules">Granules</option>
                  <option value="Powders">Powders</option>
                  <option value="Liquids">Liquids</option>
                </select>
              </div>
            );
          }
          
          // Sales manager field for salesmen (read-only, auto-assigned)
          if (field === 'sales_manager' && activeTab === 'salesmen') {
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>Sales Manager</label>
                <input
                  type="text"
                  value={formData[field] || 'Auto-assigned based on state'}
                  readOnly
                  style={{
                    ...styles.input,
                    backgroundColor: '#f8f9fa',
                    cursor: 'not-allowed',
                    color: formData[field] ? '#28a745' : '#6c757d'
                  }}
                />
                <div style={{ marginTop: '3px', fontSize: '11px', color: '#6c757d' }}>
                  Automatically assigned when state is selected
                </div>
              </div>
            );
          }

          // Only show sales_manager for salesmen
          if (field === 'sales_manager' && activeTab !== 'salesmen') return null;
          
          // GST percentage field for products (editable, with auto-set by category)
          if (field === 'gst_percentage' && activeTab === 'products') {
            const category = formData.category || '';
            let helpText = '';
            
            if (category === 'Granules' || category === 'Powders') {
              helpText = 'Auto-set to 5% for Granules/Powders';
            } else if (category === 'Liquids') {
              helpText = 'Auto-set to 18% for Liquids';
            } else {
              helpText = 'Select category for auto-setting';
            }
            
            return (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>GST %</label>
                <input
                  type="number"
                  value={formData[field] || ''}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  style={styles.input}
                  placeholder="Enter GST percentage"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <div style={{ marginTop: '3px', fontSize: '11px', color: '#6c757d' }}>
                  {helpText}
                </div>
              </div>
            );
          }
          
          // Hide 'active' from all create/edit forms; managed via Activate/Deactivate in tables
          if (field === 'active') return null;
          
          // Hide bottle_volume field completely for non-liquid categories
          if (field === 'bottle_volume' && activeTab === 'products') {
            const isLiquidCategory = (formData.category || '').toLowerCase().includes('liquid');
            if (!isLiquidCategory) return null;
          }
          
          const fieldType = typeof formTemplates[activeTab][field] === 'number' ? 'number' : 
                           field.includes('email') ? 'email' : 'text';
          
          return (
            <div key={field} style={styles.formGroup}>
              <label style={styles.label}>
                {field === 'dealer_price_per_bottle' ? 'Dealer Price' : 
                 field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}
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
                required={modalType === 'create' && (!['phone','product_details','sales_manager','bottle_volume','dealer_price_per_bottle'].includes(field) || 
                         (field === 'bottle_volume' && (formData.category || '').toLowerCase().includes('liquid')))}
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
    container: { display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--brand-bg)', color:'var(--brand-text)', width:'100%', maxWidth:'100%', overflowX:'auto', paddingRight: window.innerWidth <= 768 ? '0' : '2rem' },
    header: { textAlign:'center', marginBottom:'0', backgroundColor:'#ffffff', paddingTop:'1rem', paddingBottom:'.5rem', width:'100%', maxWidth:'100%' },
    title: { fontSize:'clamp(1.2rem, 4vw, 1.55rem)', fontWeight:700, letterSpacing:'.3px', margin:0, background:'linear-gradient(90deg,#128d3b,#2fbf62)', WebkitBackgroundClip:'text', color:'transparent' },
    tabs: { display:'flex', justifyContent:'center', gap:'.5rem', marginBottom:'1rem', flexWrap:'wrap', position:'sticky', top:'0', zIndex:50, backgroundColor:'#ffffff', paddingTop:'.5rem', paddingBottom:'.75rem', borderBottom:'1px solid #e0e0e0', width:'100%', maxWidth:'100%' },
    tab: { padding:'.5rem .8rem', background:'#fff', color:'var(--brand-green-dark)', border:'1px solid var(--brand-green)', borderRadius:'var(--radius-md)', cursor:'pointer', fontSize:'.7rem', fontWeight:500, letterSpacing:'.3px', transition:'var(--transition-base)' },
    activeTab: { background:'var(--brand-green)', color:'#fff', boxShadow:'var(--brand-shadow-sm)' },
    content: { background:'var(--brand-surface)', border:'1px solid var(--brand-border)', borderRadius:'var(--radius-lg)', padding:'1rem', maxWidth: window.innerWidth <= 768 ? '100%' : 'calc(100% - 2rem)', margin:'0 0 1rem 0', width: window.innerWidth <= 768 ? '100%' : 'calc(100% - 2rem)', boxShadow:'var(--brand-shadow-sm)', overflowX:'auto' },
    createButton: { background:'var(--brand-green)', color:'#fff', border:'1px solid var(--brand-green)', padding:'.4rem .6rem', borderRadius:'var(--radius-md)', fontSize:'.65rem', fontWeight:600, letterSpacing:'.3px', cursor:'pointer', boxShadow:'var(--brand-shadow-sm)', transition:'var(--transition-base)' },
    tableContainer: { overflowX:'auto', marginTop:'.5rem', width:'100%', maxWidth:'100%', border:'1px solid #ddd', borderRadius:'4px', padding:'.5rem', boxSizing:'border-box', WebkitOverflowScrolling:'touch', scrollBehavior:'smooth' },
    table: { 
      borderCollapse:'collapse', 
      fontSize:'.7rem', 
      width: window.innerWidth <= 768 ? '600px' : '100%', 
      tableLayout:'auto',
      minWidth: window.innerWidth <= 768 ? '600px' : 'auto'
    },
    th: { 
      background:'var(--brand-surface-alt)', 
      padding:'.4rem', 
      textAlign:'left', 
      borderBottom:'1px solid var(--brand-border)', 
      fontWeight:600, 
      fontSize:'.55rem', 
      textTransform:'uppercase', 
      color:'var(--brand-text-soft)', 
      whiteSpace:'nowrap', 
      minWidth: window.innerWidth <= 768 ? '120px' : '100px', 
      maxWidth:'200px' 
    },
    tr: { borderBottom:'1px solid var(--brand-border)' },
    td: { 
      padding:'.4rem', 
      verticalAlign:'middle', 
      fontSize:'.65rem', 
      whiteSpace:'nowrap', 
      minWidth: window.innerWidth <= 768 ? '120px' : '100px', 
      maxWidth:'200px', 
      overflow:'hidden', 
      textOverflow:'ellipsis' 
    },
    editButton: { background:'var(--brand-green)', color:'#fff', border:'none', padding:'.5rem .75rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.75rem', fontWeight:600, marginRight:'.25rem', minHeight:'36px' },
    deactivateButton: { background:'#ff9800', color:'#fff', border:'none', padding:'.5rem .75rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.75rem', fontWeight:600, minHeight:'36px' },
    activateButton: { background:'#17a2b8', color:'#fff', border:'none', padding:'.5rem .75rem', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'.75rem', fontWeight:600, minHeight:'36px' },
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
    sortButton: { background:'#0f7030', color:'#fff', border:'1px solid #0f7030', padding:'.4rem .6rem', borderRadius:'var(--radius-md)', fontSize:'.65rem', fontWeight:600, cursor:'pointer' },
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
  multiSelectDropdown: { position:'absolute', top:'100%', left:0, right:0, zIndex:60, background:'#fff', border:'1px solid var(--brand-border)', borderRadius:'6px', boxShadow:'0 8px 20px rgba(0,0,0,0.12)', padding:'.5rem', marginTop:'.35rem' },
  // Search bar styles
  searchContainer: { marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' },
  searchInput: { 
    flex: 1, 
    padding: '.75rem 1rem', 
    border: '2px solid var(--brand-border)', 
    borderRadius: 'var(--radius-md)', 
    fontSize: '.875rem', 
    background: '#fff', 
    color: 'var(--brand-text)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none'
  }
  };

  return (
    <div className="admin-management" style={styles.container}>
      <AppHeader />
      <div style={styles.header}>
        <h1 className="mobile-center" style={{...styles.title, fontSize: 'clamp(1.3rem, 4vw, 1.55rem)'}}>Data Management</h1>
      </div>

      <div className="nav-tabs" style={styles.tabs}>
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
        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder={`Search ${activeTab.replace(/_/g, ' ')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--brand-green)';
              e.target.style.boxShadow = '0 0 0 3px rgba(18, 141, 59, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--brand-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div className="btn-group" style={{marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center'}}>
          <button className="btn" style={styles.createButton} onClick={handleCreate}>
            {(() => {
              const singular = { salesmen: 'Salesman', sales_managers: 'Sales Manager', directors: 'Director', dealers: 'Dealer', products: 'Product' }[activeTab] || pretty(activeTab);
              return `Add ${singular}`;
            })()}
          </button>
          <button
            className="btn secondary"
            style={styles.sortButton}
            onClick={() => setSortAsc(prev => !prev)}
            title={`Sort ${sortAsc ? 'Z-A' : 'A-Z'}`}
          >
            Sort {sortAsc ? 'A-Z' : 'Z-A'}
          </button>
        </div>
        
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
