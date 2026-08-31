import React, { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export function RevenueChart({ data, filter, onFilterChange }) {
  const internalFilter = filter || '7 Days';
  const setFilter = onFilterChange || (() => {});

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-higher/90 backdrop-blur-xl border border-border/50 p-4 rounded-xl shadow-xl">
          <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
          <p className="text-primary text-xl font-bold tracking-tight">
            ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full lg:col-span-2 border-border/40 bg-surface hover:border-primary/20 transition-colors group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
        <CardTitle className="text-lg text-text-primary">Revenue Overview</CardTitle>
        <div className="flex gap-1 p-1 rounded-xl bg-surface-elevated border border-border/50">
          {['7 Days', '30 Days', '90 Days'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className="relative px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors text-text-secondary hover:text-text-primary"
            >
              {internalFilter === f && (
                <motion.div 
                  layoutId="chart-filter"
                  className="absolute inset-0 bg-surface-higher shadow-sm rounded-lg border border-border/50"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${internalFilter === f ? 'text-primary' : ''}`}>{f}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={internalFilter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="h-[340px] w-full relative z-10"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5}/>
                    <stop offset="70%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255, 190, 100, 0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9e9389" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={15}
                />
                <YAxis 
                  stroke="#9e9389" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `₹${value / 1000}k`}
                  dx={-15}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255, 190, 100, 0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
