import supabase from './supabaseClient';
import { safeSetItem } from '../utils/storageUtils';

const EXPENSES_STORAGE_KEY = 'ohana_expenses_cache';

const getLocalExpenses = () => {
  try {
    const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

let tableExpensesAvailable = true;

export const EXPENSE_CATEGORIES = [
  { id: 'compras', label: 'Compras', sub: 'Insumos y mercadería' },
  { id: 'servicios', label: 'Servicios', sub: 'Luz, agua, internet' },
  { id: 'local', label: 'Local y Alquiler', sub: 'Alquiler y local' },
  { id: 'personal', label: 'Personal y Movilidad', sub: 'Movilidad y personal' },
  { id: 'otros', label: 'Otros', sub: 'Gastos varios' },
];

export const expenseService = {
  /**
   * Obtiene todos los gastos filtrados por mes y año
   */
  async getExpenses({ month, year } = {}) {
    let allExpenses = [];

    if (tableExpensesAvailable) {
      try {
        const { data, error, status } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });

        if (status === 404 || error?.code === '42P01' || error?.message?.includes('404')) {
          tableExpensesAvailable = false;
          allExpenses = getLocalExpenses();
        } else if (!error && data) {
          allExpenses = data;
        } else {
          allExpenses = getLocalExpenses();
        }
      } catch {
        allExpenses = getLocalExpenses();
      }
    } else {
      allExpenses = getLocalExpenses();
    }

    // Si se pasa month o year, filtramos
    if (month !== undefined && year !== undefined) {
      return allExpenses.filter((item) => {
        const d = new Date(item.date || item.created_at);
        if (isNaN(d.getTime())) return true;
        return d.getMonth() === month && d.getFullYear() === year;
      });
    }

    return allExpenses;
  },

  /**
   * Registra un nuevo gasto operativo
   */
  async createExpense(expenseData) {
    const newExpense = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
      concept: (expenseData.concept || '').trim(),
      category: expenseData.category || 'Otros',
      amount: Number(expenseData.amount) || 0,
      payment_method: expenseData.payment_method || 'Efectivo',
      voucher_number: (expenseData.voucher_number || '').trim(),
      date: expenseData.date ? new Date(expenseData.date).toISOString() : new Date().toISOString(),
      user_name: expenseData.user_name || 'Admin Ohana',
      notes: (expenseData.notes || '').trim(),
      created_at: new Date().toISOString(),
    };

    // 1. Guardar en caché local
    try {
      const local = getLocalExpenses();
      local.unshift(newExpense);
      safeSetItem(EXPENSES_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Error saving local expense:', e);
    }

    // 2. Intentar guardar en Supabase
    if (tableExpensesAvailable) {
      try {
        const { error, status } = await supabase.from('expenses').insert([newExpense]);
        if (status === 404 || error?.code === '42P01') {
          tableExpensesAvailable = false;
        }
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_expenses_updated', { detail: newExpense }));
    }

    return { success: true, expense: newExpense };
  },

  /**
   * Actualiza un gasto existente
   */
  async updateExpense(id, updatedFields) {
    try {
      const local = getLocalExpenses();
      const index = local.findIndex((e) => String(e.id) === String(id));
      if (index !== -1) {
        local[index] = {
          ...local[index],
          ...updatedFields,
          updated_at: new Date().toISOString(),
        };
        safeSetItem(EXPENSES_STORAGE_KEY, JSON.stringify(local));
      }
    } catch (e) {
      console.warn('Error updating local expense:', e);
    }

    if (tableExpensesAvailable) {
      try {
        await supabase
          .from('expenses')
          .update({ ...updatedFields, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_expenses_updated'));
    }

    return { success: true };
  },

  /**
   * Elimina un gasto operativo
   */
  async deleteExpense(id) {
    try {
      const local = getLocalExpenses().filter((e) => String(e.id) !== String(id));
      safeSetItem(EXPENSES_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Error deleting local expense:', e);
    }

    if (tableExpensesAvailable) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_expenses_updated'));
    }

    return { success: true };
  },
};

export default expenseService;
