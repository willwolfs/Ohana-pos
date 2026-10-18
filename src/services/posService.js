import { apiClient } from './api';

export const posService = {
  getCategories: async () => {
    return apiClient('/categories');
  },

  getProducts: async (categoryId) => {
    const query = categoryId ? `?category=${categoryId}` : '';
    return apiClient(`/products${query}`);
  },

  createOrder: async (orderData) => {
    return apiClient('/orders', { body: orderData });
  },

  getKitchenOrders: async () => {
    return apiClient('/orders/kitchen');
  },

  updateOrderStatus: async (orderId, status) => {
    return apiClient(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },
};
