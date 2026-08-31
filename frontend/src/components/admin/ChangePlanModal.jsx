import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, Check, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';

const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    monthly: 499,
    yearly: 4999,
    features: { menuItems: 25, categories: 8, chefs: 2, tables: 10, analyticsDays: 7 },
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 999,
    yearly: 9999,
    features: { menuItems: 100, categories: 25, chefs: 10, tables: 50, analyticsDays: 90 },
  },
  {
    key: 'premium',
    name: 'Premium',
    monthly: 1999,
    yearly: 19999,
    features: { menuItems: null, categories: null, chefs: null, tables: null, analyticsDays: 365 },
  },
];

const RESOURCE_LABELS = {
  menuItems: 'Menu Items',
  categories: 'Categories',
  chefs: 'Chefs',
  tables: 'Tables',
  analyticsDays: 'Analytics (days)',
};

const fmt = (v) => v === null ? 'Unlimited' : v.toLocaleString('en-IN');
const fmtCurrency = (v) => '₹' + v.toLocaleString('en-IN');

export default function ChangePlanModal({ vendor, isOpen, onClose, onPlanChanged }) {
  const [selectedPlan, setSelectedPlan] = useState(vendor?.subscriptionPlan || 'basic');
  const [selectedCycle, setSelectedCycle] = useState(vendor?.billingCycle || 'monthly');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState(null);

  // Fetch current usage
  useEffect(() => {
    if (!isOpen || !vendor?._id) return;
    const fetchUsage = async () => {
      try {
        const res = await api.get(`/api/admin/vendors/${vendor._id}/detail`);
        const st = res.data?.stats || {};
        setUsage({
          menuItems: st.activeMenuItems || 0,
          categories: st.totalCategories || 0,
          chefs: st.totalChefs || 0,
          tables: st.totalTables || 0,
        });
      } catch {
        setUsage(null);
      }
    };
    fetchUsage();
  }, [isOpen, vendor?._id]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(vendor?.subscriptionPlan || 'basic');
      setSelectedCycle(vendor?.billingCycle || 'monthly');
      setConfirming(false);
      setError('');
    }
  }, [isOpen, vendor?.subscriptionPlan, vendor?.billingCycle]);

  if (!isOpen) return null;

  const currentPlan = PLANS.find(p => p.key === vendor?.subscriptionPlan) || PLANS[0];
  const targetPlan = PLANS.find(p => p.key === selectedPlan) || PLANS[0];
  const targetAmount = selectedCycle === 'yearly' ? targetPlan.yearly : targetPlan.monthly;
  const currentAmount = vendor?.billingCycle === 'yearly' ? currentPlan.yearly : currentPlan.monthly;

  // Check for downgrade exceeding limits
  const exceeding = [];
  if (usage) {
    for (const [resource, limit] of Object.entries(targetPlan.features)) {
      if (limit !== null && usage[resource] > limit) {
        exceeding.push({
          resource: RESOURCE_LABELS[resource],
          current: usage[resource],
          limit,
        });
      }
    }
  }

  const isDowngrade = PLANS.findIndex(p => p.key === selectedPlan) < PLANS.findIndex(p => p.key === vendor?.subscriptionPlan);
  const isSamePlan = selectedPlan === vendor?.subscriptionPlan && selectedCycle === vendor?.billingCycle;

  const handleChangePlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.patch(`/api/admin/vendors/${vendor._id}/plan`, {
        plan: selectedPlan,
        billingCycle: selectedCycle,
      });
      if (res.data.success) {
        onPlanChanged?.(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-surface-higher border border-border/50 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/30">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Change Plan</h2>
              <p className="text-sm text-text-secondary mt-1">{vendor?.restaurantName}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-elevated transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Current Subscription */}
            <div className="bg-surface-elevated/50 rounded-xl p-4 border border-border/30">
              <h3 className="text-xs font-bold text-text-muted uppercase mb-3">Current Subscription</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-text-muted uppercase">Plan</p>
                  <p className="text-sm font-bold text-text-primary">{currentPlan.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase">Cycle</p>
                  <p className="text-sm font-bold text-text-primary capitalize">{vendor?.billingCycle || 'Monthly'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase">Amount</p>
                  <p className="text-sm font-bold text-primary">{fmtCurrency(currentAmount)}</p>
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-3">Select New Plan</h3>
              <div className="grid grid-cols-3 gap-3">
                {PLANS.map(plan => (
                  <button
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === plan.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border/30 hover:border-border/60 bg-surface-elevated/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-text-primary">{plan.name}</span>
                      {selectedPlan === plan.key && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-lg font-bold text-primary">{fmtCurrency(plan.monthly)}</p>
                    <p className="text-[10px] text-text-muted">/month</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Cycle */}
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-3">Billing Cycle</h3>
              <div className="flex gap-3">
                {['monthly', 'yearly'].map(cycle => (
                  <button
                    key={cycle}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${
                      selectedCycle === cycle
                        ? 'border-primary bg-primary/5'
                        : 'border-border/30 hover:border-border/60 bg-surface-elevated/30'
                    }`}
                  >
                    <span className="text-sm font-bold text-text-primary capitalize">{cycle}</span>
                    <p className="text-xs text-text-muted mt-1">
                      {fmtCurrency(cycle === 'yearly' ? targetPlan.yearly : targetPlan.monthly)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Comparison */}
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-3">Feature Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 text-[10px] font-bold text-text-muted uppercase">Feature</th>
                      <th className="text-center py-2 text-[10px] font-bold text-text-muted uppercase">Basic</th>
                      <th className="text-center py-2 text-[10px] font-bold text-text-muted uppercase">Pro</th>
                      <th className="text-center py-2 text-[10px] font-bold text-text-muted uppercase">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                      <tr key={key} className="border-b border-border/20">
                        <td className="py-2 text-text-secondary">{label}</td>
                        {PLANS.map(plan => {
                          const val = plan.features[key];
                          const isTarget = plan.key === selectedPlan;
                          const isCurrent = plan.key === vendor?.subscriptionPlan;
                          return (
                            <td key={plan.key} className="py-2 text-center">
                              <span className={`font-bold ${
                                isTarget ? 'text-primary' : isCurrent ? 'text-text-primary' : 'text-text-muted'
                              }`}>
                                {fmt(val)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* New Pricing Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-text-primary">
                New pricing ({fmtCurrency(targetAmount)} {selectedCycle}) applies to the next billing cycle.
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Payment status will be set to Pending for the new plan amount.
              </p>
            </div>

            {/* Downgrade Warning */}
            {isDowngrade && exceeding.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-400">Current usage exceeds {targetPlan.name} plan limits</p>
                    <div className="mt-2 space-y-1">
                      {exceeding.map(e => (
                        <p key={e.resource} className="text-xs text-text-secondary">
                          {e.resource}: <span className="text-red-400 font-bold">{e.current}</span> / <span className="text-text-muted">{e.limit}</span>
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      Existing resources will NOT be deleted. Vendor will be blocked from creating new resources until usage falls below the plan limit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation step */}
            {confirming && (
              <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-yellow-400">Confirm Plan Change</p>
                    <div className="mt-2 text-xs text-text-secondary space-y-1">
                      <p>Vendor: <span className="font-bold text-text-primary">{vendor?.restaurantName}</span></p>
                      <p>Current: <span className="font-bold text-text-primary">{currentPlan.name} {fmtCurrency(currentAmount)} ({vendor?.billingCycle})</span></p>
                      <p className="flex items-center gap-2">
                        New: <ArrowRight className="w-3 h-3 text-primary" />
                        <span className="font-bold text-primary">{targetPlan.name} {fmtCurrency(targetAmount)} ({selectedCycle})</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border/30">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                disabled={isSamePlan}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-black hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSamePlan ? 'No Change' : 'Review Change'}
              </button>
            ) : (
              <button
                onClick={handleChangePlan}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-black hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Confirm Plan Change'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
