import api from './axios';

export const getTables = () => api.get('/api/vendor/tables');
export const createTable = (data) => api.post('/api/vendor/tables', data);
export const updateTable = (id, data) => api.put(`/api/vendor/tables/${id}`, data);
export const updateTableStatus = (id, isActive) => api.patch(`/api/vendor/tables/${id}/status`, { isActive });
