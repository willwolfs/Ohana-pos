// Dashboard Data Structure - Zero initial data

export const PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

export const DASHBOARD_ZERO_DATA = {
  [PERIODS.DAY]: {
    label: 'Hoy (Día)',
    periodDescription: 'Ventas registradas hoy en tiempo real',
    metrics: {
      sales: { value: 0, change: '0% vs ayer', positive: true, note: 'Sin ventas hoy' },
      orders: { value: 0, change: '0 órdenes', positive: true, note: 'Punto de venta listo' },
      averageTicket: { value: 0, change: 'S/ 0.00', positive: true, note: 'Promedio inicial' },
      users: { value: 0, change: '0 clientes', positive: true, note: 'Sin comensales' },
    },
    revenueChart: {
      maxScale: 1000,
      step: 200,
      unit: 'S/',
      bars: [
        { label: '12:00', revenue: 0, target: 100, orders: 0 },
        { label: '14:00', revenue: 0, target: 100, orders: 0 },
        { label: '16:00', revenue: 0, target: 100, orders: 0 },
        { label: '18:00', revenue: 0, target: 100, orders: 0 },
        { label: '20:00', revenue: 0, target: 100, orders: 0 },
        { label: '22:00', revenue: 0, target: 100, orders: 0 },
      ],
    },
    modality: {
      totalCount: 0,
      items: [
        { key: 'mesa', label: 'Salón / Mesa', count: 0, percentage: 0, amount: 0, color: '#f97316' },
        { key: 'llevar', label: 'Para Llevar (Takeaway)', count: 0, percentage: 0, amount: 0, color: '#facc15' },
        { key: 'delivery', label: 'Delivery', count: 0, percentage: 0, amount: 0, color: '#06b6d4' },
      ],
    },
    paymentMethods: [
      { key: 'yape', name: 'Yape / Plin', count: 0, amount: 0, percentage: 0, color: '#8b5cf6', isLeader: false },
      { key: 'tarjeta', name: 'Tarjeta (POS Visa/MC)', count: 0, amount: 0, percentage: 0, color: '#3b82f6', isLeader: false },
      { key: 'efectivo', name: 'Efectivo en Caja', count: 0, amount: 0, percentage: 0, color: '#10b981', isLeader: false },
      { key: 'mixto', name: 'Pago Mixto', count: 0, amount: 0, percentage: 0, color: '#f59e0b', isLeader: false },
    ],
  },

  [PERIODS.WEEK]: {
    label: 'Esta Semana',
    periodDescription: 'Consolidado acumulado semanal',
    metrics: {
      sales: { value: 0, change: '0%', positive: true, note: 'Sin ventas' },
      orders: { value: 0, change: '0 órdenes', positive: true, note: 'Sin pedidos' },
      averageTicket: { value: 0, change: 'S/ 0.00', positive: true, note: 'Sin promedio' },
      users: { value: 0, change: '0 clientes', positive: true, note: 'Sin usuarios' },
    },
    revenueChart: {
      maxScale: 1000,
      step: 200,
      unit: 'S/',
      bars: [
        { label: 'Lun', revenue: 0, target: 150, orders: 0 },
        { label: 'Mar', revenue: 0, target: 150, orders: 0 },
        { label: 'Mié', revenue: 0, target: 150, orders: 0 },
        { label: 'Jue', revenue: 0, target: 150, orders: 0 },
        { label: 'Vie', revenue: 0, target: 150, orders: 0 },
        { label: 'Sáb', revenue: 0, target: 150, orders: 0 },
        { label: 'Dom', revenue: 0, target: 150, orders: 0 },
      ],
    },
    modality: {
      totalCount: 0,
      items: [
        { key: 'mesa', label: 'Salón / Mesa', count: 0, percentage: 0, amount: 0, color: '#f97316' },
        { key: 'llevar', label: 'Para Llevar (Takeaway)', count: 0, percentage: 0, amount: 0, color: '#facc15' },
        { key: 'delivery', label: 'Delivery', count: 0, percentage: 0, amount: 0, color: '#06b6d4' },
      ],
    },
    paymentMethods: [
      { key: 'yape', name: 'Yape / Plin', count: 0, amount: 0, percentage: 0, color: '#8b5cf6', isLeader: false },
      { key: 'tarjeta', name: 'Tarjeta (POS Visa/MC)', count: 0, amount: 0, percentage: 0, color: '#3b82f6', isLeader: false },
      { key: 'efectivo', name: 'Efectivo en Caja', count: 0, amount: 0, percentage: 0, color: '#10b981', isLeader: false },
      { key: 'mixto', name: 'Pago Mixto', count: 0, amount: 0, percentage: 0, color: '#f59e0b', isLeader: false },
    ],
  },

  [PERIODS.MONTH]: {
    label: 'Meses del Año',
    periodDescription: 'Resumen consolidado mes a mes',
    metrics: {
      sales: { value: 0, change: '0%', positive: true, note: 'Sin ventas' },
      orders: { value: 0, change: '0 órdenes', positive: true, note: 'Sin pedidos' },
      averageTicket: { value: 0, change: 'S/ 0.00', positive: true, note: 'Sin promedio' },
      users: { value: 0, change: '0 clientes', positive: true, note: 'Sin usuarios' },
    },
    revenueChart: {
      maxScale: 1000,
      step: 200,
      unit: 'S/',
      bars: [
        { label: 'Ene', revenue: 0, target: 100, orders: 0 },
        { label: 'Feb', revenue: 0, target: 100, orders: 0 },
        { label: 'Mar', revenue: 0, target: 100, orders: 0 },
        { label: 'Abr', revenue: 0, target: 100, orders: 0 },
        { label: 'May', revenue: 0, target: 100, orders: 0 },
        { label: 'Jun', revenue: 0, target: 100, orders: 0 },
        { label: 'Jul', revenue: 0, target: 100, orders: 0 },
        { label: 'Ago', revenue: 0, target: 100, orders: 0 },
        { label: 'Set', revenue: 0, target: 100, orders: 0 },
        { label: 'Oct', revenue: 0, target: 100, orders: 0 },
        { label: 'Nov', revenue: 0, target: 100, orders: 0 },
        { label: 'Dic', revenue: 0, target: 100, orders: 0 },
      ],
    },
    modality: {
      totalCount: 0,
      items: [
        { key: 'mesa', label: 'Salón / Mesa', count: 0, percentage: 0, amount: 0, color: '#f97316' },
        { key: 'llevar', label: 'Para Llevar (Takeaway)', count: 0, percentage: 0, amount: 0, color: '#facc15' },
        { key: 'delivery', label: 'Delivery', count: 0, percentage: 0, amount: 0, color: '#06b6d4' },
      ],
    },
    paymentMethods: [
      { key: 'yape', name: 'Yape / Plin', count: 0, amount: 0, percentage: 0, color: '#8b5cf6', isLeader: false },
      { key: 'tarjeta', name: 'Tarjeta (POS Visa/MC)', count: 0, amount: 0, percentage: 0, color: '#3b82f6', isLeader: false },
      { key: 'efectivo', name: 'Efectivo en Caja', count: 0, amount: 0, percentage: 0, color: '#10b981', isLeader: false },
      { key: 'mixto', name: 'Pago Mixto', count: 0, amount: 0, percentage: 0, color: '#f59e0b', isLeader: false },
    ],
  },

  [PERIODS.YEAR]: {
    label: 'Comparativa Anual',
    periodDescription: 'Ventas consolidadas por año',
    metrics: {
      sales: { value: 0, change: '0%', positive: true, note: 'Sin ventas anuales' },
      orders: { value: 0, change: '0 órdenes', positive: true, note: 'Sin pedidos' },
      averageTicket: { value: 0, change: 'S/ 0.00', positive: true, note: 'Sin promedio' },
      users: { value: 0, change: '0 clientes', positive: true, note: 'Sin usuarios' },
    },
    revenueChart: {
      maxScale: 1000,
      step: 200,
      unit: 'S/',
      bars: [
        { label: '2023', revenue: 0, target: 200, orders: 0 },
        { label: '2024', revenue: 0, target: 300, orders: 0 },
        { label: '2025', revenue: 0, target: 400, orders: 0 },
        { label: '2026', revenue: 0, target: 500, orders: 0 },
      ],
    },
    modality: {
      totalCount: 0,
      items: [
        { key: 'mesa', label: 'Salón / Mesa', count: 0, percentage: 0, amount: 0, color: '#f97316' },
        { key: 'llevar', label: 'Para Llevar (Takeaway)', count: 0, percentage: 0, amount: 0, color: '#facc15' },
        { key: 'delivery', label: 'Delivery', count: 0, percentage: 0, amount: 0, color: '#06b6d4' },
      ],
    },
    paymentMethods: [
      { key: 'yape', name: 'Yape / Plin', count: 0, amount: 0, percentage: 0, color: '#8b5cf6', isLeader: false },
      { key: 'tarjeta', name: 'Tarjeta (POS Visa/MC)', count: 0, amount: 0, percentage: 0, color: '#3b82f6', isLeader: false },
      { key: 'efectivo', name: 'Efectivo en Caja', count: 0, amount: 0, percentage: 0, color: '#10b981', isLeader: false },
      { key: 'mixto', name: 'Pago Mixto', count: 0, amount: 0, percentage: 0, color: '#f59e0b', isLeader: false },
    ],
  },
};

export const DASHBOARD_DATA = DASHBOARD_ZERO_DATA;
export const RECENT_ORDERS_DATA = [];
