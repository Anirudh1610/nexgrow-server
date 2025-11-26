import React from 'react';
import { INDIAN_STATES } from '../constants/indianStates';

const StateDropdown = ({
  value,
  onChange,
  required = false,
  style = {},
  label = "State:",
  placeholder = "Select State",
  showLabel = true,
  disabled = false,
  allowCustom = false,
  customValue = '',
  onCustomChange = null
}) => {
  const formGroupStyle = {
    marginBottom: '1rem'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '.5rem',
    fontWeight: '600',
    fontSize: '.875rem',
    color: 'var(--brand-text)'
  };

  const inputStyle = {
    width: '100%',
    padding: '.6rem .75rem',
    fontSize: '.875rem',
    border: '1px solid var(--brand-border)',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: 'var(--brand-text)',
    ...style
  };

  return (
    <div style={formGroupStyle}>
      {showLabel && <label style={labelStyle}>{label}</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        required={required}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {INDIAN_STATES.map(state => (
          <option key={state.code} value={state.code}>
            {state.code} - {state.name}
          </option>
        ))}
        {allowCustom && <option value="__custom__">Other (Custom)</option>}
      </select>
      
      {allowCustom && value === '__custom__' && (
        <input
          type="text"
          placeholder="Enter custom state"
          value={customValue || ''}
          onChange={(e) => onCustomChange && onCustomChange(e.target.value)}
          style={{
            ...inputStyle,
            marginTop: '.5rem'
          }}
          required={required}
        />
      )}
    </div>
  );
};

export default StateDropdown;