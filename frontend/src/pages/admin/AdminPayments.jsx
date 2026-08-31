import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchPayments = useCallback(async () => {
    try { const res = await api.get('/api/admin/payments'); setPayments(res.data.payments || []); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Listen for real-time subscription payment updates
  useEffect(() => {
    const handler = () => fetchPayments();
    window.addEventListener('socket:subscription-payment-updated', handler);
    return () => window.removeEventListener('socket:subscription-payment-updated', handler);
  }, [fetchPayments]);

  const markPaid = async (vendorId) => {
    if (!window.confirm("Confirm subscription payment received?")) return;
    try {
      setUpdatingId(vendorId);
      await api.patch(`/api/admin/vendors/${vendorId}/subscription-payment`, { paymentStatus: 'paid', lastPaymentDate: new Date().toISOString() });
      fetchPayments();
    } catch(e) { alert(e.response?.data?.message||'Failed'); } finally { setUpdatingId(null); }
  };

  const markOverdue = async (vendorId) => {
    try { setUpdatingId(vendorId); await api.patch(`/api/admin/vendors/${vendorId}/subscription-payment`, { paymentStatus: 'overdue' }); fetchPayments(); } catch(e) { alert('Failed'); } finally { setUpdatingId(null); }
  };

  const filtered = payments.filter(p => filter === 'all' || p.paymentStatus === filter);
  const stats = { all: payments.length, paid: payments.filter(p=>p.paymentStatus==='paid').length, pending: payments.filter(p=>p.paymentStatus==='pending').length, overdue: payments.filter(p=>p.paymentStatus==='overdue').length };

  if (loading) return <div className="space-y-4"><div className="h-10 w-48 rounded bg-surface animate-pulse"/></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-text-primary">Subscription Payments</h1><p className="text-text-secondary text-sm">Manage vendor subscription payment status.</p></div>
      <div className="flex gap-2 flex-wrap">
        {[{k:'all',l:'All'},{k:'paid',l:'Paid',c:'text-success'},{k:'pending',l:'Pending',c:'text-yellow-400'},{k:'overdue',l:'Overdue',c:'text-red-400'}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} className={"px-4 py-2 rounded-xl text-sm font-semibold border transition-colors "+(filter===f.k?"bg-surface-higher border-primary/30 text-primary":"border-border/50 text-text-secondary hover:text-text-primary")}>{f.l} ({stats[f.k]||0})</button>
        ))}
      </div>
      <Card className="border-border/40">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-semibold">Restaurant</th><th className="pb-3 font-semibold">Owner</th><th className="pb-3 font-semibold">Plan</th><th className="pb-3 font-semibold">Amount</th><th className="pb-3 font-semibold">Payment Status</th><th className="pb-3 font-semibold">Access</th><th className="pb-3 font-semibold">Last Payment</th><th className="pb-3 font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border/30">
                {filtered.length===0?<tr><td colSpan={8} className="py-8 text-center text-text-muted">No payments found</td></tr>:filtered.map((p,i)=>(
                  <tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 font-medium text-text-primary">{p.restaurantName}</td>
                    <td className="py-3 text-text-secondary">{p.ownerName}</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">{p.plan}</span></td>
                    <td className="py-3 text-text-primary">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3">
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold "+(p.paymentStatus==='paid'?"bg-success/10 text-success":p.paymentStatus==='overdue'?"bg-red-500/10 text-red-400":"bg-yellow-500/10 text-yellow-400")}>
                        {p.paymentStatus==='paid'?<CheckCircle className="w-3 h-3"/>:p.paymentStatus==='overdue'?<AlertTriangle className="w-3 h-3"/>:<Clock className="w-3 h-3"/>}
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full "+(p.subscriptionStatus==='restricted'?'bg-red-500/10 text-red-400':p.subscriptionStatus==='grace'?'bg-yellow-500/10 text-yellow-400':'bg-success/10 text-success')}>
                        {p.subscriptionStatus||'active'}
                      </span>
                    </td>
                    <td className="py-3 text-text-muted text-xs">{p.lastPaymentDate ? new Date(p.lastPaymentDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {p.paymentStatus!=='paid'&&<Button onClick={()=>markPaid(p.vendorId)} disabled={updatingId===p.vendorId} variant="ghost" className="text-xs px-2 py-1 h-auto text-success hover:bg-success/10">{updatingId===p.vendorId?'...':'Mark Paid'}</Button>}
                        {p.paymentStatus!=='overdue'&&p.paymentStatus!=='paid'&&<Button onClick={()=>markOverdue(p.vendorId)} disabled={updatingId===p.vendorId} variant="ghost" className="text-xs px-2 py-1 h-auto text-red-400 hover:bg-red-500/10">Overdue</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
