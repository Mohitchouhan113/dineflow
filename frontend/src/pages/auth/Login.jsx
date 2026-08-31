import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Utensils } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import api from '../../api/axios';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      
      const user = response.data.user || {};
      localStorage.setItem('user', JSON.stringify(user));
      
      const role = user.role || 'vendorAdmin';
      
      if (role === 'chef') {
        navigate('/chef/dashboard');
      } else if (role === 'superAdmin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/vendor/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Visual Product Abstract (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-surface flex-col justify-center border-r border-border p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">DineFlow</h1>
          </div>
          <p className="text-xl text-text-secondary mb-2">Restaurant operations, beautifully simplified.</p>
          <p className="text-sm text-text-muted font-medium mb-12 uppercase tracking-widest">Menu • Orders • Kitchen • Payments</p>
          
          <div className="relative h-[400px] w-full">
            {/* Abstract UI Cards Animation */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-64"
            >
              <Card className="p-4 bg-background/80 backdrop-blur border-border shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Order #1024</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">Preparing</span>
                </div>
                <div className="text-xs text-text-secondary">Table T08 • ₹1,249</div>
              </Card>
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
              className="absolute top-32 left-12 w-72"
            >
              <Card className="p-4 bg-background/80 backdrop-blur border-border shadow-2xl">
                <div className="text-xs text-text-secondary mb-1">Today's Revenue</div>
                <div className="text-2xl font-bold text-success">₹24,580</div>
              </Card>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 2 }}
              className="absolute top-20 right-0 w-48"
            >
              <Card className="p-4 bg-background/80 backdrop-blur border-border shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded bg-surface flex items-center justify-center">
                    <svg className="w-4 h-4 text-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                  </div>
                  <span className="text-sm font-semibold">QR Menu</span>
                </div>
                <div className="text-xs text-text-muted">Scan → Browse → Order</div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">DineFlow</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-text-primary mb-2">Welcome back</h2>
            <p className="text-text-secondary mb-8">Sign in to manage your restaurant</p>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Email</label>
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com" 
                  required 
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-sm font-medium text-text-primary">Password</label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-background" />
                  <span className="text-text-secondary">Remember me</span>
                </label>
                <a href="#" className="text-primary hover:text-primary-hover font-medium transition-colors">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign In
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-text-muted">
              © {new Date().getFullYear()} DineFlow Technologies. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
