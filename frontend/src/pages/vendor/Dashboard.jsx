import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  ShoppingBag,
  DollarSign,
  Utensils,
  Users,
  X,
  Clock,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { MetricCard } from "../../components/dashboard/MetricCard";
import { RevenueChart } from "../../components/dashboard/RevenueChart";
import { LiveOrders } from "../../components/dashboard/LiveOrders";
import { PopularItems } from "../../components/dashboard/PopularItems";
import { RestaurantStatus } from "../../components/dashboard/RestaurantStatus";
import api from "../../api/axios";

function capitalize(str) {
  if (!str) return 'Pending';
  return str.charAt(0).toUpperCase() + str.slice(1);
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

export default function Dashboard() {
  const navigate = useNavigate();

  // ==========================================
  // NEW ORDER MODAL
  // ==========================================
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [checkingTableId, setCheckingTableId] = useState(null);

  // ==========================================
  // ACTIVE ORDER MODAL
  // ==========================================
  const [showActiveOrderModal, setShowActiveOrderModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeOrderLoading, setActiveOrderLoading] = useState(false);

  const fetchTablesForNewOrder = async () => {
    try {
      setTablesLoading(true);
      const res = await api.get("/api/vendor/tables");
      const tableList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.tables)
        ? res.data.tables
        : [];
      setTables(tableList.filter((t) => t.isActive !== false));
    } catch (err) {
      console.error("Failed to fetch tables:", err);
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleNewOrderClick = () => {
    fetchTablesForNewOrder();
    setShowNewOrderModal(true);
  };

  const handleSelectTable = async (table) => {
    const vendorId =
      typeof table.vendorId === "object"
        ? table.vendorId?._id
        : table.vendorId;

    if (!vendorId || !table._id) {
      alert("Table configuration is incomplete.");
      return;
    }

    try {
      setCheckingTableId(table._id);
      setActiveOrderLoading(true);

      const res = await api.get(`/api/vendor/tables/${table._id}/active-order`);
      const data = res.data;

      if (data.hasActiveOrder && data.order) {
        setActiveOrder(data.order);
        setShowActiveOrderModal(true);
        setShowNewOrderModal(false);
      } else {
        // No active order, navigate to public menu
        navigate(`/menu/${vendorId}/${table._id}`, { state: { fromVendor: true } });
        setShowNewOrderModal(false);
      }
    } catch (err) {
      console.error("Failed to check active order:", err);
      // On error, proceed to menu anyway
      navigate(`/menu/${vendorId}/${table._id}`, { state: { fromVendor: true } });
      setShowNewOrderModal(false);
    } finally {
      setActiveOrderLoading(false);
      setCheckingTableId(null);
    }
  };

  const handleViewOrder = () => {
    setShowActiveOrderModal(false);
    setActiveOrder(null);
    navigate("/vendor/orders");
  };

  const handleCloseActiveOrder = () => {
    setShowActiveOrderModal(false);
    setActiveOrder(null);
  };

  // ==========================================
  // VENDOR INFO (for greeting)
  // ==========================================
  const [restaurantName, setRestaurantName] = useState('Restaurant');

  useEffect(() => {
    const fetchName = async () => {
      try {
        const res = await api.get('/api/vendor/info');
        setRestaurantName(res.data.restaurantName || 'Restaurant');
      } catch {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setRestaurantName(user.vendorRestaurantName || 'Restaurant');
      }
    };
    fetchName();
    const handler = () => fetchName();
    window.addEventListener('vendor-settings-updated', handler);
    return () => window.removeEventListener('vendor-settings-updated', handler);
  }, []);

  // ==========================================
  // DASHBOARD DATA (from API)
  // ==========================================
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState('7 Days');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/api/vendor/dashboard/summary');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refresh on socket events
  useEffect(() => {
    const refresh = () => fetchDashboard();
    window.addEventListener('socket:new-order', refresh);
    window.addEventListener('socket:order-status-updated', refresh);
    window.addEventListener('socket:payment-status-updated', refresh);
    return () => {
      window.removeEventListener('socket:new-order', refresh);
      window.removeEventListener('socket:order-status-updated', refresh);
      window.removeEventListener('socket:payment-status-updated', refresh);
    };
  }, [fetchDashboard]);

  const summary = dashboardData?.summary || {};
  const revenueSeries = dashboardData?.revenueSeries || {};
  const liveOrders = dashboardData?.liveOrders || [];
  const popularItems = dashboardData?.popularItems || [];

  const chartDataMap = {
    '7 Days': revenueSeries['7d'] || [],
    '30 Days': revenueSeries['30d'] || [],
    '90 Days': revenueSeries['90d'] || [],
  };
  const chartData = chartDataMap[chartFilter] || chartDataMap['7 Days'] || [];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8 relative">
      {/* Subtle warm ambient light behind hero */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Premium Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              Live
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {today}
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary leading-tight">
            Good evening, <br />
            <span className="text-primary">{restaurantName}</span>
          </h1>
          <p className="text-text-secondary mt-2 text-lg">
            Your restaurant is running smoothly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleNewOrderClick}
            className="shrink-0 gap-2 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.97] transition-all"
            variant="primary"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold text-base">New Order</span>
          </Button>
        </div>
      </motion.div>

      {/* Restaurant Health Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4 rounded-2xl bg-surface/80 border border-border backdrop-blur-sm relative z-10"
      >
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
          System Status
        </span>
        <div className="w-px h-6 bg-border hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">
            Kitchen
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />{" "}
            Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">
            QR Ordering
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />{" "}
            Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">
            Payments
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />{" "}
            Active
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-text-secondary">Menu</span>
          <span className="text-sm font-semibold text-text-primary text-right">
            {summary.availableItems ?? 0}
            <span className="text-text-muted">
              /{summary.totalActiveItems ?? 0} Available
            </span>
          </span>
        </div>
      </motion.div>

      {/* Metrics Row */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 relative z-10"
      >
        <MetricCard
          type="orders"
          title="Today's Orders"
          value={summary.todaysOrders ?? 0}
          trend={summary.orderTrend ?? '+0%'}
          icon={ShoppingBag}
        />
        <MetricCard
          type="revenue"
          title="Revenue"
          value={summary.todaysRevenue ?? 0}
          trend={summary.revenueTrend ?? '+0%'}
          icon={DollarSign}
        />
        <MetricCard
          type="availability"
          title="Active Menu Items"
          value={summary.totalActiveItems ?? 0}
          available={summary.availableItems ?? 0}
          icon={Utensils}
        />
        <MetricCard
          type="capacity"
          title="Occupied Tables"
          current={summary.occupiedTables ?? 0}
          total={summary.totalActiveTables ?? 0}
          percentage={
            summary.totalActiveTables > 0
              ? Math.round((summary.occupiedTables / summary.totalActiveTables) * 100)
              : 0
          }
          icon={Users}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <RevenueChart data={chartData} filter={chartFilter} onFilterChange={setChartFilter} />
        <div className="lg:col-span-1">
          <LiveOrders orders={liveOrders} onViewAll={() => navigate('/vendor/orders')} />
        </div>
      </div>

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <PopularItems items={popularItems} />
        </div>
        <div className="lg:col-span-1">
          <RestaurantStatus data={summary} />
        </div>
      </div>

      {/* ==========================================
          NEW ORDER MODAL - Select Table
          ========================================== */}
      <Modal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        title="New Order"
      >
        <p className="text-sm text-text-secondary mb-4">
          Select an active table to open its menu and place an order.
        </p>

        {tablesLoading ? (
          <div className="py-8 text-center text-text-muted text-sm">
            Loading tables...
          </div>
        ) : tables.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">
            No active tables found.{" "}
            <button
              onClick={() => {
                setShowNewOrderModal(false);
                navigate("/vendor/tables");
              }}
              className="text-primary hover:underline font-medium"
            >
              Create a table first
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
            {tables.map((table) => (
              <button
                key={table._id}
                onClick={() => handleSelectTable(table)}
                disabled={checkingTableId === table._id}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group disabled:opacity-50 disabled:cursor-wait"
              >
                {checkingTableId === table._id ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-1" />
                ) : (
                  <span className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                    {table.tableNumber}
                  </span>
                )}
                <span className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                  Table
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* ==========================================
          ACTIVE ORDER MODAL
          ========================================== */}
      <Modal
        isOpen={showActiveOrderModal}
        onClose={handleCloseActiveOrder}
        title="Active Order"
      >
        {activeOrder && (
          <div className="space-y-4">
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  Table {activeOrder.tableId?.tableNumber || '—'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {capitalize(activeOrder.orderStatus)}
                </span>
              </div>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatTimeAgo(activeOrder.createdAt)}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {activeOrder.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    <span className="font-medium text-text-primary">{item.quantity}×</span>{' '}
                    {item.name}
                  </span>
                  <span className="text-text-primary font-medium">₹{item.total}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-3 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Subtotal</span>
                <span>₹{activeOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Tax</span>
                <span>₹{activeOrder.tax}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-text-primary pt-1">
                <span>Total</span>
                <span>₹{activeOrder.totalAmount}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-elevated text-text-secondary border border-border">
                {activeOrder.paymentMethod === 'online' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                {activeOrder.paymentMethod === 'online' ? 'Online' : 'Cash'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                activeOrder.paymentStatus === 'paid' ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'
              }`}>
                {activeOrder.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>

            {/* Customer Note */}
            {activeOrder.customerNote && (
              <div className="p-2.5 rounded-lg bg-surface-elevated border border-border/50">
                <span className="text-xs text-text-secondary">📝 {activeOrder.customerNote}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCloseActiveOrder}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-surface-elevated text-text-secondary border border-border hover:bg-surface-higher transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleViewOrder}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-background hover:bg-primary-hover transition-colors"
              >
                View Order
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
