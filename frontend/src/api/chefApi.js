import api from './axios';

export const getChefOrders = () => api.get('/api/chef/orders');
export const updateOrderStatus = (id, status) => api.patch(`/api/chef/orders/${id}/status`, { status });
