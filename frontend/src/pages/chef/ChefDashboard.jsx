import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChefHat, Check, ArrowRight, User } from 'lucide-react';
import { getChefOrders, updateOrderStatus } from '../../api/chefApi';

export default function ChefDashboard() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await getChefOrders();
      const orderList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.orders)
        ? res.data.orders
        : [];
      setOrders(orderList);
    } catch (err) {
      console.error('[ChefDashboard] Fetch error:', err?.response?.status, err?.response?.data || err.message);
      if (!err.response) {
        // Network error — server may be waking up from sleep
        setError('Unable to connect to server. Retrying automatically...');
      } else if (err.response.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response.status === 403) {
        setError('Access denied. Chef account required.');
      } else {
        setError(`Server error (${err.response.status}). Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for socket events and refetch immediately
  useEffect(() => {
    const handleNewOrder = (e) => {
      fetchOrders();
      const data = e.detail;
      if (data) {
        const msg = `New order from Table ${data.table}`;
        setToast(msg);
        setTimeout(() => setToast(null), 5000);
      }
    };
    const handleStatusUpdate = () => fetchOrders();

    window.addEventListener("socket:new-order", handleNewOrder);
    window.addEventListener("socket:order-status-updated", handleStatusUpdate);

    return () => {
      window.removeEventListener("socket:new-order", handleNewOrder);
      window.removeEventListener("socket:order-status-updated", handleStatusUpdate);
    };
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o._id === id ? { ...o, orderStatus: newStatus } : o));
      await updateOrderStatus(id, newStatus);
    } catch (err) {
      console.error(err);
      // Rollback on failure
      fetchOrders();
    }
  };

  const getActionInfo = (status) => {
    switch(status) {
      case 'pending': return { label: 'Accept Order', nextStatus: 'accepted', color: 'bg-primary hover:bg-primary-hover text-white' };
      case 'accepted': return { label: 'Start Preparing', nextStatus: 'preparing', color: 'bg-blue-600 hover:bg-blue-700 text-white' };
      case 'preparing': return { label: 'Mark Ready', nextStatus: 'ready', color: 'bg-orange-500 hover:bg-orange-600 text-white' };
      case 'ready': return { label: 'Complete Order', nextStatus: 'completed', color: 'bg-success hover:bg-success/90 text-white' };
      default: return null;
    }
  };

  const getTimeElapsed = (createdAt) => {
    const minutes = Math.floor((new Date() - new Date(createdAt)) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  };

  const columns = [
    { id: 'pending', title: 'New Orders', bgColor: 'bg-surface/50 border-primary/20' },
    { id: 'accepted', title: 'Accepted', bgColor: 'bg-surface/50 border-blue-500/20' },
    { id: 'preparing', title: 'Preparing', bgColor: 'bg-surface/50 border-orange-500/20' },
    { id: 'ready', title: 'Ready', bgColor: 'bg-surface/50 border-success/20' }
  ];

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <ChefHat className="w-12 h-12 text-primary animate-pulse mb-4" />
        <p className="text-text-secondary font-medium">Loading Kitchen Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-primary text-background font-bold text-sm shadow-lg shadow-primary/30"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-surface-higher border-b border-border/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">DineFlow Kitchen</h1>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-success uppercase tracking-wider">Kitchen Online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-text-primary">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            <div className="text-xs text-text-secondary">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="w-px h-8 bg-border/50 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-text-secondary hidden sm:block">Chef Dashboard</div>
            <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center border border-border">
              <User className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 overflow-x-auto p-6 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-surface via-background to-background">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
            <span className="text-red-500 text-sm font-medium">{error}</span>
            <button onClick={() => { setIsLoading(true); setError(null); fetchOrders(); }} className="text-xs bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors">Retry</button>
          </div>
        )}

        <div className="flex gap-6 h-full min-w-max">
          {columns.map(col => {
            const colOrders = orders.filter(o => o.orderStatus === col.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return (
              <div key={col.id} className={`w-80 flex flex-col rounded-2xl border ${col.bgColor} shadow-xl overflow-hidden`}>
                <div className="px-5 py-4 border-b border-border/50 bg-surface-elevated/50 backdrop-blur flex justify-between items-center sticky top-0 z-10">
                  <h2 className="font-bold text-text-primary text-lg capitalize">{col.title}</h2>
                  <span className="bg-background text-text-secondary text-xs font-bold px-2.5 py-1 rounded-full border border-border">
                    {colOrders.length}
                  </span>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                  <AnimatePresence mode="popLayout">
                    {colOrders.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="h-32 flex items-center justify-center text-text-muted text-sm border-2 border-dashed border-border/50 rounded-xl"
                      >
                        No orders
                      </motion.div>
                    ) : (
                      colOrders.map(order => {
                        const action = getActionInfo(order.orderStatus);
                        return (
                          <motion.div
                            layout
                            key={order._id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="bg-surface-elevated border border-border hover:border-primary/30 transition-colors rounded-xl p-4 shadow-lg relative group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <span className="text-sm font-bold text-primary">#ORD-{order._id.slice(-4).toUpperCase()}</span>
                                <div className="text-lg font-black text-text-primary mt-0.5">
                                  {order.tableId?.tableNumber ? `Table ${order.tableId.tableNumber}` : 'Takeaway'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary bg-background px-2 py-1 rounded-lg border border-border">
                                <Clock className="w-3.5 h-3.5" />
                                {getTimeElapsed(order.createdAt)}
                              </div>
                            </div>

                            <div className="space-y-2 mb-4 bg-background/50 rounded-lg p-3 border border-border/50">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-start text-sm">
                                  <div className="flex gap-2 font-medium text-text-primary">
                                    <span className="text-primary font-bold">{item.quantity}×</span>
                                    {item.name || 'Unknown Item'}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {order.customerNote && (
                              <div className="mb-4 text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-600/90 dark:text-yellow-400 p-2.5 rounded-lg font-medium italic">
                                "{order.customerNote}"
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-4">
                              <div className="text-xs text-text-muted font-medium">
                                {order.paymentMethod === 'online' ? 'Online • Paid' : 'Cash'}
                              </div>
                              {action && (
                                <button
                                  onClick={() => handleStatusUpdate(order._id, action.nextStatus)}
                                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 ${action.color}`}
                                >
                                  {action.label}
                                  {action.nextStatus === 'completed' ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
