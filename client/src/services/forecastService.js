import api from './api';

export const forecastService = {
  revenue: (payload) => api.post('/forecast/revenue', payload),
  expenses: (payload) => api.post('/forecast/expenses', payload),
  profit: (payload) => api.post('/forecast/profit', payload),
  history: () => api.get('/forecast/history'),
};

export const anomalyService = {
  list: () => api.get('/anomalies'),
  update: (id, status) => api.patch(`/anomalies/${id}`, { status }),
  recurring: () => api.get('/anomalies/recurring'),
};
