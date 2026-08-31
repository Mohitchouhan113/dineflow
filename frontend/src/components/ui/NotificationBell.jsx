import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, X, ShoppingBag, CreditCard, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../../context/SocketContext";

function formatNotifTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getNotifIcon(type) {
  switch (type) {
    case "new-order":
      return <ShoppingBag className="w-4 h-4" />;
    case "payment-status-updated":
      return <CreditCard className="w-4 h-4" />;
    default:
      return <ArrowUpRight className="w-4 h-4" />;
  }
}

function getNotifColor(type) {
  switch (type) {
    case "new-order":
      return "bg-primary/10 text-primary border-primary/20";
    case "order-status-updated":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "payment-status-updated":
      return "bg-success/10 text-success border-success/20";
    default:
      return "bg-surface-elevated text-text-secondary border-border";
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-text-secondary hover:text-text-primary bg-surface/50 hover:bg-surface-elevated border border-border/50 rounded-xl transition-all group"
      >
        <Bell className="w-5 h-5 group-hover:animate-bounce-subtle" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-background text-[10px] font-bold px-1 ring-2 ring-background"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface-higher border border-border/50 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-text-muted font-medium">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/30 transition-colors ${
                      notif.read ? "opacity-60" : "bg-surface-elevated/30"
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getNotifColor(
                        notif.type
                      )}`}
                    >
                      {getNotifIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{notif.title}</span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 truncate">{notif.message}</p>
                      <span className="text-[10px] text-text-muted mt-1 block">
                        {formatNotifTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Close */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notif.id);
                      }}
                      className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
