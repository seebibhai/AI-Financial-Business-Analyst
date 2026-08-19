import api from './api';

export const dataService = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/data/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  selectSheet: (dataSourceId, sheetName) => api.get(`/data/${dataSourceId}/sheet/${encodeURIComponent(sheetName)}`),
  confirmMapping: (dataSourceId, mapping, usesDebitCredit) =>
    api.post(`/data/${dataSourceId}/confirm`, { mapping, usesDebitCredit }),
  list: () => api.get('/data'),
  get: (id) => api.get(`/data/${id}`),
  remove: (id) => api.delete(`/data/${id}`),
};
