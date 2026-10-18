import React from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import Card from '../../../components/common/Card';
import { formatCurrency } from '../../../utils/formatCurrency';

export const DashboardMetrics = ({ metrics, periodLabel, activePeriod }) => {
  const isDay = !activePeriod || activePeriod === 'day' || activePeriod === 'DAY';
  const cards = [
    {
      id: 'sales',
      title: isDay ? 'Ventas de Hoy' : 'Ventas',
      subtitle: isDay ? 'Hoy en tiempo real' : (periodLabel || 'Período actual'),
      value: formatCurrency(metrics?.sales?.value || 0),
      icon: DollarSign,
      iconClass: 'icon-sales',
      change: metrics?.sales?.change || '+0%',
      positive: metrics?.sales?.positive ?? true,
      note: isDay ? 'Ventas del día' : (metrics?.sales?.note || 'Meta comercial'),
    },
    {
      id: 'orders',
      title: 'Órdenes Realizadas',
      subtitle: 'Comandas facturadas',
      value: (metrics?.orders?.value || 0).toLocaleString('es-PE'),
      icon: ShoppingBag,
      iconClass: 'icon-orders',
      change: metrics?.orders?.change || '+0%',
      positive: metrics?.orders?.positive ?? true,
      note: metrics?.orders?.note || 'Total de pedidos',
    },
    {
      id: 'averageTicket',
      title: 'Ticket Promedio',
      subtitle: 'Gasto medio por orden',
      value: formatCurrency(metrics?.averageTicket?.value || 0),
      icon: TrendingUp,
      iconClass: 'icon-ticket',
      change: metrics?.averageTicket?.change || '+0%',
      positive: metrics?.averageTicket?.positive ?? true,
      note: metrics?.averageTicket?.note || 'Consumo comensal',
    },
    {
      id: 'users',
      title: 'Usuarios',
      subtitle: 'Clientes y comensales',
      value: (metrics?.users?.value || 0).toLocaleString('es-PE'),
      icon: Users,
      iconClass: 'icon-users',
      change: metrics?.users?.change || '+0 nuevos',
      positive: metrics?.users?.positive ?? true,
      note: metrics?.users?.note || 'Clientes atendidos',
    },
  ];

  return (
    <div className="metrics-grid">
      {cards.map((item) => {
        const IconComponent = item.icon;
        return (
          <Card key={item.id} className="metric-card metric-card-interactive">
            <div className="metric-header">
              <div>
                <span className="metric-title">{item.title}</span>
                <span className="metric-period-pill">{item.subtitle}</span>
              </div>
              <div className={`metric-icon-box ${item.iconClass}`}>
                <IconComponent size={20} />
              </div>
            </div>
            
            <div className="metric-value">{item.value}</div>
            
            <div className="metric-footer">
              <span className={`metric-change ${item.positive ? 'positive' : 'negative'}`}>
                {item.change}
              </span>
              <span className="metric-note">{item.note}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;
