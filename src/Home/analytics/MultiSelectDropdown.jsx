import React, { useState, useRef, useEffect } from 'react';

// Searchable, checkbox-based multi-select. `selected` is an array of chosen
// option strings; an empty array means "all" (no filter applied).
export default function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filteredOptions = search.trim()
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };

  const triggerLabel = selected.length === 0
    ? `All ${label.toLowerCase()}`
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        onClick={() => { setOpen((o) => !o); setSearch(''); }}
        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem', minWidth: 200 }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{triggerLabel}</span>
        <span style={{ color: 'var(--brand-text-soft)', fontSize: '.75rem' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20, width: 260,
          background: 'var(--brand-surface)', border: '1px solid var(--brand-border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--brand-shadow-lg)',
          display: 'flex', flexDirection: 'column', maxHeight: 340,
        }}>
          <div style={{ padding: '.6rem .6rem 0' }}>
            <input
              className="input"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem .75rem', fontSize: '.78rem' }}>
            <button type="button" onClick={() => onChange(options)} style={{ background: 'none', border: 'none', color: 'var(--brand-green)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Select all</button>
            <button type="button" onClick={() => onChange([])} style={{ background: 'none', border: 'none', color: 'var(--brand-text-soft)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Clear</button>
          </div>
          <div style={{ overflowY: 'auto', borderTop: '1px solid var(--brand-border)' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '.85rem .75rem', fontSize: '.85rem', color: 'var(--brand-text-soft)' }}>No matches</div>
            ) : filteredOptions.map((opt) => (
              <label
                key={opt}
                style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', fontSize: '.85rem', color: 'var(--brand-text)', cursor: 'pointer' }}
              >
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
