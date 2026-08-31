import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Calendar, Clock, CheckCircle, AlertTriangle, Receipt, ExternalLink, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';

const PLAN_PRICING = {
  free:    { monthly: 0,    yearly: 0,    label: 'Free' },
  basic:   { monthly: 499,  yearly: 4999,  label: 'Basic' },
  pro:     { monthly: 999,  yearly: 9999,  label: 'Pro' },
  premium: { monthly: 1999, yearly: 19999, label: 'Premium' },
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(s) {
  if (s === 'paid') return 'text-success bg-success/10 border-success/20';
  if (s === 'overdue') return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
}

export default function Billing() {
  const [billing, setBilling] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);

  const fetchBilling = useCallback(async () => {
    try {
      const [billRes, subRes, usageRes] = await Promise.all([
        api.get('/api/vendor/billing'),
        api.get('/api/vendor/subscription/status'),
        api.get('/api/vendor/subscription/usage'),
      ]);
      setBilling(billRes.data.billing);
      setHistory(billRes.data.history || []);
      setSubscription(subRes.data.subscription);
      setUsage(usageRes.data.usage);
    } catch (e) {
      console.error('Billing fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  // Listen for real-time subscription payment updates
  useEffect(() => {
    const handler = () => fetchBilling();
    window.addEventListener('socket:subscription-payment-updated', handler);
    return () => window.removeEventListener('socket:subscription-payment-updated', handler);
  }, [fetchBilling]);

  const handlePayNow = async () => {
    if (paying) return;
    setPaying(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Unable to load Razorpay. Please check your internet connection.');
        setPaying(false);
        return;
      }

      // Create subscription order
      const { data: orderData } = await api.post('/api/vendor/subscription/create-order');
      
      const options = {
        key: orderData.key,
        amount: orderData.amount * 100,
        currency: orderData.currency || 'INR',
        name: 'DineFlow',
        description: `${billing.plan.toUpperCase()} Subscription - ${billing.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          try {
            const { data: verifyData } = await api.post('/api/vendor/subscription/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscriptionPaymentId: orderData.subscriptionPaymentId,
            });

            setBilling(verifyData.billing);
            setToast({ type: 'success', message: 'Payment successful! Subscription renewed.' });
            fetchBilling();
            setTimeout(() => setToast(null), 5000);
          } catch (err) {
            console.error('Verification error:', err);
            setToast({ type: 'error', message: 'Payment verification failed. Contact support.' });
            setTimeout(() => setToast(null), 5000);
          }
          setPaying(false);
        },
        prefill: { name: '', email: '' },
        theme: { color: '#f59e0b' },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setToast({ type: 'error', message: 'Payment failed. Please try again.' });
        setTimeout(() => setToast(null), 5000);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Pay Now error:', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to initiate payment' });
      setTimeout(() => setToast(null), 5000);
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded bg-surface animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl bg-surface border border-border/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!billing) {
    return <div className="text-center py-20 text-text-muted">Failed to load billing information.</div>;
  }

  const planInfo = PLAN_PRICING[billing.plan] || PLAN_PRICING.free;
  const canPay = billing.paymentStatus === 'pending' || billing.paymentStatus === 'overdue';

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg border backdrop-blur-md"
            style={{
              background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              borderColor: toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
              color: toast.type === 'success' ? '#4ade80' : '#f87171'
            }}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Billing & Subscription</h1>
        <p className="text-text-secondary text-sm">Manage your DineFlow subscription and payment history.</p>
      </div>

      {/* Subscription Status Card */}
      <Card className="border-border/40 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary-hover to-primary" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Current Plan</p>
                  <p className="text-2xl font-bold text-text-primary">{planInfo.label}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{billing.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} billing</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>₹{billing.amount?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className={"px-3 py-1.5 rounded-full text-xs font-bold border " + statusColor(billing.paymentStatus)}>
                {billing.paymentStatus === 'paid' ? '✓ Paid' : billing.paymentStatus === 'overdue' ? '⚠ Overdue' : '⏳ Pending'}
              </div>
              {canPay && billing.amount > 0 && (
                <Button onClick={handlePayNow} disabled={paying}
                  className="bg-primary hover:bg-primary-hover text-background font-bold gap-2 min-w-[140px]">
                  {paying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Pay Now
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Plan</p>
            <p className="text-lg font-bold text-text-primary">{planInfo.label}</p>
            <p className="text-xs text-text-muted mt-0.5">{billing.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Amount</p>
            <p className="text-lg font-bold text-primary">₹{billing.amount?.toLocaleString('en-IN') || 0}</p>
            <p className="text-xs text-text-muted mt-0.5">per {billing.billingCycle === 'yearly' ? 'year' : 'month'}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Last Payment</p>
            <p className="text-lg font-bold text-text-primary">{formatDate(billing.lastPaymentDate)}</p>
            <p className="text-xs text-text-muted mt-0.5">{billing.lastPaymentDate ? 'Completed' : 'No payments yet'}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Next Due</p>
            <p className="text-lg font-bold text-text-primary">{formatDate(billing.nextDueDate)}</p>
            <p className={"text-xs mt-0.5 font-medium " + (billing.paymentStatus === 'overdue' ? 'text-red-400' : 'text-text-muted')}>
              {billing.paymentStatus === 'overdue' ? 'Payment overdue' : billing.paymentStatus === 'paid' ? 'Up to date' : 'Due soon'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status */}
      {subscription && (subscription.status !== 'active' || subscription.paymentStatus !== 'paid') && (
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${subscription.status === 'restricted' ? 'bg-red-500' : subscription.status === 'grace' ? 'bg-yellow-500' : 'bg-primary'}`} />
                <div>
                  <p className="text-sm font-bold text-text-primary">Subscription Status</p>
                  <p className="text-xs text-text-muted capitalize">{subscription.status} — {subscription.paymentStatus}</p>
                </div>
              </div>
              {subscription.isGrace && subscription.graceDaysRemaining != null && (
                <span className="text-xs font-bold text-yellow-400">{subscription.graceDaysRemaining} days left</span>
              )}
              {subscription.isRestricted && (
                <span className="text-xs font-bold text-red-400">Restricted</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Usage */}
      {usage && (
        <Card className="border-border/40">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Plan Usage</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(usage).filter(([k]) => k !== 'analyticsDays').map(([resource, { current, limit }]) => {
                const pct = limit === null ? 0 : Math.min(100, (current / limit) * 100);
                const atLimit = limit !== null && current >= limit;
                return (
                  <div key={resource} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary capitalize">{resource.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`font-bold ${atLimit ? 'text-red-400' : 'text-text-primary'}`}>
                        {current} / {limit === null ? '∞' : limit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-elevated/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-primary'}`}
                        style={{ width: limit === null ? '10%' : `${pct}%` }}
                      />
                    </div>
                    {atLimit && <p className="text-[10px] text-red-400 font-medium">Limit reached</p>}
                  </div>
                );
              })}
            </div>
            {usage.analyticsDays && (
              <p className="text-xs text-text-muted mt-3">Analytics: up to {usage.analyticsDays} days</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border/30">
            <h2 className="text-lg font-bold text-text-primary">Payment History</h2>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payment history yet.</p>
              {billing.plan !== 'free' && billing.paymentStatus === 'pending' && (
                <p className="text-xs mt-1">Complete your first payment to see history here.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border/30">
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Cycle</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id} className="border-b border-border/20 hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-6 py-3 text-text-primary">{formatDate(h.paidAt || h.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                          {h.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs capitalize">{h.billingCycle}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary">₹{h.amount?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary capitalize">{h.paymentMethod}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border " + (h.status === 'paid' ? 'text-success bg-success/10 border-success/20' : h.status === 'failed' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20')}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-text-muted text-xs font-mono truncate max-w-[140px]">
                        {h.razorpayPaymentId || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
