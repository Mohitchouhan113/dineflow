import api from './axios';

export const getCategories = () => api.get('/api/vendor/categories');
export const createCategory = (data) => api.post('/api/vendor/categories', data);
export const updateCategory = (id, data) => api.put(`/api/vendor/categories/${id}`, data);
export const updateCategoryStatus = (id, isActive) => api.patch(`/api/vendor/categories/${id}/status`, { isActive });
