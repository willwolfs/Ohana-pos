import React from 'react';

export const Loader = ({ message = 'Cargando...', size = 'md' }) => {
  return (
    <div className={`loader-container loader-${size}`}>
      <div className="spinner"></div>
      {message && <p className="loader-text">{message}</p>}
    </div>
  );
};

export default Loader;
