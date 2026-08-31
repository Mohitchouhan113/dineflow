import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../api/axios';
import useSubscriptionLimits from '../../hooks/useSubscriptionLimits';

export default function Chefs() {
  const [searchParams] = useSearchParams();
  const globalSearch = searchParams.get('search') || '';
  const { isAtLimit, getUsage, isRestricted } = useSubscriptionLimits();

  const [chefs, setChefs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChef, setEditingChef] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchChefs = async () => {
    try {
      setIsLoading(true);
      setFetchError('');
      const res = await api.get('/api/vendor/chefs');

      // Normalize: backend returns { success, count, chefs: [...] }
      const chefList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.chefs)
        ? res.data.chefs
        : [];

      setChefs(chefList);
    } catch (err) {
      console.error('Fetch chefs error:', err);
      setFetchError(err.response?.data?.message || 'Failed to load chefs');
      setChefs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChefs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingChef) {
        await api.put(`/api/vendor/chefs/${editingChef._id}`, formData);
      } else {
        await api.post('/api/vendor/chefs', formData);
      }
      setIsModalOpen(false);
      fetchChefs();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    if (currentStatus !== false) {
      if (!window.confirm("Are you sure you want to deactivate this chef?")) return;
    }
    try {
      const newStatus = currentStatus === false ? true : false;
      await api.patch(`/api/vendor/chefs/${id}/status`, { isActive: newStatus });
      fetchChefs();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (chef = null) => {
    setError('');
    if (chef) {
      setEditingChef(chef);
      setFormData({ name: chef.name, email: chef.email, password: '', phone: chef.phone || '' });
    } else {
      setEditingChef(null);
      setFormData({ name: '', email: '', password: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const safeChefs = Array.isArray(chefs) ? chefs : [];

  const filteredChefs = globalSearch.trim()
    ? safeChefs.filter((chef) => {
        const q = globalSearch.trim().toLowerCase();
        return (chef.name || '').toLowerCase().includes(q)
          || (chef.email || '').toLowerCase().includes(q);
      })
    : safeChefs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Chefs</h1>
          <p className="text-text-secondary text-sm">Manage kitchen staff and access.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => { if (!isAtLimit('chefs') && !isRestricted) openModal(); }}
            variant="primary" className="gap-2"
            disabled={isAtLimit('chefs') || isRestricted}>
            <Plus className="w-4 h-4" /> Add Chef
          </Button>
          {isAtLimit('chefs') && <span className="text-[10px] text-red-400 font-medium">Chef limit reached ({getUsage('chefs').current}/{getUsage('chefs').limit})</span>}
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      <Card className="border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary bg-surface-elevated/30 uppercase border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-text-muted">Loading chefs...</td>
                </tr>
              ) : filteredChefs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-text-muted">
                    {globalSearch.trim() ? 'No chefs match your search.' : 'No chefs found. Add your first chef to get started.'}
                  </td>
                </tr>
              ) : (
                filteredChefs.map((chef) => (
                  <motion.tr 
                    key={chef._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-surface-elevated/20 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-text-primary">{chef.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{chef.email}</td>
                    <td className="px-6 py-4 text-text-secondary">{chef.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${chef.isActive !== false ? 'bg-success/10 text-success border-success/20' : 'bg-surface-elevated text-text-muted border-border'}`}>
                        {chef.isActive !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {chef.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => toggleStatus(chef._id, chef.isActive)} className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                        Toggle
                      </button>
                      <button onClick={() => openModal(chef)} className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                        Edit
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingChef ? 'Edit Chef' : 'Add Chef'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Chef Name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Email</label>
            <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="chef@restaurant.com" />
          </div>
          {!editingChef && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Password</label>
              <Input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Chef</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
