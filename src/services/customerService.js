import supabase from './supabaseClient';
import { safeSetItem } from '../utils/storageUtils';

const CUSTOMERS_STORAGE_KEY = 'ohana_customers_cache';
const ORDERS_STORAGE_KEY = 'ohana_orders_cache';

const MOCK_IDS = new Set(['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5']);

const INITIAL_CUSTOMERS = [];

const getLocalCustomers = () => {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      safeSetItem(CUSTOMERS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filtrar y purgar cualquier dato de prueba previo
      const filtered = parsed.filter((c) => !MOCK_IDS.has(c.id));
      if (filtered.length !== parsed.length) {
        safeSetItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
    return [];
  } catch {
    return [];
  }
};

let tableCustomersAvailable = true;

export const customerService = {
  /**
   * Obtiene la lista completa de clientes (con cálculo de visitas reales si hay ventas)
   */
  async getCustomers() {
    let customers = getLocalCustomers();

    if (tableCustomersAvailable) {
      try {
        const { data, error, status } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true });

        if (status === 404 || error?.code === '42P01' || error?.message?.includes('404')) {
          tableCustomersAvailable = false;
        } else if (!error && data) {
          const filtered = data.filter((c) => !MOCK_IDS.has(c.id));
          customers = filtered;
          safeSetItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(filtered));
        }
      } catch {
        // Fallback a caché local
      }
    }

    return customers;
  },

  /**
   * Guarda o actualiza un cliente
   */
  async saveCustomer(customerData) {
    const isEdit = Boolean(customerData.id);
    const docType = customerData.doc_type || (customerData.doc_number?.length === 11 ? 'RUC' : 'DNI');
    const visits = Number(customerData.visits) || 1;

    let computedCategory = 'Nuevo';
    if (docType === 'RUC') {
      computedCategory = 'Empresa';
    } else if (visits >= 4) {
      computedCategory = 'Frecuente';
    }

    const record = {
      id: customerData.id || `cust-${Date.now()}`,
      name: (customerData.name || '').trim(),
      business_name: (customerData.business_name || customerData.razon_social || '-').trim(),
      doc_type: docType,
      doc_number: (customerData.doc_number || '').trim(),
      phone: (customerData.phone || '').trim(),
      email: (customerData.email || '').trim(),
      address: (customerData.address || '').trim(),
      category: customerData.category || computedCategory,
      visits: visits,
      total_spent: Number(customerData.total_spent) || 0,
      favorite_roll: customerData.favorite_roll || 'Acevichado Maki',
      notes: customerData.notes || '',
      created_at: customerData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Guardar en local
    try {
      const list = getLocalCustomers();
      let updatedList;
      if (isEdit) {
        updatedList = list.map((c) => (String(c.id) === String(record.id) ? { ...c, ...record } : c));
      } else {
        updatedList = [record, ...list];
      }
      safeSetItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updatedList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ohana_customers_updated', { detail: record }));
      }
    } catch (e) {
      console.warn('Error saving local customer:', e);
    }

    // 2. Guardar en Supabase si está disponible
    if (tableCustomersAvailable) {
      try {
        const { error, status } = await supabase.from('customers').upsert([record]);
        if (status === 404 || error?.code === '42P01') {
          tableCustomersAvailable = false;
        }
      } catch {
        // ignore
      }
    }

    return { success: true, customer: record };
  },

  /**
   * Elimina un cliente
   */
  async deleteCustomer(id) {
    try {
      const list = getLocalCustomers().filter((c) => String(c.id) !== String(id));
      safeSetItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(list));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ohana_customers_updated'));
      }
    } catch (e) {
      console.warn('Error deleting customer:', e);
    }

    if (tableCustomersAvailable) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    return { success: true };
  },

  /**
   * Obtiene las ventas históricas asociadas a un cliente específico
   */
  getCustomerOrders(customer) {
    try {
      const rawOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!rawOrders) return [];
      const orders = JSON.parse(rawOrders);
      if (!Array.isArray(orders)) return [];

      const cleanDoc = (customer.doc_number || '').trim().toLowerCase();
      const cleanName = (customer.name || '').trim().toLowerCase();

      return orders.filter((o) => {
        const orderDoc = (o.customer_dni || o.customer_ruc || o.doc_number || '').trim().toLowerCase();
        const orderName = (o.customer_name || '').trim().toLowerCase();

        if (cleanDoc && orderDoc && orderDoc === cleanDoc) return true;
        if (cleanName && orderName && orderName === cleanName) return true;
        return false;
      });
    } catch {
      return [];
    }
  },
};

export default customerService;
