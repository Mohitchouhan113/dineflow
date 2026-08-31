import api from './axios';

export const getPublicMenu = (vendorId, tableId) => api.get(`/api/public/menu/${vendorId}/${tableId}`);
export const placeOrder = (data) => api.post('/api/public/orders', data);
export const createPayment = (data) => api.post('/api/public/payments/create', data);
export const verifyPayment = (data) => api.post('/api/public/payments/verify', data);
