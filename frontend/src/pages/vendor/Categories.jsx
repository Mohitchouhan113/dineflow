import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../api/axios';
import useSubscriptionLimits from '../../hooks/useSubscriptionLimits';

const getCategoryImage = (category) => {
  if (category?.image) return category.image;

  const name = (category?.name || '').toLowerCase();

  if (name.includes('pizza')) return '/food-images/pizza.jpg';
  if (name.includes('burger')) return '/food-images/burger.jpg';
  if (name.includes('dessert') || name.includes('cake') || name.includes('sweet')) return '/food-images/cake.jpg';
  if (name.includes('beverage') || name.includes('drink') || name.includes('coffee') || name.includes('tea') || name.includes('juice') || name.includes('shake')) return '/food-images/coffee.jpg';
  if (name.includes('main course') || name.includes('thali') || name.includes('curry')) return '/food-images/thali.jpg';
  if (name.includes('biryani') || name.includes('rice')) return '/food-images/biryani.jpg';
  if (name.includes('noodle') || name.includes('chinese')) return '/food-images/noodles.jpg';
  if (name.includes('paneer')) return '/food-images/paneer.jpg';
  if (name.includes('snack') || name.includes('chaat') || name.includes('starter')) return '/food-images/fries.jpg';

  return '/food-images/default-food.jpg';
};

export default function Categories() {
  const [searchParams] = useSearchParams();
  const globalSearch = searchParams.get('search') || '';
  const { isAtLimit, getUsage, isRestricted } = useSubscriptionLimits();

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', image: '' });
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setFetchError('');
      const res = await api.get('/api/vendor/categories');

      // Normalize: backend returns { success, count, categories: [...] }
      const categoryList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.categories)
        ? res.data.categories
        : [];

      setCategories(categoryList);
    } catch (err) {
      console.error('Fetch categories error:', err);
      setFetchError(err.response?.data?.message || 'Failed to load categories');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingCat) {
        await api.put(`/api/vendor/categories/${editingCat._id}`, formData);
      } else {
        await api.post('/api/vendor/categories', formData);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    if (currentStatus !== false) {
      if (!window.confirm("Are you sure you want to deactivate this category?")) return;
    }
    try {
      await api.patch(`/api/vendor/categories/${id}/status`, { isActive: currentStatus === false ? true : false });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (cat = null) => {
    setError('');
    if (cat) {
      setEditingCat(cat);
      setFormData({ name: cat.name, description: cat.description || '', image: cat.image || '' });
    } else {
      setEditingCat(null);
      setFormData({ name: '', description: '', image: '' });
    }
    setIsModalOpen(true);
  };

  const safeCategories = Array.isArray(categories) ? categories : [];

  const filteredCategories = globalSearch.trim()
    ? safeCategories.filter((cat) => {
        const q = globalSearch.trim().toLowerCase();
        return (cat.name || '').toLowerCase().includes(q)
          || (cat.description || '').toLowerCase().includes(q);
      })
    : safeCategories;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Categories</h1>
          <p className="text-text-secondary text-sm">Organize your menu items.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => { if (!isAtLimit('categories') && !isRestricted) openModal(); }}
            variant="primary" className="gap-2"
            disabled={isAtLimit('categories') || isRestricted}>
            <Plus className="w-4 h-4" /> Add Category
          </Button>
          {isAtLimit('categories') && <span className="text-[10px] text-red-400 font-medium">Category limit reached ({getUsage('categories').current}/{getUsage('categories').limit})</span>}
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-text-muted">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-text-muted">
            {globalSearch.trim() ? 'No categories match your search.' : 'No categories found. Add your first category to get started.'}
          </div>
        ) : (
          filteredCategories.map((cat, i) => (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full border-border/50 hover:border-primary/30 transition-colors group">
                <CardContent className="p-0">
                  <div className="h-32 bg-surface-elevated flex items-center justify-center relative overflow-hidden group-hover:bg-surface-elevated/80 transition-colors">
                    <img
                      src={getCategoryImage(cat)}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/food-images/default-food.jpg';
                      }}
                    />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(cat)} className="p-1.5 rounded-md bg-background/80 text-text-secondary hover:text-primary backdrop-blur-sm">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-text-primary mb-1">{cat.name}</h3>
                    <p className="text-sm text-text-secondary line-clamp-2">{cat.description || 'No description provided.'}</p>
                    <div className="mt-4 flex items-center justify-between text-xs font-medium border-t border-border/50 pt-4">
                      <button 
                        onClick={() => toggleStatus(cat._id, cat.isActive)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${cat.isActive !== false ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-surface-elevated text-text-muted hover:text-text-primary'}`}
                      >
                        {cat.isActive !== false ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">{error}</div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Pizza" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea 
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent min-h-[80px]"
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="Description (optional)" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Image URL</label>
            <Input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
