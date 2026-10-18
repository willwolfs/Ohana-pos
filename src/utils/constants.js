export const ROLES = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  CHEF: 'CHEF',
  WAITER: 'WAITER',
};

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_METHODS = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta (POS)',
  YAPE: 'Yape / Plin',
  MIXED: 'Pago Mixto',
};

export const ORDER_TYPES = {
  DINE_IN: 'Mesa',
  TAKEAWAY: 'Para Llevar',
  DELIVERY: 'Delivery',
};
