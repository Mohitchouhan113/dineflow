import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function useSubscriptionLimits() {
  const [usage, setUsage] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const fetchLimits = useCallback(async () => {
    try {
      const [usageRes, subRes] = await Promise.all([
        api.get('/api/vendor/subscription/usage'),
        api.get('/api/vendor/subscription/status'),
      ]);
      setUsage(usageRes.data.usage || null);
      setSubscription(subRes.data.subscription || null);
    } catch (e) {
      // Silently ignore — limits not available
    }
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  const isAtLimit = useCallback((resource) => {
    if (!usage || !usage[resource]) return false;
    const { current, limit } = usage[resource];
    if (limit === null || limit === undefined) return false;
    return current >= limit;
  }, [usage]);

  const getUsage = useCallback((resource) => {
    if (!usage || !usage[resource]) return { current: 0, limit: null };
    return usage[resource];
  }, [usage]);

  const isRestricted = subscription?.status === 'restricted';
  const isGrace = subscription?.status === 'grace';

  return { usage, subscription, isAtLimit, getUsage, isRestricted, isGrace, refetch: fetchLimits };
}
