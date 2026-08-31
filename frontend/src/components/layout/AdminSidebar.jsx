import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Store, CreditCard, TrendingUp, LogOut, ChevronRight, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';
import socket from '../../socket/socket';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin/dashboard' },
  { icon: Store, label: 'Vendors', path: '/admin/vendors' },
  { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
  { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
];

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    navigate('/login');
  };

  let user = null;
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-[280px] bg-surface-higher/95 backdrop-blur-xl border-r border-border/40 flex flex-col shadow-2xl lg:shadow-none",
        "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        !isOpen && "-translate-x-full", isOpen && "translate-x-0", "lg:!translate-x-0"
      )}>
        <div className="flex h-24 items-center px-6 border-b border-border/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] border border-primary/20">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-text-primary">DineFlow</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary block mt-0.5">Admin</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={() => setIsOpen(false)}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group",
                isActive ? "text-primary" : "text-text-secondary hover:text-text-primary"
              )}>
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.div layoutId="admin-sidebar-active" className="absolute inset-0 bg-surface-elevated/80 rounded-xl border border-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}>
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
        <div className="p-5 border-t border-border/30 bg-background/20 backdrop-blur-md">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-elevated/50 border border-border/40">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-500/20 to-red-400/10 flex items-center justify-center flex-shrink-0 border border-red-500/20">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{user?.name || 'Super Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
                <span className="text-red-400 font-medium">Super Admin</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-primary hover:bg-primary/5 transition-colors group">
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
