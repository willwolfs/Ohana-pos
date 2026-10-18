import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';

export const RevenueBarChart = ({ chartData, activePeriod, onPeriodChange, periodsList }) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  const bars = chartData?.bars || [];
  const maxScale = chartData?.maxScale || 50000;
  const step = chartData?.step || 10000;

  // Generate 5 Y-axis steps from max down to step
  const yTicks = [];
  for (let val = maxScale; val >= step; val -= step) {
    yTicks.push(val);
  }

  const formatTick = (val) => {
    if (val >= 1000) {
      return `S/ ${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    }
    return `S/ ${val}`;
  };

  const totalPeriodRevenue = bars.reduce((acc, curr) => acc + curr.revenue, 0);

  return (
    <div className="revenue-card">
      <div className="revenue-card-header">
        <div className="revenue-title-area">
          <div className="revenue-title-row">
            <h2 className="revenue-title">Ingresos Totales</h2>
            {totalPeriodRevenue > 0 && (
              <div className="revenue-trend-pill">
                <TrendingUp size={14} />
                <span>+18.4%</span>
              </div>
            )}
          </div>
          <p className="revenue-subtitle">
            Ingresos brutos facturados: <strong className="revenue-sum-highlight">{formatCurrency(totalPeriodRevenue)}</strong>
          </p>
        </div>
      </div>

      {/* Chart container */}
      <div className="revenue-chart-wrapper">
        {/* Y Axis labels */}
        <div className="revenue-y-axis">
          {yTicks.map((tick) => (
            <div key={tick} className="y-axis-label">
              {formatTick(tick)}
            </div>
          ))}
          <div className="y-axis-label">S/ 0</div>
        </div>

        {/* Grid and Bars Area */}
        <div className="revenue-bars-container">
          {/* Horizontal grid lines */}
          <div className="revenue-grid-lines">
            {yTicks.map((tick) => (
              <div key={tick} className="grid-line" />
            ))}
            <div className="grid-line grid-line-zero" />
          </div>

          {/* Bars */}
          <div className="revenue-bars-track">
            {bars.map((item, idx) => {
              const targetHeightPercent = Math.min(100, Math.max(5, (item.target / maxScale) * 100));
              const revenueHeightPercent = item.revenue > 0
                ? Math.min(100, Math.max(4, (item.revenue / maxScale) * 100))
                : 0;
              const isHovered = hoveredBar === idx;

              return (
                <div
                  key={idx}
                  className="bar-column-group"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="bar-hover-tooltip">
                      <div className="tooltip-title">{item.label}</div>
                      <div className="tooltip-value">{formatCurrency(item.revenue)}</div>
                      <div className="tooltip-meta">
                        <span>{item.orders} órdenes</span>
                        <span>Meta: {formatCurrency(item.target)}</span>
                      </div>
                    </div>
                  )}

                  {/* Dual tone stacked bar */}
                  <div className="bar-dual-track">
                    {/* Background Target Bar (Soft peach/coral container) */}
                    <div
                      className="bar-target-bg"
                      style={{ height: `${targetHeightPercent}%` }}
                    />
                    {/* Foreground Revenue Bar (Solid warm coral/orange) */}
                    <div
                      className={`bar-revenue-fill ${isHovered ? 'bar-fill-hovered' : ''}`}
                      style={{ height: `${revenueHeightPercent}%` }}
                    />
                  </div>

                  {/* X Axis Label */}
                  <span className={`bar-x-label ${isHovered ? 'bar-x-label-active' : ''}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart Footer with legend */}
      <div className="revenue-chart-footer">
        <div className="chart-legend-item">
          <span className="legend-indicator fill-primary" />
          <span className="legend-text">Ingresos Reales Facturados</span>
        </div>
        <div className="chart-legend-item">
          <span className="legend-indicator fill-target" />
          <span className="legend-text">Proyección / Capacidad Estimada</span>
        </div>
        <div className="chart-legend-right">
          <span className="legend-info">Actualización automática al cerrar comanda</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueBarChart;
