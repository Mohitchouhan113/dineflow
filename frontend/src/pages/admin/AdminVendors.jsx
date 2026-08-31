import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Power, PowerOff, Store, Plus, X, Building2, User, Mail, Lock, Phone, MapPin, CreditCard, Calendar, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../api/axios';

const PLAN_PRICING = {
  free:    { monthly: 0,    yearly: 0 },
  basic:   { monthly: 499,  yearly: 4999 },
  pro:     { monthly: 999,  yearly: 9999 },
  premium: { monthly: 1999, yearly: 19999 },
};

const initialForm = {
  restaurantName: '',
  ownerName: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  password: '',
  confirmPassword: '',
  subscriptionPlan: 'free',
  billingCycle: 'monthly',
  subscriptionAmount: 0,
  isActive: true,
  subscriptionPaymentStatus: 'pending',
};

export default function AdminVendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Add Vendor modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchVendors = useCallback(async () => {
    try { const res = await api.get('/api/admin/vendors'); setVendors(res.data.vendors || []); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const toggleStatus = async (id, current) => {
    if (!window.confirm(current ? "Deactivate this restaurant?" : "Activate this restaurant?")) return;
    try { await api.patch(`/api/admin/vendors/${id}/status`, { isActive: !current }); fetchVendors(); } catch(e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleFormChange = (field, value) => {
    const next = { ...form, [field]: value };
    // Auto-calculate subscription amount when plan or cycle changes
    if (field === 'subscriptionPlan' || field === 'billingCycle') {
      const plan = field === 'subscriptionPlan' ? value : form.subscriptionPlan;
      const cycle = field === 'billingCycle' ? value : form.billingCycle;
      if (PLAN_PRICING[plan]) {
        next.subscriptionAmount = PLAN_PRICING[plan][cycle];
      }
    }
    setForm(next);
    // Clear field error on change
    if (formErrors[field]) {
      setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.restaurantName.trim()) errors.restaurantName = 'Restaurant name is required';
    if (!form.ownerName.trim()) errors.ownerName = 'Owner name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email format';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 6) errors.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await api.post('/api/admin/vendors', {
        restaurantName: form.restaurantName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        subscriptionPlan: form.subscriptionPlan,
        billingCycle: form.billingCycle,
        subscriptionAmount: form.subscriptionAmount,
        isActive: form.isActive,
        subscriptionPaymentStatus: form.subscriptionPaymentStatus,
      });
      setShowModal(false);
      setForm(initialForm);
      setFormErrors({});
      setToast({ type: 'success', message: 'Vendor created successfully' });
      fetchVendors();
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create vendor';
      setFormErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setForm(initialForm);
    setFormErrors({});
    setShowModal(true);
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.restaurantName?.toLowerCase().includes(q) || v.ownerId?.name?.toLowerCase().includes(q) || v.ownerId?.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? v.isActive : !v.isActive);
    const matchPlan = planFilter === 'all' || v.subscriptionPlan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  if (loading) return <div className="space-y-4"><div className="h-10 w-48 rounded bg-surface animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-48 rounded-2xl bg-surface border border-border/40 animate-pulse"/>)}</div></div>;

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg border backdrop-blur-md"
            style={{ background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderColor: toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)', color: toast.type === 'success' ? '#4ade80' : '#f87171' }}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vendors</h1>
          <p className="text-text-secondary text-sm">Manage all restaurants on the platform.</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 bg-primary hover:bg-primary-hover text-background font-semibold">
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"/><Input className="pl-9" placeholder="Search restaurants..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select value={planFilter} onChange={e=>setPlanFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary"><option value="all">All Plans</option><option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option></select>
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length===0?<div className="col-span-full text-center py-12 text-text-muted">No vendors found.</div>:filtered.map((v,i)=>(
          <motion.div key={v._id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
            <Card className="border-border/40 hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Store className="w-5 h-5 text-primary"/></div>
                    <div><p className="font-semibold text-text-primary">{v.restaurantName}</p><p className="text-xs text-text-muted">{v.ownerId?.name || '—'} • {v.ownerId?.email || '—'}</p></div>
                  </div>
                  <button onClick={()=>toggleStatus(v._id, v.isActive)} className={"p-1.5 rounded-lg transition-colors "+(v.isActive?"text-success hover:bg-success/10":"text-red-400 hover:bg-red-500/10")} title={v.isActive?"Deactivate":"Activate"}>
                    {v.isActive?<Power className="w-4 h-4"/>:<PowerOff className="w-4 h-4"/>}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-surface-elevated/30"><p className="text-lg font-bold text-text-primary">{v.totalOrders||0}</p><p className="text-[10px] text-text-muted">Orders</p></div>
                  <div className="text-center p-2 rounded-lg bg-surface-elevated/30"><p className="text-lg font-bold text-primary">₹{(v.totalSales||0).toLocaleString('en-IN')}</p><p className="text-[10px] text-text-muted">Sales</p></div>
                  <div className="text-center p-2 rounded-lg bg-surface-elevated/30"><p className={"text-lg font-bold "+(v.isActive?"text-success":"text-red-400")}>{v.isActive?"Active":"Off"}</p><p className="text-[10px] text-text-muted">Status</p></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase">{v.subscriptionPlan||'free'}</span>
                  <span className={"px-2 py-0.5 rounded-full font-semibold "+(v.subscriptionPaymentStatus==='paid'?"bg-success/10 text-success":"bg-yellow-500/10 text-yellow-400")}>{v.subscriptionPaymentStatus||'pending'}</span>
                </div>
                <Button onClick={()=>navigate('/admin/vendors/' + v._id)} variant="ghost" className="w-full mt-3 gap-2 text-sm"><Eye className="w-4 h-4"/> View Details</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Vendor Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-surface-higher border border-border/40 rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Add New Vendor</h2>
                    <p className="text-xs text-text-muted">Create a new restaurant account</p>
                  </div>
                </div>
                <button onClick={() => { setShowModal(false); setFormErrors({}); }} className="p-2 rounded-lg hover:bg-surface-elevated/60 text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateVendor} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formErrors.submit}</div>
                )}

                {/* Restaurant Information */}
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Restaurant Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Restaurant Name *</label>
                      <Input placeholder="e.g. Burger King" value={form.restaurantName} onChange={e => handleFormChange('restaurantName', e.target.value)}
                        className={formErrors.restaurantName ? 'border-red-500/50' : ''} />
                      {formErrors.restaurantName && <p className="text-xs text-red-400 mt-1">{formErrors.restaurantName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Owner Name *</label>
                      <Input placeholder="e.g. John Doe" value={form.ownerName} onChange={e => handleFormChange('ownerName', e.target.value)}
                        className={formErrors.ownerName ? 'border-red-500/50' : ''} />
                      {formErrors.ownerName && <p className="text-xs text-red-400 mt-1">{formErrors.ownerName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Email *</label>
                      <Input type="email" placeholder="owner@email.com" value={form.email} onChange={e => handleFormChange('email', e.target.value)}
                        className={formErrors.email ? 'border-red-500/50' : ''} />
                      {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Phone</label>
                      <Input placeholder="+91 9876543210" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">City</label>
                      <Input placeholder="e.g. Mumbai" value={form.city} onChange={e => handleFormChange('city', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Address</label>
                      <Input placeholder="Full address" value={form.address} onChange={e => handleFormChange('address', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" /> Account Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Login Password *</label>
                      <Input type="password" placeholder="Min 6 characters" value={form.password} onChange={e => handleFormChange('password', e.target.value)}
                        className={formErrors.password ? 'border-red-500/50' : ''} />
                      {formErrors.password && <p className="text-xs text-red-400 mt-1">{formErrors.password}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Confirm Password *</label>
                      <Input type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => handleFormChange('confirmPassword', e.target.value)}
                        className={formErrors.confirmPassword ? 'border-red-500/50' : ''} />
                      {formErrors.confirmPassword && <p className="text-xs text-red-400 mt-1">{formErrors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                {/* Subscription */}
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" /> Subscription
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Plan</label>
                      <select value={form.subscriptionPlan} onChange={e => handleFormChange('subscriptionPlan', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:border-primary/50 focus:outline-none">
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Billing Cycle</label>
                      <select value={form.billingCycle} onChange={e => handleFormChange('billingCycle', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:border-primary/50 focus:outline-none">
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Amount (₹)</label>
                      <Input type="number" min="0" value={form.subscriptionAmount} onChange={e => handleFormChange('subscriptionAmount', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Payment Status</label>
                      <select value={form.subscriptionPaymentStatus} onChange={e => handleFormChange('subscriptionPaymentStatus', e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:border-primary/50 focus:outline-none">
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Initial Status</label>
                      <select value={form.isActive ? 'active' : 'inactive'} onChange={e => handleFormChange('isActive', e.target.value === 'active')}
                        className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:border-primary/50 focus:outline-none">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
                <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setFormErrors({}); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVendor} disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-background font-semibold gap-2 min-w-[140px]">
                  {submitting ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Creating...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create Vendor</span>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
