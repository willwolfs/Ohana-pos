import React, { createContext, useState, useMemo, useRef } from 'react';
import { CheckCircle2, Trash2, BadgeCheck } from 'lucide-react';
import cashService from '../services/cashService';
import { sanitizeOrderItemsForStorage } from '../utils/storageUtils';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableNumber, setTableNumber] = useState('Mesa 1');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOrderTicketCode, setActiveOrderTicketCode] = useState(null);
  const [toast, setToast] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const toastTimerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const showToast = (message, type = 'success', subtitle = '') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    setIsExiting(false);
    const id = Date.now();
    setToast({ id, message, type, subtitle });

    toastTimerRef.current = setTimeout(() => {
      setIsExiting(true);
      exitTimerRef.current = setTimeout(() => {
        setToast(null);
        setIsExiting(false);
      }, 260);
    }, 2400);
  };

  const syncActiveParkedOrder = (orderId, newItems) => {
    if (!orderId) return;
    try {
      if (!newItems || newItems.length === 0) {
        // Al eliminar todos los productos del pedido aparcado, se elimina de ventas aparcadas
        cashService.deleteOrder(orderId);
        setActiveOrderId(null);
        setActiveOrderTicketCode(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ohana_orders_updated'));
        }
      } else {
        const pending = cashService.getPendingOrders();
        const existing = pending.find((o) => String(o.id) === String(orderId));
        if (existing) {
          const newTotal = newItems.reduce(
            (sum, it) => sum + (Number(it.price) || 0) * (it.quantity || 1),
            0
          );
          const cleanItems = sanitizeOrderItemsForStorage(newItems);
          const updated = {
            ...existing,
            items: cleanItems,
            order_items: cleanItems,
            total: newTotal,
            subtotal: newTotal,
            items_summary: cleanItems
              .map((it) => `${it.quantity || 1}x ${it.product_name || it.name}`)
              .join(', '),
          };
          cashService.recordOrder(updated);
        }
      }
    } catch (e) {
      console.warn('Notice syncing active parked order:', e);
    }
  };

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      let updated;
      if (existing) {
        updated = prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        updated = [...prev, { ...product, quantity }];
      }
      if (activeOrderId) {
        syncActiveParkedOrder(activeOrderId, updated);
      }
      return updated;
    });
    showToast(`"${product.name}" agregado al pedido`, 'add');
  };

  const removeItem = (productId) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === productId);
      if (target) {
        showToast(`"${target.name}" eliminado del pedido`, 'remove');
      }
      const updated = prev.filter((item) => item.id !== productId);
      if (activeOrderId) {
        syncActiveParkedOrder(activeOrderId, updated);
      }
      return updated;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === productId ? { ...item, quantity } : item));
      if (activeOrderId) {
        syncActiveParkedOrder(activeOrderId, updated);
      }
      return updated;
    });
  };

  const updateItemNotes = (productId, notes) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === productId ? { ...item, notes } : item));
      if (activeOrderId) {
        syncActiveParkedOrder(activeOrderId, updated);
      }
      return updated;
    });
  };

  const loadOrder = (order) => {
    setActiveOrderId(order.id || null);
    setActiveOrderTicketCode(order.ticket_code || null);

    let catalog = [];
    try {
      const raw = localStorage.getItem('ohana_products');
      if (raw) catalog = JSON.parse(raw);
    } catch {}

    const orderItems = (order.items || order.order_items || []).map((it) => {
      let itImg = it.image || null;
      if (!itImg && Array.isArray(catalog) && catalog.length > 0) {
        const targetName = (it.name || it.product_name || '').toLowerCase().trim();
        const found = catalog.find(
          (p) => (p.id && (p.id === it.id || p.id === it.product_id)) || (p.name && p.name.toLowerCase().trim() === targetName)
        );
        if (found?.image) itImg = found.image;
      }

      return {
        id: it.id || it.product_id || `prod-${Date.now()}-${Math.random()}`,
        name: it.name || it.product_name,
        price: Number(it.price || it.unit_price) || 0,
        quantity: Number(it.quantity) || 1,
        notes: it.notes || '',
        image: itImg,
        category: it.category || '',
      };
    });
    setItems(orderItems);
    if (order.modality === 'Llevar' || order.modality === 'TAKE_AWAY') {
      setOrderType('TAKE_AWAY');
    } else if (order.modality === 'Delivery' || order.modality === 'DELIVERY') {
      setOrderType('DELIVERY');
    } else {
      setOrderType('DINE_IN');
    }
    setTableNumber(order.table_number || 'Mesa 1');
    setCustomerName(
      order.customer_name === 'Cliente General' || order.customer_name === 'CLIENTE GENERAL'
        ? ''
        : (order.customer_name || '')
    );
    showToast(`Pedido cargado #${order.ticket_code}`, 'add');
  };

  const clearCart = (silent = false) => {
    if (!silent && items.length > 0) {
      showToast('Se eliminaron todos los productos del pedido', 'remove');
    }
    setItems([]);
    setCustomerName('');
    setNote('');
    setActiveOrderId(null);
    setActiveOrderTicketCode(null);
  };

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const igv = useMemo(() => subtotal * 0.18, [subtotal]);
  const total = useMemo(() => subtotal, [subtotal]); // Precios suelen ser con IGV incluido o calculable

  return (
    <CartContext.Provider
      value={{
        items,
        orderType,
        setOrderType,
        tableNumber,
        setTableNumber,
        customerName,
        setCustomerName,
        note,
        setNote,
        activeOrderId,
        setActiveOrderId,
        activeOrderTicketCode,
        setActiveOrderTicketCode,
        loadOrder,
        addItem,
        removeItem,
        updateQuantity,
        updateItemNotes,
        clearCart,
        subtotal,
        igv,
        total,
        toast,
        showToast,
      }}
    >
      {children}

      {/* Notificación flotante arriba por la derecha con animación */}
      {toast && (
        <div
          className={`pos-global-toast toast-${toast.type} ${isExiting ? 'toast-exiting' : ''}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-icon-wrapper">
            {toast.type === 'payment' || toast.type === 'paid' ? (
              <BadgeCheck size={18} className="toast-icon-payment" />
            ) : toast.type === 'remove' || toast.type === 'error' ? (
              <Trash2 size={16} className="toast-icon-error" />
            ) : (
              <CheckCircle2 size={16} className="toast-icon-success" />
            )}
          </div>
          <div className="toast-content">
            <span className="toast-message">{toast.message}</span>
            {toast.subtitle && <span className="toast-subtitle">{toast.subtitle}</span>}
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};


