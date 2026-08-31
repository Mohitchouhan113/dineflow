import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import socket from "../socket/socket";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

// Notification sound - only plays once per new order
let lastSoundTime = 0;
function playNotificationSound() {
  const now = Date.now();
  if (now - lastSoundTime < 2000) return; // debounce 2s
  lastSoundTime = now;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Browser blocked audio, silently continue
  }
}

export function SocketProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const joinedVendorRef = useRef(null);

  // Get user info from localStorage
  const getUserInfo = useCallback(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Connect socket when authenticated
  useEffect(() => {
    const user = getUserInfo();
    const token = localStorage.getItem("token");

    if (user && token && !socket.connected) {
      socket.connect();
    }

    return () => {
      // Don't disconnect on unmount — let it persist across route changes
    };
  }, [getUserInfo]);

  // Handle connection state
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      // Re-join vendor room on reconnect
      const user = getUserInfo();
      if (user?.vendorId) {
        socket.emit("join-vendor-room", user.vendorId);
        joinedVendorRef.current = user.vendorId;
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // If already connected, set state
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [getUserInfo]);

  // Join vendor room when user info changes
  useEffect(() => {
    const user = getUserInfo();
    if (user?.vendorId && socket.connected) {
      socket.emit("join-vendor-room", user.vendorId);
      joinedVendorRef.current = user.vendorId;
    }
  }, [getUserInfo]);

  // Listen for socket events
  useEffect(() => {
    const user = getUserInfo();
    const isChef = user?.role === "chef";

    const addNotification = (notif) => {
      setNotifications((prev) => {
        // Deduplicate by orderId + type
        const exists = prev.find(
          (n) => n.orderId === notif.orderId && n.type === notif.type
        );
        if (exists) return prev;
        return [notif, ...prev].slice(0, 50); // keep max 50
      });
    };

    const handleNewOrder = (data) => {
      const notif = {
        id: `${data.orderId}-${Date.now()}`,
        type: "new-order",
        title: "New Order",
        message: `Table ${data.table} placed order #${data.orderNumber}`,
        orderId: data.orderId,
        createdAt: data.createdAt,
        read: false,
      };
      addNotification(notif);
      // Play sound only for vendor
      if (!isChef) {
        playNotificationSound();
      }
      // Dispatch custom event for pages to refetch
      window.dispatchEvent(new CustomEvent("socket:new-order", { detail: data }));
    };

    const handleOrderStatusUpdated = (data) => {
      const notif = {
        id: `${data.orderId}-status-${Date.now()}`,
        type: "order-status-updated",
        title: "Order Updated",
        message: `Order #${data.orderNumber} is now ${data.status}`,
        orderId: data.orderId,
        createdAt: data.updatedAt,
        read: false,
      };
      addNotification(notif);
      // Dispatch custom event for pages to refetch
      window.dispatchEvent(new CustomEvent("socket:order-status-updated", { detail: data }));
    };

    const handlePaymentStatusUpdated = (data) => {
      const notif = {
        id: `${data.orderId}-payment-${Date.now()}`,
        type: "payment-status-updated",
        title: "Payment Updated",
        message: `Payment ${data.paymentStatus} for #${data.orderNumber}`,
        orderId: data.orderId,
        createdAt: data.updatedAt,
        read: false,
      };
      addNotification(notif);
      // Dispatch custom event for pages to refetch
      window.dispatchEvent(new CustomEvent("socket:payment-status-updated", { detail: data }));
    };

    const handleSubscriptionPaymentUpdated = (data) => {
      window.dispatchEvent(new CustomEvent("socket:subscription-payment-updated", { detail: data }));
    };

    socket.on("new-order", handleNewOrder);
    socket.on("order-status-updated", handleOrderStatusUpdated);
    socket.on("payment-status-updated", handlePaymentStatusUpdated);
    socket.on("subscription-payment-updated", handleSubscriptionPaymentUpdated);

    return () => {
      socket.off("new-order", handleNewOrder);
      socket.off("order-status-updated", handleOrderStatusUpdated);
      socket.off("payment-status-updated", handlePaymentStatusUpdated);
      socket.off("subscription-payment-updated", handleSubscriptionPaymentUpdated);
    };
  }, [getUserInfo]);

  const markAsRead = useCallback((notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
