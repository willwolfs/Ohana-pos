import { apiClient } from './api';

export const inventoryService = {
  getSupplies: async () => {
    return apiClient('/inventory/supplies');
  },

  getRecipes: async () => {
    return apiClient('/inventory/recipes');
  },

  getKardex: async (supplyId) => {
    const query = supplyId ? `?supplyId=${supplyId}` : '';
    return apiClient(`/inventory/kardex${query}`);
  },

  updateStock: async (supplyId, data) => {
    return apiClient(`/inventory/supplies/${supplyId}/stock`, {
      method: 'PATCH',
      body: data,
    });
  },
};
