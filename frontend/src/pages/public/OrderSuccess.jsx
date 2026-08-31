import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Receipt, ArrowLeft, Clock } from 'lucide-react';
import socket from '../../socket/socket';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  accepted: { label: 'Accepted', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  preparing: { label: 'Preparing', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  ready: { label: 'Ready', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const { order, table, restaurant, status: initialStatus, method } = location.state || {};

  // Real-time status state — initialized from actual order data
  const [status, setStatus] = useState(initialStatus || order?.orderStatus || 'pending');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Extract order ID safely
  const currentOrderId = order?._id || order?.id || null;

  // Determine table display
  const tableDisplay =
    order?.tableId?.tableNumber ||
    order?.tableId?.name ||
    order?.table?.tableNumber ||
    order?.tableNumber ||
    table?.tableNumber ||
    'Takeaway';



  // Socket: join order room + listen for status updates
  useEffect(() => {
    if (!currentOrderId) return;

    // Emit join to order-specific room
    if (socket.connected) {
      socket.emit('join-order-room', currentOrderId);
    } else {
      // If not connected yet, wait for connect then join
      const onConnect = () => {
        socket.emit('join-order-room', currentOrderId);
      };
      socket.on('connect', onConnect);
      // Also try connecting
      if (!socket.connected) {
        socket.connect();
      }
    }

    // Listen for status updates
    const handleStatusUpdate = (payload) => {
      if (String(payload.orderId) === String(currentOrderId)) {
        setStatus(payload.status);
        setLastUpdate(payload.updatedAt);
      }
    };

    socket.on('order-status-updated', handleStatusUpdate);

    return () => {
      socket.off('connect', () => {});
      socket.off('order-status-updated', handleStatusUpdate);
    };
  }, [currentOrderId]);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[#5C5549] mb-4">No order found.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans selection:bg-amber-200 selection:text-amber-900 flex flex-col items-center pt-20 px-6">
      
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner"
      >
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-black text-[#1A1816] mb-2 tracking-tight">Order Placed!</h1>
        <p className="text-[#5C5549] font-medium text-lg">Thank you for ordering with us.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-[#EAE5D9] mb-8 relative overflow-hidden"
      >
        {/* Ticket zig-zag decoration */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-2 -translate-y-1/2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#FDFBF7] rounded-full"></div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-dashed border-[#EAE5D9]">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#8C8477] uppercase tracking-wider mb-0.5">Order Number</div>
            <div className="text-xl font-black text-[#1A1816]">#ORD-{order._id?.slice(-6).toUpperCase() || '12345'}</div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-[#8C8477] font-medium">Table</span>
            <span className="font-bold text-[#1A1816] text-lg">{tableDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8C8477] font-medium">Total Amount</span>
            <span className="font-bold text-amber-700 text-lg">₹{(order.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8C8477] font-medium">Payment Method</span>
            <span className="font-bold text-[#1A1816] bg-[#F5F2EA] px-3 py-1 rounded-lg">{method || 'Cash'}</span>
          </div>
        </div>

        <div className={`${statusConfig.bg} rounded-2xl p-4 flex items-center gap-3 border ${statusConfig.border}`}>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
            <Clock className={`w-5 h-5 ${statusConfig.color}`} />
          </div>
          <div>
            <div className="text-sm font-bold text-[#1A1816]">Current Status</div>
            <div className={`${statusConfig.color} font-medium capitalize text-sm`}>
              {statusConfig.label}
            </div>
            {lastUpdate && (
              <div className="text-xs text-[#8C8477] mt-0.5">
                Updated: {new Date(lastUpdate).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8C8477] hover:text-[#1A1816] font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Menu
        </button>
      </motion.div>
    </div>
  );
}
