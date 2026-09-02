import api from './axios';

// Retry wrapper for chef API calls
// Handles Render free-tier cold-start (server sleeps, takes 30-60s to wake)
// Exponential backoff: 5s, 10s, 20s = total ~35s wait
async function withRetry(fn, retries = 3, baseDelay = 5000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError = !err.response;
      if (isNetworkError && i < retries) {
        const waitMs = baseDelay * Math.pow(2, i);
        const attempt = i + 1;
        console.warn(`[chefApi] Attempt ${attempt}/${retries + 1} failed. Retrying in ${waitMs / 1000}s...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}

export const getChefOrders = () => withRetry(() =>
  api.get('/api/chef/orders', { timeout: 20000 }) // 20s axios timeout
);
export const updateOrderStatus = (id, status) =>
  api.patch(`/api/chef/orders/${id}/status`, { status }, { timeout: 10000 });
