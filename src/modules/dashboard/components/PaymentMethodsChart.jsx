import React from 'react';
import { Smartphone, CreditCard, Banknote, Split, Award } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';

export const PaymentMethodsChart = ({ paymentMethods }) => {
  const list = paymentMethods || [];
  const leader = list.find((p) => p.isLeader && p.count > 0);

  const getMethodIcon = (key) => {
    switch (key) {
      case 'yape':
        return <Smartphone size={18} />;
      case 'tarjeta':
        return <CreditCard size={18} />;
      case 'efectivo':
        return <Banknote size={18} />;
      case 'mixto':
      case 'transferencia':
        return <Split size={18} />;
      default:
        return <CreditCard size={18} />;
    }
  };

  return (
    <div className="payment-chart-card">
      <div className="payment-card-header">
        <div>
          <h2 className="payment-card-title">Métodos de Pago Más Usados</h2>
          <p className="payment-card-subtitle">Preferencia y recaudación por canal transaccional</p>
        </div>
        {leader && (
          <div className="leader-method-badge">
            <Award size={16} />
            <span>#1 Favorito: <strong>{leader.name} ({leader.percentage}%)</strong></span>
          </div>
        )}
      </div>

      <div className="payment-distribution-grid">
        {list.map((method) => {
          return (
            <div
              key={method.key}
              className={`payment-row-card ${method.isLeader ? 'is-dominant' : ''}`}
            >
              <div className="payment-row-top">
                <div className="payment-identity">
                  <div
                    className="payment-method-icon-box"
                    style={{ backgroundColor: `${method.color}15`, color: method.color }}
                  >
                    {getMethodIcon(method.key)}
                  </div>
                  <div>
                    <h4 className="payment-name">{method.name}</h4>
                    <span className="payment-trans-count">{method.count} transacciones</span>
                  </div>
                </div>

                <div className="payment-amounts">
                  <span className="payment-pct-tag" style={{ backgroundColor: `${method.color}20`, color: method.color }}>
                    {method.percentage}%
                  </span>
                  <span className="payment-currency-val">{formatCurrency(method.amount)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="payment-progress-bar-bg">
                <div
                  className="payment-progress-bar-fill"
                  style={{
                    width: `${method.percentage}%`,
                    backgroundColor: method.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggregate insight summary */}
      <div className="payment-summary-footer">
        <div className="payment-summary-stat">
          <span className="stat-label">Pagos Digitales (Yape + Tarjeta)</span>
          <strong className="stat-val">
            {((list[0]?.percentage || 0) + (list[1]?.percentage || 0))}% del volumen
          </strong>
        </div>
        <div className="payment-summary-stat">
          <span className="stat-label">Caja y Efectivo Físico</span>
          <strong className="stat-val">
            {(list[2]?.percentage || 0)}% en arqueo
          </strong>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsChart;
