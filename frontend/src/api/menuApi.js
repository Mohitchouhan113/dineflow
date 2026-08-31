import api from './axios';

export const getMenuItems = () => api.get('/api/vendor/menu-items');
export const createMenuItem = (data) => api.post('/api/vendor/menu-items', data);
export const updateMenuItem = (id, data) => api.put(`/api/vendor/menu-items/${id}`, data);
export const updateMenuAvailability = (id, isAvailable) => api.patch(`/api/vendor/menu-items/${id}/availability`, { isAvailable });
