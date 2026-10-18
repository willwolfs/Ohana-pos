import React, { useState, useEffect, useRef } from 'react';
import { Clock, CalendarRange, BarChart3, TrendingUp } from 'lucide-react';
import DashboardMetrics from '../components/DashboardMetrics';
import RevenueBarChart from '../components/RevenueBarChart';
import ModalityPerformanceGauge from '../components/ModalityPerformanceGauge';
import RecentOrdersSection from '../components/RecentOrdersSection';
import { DASHBOARD_ZERO_DATA, PERIODS } from '../data/dashboardMockData';
import { dashboardService } from '../../../services/dashboardService';
import { cashService } from '../../../services/cashService';
import '../styles/Dashboard.css';

export const DashboardPage = () => {
  const [activePeriod, setActivePeriod] = useState(PERIODS.DAY);
  const rawOrdersRef = useRef(cashService.getLocalOrders());

  // Carga ultra-rápida inmediata (0ms): se lee de memoria/caché local en el instante de montaje
  const [orders, setOrders] = useState(() => {
    const local = cashService.getLocalOrders();
    return dashboardService.formatRecentOrders(local);
  });
  const [periodData, setPeriodData] = useState(() => {
    const local = cashService.getLocalOrders();
    return dashboardService.calculateDashboardData(local, PERIODS.DAY);
  });

  const periodsList = [
    { key: PERIODS.DAY, label: 'Día (Hoy)', icon: Clock },
    { key: PERIODS.WEEK, label: 'Semana', icon: CalendarRange },
    { key: PERIODS.MONTH, label: 'Meses', icon: BarChart3 },
    { key: PERIODS.YEAR, label: 'Años', icon: TrendingUp },
  ];

  const currentData = periodData || DASHBOARD_ZERO_DATA[activePeriod] || DASHBOARD_ZERO_DATA[PERIODS.DAY];

  // Cambio de período 100% instantáneo (0ms) sin esperar llamadas a la red
  const handlePeriodChange = (newPeriod) => {
    setActivePeriod(newPeriod);
    const currentOrders = rawOrdersRef.current && rawOrdersRef.current.length > 0
      ? rawOrdersRef.current
      : cashService.getLocalOrders();
    setPeriodData(dashboardService.calculateDashboardData(currentOrders, newPeriod));
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Refrescar instantáneamente con la última información local
    const local = cashService.getLocalOrders();
    rawOrdersRef.current = local;
    setOrders(dashboardService.formatRecentOrders(local));
    setPeriodData(dashboardService.calculateDashboardData(local, activePeriod));

    // 2. Sincronización en segundo plano con Supabase (sin bloquear ni demorar la interfaz)
    cashService.getOrders().then((freshOrders) => {
      if (!isMounted || !freshOrders) return;
      rawOrdersRef.current = freshOrders;
      setOrders(dashboardService.formatRecentOrders(freshOrders));
      setPeriodData(dashboardService.calculateDashboardData(freshOrders, activePeriod));
    }).catch((err) => {
      console.warn('Dashboard background sync notice:', err);
    });

    // 3. Escuchar ventas nuevas emitidas desde el Punto de Venta en tiempo real
    const handleOrdersChange = () => {
      const updated = cashService.getLocalOrders();
      rawOrdersRef.current = updated;
      setOrders(dashboardService.formatRecentOrders(updated));
      setPeriodData(dashboardService.calculateDashboardData(updated, activePeriod));
    };

    window.addEventListener('ohana_orders_updated', handleOrdersChange);
    window.addEventListener('storage', handleOrdersChange);
    window.addEventListener('focus', handleOrdersChange);

    return () => {
      isMounted = false;
      window.removeEventListener('ohana_orders_updated', handleOrdersChange);
      window.removeEventListener('storage', handleOrdersChange);
      window.removeEventListener('focus', handleOrdersChange);
    };
  }, [activePeriod]);

  return (
    <div className="dashboard-page dashboard-page-container">
      {/* Top Header & Tabs estilo Control de Caja */}
      <div className="dashboard-header-block">
        <div className="dashboard-header-info">
          <h1 className="dashboard-page-title">Panel Principal</h1>
          <p className="dashboard-page-subtitle">
            {activePeriod === PERIODS.DAY
              ? 'Ventas registradas hoy en tiempo real '
              : `${currentData.periodDescription} `}
          </p>
        </div>

        {/* Tabs Bar idéntica a Control de Caja */}
        <div className="dashboard-tabs-bar">
          {periodsList.map((p) => {
            const IconComponent = p.icon;
            return (
              <button
                key={p.key}
                type="button"
                className={`dashboard-tab-btn ${activePeriod === p.key ? 'active' : ''}`}
                onClick={() => handlePeriodChange(p.key)}
              >
                <IconComponent size={15} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. CARDS PRINCIPALES: Ventas de Hoy, Órdenes Realizadas, Ticket Promedio, Usuarios */}
      <DashboardMetrics
        metrics={currentData.metrics}
        periodLabel={currentData.label}
        activePeriod={activePeriod}
      />

      {/* 2. PLANTILLA MODELO (IMAGEN 2): Total Revenue (Barras) + Performance (Gauge Semicircular Modalidad) */}
      <div className="dashboard-template-grid">
        <RevenueBarChart
          chartData={currentData.revenueChart}
        />

        <ModalityPerformanceGauge
          modalityData={currentData.modality}
          paymentMethodsData={currentData.paymentMethods}
        />
      </div>

      {/* 3. ÓRDENES RECIENTES VENDIDAS */}
      <RecentOrdersSection
        orders={orders}
      />
    </div>
  );
};

export default DashboardPage;
