import React from 'react';

export const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label" htmlFor={name}>{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon className="input-prefix-icon" size={18} />}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input-field ${Icon ? 'with-icon' : ''} ${error ? 'input-error' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

export default Input;
