import api from './api';

export const analyticsService = {
  overview: (params) => api.get('/analytics/overview', { params }),
  revenue: (params) => api.get('/analytics/revenue', { params }),
  expenses: (params) => api.get('/analytics/expenses', { params }),
  profit: (params) => api.get('/analytics/profit', { params }),
  trends: (params) => api.get('/analytics/trends', { params }),
  categories: (params) => api.get('/analytics/categories', { params }),
};

export const transactionService = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  exportCsvUrl: (params) => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const qs = new URLSearchParams(params).toString();
    return `${base}/transactions/export/csv${qs ? `?${qs}` : ''}`;
  },
};
