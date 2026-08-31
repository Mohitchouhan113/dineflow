
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, X, ChevronDown, User, LogOut, Settings, Mail, Briefcase, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import NotificationBell from '../ui/NotificationBell';
import socket from '../../socket/socket';

const ROLE_LABELS = {
  vendorAdmin: 'Vendor Admin',
  chef: 'Chef',
  superAdmin: 'Super Admin',
};

function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Topbar({ setIsSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // User data
  const [user, setUser] = useState(getUser);

  // Keep user in sync with localStorage (e.g. after login)
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Re-read user on route change (login sets user then navigates)
  useEffect(() => {
    setUser(getUser());
  }, [location.pathname]);

  const displayName = user?.name || 'Admin User';
  const displayEmail = user?.email || '';
  const displayRole = ROLE_LABELS[user?.role] || user?.role || 'Vendor';

  // Search
  const getInitialSearch = () => {
    const params = new URLSearchParams(location.search);
    return params.get('search') || '';
  };

  const [searchQuery, setSearchQuery] = useState(getInitialSearch);

  const handleSearchSubmit = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      const encoded = encodeURIComponent(query);
      const upper = query.toUpperCase();

      if (upper.startsWith('T') || upper.startsWith('ORD') || upper.startsWith('#')) {
        navigate(`/vendor/orders?search=${encoded}`);
      } else {
        navigate(`/vendor/menu?search=${encoded}`);
      }
    }
  }, [searchQuery, navigate]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    if (location.pathname.startsWith('/vendor/menu') || location.pathname.startsWith('/vendor/orders')) {
      const params = new URLSearchParams(location.search);
      params.delete('search');
      const qs = params.toString();
      navigate(location.pathname + (qs ? `?${qs}` : ''), { replace: true });
    }
  }, [location, navigate]);

  // Profile dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dropdownOpen]);

  // Logout
  const handleLogout = () => {
    setDropdownOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    navigate('/login');
  };

  return (
    <>
    <header className="h-20 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-xl transition-all"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden md:flex items-center relative w-72 group">
          <Search className="w-4 h-4 absolute left-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
          <Input 
            type="text" 
            placeholder="Search orders, menus..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
            className="pl-10 pr-9 bg-surface/50 border-border/50 focus-visible:bg-surface focus-visible:border-primary/50 focus-visible:ring-primary/20 rounded-xl transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5">
        <NotificationBell />
        
        {/* Profile Area */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-surface-elevated transition-colors group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-background text-sm font-bold shadow-sm">
              {getInitials(displayName)}
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-text-primary leading-tight">{displayName}</span>
              <span className="text-[11px] font-medium text-text-secondary">{displayRole}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-64 bg-surface-higher/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50"
              >
                {/* User Info Header */}
                <div className="px-4 pt-4 pb-3 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-background text-sm font-bold">
                      {getInitials(displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{displayName}</p>
                      <p className="text-xs text-text-secondary truncate">{displayEmail}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {displayRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  {user?.role === 'vendorAdmin' && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/vendor/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  )}
                  <div className="my-1 border-t border-border/30" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>

    {/* Profile Modal */}
    <Modal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} title="Profile">
      <div className="space-y-5">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-background text-lg font-bold">
            {getInitials(displayName)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">{displayName}</h3>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {displayRole}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/50 border border-border/30">
            <Mail className="w-4 h-4 text-text-muted shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-text-primary">{displayEmail || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/50 border border-border/30">
            <Briefcase className="w-4 h-4 text-text-muted shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Role</p>
              <p className="text-sm font-medium text-text-primary">{displayRole}</p>
            </div>
          </div>
          {user?.vendorId && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/50 border border-border/30">
              <Building2 className="w-4 h-4 text-text-muted shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Vendor ID</p>
                <p className="text-sm font-medium text-text-primary font-mono">{user.vendorId}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
    </>
  );
}
