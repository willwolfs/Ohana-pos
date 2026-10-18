import React, { useState, useEffect, useRef } from 'react';
import { 
  MoreHorizontal, 
  UtensilsCrossed, 
  ShoppingBag, 
  Bike, 
  Check, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Split 
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';

export const ModalityPerformanceGauge = ({ modalityData, paymentMethodsData }) => {
  const [activeSegment, setActiveSegment] = useState(null);
  const [viewMode, setViewMode] = useState('modalidad'); // 'modalidad' | 'pagos'
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const isModality = viewMode === 'modalidad';

  const rawItems = isModality
    ? (modalityData?.items || [])
    : (paymentMethodsData || []);

  const items = rawItems.map((it) => ({
    ...it,
    label: it.label || it.name,
    color: it.color || (
      it.key === 'mesa' ? '#f97316' :
      it.key === 'llevar' ? '#facc15' :
      it.key === 'delivery' ? '#06b6d4' :
      it.key === 'yape' ? '#8b5cf6' :
      it.key === 'tarjeta' ? '#3b82f6' :
      it.key === 'efectivo' ? '#10b981' : '#f59e0b'
    ),
  }));

  const totalCount = isModality
    ? (modalityData?.totalCount || items.reduce((sum, it) => sum + (it.count || 0), 0))
    : items.reduce((sum, it) => sum + (it.count || 0), 0);

  const totalAmount = items.reduce((sum, it) => sum + (it.amount || 0), 0);

  // Helper to describe an arc path from angle startAngle to endAngle (in radians)
  // Angles go from Math.PI (left, 180 deg) down to 0 (right, 0 deg)
  const cx = 130;
  const cy = 115;
  const r = 85;
  const strokeWidth = 24;

  const polarToCartesian = (centerX, centerY, radius, angleInRadians) => {
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY - radius * Math.sin(angleInRadians), // SVG y is inverted
    };
  };

  const createArc = (startRad, endRad, radius) => {
    const start = polarToCartesian(cx, cy, radius, startRad);
    const end = polarToCartesian(cx, cy, radius, endRad);
    const largeArcFlag = Math.abs(endRad - startRad) > Math.PI ? '1' : '0';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Build segments with subtle gaps
  const gapRad = 0.05; // ~2.8 degrees gap

  const segments = items.map((item, idx) => {
    // Calculate start angle by summing previous item percentages
    const previousPct = items.slice(0, idx).reduce((sum, it) => sum + (it.percentage || 0), 0);
    const start = Math.PI - (previousPct / 100) * Math.PI;
    const spanRad = ((item.percentage || 0) / 100) * Math.PI;
    const end = Math.max(0, start - spanRad + (idx === items.length - 1 ? 0 : gapRad));

    return {
      ...item,
      d: createArc(start, Math.max(0, end + (idx === items.length - 1 ? 0 : 0.02)), r),
      strokeColor: item.color,
    };
  });

  const getItemIcon = (key) => {
    switch (key) {
      case 'mesa':
        return <UtensilsCrossed size={14} />;
      case 'llevar':
        return <ShoppingBag size={14} />;
      case 'delivery':
        return <Bike size={14} />;
      case 'efectivo':
        return <Banknote size={14} />;
      case 'yape':
        return <Smartphone size={14} />;
      case 'tarjeta':
        return <CreditCard size={14} />;
      case 'mixto':
      case 'transferencia':
        return <Split size={14} />;
      default:
        return <CreditCard size={14} />;
    }
  };

  return (
    <div className="performance-card">
      <div className="performance-card-header" style={{ position: 'relative' }}>
        <div>
          <h2 className="performance-title">Rendimiento</h2>
          <p className="performance-subtitle">
            {isModality ? 'Modalidad de Pedido y Canales' : 'Métodos de Pago y Canales'}
          </p>
        </div>

        {/* Botón de 3 puntos con menú para alternar vista */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`performance-menu-btn ${isMenuOpen ? 'active' : ''}`}
            title="Ver Modalidades o Métodos de Pago"
            aria-label="Opciones de rendimiento"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <MoreHorizontal size={18} />
          </button>

          {isMenuOpen && (
            <div className="performance-dropdown-menu">
              <div className="performance-dropdown-header">VER EN GRÁFICA</div>
              <button
                type="button"
                className={`performance-dropdown-item ${isModality ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('modalidad');
                  setIsMenuOpen(false);
                }}
              >
                <div className="dropdown-item-left">
                  <UtensilsCrossed size={14} />
                  <span>Modalidades de Pedido</span>
                </div>
                {isModality && <Check size={14} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`performance-dropdown-item ${!isModality ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('pagos');
                  setIsMenuOpen(false);
                }}
              >
                <div className="dropdown-item-left">
                  <CreditCard size={14} />
                  <span>Métodos de Pago</span>
                </div>
                {!isModality && <Check size={14} className="check-icon" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Semicircular Gauge SVG */}
      <div className="gauge-viewport">
        <svg
          viewBox="0 0 260 145"
          className="gauge-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background track (soft grey/beige arc) */}
          <path
            d={createArc(Math.PI, 0, r)}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Color segments */}
          {segments.map((seg, idx) => {
            const isHovered = activeSegment === seg.key;
            return (
              <path
                key={seg.key || idx}
                d={seg.d}
                fill="none"
                stroke={seg.strokeColor}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="butt"
                className="gauge-segment"
                onMouseEnter={() => setActiveSegment(seg.key)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            );
          })}
        </svg>

        {/* Center count and text inside the semicircle */}
        <div className="gauge-center-content">
          <span className="gauge-center-label">
            {isModality ? 'Total Pedidos' : 'Total Recaudado'}
          </span>
          <span className="gauge-center-value">
            {isModality
              ? totalCount.toLocaleString('es-PE')
              : (totalAmount > 0 ? formatCurrency(totalAmount) : `${totalCount}`)}
          </span>
          <span className="gauge-center-caption">
            {isModality ? 'Órdenes Atendidas' : `${totalCount} Pagos Realizados`}
          </span>
        </div>
      </div>

      {/* Subtitle text */}
      <p className="performance-description">
        {isModality
          ? 'Distribución de ventas por canales para optimizar los tiempos de atención en salón, retiro y reparto.'
          : 'Distribución de ingresos y transacciones según el medio de cobro utilizado por los clientes.'}
      </p>

      {/* Legend below matching image 2: View Count, Percentage */}
      <div className="performance-legend-list">
        {items.map((item) => {
          const isHovered = activeSegment === item.key;
          return (
            <div
              key={item.key}
              className={`performance-legend-pill ${isHovered ? 'active' : ''}`}
              onMouseEnter={() => setActiveSegment(item.key)}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <div className="legend-dot-label">
                <span
                  className="legend-color-dot"
                  style={{ backgroundColor: item.color }}
                />
                <span className="legend-name">
                  {getItemIcon(item.key)}
                  {item.label}
                </span>
              </div>
              <div className="legend-stats">
                <strong className="legend-percentage">{item.percentage}%</strong>
                <span className="legend-count">
                  ({item.count} {isModality ? 'ord' : 'pagos'} • {formatCurrency(item.amount)})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModalityPerformanceGauge;
