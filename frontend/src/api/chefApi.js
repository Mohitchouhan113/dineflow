import api from './axios';

/**
 * Retry wrapper for chef API calls.
 * Handles Render free-tier cold-start: server sleeps after ~15 min inactivity,
 * takes 30-60s to fully wake.
 *
 * Strategy: 4 retries with increasing delays = 5s, 10s, 15s, 20s = total ~50s wait
 * This covers the worst-case Render free-tier cold start window.
 *
 * IMPORTANT: This function is stateless — each call creates a fresh loop.
 * The component should NOT recreate this on every render.
 */
async function withRetry(fn, retries = 4) {
  const delays = [5000, 10000, 15000, 20000]; // increasing delays
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError = !err.response;
      const isServerError = err.response && err.response.status >= 500;
      const canRetry = (isNetworkError || isServerError) && attempt < retries;
      
      if (canRetry) {
        const waitMs = delays[attempt] || delays[delays.length - 1];
        console.warn(`[chefApi] Retry ${attempt + 1}/${retries} in ${waitMs / 1000}s (server may be starting up)...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      
      // No more retries — throw the error
      throw err;
    }
  }
}

export const getChefOrders = () => withRetry(() =>
  api.get('/api/chef/orders', { timeout: 25000 })
);

export const updateOrderStatus = (id, status) =>
  api.patch(`/api/chef/orders/${id}/status`, { status }, { timeout: 10000 });
