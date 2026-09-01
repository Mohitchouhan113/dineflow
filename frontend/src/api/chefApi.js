import api from './axios';

// Retry wrapper for chef API calls
// Handles Render free-tier cold-start where first request may timeout
async function withRetry(fn, retries = 2, delay = 3000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError = !err.response;
      if (isNetworkError && i < retries) {
        console.warn(`[chefApi] Retry ${i + 1}/${retries} after network error...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

export const getChefOrders = () => withRetry(() => api.get('/api/chef/orders'));
export const updateOrderStatus = (id, status) => api.patch(`/api/chef/orders/${id}/status`, { status });
