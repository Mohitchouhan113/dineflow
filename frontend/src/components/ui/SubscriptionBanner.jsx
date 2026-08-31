import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Ban, X } from 'lucide-react';
import api from '../../api/axios';

export default function SubscriptionBanner() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/api/vendor/subscription/status');
      setSubscription(res.data.subscription);
    } catch (e) {
      // Silently ignore
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Listen for payment updates
  useEffect(() => {
    const handler = () => fetchStatus();
    window.addEventListener('socket:subscription-payment-updated', handler);
    return () => window.removeEventListener('socket:subscription-payment-updated', handler);
  }, [fetchStatus]);

  if (!subscription || dismissed) return null;
  if (subscription.status === 'active' && subscription.paymentStatus === 'paid') return null;

  const { status, paymentStatus, graceDaysRemaining, nextDueDate, isRestricted, isGrace } = subscription;

  // Build banner based on state
  let bgColor, borderColor, textColor, Icon, message, actionLabel;

  if (isRestricted) {
    bgColor = 'bg-red-500/10';
    borderColor = 'border-red-500/30';
    textColor = 'text-red-400';
    Icon = Ban;
    message = 'Your subscription is restricted due to an overdue payment. Complete payment to restore ordering and management features.';
    actionLabel = 'Pay Now';
  } else if (isGrace) {
    bgColor = 'bg-yellow-500/10';
    borderColor = 'border-yellow-500/30';
    textColor = 'text-yellow-400';
    Icon = Clock;
    message = `Your subscription payment is overdue. You have ${graceDaysRemaining ?? '?'} days remaining before account restrictions.`;
    actionLabel = 'Pay Now';
  } else if (paymentStatus === 'overdue') {
    bgColor = 'bg-yellow-500/10';
    borderColor = 'border-yellow-500/30';
    textColor = 'text-yellow-400';
    Icon = AlertTriangle;
    message = 'Your subscription payment is overdue.';
    actionLabel = 'Pay Now';
  } else if (paymentStatus === 'pending') {
    bgColor = 'bg-primary/10';
    borderColor = 'border-primary/30';
    textColor = 'text-primary';
    Icon = AlertTriangle;
    message = 'Subscription payment pending.';
    actionLabel = 'View Billing';
  } else {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border ${bgColor} ${borderColor} rounded-xl mb-4`}>
      <Icon className={`w-5 h-5 ${textColor} shrink-0`} />
      <p className={`text-sm ${textColor} flex-1`}>{message}</p>
      <button
        onClick={() => navigate('/vendor/billing')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${textColor} bg-surface-elevated/50 hover:bg-surface-elevated transition-colors whitespace-nowrap`}
      >
        {actionLabel}
      </button>
      <button onClick={() => setDismissed(true)} className="p-1 hover:bg-surface-elevated rounded-lg transition-colors">
        <X className="w-3.5 h-3.5 text-text-muted" />
      </button>
    </div>
  );
}
