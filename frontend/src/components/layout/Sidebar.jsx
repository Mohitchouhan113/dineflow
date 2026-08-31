import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, Utensils, ListTree, Users, QrCode, TrendingUp, Settings, CreditCard, LogOut, ChevronRight, Store } from 'lucide-react';
import { cn } from '../../utils/cn';
import socket from '../../socket/socket';
import api from '../../api/axios';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/vendor/dashboard' },
  { icon: ShoppingBag, label: 'Orders', path: '/vendor/orders' },
  { icon: Utensils, label: 'Menu', path: '/vendor/menu' },
  { icon: ListTree, label: 'Categories', path: '/vendor/categories' },
  { icon: Users, label: 'Chefs', path: '/vendor/chefs' },
  { icon: QrCode, label: 'Tables & QR', path: '/vendor/tables' },
  { icon: TrendingUp, label: 'Analytics', path: '/vendor/analytics' },
  { icon: CreditCard, label: 'Billing', path: '/vendor/billing' },
  { icon: Settings, label: 'Settings', path: '/vendor/settings' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const [vendorInfo, setVendorInfo] = useState({
    restaurantName: 'Restaurant',
    city: '',
    isOpen: true,
  });

  const fetchVendorInfo = useCallback(async () => {
    try {
      const res = await api.get('/api/vendor/info');
      setVendorInfo({
        restaurantName: res.data.restaurantName || 'Restaurant',
        city: res.data.city || '',
        isOpen: res.data.isOpen !== false,
      });
      // Also cache in localStorage for immediate rendering
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.vendorRestaurantName = res.data.restaurantName;
      user.vendorCity = res.data.city;
      user.vendorIsOpen = res.data.isOpen;
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      // Fallback to cached data from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.vendorRestaurantName) {
        setVendorInfo({
          restaurantName: user.vendorRestaurantName,
          city: user.vendorCity || '',
          isOpen: user.vendorIsOpen !== false,
        });
      }
    }
  }, []);

  useEffect(() => { fetchVendorInfo(); }, [fetchVendorInfo]);

  // Re-fetch when settings are updated
  useEffect(() => {
    const handler = () => fetchVendorInfo();
    window.addEventListener('vendor-settings-updated', handler);
    return () => window.removeEventListener('vendor-settings-updated', handler);
  }, [fetchVendorInfo]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    navigate('/login');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[280px] bg-surface-higher/95 backdrop-blur-xl border-r border-border/40 flex flex-col shadow-2xl lg:shadow-none",
          // Mobile: hidden by default, slide in when open
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          !isOpen && "-translate-x-full",
          isOpen && "translate-x-0",
          // Desktop: always visible — lg:!translate-x-0 overrides framer-motion and mobile classes
          "lg:!translate-x-0"
        )}
      >
        <div className="flex h-16 items-center px-5 border-b border-border/30 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] border border-primary/20">
              <Utensils className="w-5 h-5 text-background" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-text-primary">DineFlow</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary block mt-0.5">Partner</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto lg:overflow-y-visible py-3 px-3 space-y-0.5 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group",
                isActive ? "text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-surface-elevated/80 rounded-xl border border-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    </motion.div>
                  ) : (
                    <div className="absolute inset-0 bg-surface-elevated/0 group-hover:bg-surface-elevated/40 rounded-xl transition-colors duration-300" />
                  )}
                  <item.icon className={cn("w-5 h-5 z-10 transition-transform duration-300", isActive ? "scale-110" : "group-hover:translate-x-1")} />
                  <span className="z-10">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto z-10 opacity-50" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border/30 bg-background/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/50 border border-border/40 hover:border-primary/30 transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-surface to-surface-higher flex items-center justify-center flex-shrink-0 border border-border/50 group-hover:border-primary/30 transition-colors">
                <Store className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface-higher shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{vendorInfo.restaurantName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
                <span className={vendorInfo.isOpen ? 'text-success font-medium' : 'text-red-400 font-medium'}>
                  {vendorInfo.isOpen ? 'Open' : 'Closed'}
                </span>
                {vendorInfo.city && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="truncate">{vendorInfo.city}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-primary hover:bg-primary/5 transition-colors group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
