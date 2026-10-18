import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './FullPageLoader.css';

export const FullPageLoader = ({ message = 'Cargando perfil...' }) => {
  const { appLogo, loaderTheme } = useTheme();

  return (
    <div className={`ohana-fullpage-loader loader-theme-${loaderTheme || 'default'}`}>
      <div className="ohana-loader-pulse-container">
        {/* Ondas concéntricas de pulso */}
        <div className="ohana-loader-ripple-1"></div>
        <div className="ohana-loader-ripple-2"></div>
        <div className="ohana-loader-ripple-3"></div>

        {/* Anillo de órbita giratoria sutil */}
        <div className="ohana-loader-orbit"></div>

        {/* Logotipo de Ohana con animación de pulso / respiración */}
        <div className="ohana-loader-logo-wrapper">
          <img 
            src={appLogo || '/assets/logo-ohana.png'} 
            alt="Ohana Makis" 
            className="ohana-loader-logo-img"
          />
        </div>
      </div>

      {/* Texto de carga y barra de progreso indeterminada */}
      <div className="ohana-loader-text-wrapper">
        <p className="ohana-loader-text">{message}</p>
        <div className="ohana-loader-track">
          <div className="ohana-loader-track-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default FullPageLoader;
