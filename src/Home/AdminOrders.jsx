import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import AppHeader from '../components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { formatINR, formatPercent, formatOrderDisplayId, computeDisplaySeqMap, calculateGST } from './numberFormat';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Filtering and sorting states
  const [sortBy, setSortBy] = useState('date'); // 'date', 'status', 'total'
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSelections, setFilterSelections] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = {};
        try { const u = JSON.parse(localStorage.getItem('nexgrow_user')||'null'); if (u?.uid) params.uid = u.uid; if (u?.email) params.email = u.email; } catch {}
        const res = await axios.get(`${SERVER_API_URL}/orders/admin/orders`, { params });
        let data = res.data || [];
        setOrders(data);
      } catch {
        setOrders([]);
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  // Get unique values for a filter field
  const getUniqueValues = (field) => {
    const values = new Set();
    orders.forEach(order => {
      let value = order[field];
      if (field === 'discount_status') {
        value = (value || 'n/a').toLowerCase();
      }
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value));
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  };

  // Apply filters and sorting
  const getFilteredAndSortedOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => {
        const searchFields = [
          order.order_code,
          order.salesman_name,
          order.dealer_name,
          order.state,
          order._id,
          order.id
        ];
        return searchFields.some(field => 
          field && String(field).toLowerCase().includes(query)
        );
      });
    }

    // Apply column filters
    filtered = filtered.filter(order => {
      return Object.entries(filterSelections).every(([field, selected]) => {
        if (!selected || selected.length === 0) return true;
        let value = order[field];
        if (field === 'discount_status') {
          value = (value || 'n/a').toLowerCase();
        }
        return selected.includes(String(value));
      });
    });

    // Sort
    const getTimestamp = (o) => {
      const raw = o.created_at || o.createdAt || o.updated_at || o.date || o.timestamp || null;
      const t = raw ? new Date(raw).getTime() : 0;
      if (t && !isNaN(t)) return t;
      if (o._id && typeof o._id === 'string' && o._id.length >= 8) {
        try { return parseInt(o._id.substring(0,8),16) * 1000; } catch { return 0; }
      }
      return 0;
    };

    filtered.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        compareValue = getTimestamp(b) - getTimestamp(a);
      } else if (sortBy === 'status') {
        const statusA = (a.discount_status || 'n/a').toLowerCase();
        const statusB = (b.discount_status || 'n/a').toLowerCase();
        const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2, 'n/a': 3 };
        compareValue = (statusOrder[statusA] || 3) - (statusOrder[statusB] || 3);
      } else if (sortBy === 'total') {
        const totalA = a.total_price || 0;
        const totalB = b.total_price || 0;
        compareValue = totalB - totalA;
      }
      
      return sortAsc ? -compareValue : compareValue;
    });

    return filtered;
  };

  const toggleFilter = (field, value) => {
    setFilterSelections(prev => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearAllFilters = () => {
    setFilterSelections({});
    setSearchQuery('');
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  // Get paginated orders
  const getPaginatedOrders = (filteredOrders) => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  };

  const getTotalPages = (filteredOrders) => {
    return Math.ceil(filteredOrders.length / ordersPerPage);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilter && !event.target.closest('.filter-dropdown-container')) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  // Reset to page 1 when search query or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortAsc]);

  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <AppHeader
        centerContent={
          <div className="header-nav" style={{ display:'flex', gap:'.5rem', marginRight:'.5rem' }}>
          </div>
        }
      />
      <main className="page fade-in">
        <h1 className="section-title mobile-center" style={{ fontSize: 'clamp(1.3rem, 4vw, 1.5rem)' }}>
          All Orders
        </h1>
        
        {/* Search and Controls */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by order code, salesman, dealer, state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1 1 300px',
              padding: '.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '.9rem'
            }}
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '.9rem',
              cursor: 'pointer'
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="total">Sort by Total</option>
          </select>
          
          <button
            onClick={() => setSortAsc(!sortAsc)}
            style={{
              padding: '.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '.9rem'
            }}
          >
            {sortAsc ? '↑ Asc' : '↓ Desc'}
          </button>
          
          {(Object.keys(filterSelections).length > 0 || searchQuery) && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '.5rem 1rem',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                background: 'white',
                color: '#dc3545',
                cursor: 'pointer',
                fontSize: '.9rem'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {['state', 'discount_status', 'salesman_name'].map(field => {
            const uniqueVals = getUniqueValues(field);
            const selected = filterSelections[field] || [];
            const label = field === 'discount_status' ? 'Status' : field === 'salesman_name' ? 'Salesman' : 'State';
            
            return (
              <div key={field} style={{ position: 'relative' }} className="filter-dropdown-container">
                <button
                  onClick={() => setOpenFilter(openFilter === field ? null : field)}
                  style={{
                    padding: '.4rem .8rem',
                    border: selected.length > 0 ? '2px solid var(--brand-green)' : '1px solid #ccc',
                    borderRadius: '4px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '.85rem',
                    fontWeight: selected.length > 0 ? 'bold' : 'normal'
                  }}
                >
                  {label} {selected.length > 0 && `(${selected.length})`} ▼
                </button>
                
                {openFilter === field && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '.25rem',
                      background: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '200px',
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    {uniqueVals.map(val => (
                      <label
                        key={val}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '.5rem',
                          cursor: 'pointer',
                          fontSize: '.85rem',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(val)}
                          onChange={() => toggleFilter(field, val)}
                          style={{ marginRight: '.5rem' }}
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="surface-card elevated">
          {loading ? (
            <p>Loading...</p>
          ) : (() => {
            const filteredOrders = getFilteredAndSortedOrders();
            const totalPages = getTotalPages(filteredOrders);
            const paginatedOrders = getPaginatedOrders(filteredOrders);
            
            if (filteredOrders.length === 0) {
              return <p>{orders.length === 0 ? 'No orders found.' : 'No orders match the current filters.'}</p>;
            }
            
            const startIndex = (currentPage - 1) * ordersPerPage + 1;
            const endIndex = Math.min(currentPage * ordersPerPage, filteredOrders.length);
            
            return (
              <>
                <div style={{ marginBottom: '1rem', fontSize: '.9rem', color: 'var(--brand-text-soft)' }}>
                  Showing {startIndex}-{endIndex} of {filteredOrders.length} orders
                  {filteredOrders.length < orders.length && ` (filtered from ${orders.length} total)`}
                </div>
                <ul className="order-list">
                  {(() => {
                    const seqMap = computeDisplaySeqMap(paginatedOrders);
                    return paginatedOrders.map((order) => {
                const total = order.total_price || 0;
                const discountPct = order.discount || 0;
                const discounted =
                  order.discounted_total != null
                    ? order.discounted_total
                    : total - (total * discountPct) / 100;
                const discountAmt = total - discounted;
                
                // Calculate GST - use stored value or calculate from product data
                let gstTotal = order.gst_total || 0;
                let grandTotal = order.grand_total || discounted;
                
                // If no stored GST, try to calculate from products
                if (gstTotal === 0 && order.products && order.products.length > 0) {
                  gstTotal = order.products.reduce((sum, product) => {
                    const gstPercentage = product.gst_percentage || 0;
                    if (gstPercentage > 0) {
                      const productDiscounted = product.discounted_price || product.price || 0;
                      const gstAmount = calculateGST(productDiscounted, gstPercentage);
                      return sum + gstAmount;
                    }
                    return sum;
                  }, 0);
                  grandTotal = discounted + gstTotal;
                }
                const status = order.discount_status || 'n/a';
                const badgeClass =
                  status === 'approved'
                    ? 'badge success'
                    : status === 'pending'
                    ? 'badge warning'
                    : status === 'rejected'
                    ? 'badge danger'
                    : 'badge';
                  const seq = seqMap[String(order._id || order.id)] || 1;
                return (
                  <li key={order._id || order.id} className="order-card">
                    <header>
                      <strong
                        style={{
                          fontSize: '.85rem',
                          letterSpacing: '.5px',
                        }}
                      >
                        {order.order_code ? order.order_code : formatOrderDisplayId(order, { seq })}
                      </strong>
                      <span className={badgeClass}>
                        {status.toUpperCase()}
                      </span>
                    </header>
                    <div
                      style={{
                        fontSize: '.75rem',
                        color: 'var(--brand-text-soft)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '.85rem',
                      }}
                    >
                      <span>
                        <strong style={{ color: 'var(--brand-text)' }}>
                          Salesman:
                        </strong>{' '}
                        {order.salesman_name || order.salesman_id}
                      </span>
                      <span>
                        <strong style={{ color: 'var(--brand-text)' }}>
                          Dealer:
                        </strong>{' '}
                        {order.dealer_name || order.dealer_id}
                      </span>
                      <span>
                        <strong style={{ color: 'var(--brand-text)' }}>
                          State:
                        </strong>{' '}
                        {order.state}
                      </span>
                    </div>
                    {order.products && order.products.length > 0 && (
                      <ul
                        style={{
                          margin: '.5rem 0 0 1rem',
                          padding: 0,
                          fontSize: '.7rem',
                          listStyle: 'disc',
                        }}
                      >
                        {order.products.map((p, i) => (
                          <li key={i} style={{ margin: '2px 0' }}>
                            {p.product_name || p.product_id} - Qty: {formatINR(p.quantity,{decimals:0})} {p.price ? `- ₹${formatINR(p.price)}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div
                      className="order-metrics"
                      style={{ marginTop: '.75rem' }}
                    >
                      <span>Total: ₹{formatINR(total)}</span>
                      <span>Discount %: {formatPercent(discountPct,{decimals:2})}</span>
                      <span>Discount Amt: ₹{formatINR(discountAmt)}</span>
                      <span>After Discount: ₹{formatINR(discounted)}</span>
                      {gstTotal > 0 && (
                        <>
                          <span>GST: ₹{formatINR(gstTotal)}</span>
                          <span><strong>Grand Total: ₹{formatINR(grandTotal)}</strong></span>
                        </>
                      )}
                    </div>
                  </li>
                );
                });
              })()}
            </ul>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '.5rem',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e0e0e0'
              }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '.5rem 1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: currentPage === 1 ? '#f5f5f5' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '.9rem'
                  }}
                >
                  ← Previous
                </button>
                
                <div style={{ display: 'flex', gap: '.25rem' }}>
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          style={{
                            padding: '.5rem .75rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '.9rem'
                          }}
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="ellipsis1" style={{ padding: '.5rem' }}>...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          style={{
                            padding: '.5rem .75rem',
                            border: i === currentPage ? '2px solid var(--brand-green)' : '1px solid #ccc',
                            borderRadius: '4px',
                            background: i === currentPage ? 'var(--brand-green)' : 'white',
                            color: i === currentPage ? 'white' : 'black',
                            cursor: 'pointer',
                            fontSize: '.9rem',
                            fontWeight: i === currentPage ? 'bold' : 'normal'
                          }}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="ellipsis2" style={{ padding: '.5rem' }}>...</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          style={{
                            padding: '.5rem .75rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '.9rem'
                          }}
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '.5rem 1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: currentPage === totalPages ? '#f5f5f5' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '.9rem'
                  }}
                >
                  Next →
                </button>
                
                <span style={{ marginLeft: '.5rem', fontSize: '.85rem', color: 'var(--brand-text-soft)' }}>
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </>
            );
          })()}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn secondary"
              onClick={() => navigate('/home')}
            >
              Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminOrders;
