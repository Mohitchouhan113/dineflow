import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ShoppingBag, RefreshCw, Clock, CreditCard, Banknote, Filter, ChevronDown, ChevronUp, StickyNote, Check } from 'lucide-react';
import api from '../../api/axios';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

function formatTime(dateStr) {
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

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

function PaymentBadge({ method }) {
  if (method === 'online') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <CreditCard className="w-3 h-3" /> Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-elevated text-text-secondary border border-border">
      <Banknote className="w-3 h-3" /> Cash
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const styles = {
    paid: 'bg-success/10 text-success border-success/20',
    pending: 'bg-primary/10 text-primary border-primary/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || styles.pending}`}>
      {status === 'paid' ? 'Paid' : status === 'failed' ? 'Failed' : 'Pending'}
    </span>
  );
}

function OrderCard({ order, onPaymentUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const tableNumber = order.tableId?.tableNumber || order.tableId || '—';

  const handleMarkAsPaid = async () => {
    if (!window.confirm('Confirm cash payment received?')) return;
    try {
      setMarkingPaid(true);
      await api.patch(`/api/vendor/orders/${order._id}/payment-status`, {
        paymentStatus: 'paid',
      });
      onPaymentUpdate?.(order._id, 'paid');
    } catch (err) {
      console.error('Failed to update payment status:', err);
      alert(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <Card className="border-border/50 hover:border-primary/20 transition-colors">
      <CardContent className="p-0">
        {/* Header row */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary truncate">
                  Table {tableNumber}
                </span>
                <StatusBadge status={capitalize(order.orderStatus)} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTime(order.createdAt)}
                </span>
                <span className="text-xs text-text-muted">
                  {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-primary">{formatCurrency(order.totalAmount)}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PaymentBadge method={order.paymentMethod} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-border/50">
            {/* Items */}
            <div className="mt-3 space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    <span className="font-medium text-text-primary">{item.quantity}×</span>{' '}
                    {item.name}
                  </span>
                  <span className="text-text-primary font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-text-primary pt-1">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {/* Customer note */}
            {order.customerNote && (
              <div className="mt-3 p-2.5 rounded-lg bg-surface-elevated border border-border/50 flex items-start gap-2">
                <StickyNote className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
                <span className="text-xs text-text-secondary">{order.customerNote}</span>
              </div>
            )}

            {/* Mark as Paid for cash pending */}
            {order.paymentMethod === 'cash' && order.paymentStatus === 'pending' && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <button
                  onClick={handleMarkAsPaid}
                  disabled={markingPaid}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {markingPaid ? 'Updating...' : 'Mark as Paid'}
                </button>
              </div>
            )}

            {/* Order ID for reference */}
            <div className="mt-3 text-[10px] text-text-muted font-mono">
              Order #{order._id?.slice(-8).toUpperCase()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function capitalize(str) {
  if (!str) return 'Pending';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Orders() {
  const [searchParams] = useSearchParams();
  const globalSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isManualRefresh = false) => {
    try {
      setError(null);
      if (isManualRefresh) setRefreshing(true);
      const res = await api.get('/api/vendor/orders');

      const orderList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.orders)
        ? res.data.orders
        : [];

      setOrders(orderList);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchOrders(false), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Listen for socket events and refetch immediately
  useEffect(() => {
    const handleNewOrder = () => fetchOrders();
    const handleStatusUpdate = () => fetchOrders();
    const handlePaymentUpdate = () => fetchOrders();

    window.addEventListener("socket:new-order", handleNewOrder);
    window.addEventListener("socket:order-status-updated", handleStatusUpdate);
    window.addEventListener("socket:payment-status-updated", handlePaymentUpdate);
    // Also listen for subscription plan updates
    window.addEventListener("socket:subscription-plan-updated", handlePaymentUpdate);

    return () => {
      window.removeEventListener("socket:new-order", handleNewOrder);
      window.removeEventListener("socket:order-status-updated", handleStatusUpdate);
      window.removeEventListener("socket:payment-status-updated", handlePaymentUpdate);
      window.removeEventListener("socket:subscription-plan-updated", handlePaymentUpdate);
    };
  }, [fetchOrders]);

  // Pre-filter by search for tab counts
  const searchFilteredOrders = globalSearch.trim()
    ? orders.filter((o) => {
        const q = globalSearch.trim().toLowerCase();
        const tableNum = String(o.tableId?.tableNumber || o.tableId || '').toLowerCase();
        const orderNum = String(o.orderNumber || o._id || '').toLowerCase();
        const itemNames = (o.items || []).map(i => (i.name || '').toLowerCase()).join(' ');
        const note = String(o.customerNote || '').toLowerCase();
        return tableNum.includes(q) || orderNum.includes(q) || itemNames.includes(q) || note.includes(q);
      })
    : orders;

  const filteredOrders = searchFilteredOrders
    .filter((o) => activeTab === 'all' || o.orderStatus === activeTab);

  const tabCounts = {};
  for (const tab of STATUS_TABS) {
    if (tab.key === 'all') {
      tabCounts[tab.key] = searchFilteredOrders.length;
    } else {
      tabCounts[tab.key] = searchFilteredOrders.filter((o) => o.orderStatus === tab.key).length;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Orders</h1>
          <p className="text-text-secondary text-sm">
            Real-time orders from QR menu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-surface-elevated text-text-muted border-border'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-text-secondary border border-border hover:bg-surface-higher transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-background shadow-md shadow-primary/20'
                : 'bg-surface-elevated text-text-secondary hover:bg-surface-higher border border-border/50'
            }`}
          >
            {tab.label}
            <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key
                ? 'bg-white/20 text-background'
                : 'bg-surface text-text-muted'
            }`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOrders} className="text-red-400 hover:text-red-300 text-xs font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-sm font-medium">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4 border border-border">
            <ShoppingBag className="w-8 h-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">
            {globalSearch.trim()
              ? 'No orders match your search'
              : activeTab === 'all' ? 'No orders yet' : `No ${activeTab} orders`}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {globalSearch.trim()
              ? 'Try a different search term.'
              : activeTab === 'all'
              ? 'Orders from QR menu will appear here.'
              : 'Try selecting a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onPaymentUpdate={(orderId, newStatus) => {
                  setOrders((prev) =>
                    prev.map((o) =>
                      o._id === orderId
                        ? {
                            ...o,
                            paymentStatus: newStatus,
                            // Auto-complete cash orders when payment is confirmed
                            ...(newStatus === 'paid' && o.paymentMethod === 'cash'
                              ? { orderStatus: 'completed' }
                              : {}),
                          }
                        : o
                    )
                  );
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
