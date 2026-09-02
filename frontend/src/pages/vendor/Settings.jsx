import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Clock, CreditCard, Shield, Save, Loader2, CheckCircle2, XCircle,
  User, Mail, Phone, MapPin, ToggleLeft, ToggleRight, Lock, AlertTriangle,
  Key, Smartphone, Globe,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../api/axios';

function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm flex items-center gap-2 ${
        type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ backgroundColor: enabled ? '#f59e0b' : '#3a3530' }}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <CardTitle className="text-base text-text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5 space-y-1">
        {children}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Password state
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Payment gateway state
  const [paymentSettings, setPaymentSettings] = useState({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    upiId: '',
    isGatewayActive: false,
    hasCredentials: false,
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentToast, setPaymentToast] = useState(null);

  const fetchPaymentSettings = useCallback(async () => {
    try {
      setPaymentLoading(true);
      const res = await api.get('/api/vendor/settings/payment');
      setPaymentSettings(res.data.paymentSettings);
    } catch (err) {
      console.error('Failed to load payment settings:', err);
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  useEffect(() => { fetchPaymentSettings(); }, [fetchPaymentSettings]);

  const handleSavePaymentSettings = async () => {
    setPaymentToast(null);
    try {
      setPaymentSaving(true);
      const res = await api.put('/api/vendor/settings/payment', paymentSettings);
      setPaymentSettings(res.data.paymentSettings);
      setPaymentToast({ type: 'success', message: res.data.message });
    } catch (err) {
      setPaymentToast({ type: 'error', message: err.response?.data?.message || 'Failed to save payment settings' });
    } finally {
      setPaymentSaving(false);
    }
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/vendor/settings');
      setSettings(res.data.vendor);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings.restaurantName?.trim()) {
      setToast({ type: 'error', message: 'Restaurant name is required' });
      return;
    }
    if (settings.gstPercentage < 0 || settings.gstPercentage > 50) {
      setToast({ type: 'error', message: 'GST must be between 0 and 50' });
      return;
    }
    if (settings.serviceChargePercentage < 0 || settings.serviceChargePercentage > 30) {
      setToast({ type: 'error', message: 'Service charge must be between 0 and 30' });
      return;
    }
    if (settings.minimumOrderAmount < 0) {
      setToast({ type: 'error', message: 'Minimum order cannot be negative' });
      return;
    }

    try {
      setSaving(true);
      await api.put('/api/vendor/settings', settings);
      setToast({ type: 'success', message: 'Settings saved successfully' });

      // Sync to localStorage so sidebar/dashboard update immediately
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.vendorRestaurantName = settings.restaurantName;
      user.vendorCity = settings.city;
      user.vendorIsOpen = settings.isOpen;
      localStorage.setItem('user', JSON.stringify(user));

      // Dispatch custom event so other components can react
      window.dispatchEvent(new Event('vendor-settings-updated'));
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwords.current) {
      setPasswordError('Current password is required');
      return;
    }
    if (!passwords.newPass || passwords.newPass.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await api.put('/api/vendor/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPasswords({ current: '', newPass: '', confirm: '' });
      setToast({ type: 'success', message: 'Password changed successfully' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary text-sm">Loading settings...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-surface border border-border/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-muted">Failed to load settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary text-sm">Manage your restaurant profile, business hours, and account.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="primary" className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Restaurant Profile */}
          <Section icon={Store} title="Restaurant Profile">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Restaurant Name *</label>
                <Input
                  value={settings.restaurantName || ''}
                  onChange={e => updateField('restaurantName', e.target.value)}
                  placeholder="e.g. Food Villa"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Owner / Admin Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    className="pl-9"
                    value={settings.ownerName || ''}
                    onChange={e => updateField('ownerName', e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    className="pl-9"
                    value={settings.email || ''}
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    className="pl-9"
                    value={settings.phone || ''}
                    onChange={e => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    className="pl-9"
                    value={settings.city || ''}
                    onChange={e => updateField('city', e.target.value)}
                    placeholder="e.g. Indore"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Address</label>
                <textarea
                  className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent min-h-[70px]"
                  value={settings.address || ''}
                  onChange={e => updateField('address', e.target.value)}
                  placeholder="Full restaurant address"
                />
              </div>
            </div>
          </Section>

          {/* Business Settings */}
          <Section icon={Clock} title="Business Settings">
            <div className="space-y-1">
              <Toggle
                enabled={settings.isOpen}
                onChange={v => updateField('isOpen', v)}
                label={settings.isOpen ? 'Restaurant is Open' : 'Restaurant is Closed'}
                description={settings.isOpen ? 'Your restaurant is accepting orders' : 'Orders are paused'}
              />
              <div className="border-t border-border/30 pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Opening Time</label>
                  <Input
                    type="time"
                    value={settings.openingTime || '09:00'}
                    onChange={e => updateField('openingTime', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Closing Time</label>
                  <Input
                    type="time"
                    value={settings.closingTime || '23:00'}
                    onChange={e => updateField('closingTime', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Order & Payment Settings */}
          <Section icon={CreditCard} title="Order & Payment Settings">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">GST / Tax (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={settings.gstPercentage ?? 5}
                    onChange={e => updateField('gstPercentage', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Service Charge (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={settings.serviceChargePercentage ?? 0}
                    onChange={e => updateField('serviceChargePercentage', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Minimum Order Amount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.minimumOrderAmount ?? 0}
                  onChange={e => updateField('minimumOrderAmount', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="border-t border-border/30 pt-2 space-y-0.5">
                <Toggle
                  enabled={settings.acceptCash}
                  onChange={v => updateField('acceptCash', v)}
                  label="Accept Cash Payment"
                  description="Allow customers to pay via cash"
                />
                <Toggle
                  enabled={settings.acceptOnline}
                  onChange={v => updateField('acceptOnline', v)}
                  label="Accept Online Payment"
                  description="Allow Razorpay / UPI / card payments"
                />
              </div>
            </div>
          </Section>

          {/* Payment Gateway */}
          <Section icon={CreditCard} title="Payment Gateway (Razorpay)">
            {paymentLoading ? (
              <div className="flex items-center gap-2 py-4 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading payment settings...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status indicator */}
                <div className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: paymentSettings.isGatewayActive ? 'rgba(16,185,129,0.05)' : 'rgba(107,114,128,0.05)', borderColor: paymentSettings.isGatewayActive ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: paymentSettings.isGatewayActive ? '#10b981' : '#6b7280' }} />
                    <span className="text-sm font-medium text-text-primary">
                      {paymentSettings.isGatewayActive ? 'Gateway Active' : 'Gateway Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {paymentSettings.hasCredentials ? 'Credentials saved' : 'No credentials'}
                  </span>
                </div>

                {paymentToast && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    paymentToast.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                    {paymentToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {paymentToast.message}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Razorpay Key ID</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      className="pl-9"
                      placeholder="rzp_test_xxxxxxxxxxxxx"
                      value={paymentSettings.razorpayKeyId}
                      onChange={e => setPaymentSettings(p => ({ ...p, razorpayKeyId: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Razorpay Key Secret</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      className="pl-9"
                      type="password"
                      placeholder={paymentSettings.hasCredentials ? '•••••• (leave blank to keep existing)' : 'Enter your Key Secret'}
                      value={paymentSettings.razorpayKeySecret}
                      onChange={e => setPaymentSettings(p => ({ ...p, razorpayKeySecret: e.target.value }))}
                    />
                  </div>
                  <p className="text-xs text-text-muted">Find this in your Razorpay Dashboard → Settings → API Keys</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">UPI ID (Optional)</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      className="pl-9"
                      placeholder="restaurant@upi"
                      value={paymentSettings.upiId}
                      onChange={e => setPaymentSettings(p => ({ ...p, upiId: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="border-t border-border/30 pt-2">
                  <Toggle
                    enabled={paymentSettings.isGatewayActive}
                    onChange={v => setPaymentSettings(p => ({ ...p, isGatewayActive: v }))}
                    label="Enable Vendor Payment Gateway"
                    description="When enabled, customer online payments go directly to your Razorpay account"
                  />
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-text-muted leading-relaxed">
                    {paymentSettings.isGatewayActive
                      ? '✅ Customer payments will be routed to your Razorpay account. You will receive payments directly.'
                      : 'When inactive, customer payments use the platform default Razorpay account.'}
                  </p>
                </div>

                <Button
                  onClick={handleSavePaymentSettings}
                  disabled={paymentSaving}
                  variant="ghost"
                  className="w-full gap-2 border border-border/50 hover:border-primary/30"
                >
                  {paymentSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {paymentSaving ? 'Saving...' : 'Save Payment Settings'}
                </Button>
              </div>
            )}
          </Section>

          {/* Account & Security */}
          <Section icon={Shield} title="Account & Security">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-surface-elevated/50 border border-border/30">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-text-muted" />
                  <span className="text-text-secondary">Logged in as</span>
                  <span className="font-medium text-text-primary">{settings.email}</span>
                </div>
              </div>

              <div className="border-t border-border/30 pt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-text-primary">Change Password</span>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Current Password"
                    value={passwords.current}
                    onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="New Password (min 6 characters)"
                    value={passwords.newPass}
                    onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm New Password"
                    value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                  />
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    variant="ghost"
                    className="w-full gap-2 border border-border/50 hover:border-primary/30"
                  >
                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {changingPassword ? 'Changing...' : 'Update Password'}
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          {/* Subscription Info */}
          <Section icon={Store} title="Subscription">
            <div className="p-4 rounded-xl bg-surface-elevated/50 border border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Current Plan</p>
                  <p className="text-xs text-text-muted mt-0.5">Your restaurant subscription tier</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                  {settings.subscriptionPlan || 'Free'}
                </span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} variant="primary" className="gap-2 px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
