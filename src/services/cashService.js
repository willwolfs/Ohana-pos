import supabase from './supabaseClient';
import { safeSetItem, syncAndGetNextBoletaNumber, sanitizeOrderTicketCode, sanitizeOrderItemsForStorage } from '../utils/storageUtils';

const SHIFTS_STORAGE_KEY = 'ohana_closed_shifts_cache';
const MOVEMENTS_STORAGE_KEY = 'ohana_cash_movements_cache';
const ORDERS_STORAGE_KEY = 'ohana_orders_cache';
const PARKED_STORAGE_KEY = 'ohana_parked_orders_cache';
const KITCHEN_STORAGE_KEY = 'ohana_kitchen_orders';

const getLocalParkedOrders = () => {
  try {
    const raw = localStorage.getItem(PARKED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getLocalShifts = () => {
  try {
    const raw = localStorage.getItem(SHIFTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getLocalMovements = () => {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getLocalOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    let updated = false;
    const sanitized = list.map((o) => {
      if (o?.ticket_code && o.ticket_code.endsWith('-0000')) {
        updated = true;
        return { ...o, ticket_code: sanitizeOrderTicketCode(o.ticket_code) };
      }
      return o;
    });
    if (updated) {
      safeSetItem(ORDERS_STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
};

let tableCashMovementsAvailable = true;
let tableCashShiftsAvailable = true;
let tableOrdersAvailable = true;

export const cashService = {
  /**
   * Obtiene la lista de cierres de caja filtrada por mes y año
   */
  async getClosedShifts({ month, year } = {}) {
    const targetMonth = month !== undefined ? month : new Date().getMonth();
    const targetYear = year !== undefined ? year : new Date().getFullYear();

    let shifts = [];

    if (tableCashShiftsAvailable) {
      try {
        const { data, error, status } = await supabase
          .from('cash_shifts')
          .select('*')
          .eq('status', 'Cerrada')
          .order('closed_at', { ascending: false });

        if (status === 404 || error?.code === '42P01' || error?.message?.includes('404')) {
          tableCashShiftsAvailable = false;
          shifts = getLocalShifts();
        } else if (!error && data && data.length > 0) {
          shifts = data;
        } else {
          shifts = getLocalShifts();
        }
      } catch {
        shifts = getLocalShifts();
      }
    } else {
      shifts = getLocalShifts();
    }

    // Filtrar por el mes y año seleccionado
    return shifts.filter((s) => {
      const d = new Date(s.closed_at || s.opened_at || s.date);
      if (isNaN(d.getTime())) return true;
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
  },

  /**
   * Obtiene la lista de movimientos de ingreso/egreso filtrada por mes y año
   */
  async getCashMovements({ month, year } = {}) {
    const targetMonth = month !== undefined ? month : new Date().getMonth();
    const targetYear = year !== undefined ? year : new Date().getFullYear();

    let movements = [];

    if (tableCashMovementsAvailable) {
      try {
        const { data, error, status } = await supabase
          .from('cash_movements')
          .select('*')
          .order('created_at', { ascending: false });

        if (status === 404 || error?.code === '42P01' || error?.message?.includes('404')) {
          tableCashMovementsAvailable = false;
          movements = getLocalMovements();
        } else if (!error && data && data.length > 0) {
          movements = data;
        } else {
          movements = getLocalMovements();
        }
      } catch {
        movements = getLocalMovements();
      }
    } else {
      movements = getLocalMovements();
    }

    // Filtrar por el mes y año seleccionado
    return movements.filter((m) => {
      const d = new Date(m.created_at || m.date);
      if (isNaN(d.getTime())) return true;
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
  },

  /**
   * Registra un nuevo movimiento de caja (Ingreso o Egreso)
   */
  async recordMovement({ type, amount, concept, user_name, shift_id = null, payment_method = 'Efectivo' }) {
    const newMovement = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mov-${Date.now()}`,
      type: type === 'Egreso' ? 'Egreso' : 'Ingreso',
      amount: Number(amount) || 0,
      concept: (concept || 'Movimiento manual').trim(),
      user_name: user_name || 'Admin Ohana',
      shift_id,
      payment_method,
      created_at: new Date().toISOString(),
    };

    // 1. Guardar en caché local
    try {
      const local = getLocalMovements();
      local.unshift(newMovement);
      safeSetItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Notice saving local movement:', e);
    }

    // 2. Intentar guardar en Supabase si la tabla está disponible
    if (tableCashMovementsAvailable) {
      try {
        const { error, status } = await supabase.from('cash_movements').insert([newMovement]);
        if (status === 404 || error?.code === '42P01') {
          tableCashMovementsAvailable = false;
        }
      } catch {
        // ignore
      }
    }

    return { success: true, movement: newMovement };
  },

  /**
   * Registra el cierre de una caja y lo almacena en el historial
   */
  async saveClosedShift(shiftData) {
    const closedRecord = {
      id: shiftData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `shift-${Date.now()}`),
      user_name: shiftData.cashierName || shiftData.user_name || 'Admin Ohana',
      opening_amount: Number(shiftData.opening_amount || shiftData.initialCash) || 0,
      sales_amount: Number(shiftData.sales_amount || shiftData.sales) || 0,
      total_general: Number(shiftData.total_general) || 0,
      closing_amount: Number(shiftData.closing_amount || shiftData.countedCash) || 0,
      difference: Number(shiftData.difference) || 0,
      status: 'Cerrada',
      opened_at: shiftData.opened_at || shiftData.openedAt || new Date().toISOString(),
      closed_at: shiftData.closed_at || shiftData.closedAt || new Date().toISOString(),
      notes: shiftData.notes || '',
    };

    // 1. Guardar en caché local
    try {
      const local = getLocalShifts();
      local.unshift(closedRecord);
      safeSetItem(SHIFTS_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Notice saving local closed shift:', e);
    }

    // 2. Intentar guardar en Supabase
    if (tableCashShiftsAvailable) {
      try {
        const { error, status } = await supabase.from('cash_shifts').upsert([closedRecord]);
        if (status === 404 || error?.code === '42P01') {
          tableCashShiftsAvailable = false;
        }
      } catch {
        // ignore
      }
    }

    return { success: true, shift: closedRecord };
  },

  /**
   * Elimina un cierre de caja del historial y elimina en cascada
   * todas las ventas y movimientos asociados a dicha caja
   */
  async deleteClosedShift(id, shiftObj = null) {
    let targetShift = shiftObj;
    if (!targetShift) {
      const allShifts = getLocalShifts();
      targetShift = allShifts.find((s) => String(s.id) === String(id));
    }

    // 1. Eliminar la caja de la caché local de cierres
    try {
      const local = getLocalShifts().filter((s) => String(s.id) !== String(id));
      safeSetItem(SHIFTS_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Error deleting local shift:', e);
    }

    // 2. Eliminar en cascada las ventas asociadas a este turno
    const deletedOrderIds = [];
    try {
      const allOrders = getLocalOrders();
      const shiftStartTime = targetShift?.opened_at || targetShift?.openedAt
        ? new Date(targetShift.opened_at || targetShift.openedAt).getTime()
        : null;
      const shiftEndTime = targetShift?.closed_at || targetShift?.closedAt
        ? new Date(targetShift.closed_at || targetShift.closedAt).getTime()
        : null;

      const remainingOrders = allOrders.filter((order) => {
        // Coincidencia exacta por ID de turno
        if (order.shift_id && String(order.shift_id) === String(id)) {
          if (order.id) deletedOrderIds.push(order.id);
          return false;
        }

        // Si la venta tiene asignado otro turno distinto, conservarla
        if (order.shift_id && String(order.shift_id) !== String(id)) {
          return true;
        }

        // Si no tiene shift_id explícito, comparar rango de tiempo del turno
        if (shiftStartTime && shiftEndTime && !isNaN(shiftStartTime) && !isNaN(shiftEndTime)) {
          const orderTime = new Date(order.created_at || order.date).getTime();
          if (!isNaN(orderTime) && orderTime >= (shiftStartTime - 1000) && orderTime <= (shiftEndTime + 2000)) {
            if (order.id) deletedOrderIds.push(order.id);
            return false;
          }
        }

        return true;
      });

      safeSetItem(ORDERS_STORAGE_KEY, JSON.stringify(remainingOrders));
      syncAndGetNextBoletaNumber(remainingOrders);
    } catch (e) {
      console.warn('Error deleting associated orders from shift:', e);
    }


    // 3. Eliminar en cascada los movimientos asociados a esta caja
    const deletedMovementIds = [];
    try {
      const allMovements = getLocalMovements();
      const shiftStartTime = targetShift?.opened_at || targetShift?.openedAt
        ? new Date(targetShift.opened_at || targetShift.openedAt).getTime()
        : null;
      const shiftEndTime = targetShift?.closed_at || targetShift?.closedAt
        ? new Date(targetShift.closed_at || targetShift.closedAt).getTime()
        : null;

      const remainingMovements = allMovements.filter((mov) => {
        if (mov.shift_id && String(mov.shift_id) === String(id)) {
          if (mov.id) deletedMovementIds.push(mov.id);
          return false;
        }

        if (mov.shift_id && String(mov.shift_id) !== String(id)) {
          return true;
        }

        if (shiftStartTime && shiftEndTime && !isNaN(shiftStartTime) && !isNaN(shiftEndTime)) {
          const movTime = new Date(mov.created_at || mov.date).getTime();
          if (!isNaN(movTime) && movTime >= (shiftStartTime - 1000) && movTime <= (shiftEndTime + 2000)) {
            if (mov.id) deletedMovementIds.push(mov.id);
            return false;
          }
        }

        return true;
      });

      safeSetItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(remainingMovements));
    } catch (e) {
      console.warn('Error deleting associated movements from shift:', e);
    }

    // 4. Intentar eliminar en Supabase si las tablas existen
    if (tableCashShiftsAvailable) {
      try {
        await supabase.from('cash_shifts').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    if (tableOrdersAvailable) {
      try {
        await supabase.from('orders').delete().eq('shift_id', id);
        if (deletedOrderIds.length > 0) {
          await supabase.from('orders').delete().in('id', deletedOrderIds);
        }
      } catch {
        // ignore
      }
    }

    if (tableCashMovementsAvailable) {
      try {
        await supabase.from('cash_movements').delete().eq('shift_id', id);
        if (deletedMovementIds.length > 0) {
          await supabase.from('cash_movements').delete().in('id', deletedMovementIds);
        }
      } catch {
        // ignore
      }
    }

    // 5. Notificar a toda la aplicación para refrescar tablas, dashboard y ventas
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_shift_updated'));
      window.dispatchEvent(new CustomEvent('ohana_orders_updated'));
      window.dispatchEvent(new CustomEvent('ohana_movements_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, deletedOrdersCount: deletedOrderIds.length };
  },

  /**
   * Elimina un movimiento de ingreso o egreso
   */
  async deleteMovement(id) {
    try {
      const local = getLocalMovements().filter((m) => String(m.id) !== String(id));
      safeSetItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Error deleting local movement:', e);
    }

    if (tableCashMovementsAvailable) {
      try {
        await supabase.from('cash_movements').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_movements_updated'));
    }

    return { success: true };
  },

  /**
   * Obtiene instantáneamente las órdenes de la caché local sin esperar red (0ms)
   */
  getLocalOrders() {
    return getLocalOrders();
  },

  /**
   * Obtiene todos los pedidos/ventas (desde Supabase o caché local)
   */
  async getOrders() {
    let orders = getLocalOrders();

    if (tableOrdersAvailable) {
      try {
        const fetchPromise = supabase
          .from('orders')
          .select(`
            *,
            order_items (
              product_name,
              quantity,
              portion_detail,
              unit_price
            )
          `)
          .order('created_at', { ascending: false });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 2500)
        );

        const { data, error, status } = await Promise.race([fetchPromise, timeoutPromise]);

        if (status === 404 || error?.code === '42P01' || error?.message?.includes('404')) {
          tableOrdersAvailable = false;
        } else if (!error && data && data.length > 0) {
          orders = data;
          safeSetItem(ORDERS_STORAGE_KEY, JSON.stringify(data));
          syncAndGetNextBoletaNumber(data);
        }

      } catch {
        // En caso de timeout o desconexión, usamos las órdenes locales inmediatas
      }
    }

    return orders;
  },

  /**
   * Obtiene las ventas pertenecientes a un turno activo
   */
  async getSessionOrders({ shiftOpenedAt, shiftId } = {}) {
    const allOrders = await this.getOrders();
    if (!shiftOpenedAt && !shiftId) return [];

    const shiftStartTime = shiftOpenedAt ? new Date(shiftOpenedAt).getTime() : 0;

    return allOrders.filter((o) => {
      if (shiftId && o.shift_id) {
        return o.shift_id === shiftId;
      }
      const orderTime = new Date(o.created_at || o.date).getTime();
      return !isNaN(orderTime) && orderTime >= shiftStartTime;
    });
  },

  /**
   * Registra una venta / pedido y notifica reactivamente
   */
  async recordOrder(orderData) {
    const rawItems = orderData.items || orderData.order_items || [];
    const cleanItems = sanitizeOrderItemsForStorage(rawItems);

    const newOrder = {
      id: orderData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`),
      ticket_code: sanitizeOrderTicketCode(orderData.ticket_code) || `B001-${Date.now().toString().slice(-4)}`,
      customer_name: orderData.customer_name || 'Cliente General',
      modality: orderData.modality || 'Mesa',
      table_number: orderData.table_number || '',
      payment_method: orderData.payment_method || 'Efectivo',
      total: Number(orderData.total) || 0,
      status: orderData.status || 'Completado',
      created_at: orderData.created_at || new Date().toISOString(),
      shift_id: orderData.shift_id || null,
      cashier_name: orderData.cashier_name || 'Admin Ohana',
      mixed_cash: Number(orderData.mixed_cash || orderData.mixedCash) || 0,
      mixed_yape: Number(orderData.mixed_yape || orderData.mixedYape) || 0,
      mixed_card: Number(orderData.mixed_card || orderData.mixedCard) || 0,
      items: cleanItems,
      order_items: cleanItems,
      items_summary: orderData.items_summary || (
        Array.isArray(cleanItems) && cleanItems.length > 0
          ? cleanItems.map((it) => `${it.quantity || 1}x ${it.product_name || it.name}`).join(', ')
          : 'Comanda POS'
      ),
    };

    // 1. Guardar en almacenamiento local
    try {
      const local = getLocalOrders();
      const existingIdx = local.findIndex((o) => String(o.id) === String(newOrder.id));
      if (existingIdx >= 0) {
        local[existingIdx] = {
          ...local[existingIdx],
          ...newOrder,
          updated_at: new Date().toISOString(),
        };
      } else {
        local.unshift(newOrder);
      }
      safeSetItem(ORDERS_STORAGE_KEY, JSON.stringify(local));

      // Si la orden es Pendiente (Aparcada), asegurar persistencia en PARKED_STORAGE_KEY
      const isPending = String(newOrder.status || '').toLowerCase().trim() === 'pendiente';
      try {
        const parked = getLocalParkedOrders();
        if (isPending) {
          const pIdx = parked.findIndex((o) => String(o.id) === String(newOrder.id));
          if (pIdx >= 0) {
            parked[pIdx] = { ...parked[pIdx], ...newOrder };
          } else {
            parked.unshift(newOrder);
          }
        } else {
          // Si la orden ya no es pendiente (ej. completada), quitarla de aparcadas
          const filteredParked = parked.filter((o) => String(o.id) !== String(newOrder.id));
          parked.length = 0;
          parked.push(...filteredParked);
        }
        safeSetItem(PARKED_STORAGE_KEY, JSON.stringify(parked));
      } catch (eParked) {
        console.warn('Notice saving parked order cache:', eParked);
      }

      // Sincronizar automáticamente con la comanda de Cocina (KDS)
      try {
        const rawKitchen = localStorage.getItem(KITCHEN_STORAGE_KEY);
        const kitchenList = rawKitchen ? JSON.parse(rawKitchen) : [];
        const ticketKey = newOrder.ticket_code || newOrder.id;
        const kIdx = kitchenList.findIndex(
          (k) => (k.ticket_code && k.ticket_code === newOrder.ticket_code) ||
                 String(k.id) === String(ticketKey) ||
                 String(k.order_id) === String(newOrder.id)
        );

        const kitchenOrderObj = {
          id: ticketKey,
          order_id: newOrder.id,
          ticket_code: newOrder.ticket_code,
          type: newOrder.modality === 'Mesa' ? 'DINE_IN' : 'TAKEAWAY',
          table: newOrder.modality === 'Mesa'
            ? (newOrder.table_number ? `Mesa ${newOrder.table_number}` : 'Mesa')
            : (newOrder.modality === 'Delivery' ? 'Delivery' : 'Para Llevar'),
          modality: newOrder.modality,
          elapsedMinutes: 0,
          status: kIdx >= 0 ? kitchenList[kIdx].status : 'PENDING',
          created_at: newOrder.created_at || new Date().toISOString(),
          items: cleanItems.map((it) => ({
            name: it.product_name || it.name,
            quantity: it.quantity || 1,
            notes: it.notes || '',
          })),
        };

        if (kIdx >= 0) {
          kitchenList[kIdx] = { ...kitchenList[kIdx], ...kitchenOrderObj };
        } else {
          kitchenList.unshift(kitchenOrderObj);
        }
        safeSetItem(KITCHEN_STORAGE_KEY, JSON.stringify(kitchenList));
      } catch (eKit) {
        console.warn('Notice saving kitchen order cache:', eKit);
      }

      syncAndGetNextBoletaNumber(local);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ohana_orders_updated', { detail: newOrder }));
      }
    } catch (e) {
      console.warn('Notice saving local order:', e);
    }

    // 2. Intentar guardar en Supabase si la tabla está disponible
    if (tableOrdersAvailable) {
      try {
        const payload = {
          id: newOrder.id,
          ticket_code: newOrder.ticket_code,
          customer_name: newOrder.customer_name,
          modality: newOrder.modality,
          table_number: newOrder.table_number,
          payment_method: newOrder.payment_method,
          total: newOrder.total,
          status: newOrder.status,
          created_at: newOrder.created_at,
          shift_id: newOrder.shift_id,
        };
        const { error, status } = await supabase.from('orders').upsert([payload]);

        if (status === 404 || error?.code === '42P01') {
          tableOrdersAvailable = false;
        }
      } catch {
        // ignore
      }
    }

    return { success: true, order: newOrder };
  },

  /**
   * Elimina una orden (ej. orden pendiente o aparcada cancelada)
   */
  async deleteOrder(orderId) {
    try {
      const local = getLocalOrders().filter((o) => String(o.id) !== String(orderId));
      safeSetItem(ORDERS_STORAGE_KEY, JSON.stringify(local));

      const parked = getLocalParkedOrders().filter((o) => String(o.id) !== String(orderId));
      safeSetItem(PARKED_STORAGE_KEY, JSON.stringify(parked));

      try {
        const rawKitchen = localStorage.getItem(KITCHEN_STORAGE_KEY);
        if (rawKitchen) {
          const kList = JSON.parse(rawKitchen).filter(
            (k) => String(k.order_id) !== String(orderId) && String(k.id) !== String(orderId)
          );
          safeSetItem(KITCHEN_STORAGE_KEY, JSON.stringify(kList));
        }
      } catch (eKitDel) {
        console.warn('Notice deleting kitchen order cache:', eKitDel);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ohana_orders_updated'));
      }
      if (tableOrdersAvailable) {
        try {
          await supabase.from('orders').delete().eq('id', orderId);
        } catch {
          // ignore
        }
      }
      return { success: true };
    } catch (e) {
      console.warn('Error deleting order:', e);
      return { success: false, error: e };
    }
  },

  /**
   * Obtiene todas las órdenes actualmente en estado Pendiente (Ventas Aparcadas)
   */
  getPendingOrders() {
    try {
      const parked = getLocalParkedOrders();
      const localOrders = getLocalOrders();
      const pendingInLocal = localOrders.filter((o) => {
        const s = String(o.status || '').toLowerCase().trim();
        return s === 'pendiente';
      });

      // Unir sin duplicados por ID o ticket_code
      const map = new Map();
      parked.forEach((o) => {
        if (o && o.id) map.set(String(o.id), o);
      });
      pendingInLocal.forEach((o) => {
        if (o && o.id && !map.has(String(o.id))) {
          map.set(String(o.id), o);
        }
      });

      const result = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
      );

      safeSetItem(PARKED_STORAGE_KEY, JSON.stringify(result));
      return result;
    } catch {
      return [];
    }
  },

  /**
   * Lógica unificada de cálculo de métricas de sesión de caja (Dolce Candys)
   */
  computeSessionMetrics({ currentShift, orders = [], movements = [] }) {
    if (!currentShift?.isOpen) {
      return {
        isOpen: false,
        initialCash: 0,
        adjustedFondo: 0,
        sessionSales: 0,
        salesCount: 0,
        salesCash: 0,
        salesYape: 0,
        salesCard: 0,
        salesMixed: 0,
        cashIncome: 0,
        cashExpenses: 0,
        yapeIncome: 0,
        yapeExpenses: 0,
        totalOtherIncome: 0,
        totalExpenses: 0,
        expectedCash: 0,
        expectedYape: 0,
        totalMoney: 0,
        recentSales: [],
      };
    }

    const initialCash = Number(currentShift.initialCash) || 0;
    const shiftStart = currentShift.openedAt ? new Date(currentShift.openedAt).getTime() : 0;

    // Filtrar órdenes de la sesión activa
    const sessionOrders = orders.filter((o) => {
      if (o.shift_id && currentShift.id) {
        return o.shift_id === currentShift.id;
      }
      const orderTime = new Date(o.created_at || o.date).getTime();
      return !isNaN(orderTime) && orderTime >= shiftStart;
    });

    let salesCash = 0;
    let salesYape = 0;
    let salesCard = 0;
    let salesMixed = 0;
    let sessionSales = 0;

    sessionOrders.forEach((o) => {
      const tot = Number(o.total) || 0;
      sessionSales += tot;
      const method = (o.payment_method || o.payment || '').toUpperCase();

      if (method.includes('EFECTIVO') || method === 'CASH') {
        salesCash += tot;
      } else if (method.includes('YAPE') || method.includes('PLIN')) {
        salesYape += tot;
      } else if (method.includes('TARJETA') || method === 'CARD' || method.includes('POS')) {
        salesCard += tot;
      } else if (method.includes('MIXTO') || method.includes('MIXED')) {
        salesMixed += tot;
        const mCash = Number(o.mixed_cash || o.mixedCash) || 0;
        const mYape = Number(o.mixed_yape || o.mixedYape) || 0;
        const mCard = Number(o.mixed_card || o.mixedCard) || 0;
        if (mCash + mYape + mCard > 0) {
          salesCash += mCash;
          salesYape += mYape;
          salesCard += mCard;
        } else {
          salesCash += tot;
        }
      } else {
        salesCash += tot;
      }
    });

    // Filtrar movimientos de la sesión activa
    const sessionMovements = movements.filter((m) => {
      if (m.shift_id && currentShift.id) {
        return m.shift_id === currentShift.id;
      }
      const mTime = new Date(m.created_at || m.date).getTime();
      return !isNaN(mTime) && mTime >= shiftStart;
    });

    let cashIncome = 0;
    let cashExpenses = 0;
    let yapeIncome = 0;
    let yapeExpenses = 0;

    sessionMovements.forEach((m) => {
      const amt = Number(m.amount) || 0;
      const op = (m.operation || '').toLowerCase();
      const typ = (m.type || '').toLowerCase();
      const pm = (m.payment_method || '').toLowerCase();

      const isIngreso = typ.includes('ingreso') || op.includes('ingreso');
      const isYape = pm.includes('yape') || op.includes('yape');

      if (isYape) {
        if (isIngreso) yapeIncome += amt;
        else yapeExpenses += amt;
      } else {
        if (isIngreso) cashIncome += amt;
        else cashExpenses += amt;
      }
    });

    const totalOtherIncome = cashIncome + yapeIncome;
    const totalExpenses = cashExpenses + yapeExpenses;

    // Fondo en caja ajustado (Fondo inicial + ingresos efectivo - egresos efectivo)
    const adjustedFondo = initialCash + cashIncome - cashExpenses;

    // Balances esperados
    const expectedCash = initialCash + salesCash + cashIncome - cashExpenses;
    const expectedYape = salesYape + yapeIncome - yapeExpenses;
    const totalMoney = expectedCash + expectedYape;

    // Ventas recientes mapeadas
    const recentSales = sessionOrders.map((o) => {
      const method = (o.payment_method || o.payment || 'Efectivo').toUpperCase();
      let paymentBadge = 'EFECTIVO';
      if (method.includes('YAPE') || method.includes('PLIN')) paymentBadge = 'YAPE';
      else if (method.includes('TARJETA') || method.includes('CARD')) paymentBadge = 'TARJETA';
      else if (method.includes('MIXTO') || method.includes('MIXED')) paymentBadge = 'MIXTO';

      let itemSummary = 'Pedido general';
      if (o.items_summary) {
        itemSummary = o.items_summary;
      } else if (Array.isArray(o.order_items) && o.order_items.length > 0) {
        itemSummary = o.order_items.map((it) => `${it.quantity || 1}x ${it.product_name || it.name}`).join(', ');
      } else if (Array.isArray(o.items) && o.items.length > 0) {
        itemSummary = o.items.map((it) => `${it.quantity || 1}x ${it.product_name || it.name}`).join(', ');
      }

      const orderTime = new Date(o.created_at || o.date || Date.now());
      const formattedTime = !isNaN(orderTime.getTime())
        ? orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Reciente';

      let modalityLabel = o.modality || 'Mesa';
      if (o.modality === 'Mesa' && o.table_number) {
        modalityLabel = `Mesa ${o.table_number}`;
      }

      return {
        id: o.ticket_code || (o.id ? `${o.id}`.slice(-5) : '1001'),
        amount: Number(o.total) || 0,
        cashier: o.cashier_name || o.customer_name || currentShift.cashierName || 'Admin Ohana',
        time: formattedTime,
        type: modalityLabel,
        item: itemSummary,
        paymentMethod: paymentBadge,
        created_at: o.created_at || o.date,
      };
    });

    return {
      isOpen: true,
      initialCash,
      adjustedFondo,
      sessionSales,
      salesCount: sessionOrders.length,
      salesCash,
      salesYape,
      salesCard,
      salesMixed,
      cashIncome,
      cashExpenses,
      yapeIncome,
      yapeExpenses,
      totalOtherIncome,
      totalExpenses,
      expectedCash,
      expectedYape,
      totalMoney,
      recentSales,
    };
  },
};

export default cashService;
