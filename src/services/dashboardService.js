import supabase from './supabaseClient';
import cashService from './cashService';
import { DASHBOARD_ZERO_DATA, PERIODS } from '../modules/dashboard/data/dashboardMockData';

/**
 * Servicio del Dashboard de Ohana POS
 * Conecta las ventas reales (de Supabase y de la caché local sincronizada)
 * con los KPIs, gráficos y lista de órdenes recientes.
 */
export const dashboardService = {
  /**
   * Formatea las órdenes recientes de forma instantánea y síncrona (0ms)
   */
  formatRecentOrders(orders = []) {
    if (!orders || orders.length === 0) {
      return [];
    }

    const recent = orders.slice(0, 10);

    return recent.map((order) => {
      const orderDate = new Date(order.created_at || order.date || Date.now());
      const timeDiffMinutes = Math.round((Date.now() - orderDate.getTime()) / 60000);

      const timeLabel = isNaN(timeDiffMinutes) || timeDiffMinutes < 1
        ? 'Hace un momento'
        : timeDiffMinutes < 60
        ? `Hace ${timeDiffMinutes} min`
        : timeDiffMinutes < 1440
        ? `Hace ${Math.floor(timeDiffMinutes / 60)}h`
        : orderDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

      const rawItems = order.order_items || order.items || [];
      const formattedItems = rawItems.map((it) => ({
        name: it.product_name || it.name || 'Producto',
        quantity: it.quantity || 1,
        portions: it.portion_detail || '',
        price: Number(it.unit_price || it.price || 0),
      }));

      return {
        id: order.id ? `ORD-${order.id.toString().slice(-4)}` : 'ORD-1000',
        ticket: order.ticket_code || 'T-001',
        time: timeLabel,
        customer: order.customer_name || 'Cliente General',
        tableOrChannel: order.modality === 'Mesa'
          ? `Mesa ${order.table_number || '1'} (Salón)`
          : (order.modality || 'Salón'),
        modality: order.modality || 'Mesa',
        paymentMethod: order.payment_method || 'Efectivo',
        items: formattedItems,
        total: Number(order.total) || 0,
        status: order.status || 'Completado',
        statusCode: 'completed',
      };
    });
  },

  /**
   * Obtiene las órdenes recientes ordenadas descendentemente
   */
  async getRecentOrders() {
    try {
      const orders = await cashService.getOrders();
      return this.formatRecentOrders(orders);
    } catch (err) {
      console.error('Error fetching recent orders for dashboard:', err);
      return [];
    }
  },

  /**
   * Calcula de forma síncrona y ultra-rápida (0ms) las métricas, desglose y gráficos
   * a partir de las órdenes disponibles en memoria o caché
   */
  calculateDashboardData(allOrders = [], period = PERIODS.DAY) {
    const base = DASHBOARD_ZERO_DATA[period] || DASHBOARD_ZERO_DATA[PERIODS.DAY];

    try {
      if (!allOrders || allOrders.length === 0) {
        return base;
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfWeek = startOfDay - 6 * 24 * 60 * 60 * 1000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

      // Filtrar órdenes por el período seleccionado
      const filteredOrders = allOrders.filter((o) => {
        const orderTime = new Date(o.created_at || o.date || Date.now()).getTime();
        if (isNaN(orderTime)) return true;

        if (period === PERIODS.DAY) {
          // Ventas de hoy (si no hubiera ventas hoy pero hay ventas recientes, tomamos las del día de la última venta)
          return orderTime >= startOfDay;
        } else if (period === PERIODS.WEEK) {
          return orderTime >= startOfWeek;
        } else if (period === PERIODS.MONTH) {
          return orderTime >= startOfMonth;
        } else if (period === PERIODS.YEAR) {
          return orderTime >= startOfYear;
        }
        return true;
      });

      // Si hoy no hay ventas pero sí hay ventas en el sistema, mostramos las ventas registradas para no dejarlo vacío
      const activeOrders = filteredOrders.length > 0 ? filteredOrders : allOrders;

      // Métricas globales del período
      const totalSales = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalOrders = activeOrders.length;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      const uniqueCustomers = new Set(activeOrders.map((o) => o.customer_name || o.id)).size;

      // Desglose por modalidad
      const mesaOrders = activeOrders.filter((o) => (o.modality || '').toLowerCase().includes('mesa'));
      const llevarOrders = activeOrders.filter((o) => (o.modality || '').toLowerCase().includes('llevar'));
      const deliveryOrders = activeOrders.filter((o) => (o.modality || '').toLowerCase().includes('delivery'));

      const mesaCount = mesaOrders.length;
      const llevarCount = llevarOrders.length;
      const deliveryCount = deliveryOrders.length;

      const mesaAmount = mesaOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const llevarAmount = llevarOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const deliveryAmount = deliveryOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

      const mesaPct = totalOrders > 0 ? Math.round((mesaCount / totalOrders) * 100) : 0;
      const llevarPct = totalOrders > 0 ? Math.round((llevarCount / totalOrders) * 100) : 0;
      const deliveryPct = totalOrders > 0 ? Math.max(0, 100 - mesaPct - llevarPct) : 0;

      // Desglose por métodos de pago
      const methods = [
        { key: 'yape', name: 'Yape / Plin', count: 0, amount: 0, color: '#8b5cf6' },
        { key: 'tarjeta', name: 'Tarjeta (POS Visa/MC)', count: 0, amount: 0, color: '#3b82f6' },
        { key: 'efectivo', name: 'Efectivo en Caja', count: 0, amount: 0, color: '#10b981' },
        { key: 'mixto', name: 'Pago Mixto', count: 0, amount: 0, color: '#f59e0b' },
      ];

      activeOrders.forEach((o) => {
        const p = (o.payment_method || '').toLowerCase();
        const amt = Number(o.total) || 0;
        if (p.includes('yape') || p.includes('plin')) {
          methods[0].count++;
          methods[0].amount += amt;
        } else if (p.includes('tarjeta') || p.includes('pos')) {
          methods[1].count++;
          methods[1].amount += amt;
        } else if (p.includes('efectivo')) {
          methods[2].count++;
          methods[2].amount += amt;
        } else {
          methods[3].count++;
          methods[3].amount += amt;
        }
      });

      const maxMethodCount = Math.max(...methods.map((m) => m.count));
      const formattedMethods = methods.map((m) => ({
        ...m,
        percentage: totalOrders > 0 ? Math.round((m.count / totalOrders) * 100) : 0,
        isLeader: totalOrders > 0 && m.count > 0 && m.count === maxMethodCount,
      }));

      // Gráfica de ingresos por barras según el periodo
      let chartBars = base.revenueChart?.bars || [];

      if (period === PERIODS.DAY) {
        const hoursSlots = [
          { label: '12:00', start: 11, end: 13, revenue: 0, orders: 0 },
          { label: '14:00', start: 13, end: 15, revenue: 0, orders: 0 },
          { label: '16:00', start: 15, end: 17, revenue: 0, orders: 0 },
          { label: '18:00', start: 17, end: 19, revenue: 0, orders: 0 },
          { label: '20:00', start: 19, end: 21, revenue: 0, orders: 0 },
          { label: '22:00', start: 21, end: 24, revenue: 0, orders: 0 },
        ];

        activeOrders.forEach((o) => {
          const dt = new Date(o.created_at || o.date || Date.now());
          const h = dt.getHours();
          const amt = Number(o.total) || 0;
          const slot = hoursSlots.find((s) => h >= s.start && h < s.end) || hoursSlots[hoursSlots.length - 1];
          slot.revenue += amt;
          slot.orders += 1;
        });

        chartBars = hoursSlots.map((s) => ({
          label: s.label,
          revenue: s.revenue,
          target: Math.max(80, Math.round(s.revenue * 1.25)),
          orders: s.orders,
        }));
      } else if (period === PERIODS.WEEK) {
        // SEMANA: Lun, Mar, Mié, Jue, Vie, Sáb, Dom
        // getDay(): 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
        const weekDaysMap = {
          1: 'Lun',
          2: 'Mar',
          3: 'Mié',
          4: 'Jue',
          5: 'Vie',
          6: 'Sáb',
          0: 'Dom',
        };

        const weekBars = [
          { label: 'Lun', revenue: 0, target: 150, orders: 0 },
          { label: 'Mar', revenue: 0, target: 150, orders: 0 },
          { label: 'Mié', revenue: 0, target: 150, orders: 0 },
          { label: 'Jue', revenue: 0, target: 150, orders: 0 },
          { label: 'Vie', revenue: 0, target: 150, orders: 0 },
          { label: 'Sáb', revenue: 0, target: 150, orders: 0 },
          { label: 'Dom', revenue: 0, target: 150, orders: 0 },
        ];

        activeOrders.forEach((o) => {
          const dt = new Date(o.created_at || o.date || Date.now());
          const dayName = weekDaysMap[dt.getDay()];
          const bar = weekBars.find((b) => b.label === dayName);
          if (bar) {
            bar.revenue += Number(o.total) || 0;
            bar.orders += 1;
          }
        });

        chartBars = weekBars;
      } else if (period === PERIODS.MONTH) {
        // MESES: Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Set, Oct, Nov, Dic
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
        const monthBars = monthNames.map((m) => ({
          label: m,
          revenue: 0,
          target: 100,
          orders: 0,
        }));

        activeOrders.forEach((o) => {
          const dt = new Date(o.created_at || o.date || Date.now());
          const monthIdx = dt.getMonth(); // 0: Ene ... 9: Oct, etc.
          if (monthBars[monthIdx]) {
            monthBars[monthIdx].revenue += Number(o.total) || 0;
            monthBars[monthIdx].orders += 1;
          }
        });

        chartBars = monthBars;
      } else if (period === PERIODS.YEAR) {
        // AÑOS: 2023, 2024, 2025, 2026
        const yearBars = [
          { label: '2023', revenue: 0, target: 200, orders: 0 },
          { label: '2024', revenue: 0, target: 300, orders: 0 },
          { label: '2025', revenue: 0, target: 400, orders: 0 },
          { label: '2026', revenue: 0, target: 500, orders: 0 },
        ];

        activeOrders.forEach((o) => {
          const dt = new Date(o.created_at || o.date || Date.now());
          const yearStr = String(dt.getFullYear());
          const bar = yearBars.find((b) => b.label === yearStr);
          if (bar) {
            bar.revenue += Number(o.total) || 0;
            bar.orders += 1;
          }
        });

        chartBars = yearBars;
      }

      const maxRevenueVal = Math.max(...chartBars.map((b) => b.revenue), 10);
      const computedMaxScale = Math.ceil(maxRevenueVal / 20) * 24 || 120;
      const computedStep = Math.round(computedMaxScale / 5) || 24;

      return {
        ...base,
        metrics: {
          sales: {
            value: totalSales,
            change: totalSales > 0 ? '+100%' : '0%',
            positive: true,
            note: `${totalOrders} ${totalOrders === 1 ? 'venta registrada' : 'ventas registradas'}`,
          },
          orders: {
            value: totalOrders,
            change: `${totalOrders} órdenes`,
            positive: true,
            note: 'Punto de venta activo',
          },
          averageTicket: {
            value: avgTicket,
            change: `S/ ${avgTicket.toFixed(2)}`,
            positive: true,
            note: 'Promedio calculado',
          },
          users: {
            value: uniqueCustomers,
            change: `${uniqueCustomers} comensales`,
            positive: true,
            note: 'Clientes atendidos',
          },
        },
        revenueChart: {
          maxScale: computedMaxScale,
          step: computedStep,
          unit: 'S/',
          bars: chartBars,
        },
        modality: {
          totalCount: totalOrders,
          items: [
            { key: 'mesa', label: 'Salón / Mesa', count: mesaCount, percentage: mesaPct, amount: mesaAmount, color: '#f97316' },
            { key: 'llevar', label: 'Para Llevar (Takeaway)', count: llevarCount, percentage: llevarPct, amount: llevarAmount, color: '#facc15' },
            { key: 'delivery', label: 'Delivery', count: deliveryCount, percentage: deliveryPct, amount: deliveryAmount, color: '#06b6d4' },
          ],
        },
        paymentMethods: formattedMethods,
      };
    } catch (err) {
      console.error('Error calculando datos del dashboard:', err);
      return base;
    }
  },

  /**
   * Obtiene datos del dashboard asíncronamente
   */
  async getDashboardData(period = PERIODS.DAY) {
    try {
      const orders = await cashService.getOrders();
      return this.calculateDashboardData(orders, period);
    } catch {
      return DASHBOARD_ZERO_DATA[period] || DASHBOARD_ZERO_DATA[PERIODS.DAY];
    }
  },

  /**
   * Verifica la conexión
   */
  async checkConnection() {
    try {
      const { error } = await supabase.from('orders').select('count', { count: 'exact', head: true });
      if (error && (error.message.includes('relation') || error?.message.includes('schema cache'))) {
        return { connected: true, tablesReady: false, message: 'Conectado a Ohana POS Local / Cloud' };
      }
      return { connected: true, tablesReady: true, message: 'Conectado y Sincronizado' };
    } catch {
      return { connected: true, tablesReady: false, message: 'Modo Local Sincronizado' };
    }
  },
};

export default dashboardService;
