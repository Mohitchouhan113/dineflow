import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChefHat,
  Flame,
  Timer,
  PackageCheck,
  XCircle,
  CreditCard,
  Banknote,
  UtensilsCrossed,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import api from '../../api/axios';
import useSubscriptionLimits from '../../hooks/useSubscriptionLimits';

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', icon: Clock, label: 'Pending' },
  accepted: { color: '#3b82f6', icon: CheckCircle2, label: 'Accepted' },
  preparing: { color: '#f97316', icon: ChefHat, label: 'Preparing' },
  ready: { color: '#10b981', icon: PackageCheck, label: 'Ready' },
  completed: { color: '#22c55e', icon: CheckCircle2, label: 'Completed' },
  cancelled: { color: '#ef4444', icon: XCircle, label: 'Cancelled' },
};

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#f97316', '#10b981', '#22c55e', '#ef4444'];

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  accepted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7');
  const { usage } = useSubscriptionLimits();
  const maxDays = usage?.analyticsDays || 7;

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/vendor/analytics?range=${range}`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Socket refresh
  useEffect(() => {
    const refresh = () => fetchAnalytics();
    window.addEventListener('socket:new-order', refresh);
    window.addEventListener('socket:order-status-updated', refresh);
    window.addEventListener('socket:payment-status-updated', refresh);
    return () => {
      window.removeEventListener('socket:new-order', refresh);
      window.removeEventListener('socket:order-status-updated', refresh);
      window.removeEventListener('socket:payment-status-updated', refresh);
    };
  }, [fetchAnalytics]);

  const summary = analytics?.summary || {};
  const statusBreakdown = analytics?.statusBreakdown || {};
  const revenueTrend = analytics?.revenueTrend || [];
  const topSellingItems = analytics?.topSellingItems || [];
  const paymentOverview = analytics?.paymentOverview || {};
  const tablePerformance = analytics?.tablePerformance || [];
  const recentOrders = analytics?.recentOrders || [];

  // Pie data for status breakdown
  const statusPieData = Object.entries(statusBreakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_CONFIG[key]?.label || key,
      value,
    }));

  // Payment pie data
  const totalPaymentOrders = (paymentOverview.cash?.count || 0) + (paymentOverview.online?.count || 0);
  const paymentPieData = totalPaymentOrders > 0 ? [
    { name: 'Cash', value: paymentOverview.cash?.count || 0 },
    { name: 'Online', value: paymentOverview.online?.count || 0 },
  ] : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-higher/95 backdrop-blur-xl border border-border/50 p-4 rounded-xl shadow-xl">
          <p className="text-text-secondary text-xs mb-2 font-medium">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm font-bold" style={{ color: p.color || '#f59e0b' }}>
              {p.name === 'revenue' ? `Revenue: ${formatCurrency(p.value)}` : `Orders: ${p.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
            <p className="text-text-secondary text-sm">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-surface border border-border/40 animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-surface border border-border/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-text-secondary text-sm">Track your restaurant performance and sales.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border/50">
          {[{ v: '7', l: '7 Days', d: 7 }, { v: '30', l: '30 Days', d: 30 }, { v: '90', l: '90 Days', d: 90 }].map(({ v, l, d }) => {
            const disabled = d > maxDays;
            return (
            <button
              key={v}
              disabled={disabled}
              onClick={() => !disabled && setRange(v)}
              title={disabled ? `Upgrade plan to access ${l}` : ''}
              className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                range === v
                  ? 'bg-surface-higher text-primary shadow-sm border border-border/50'
                  : disabled
                    ? 'text-text-muted/40 cursor-not-allowed'
                    : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {l}
              {disabled && <span className="ml-1 text-[8px] opacity-60">🔒</span>}
            </button>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-border/40 hover:border-primary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Revenue</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary">{formatCurrency(summary.totalRevenue)}</p>
              <p className="text-xs text-text-muted mt-1">From paid orders</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/40 hover:border-primary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Orders</span>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-text-primary">{summary.totalOrders || 0}</p>
              <p className="text-xs text-text-muted mt-1">In selected period</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/40 hover:border-primary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Avg Order Value</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-text-primary">{formatCurrency(summary.avgOrderValue)}</p>
              <p className="text-xs text-text-muted mt-1">Per paid order</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/40 hover:border-primary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Completed</span>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-text-primary">{summary.completedOrders || 0}</p>
              <p className="text-xs text-text-muted mt-1">{summary.completionRate || 0}% completion rate</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue & Orders Trend Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
            <CardTitle className="text-lg text-text-primary">Revenue & Orders Overview</CardTitle>
            <span className="text-xs text-text-muted">Last {range} days</span>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="70%" stopColor="#f59e0b" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255, 190, 100, 0.05)" />
                  <XAxis dataKey="name" stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false} dy={15} />
                  <YAxis yAxisId="revenue" stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} dx={-10} />
                  <YAxis yAxisId="orders" orientation="right" stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false} dx={10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255, 190, 100, 0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue2)" animationDuration={1500} />
                  <Area yAxisId="orders" type="monotone" dataKey="orders" name="orders" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" animationDuration={1500} strokeDasharray="6 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Status Breakdown + Payment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2 border-b border-border/30">
              <CardTitle className="text-lg text-text-primary">Order Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {statusPieData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="w-[180px] h-[180px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={1200}
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-surface-higher/95 backdrop-blur-xl border border-border/50 p-3 rounded-xl shadow-xl">
                                  <p className="text-sm font-bold text-text-primary">{payload[0].name}: {payload[0].value}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {Object.entries(statusBreakdown).filter(([, v]) => v > 0).map(([key, value]) => {
                      const cfg = STATUS_CONFIG[key];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                            <span className="text-sm text-text-secondary">{cfg.label}</span>
                          </div>
                          <span className="text-sm font-bold text-text-primary">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-8">No orders in this period</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2 border-b border-border/30">
              <CardTitle className="text-lg text-text-primary">Payment Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {totalPaymentOrders > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="w-[180px] h-[180px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={1200}
                        >
                          <Cell fill="#f59e0b" />
                          <Cell fill="#3b82f6" />
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-surface-higher/95 backdrop-blur-xl border border-border/50 p-3 rounded-xl shadow-xl">
                                  <p className="text-sm font-bold text-text-primary">{payload[0].name}: {payload[0].value} orders</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-4">
                    {/* Cash */}
                    <div className="p-3 rounded-xl bg-surface-elevated/50 border border-border/30">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Banknote className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-text-primary">Cash</span>
                      </div>
                      <div className="flex justify-between text-xs text-text-muted">
                        <span>{paymentOverview.cash?.count || 0} orders</span>
                        <span>{formatCurrency(paymentOverview.cash?.revenue)} revenue</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${totalPaymentOrders > 0 ? ((paymentOverview.cash?.count || 0) / totalPaymentOrders) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Online */}
                    <div className="p-3 rounded-xl bg-surface-elevated/50 border border-border/30">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-text-primary">Online</span>
                      </div>
                      <div className="flex justify-between text-xs text-text-muted">
                        <span>{paymentOverview.online?.count || 0} orders</span>
                        <span>{formatCurrency(paymentOverview.online?.revenue)} revenue</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${totalPaymentOrders > 0 ? ((paymentOverview.online?.count || 0) / totalPaymentOrders) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-8">No payment data in this period</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Selling Items + Table Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2 border-b border-border/30">
              <CardTitle className="text-lg text-text-primary flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" /> Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {topSellingItems.length > 0 ? (
                <div className="space-y-3">
                  {topSellingItems.map((item, i) => {
                    const maxQty = topSellingItems[0]?.quantity || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-text-primary truncate">{item.name}</span>
                            <span className="text-xs text-text-muted flex-shrink-0 ml-2">{item.quantity} sold</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all"
                                style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-primary flex-shrink-0">{formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-8">No item data in this period</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Table Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2 border-b border-border/30">
              <CardTitle className="text-lg text-text-primary flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" /> Top Tables
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {tablePerformance.length > 0 ? (
                <div className="space-y-3">
                  {tablePerformance.map((t, i) => {
                    const maxRev = tablePerformance[0]?.revenue || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center text-xs font-bold text-text-primary border border-border/30 flex-shrink-0">
                          {t.table}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-text-primary">Table {t.table}</span>
                            <span className="text-xs text-text-muted">{t.orders} orders</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                                style={{ width: `${(t.revenue / maxRev) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-emerald-400 flex-shrink-0">{formatCurrency(t.revenue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-8">No table data in this period</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
            <CardTitle className="text-lg text-text-primary">Recent Orders</CardTitle>
            <span className="text-xs text-text-muted">Last {recentOrders.length} orders</span>
          </CardHeader>
          <CardContent className="pt-4">
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Order</th>
                      <th className="pb-3 font-semibold">Table</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Payment</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {recentOrders.map((o, i) => (
                      <tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                        <td className="py-3 font-medium text-text-primary">{o.id}</td>
                        <td className="py-3 text-text-secondary">{o.table}</td>
                        <td className="py-3 font-medium text-primary">{formatCurrency(o.amount)}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-elevated text-text-secondary border border-border">
                            {o.paymentMethod === 'online' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                            {o.paymentMethod === 'online' ? 'Online' : 'Cash'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[o.status] || 'bg-surface-elevated text-text-muted border-border'}`}>
                            {STATUS_CONFIG[o.status]?.label || o.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-text-muted text-xs">{formatTimeAgo(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text-muted text-sm text-center py-8">No recent orders</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
