import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/Card';
import { Activity, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const numericValue = typeof value === 'number' ? value : parseFloat(value?.toString().replace(/[^0-9.-]+/g, ""));
    if (!isNaN(numericValue) && numericValue > 0) {
      const duration = 800;
      const steps = 30;
      const stepValue = numericValue / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setCurrent(Math.min(numericValue, Math.round(step * stepValue)));
        if (step >= steps) clearInterval(interval);
      }, duration / steps);
      return () => clearInterval(interval);
    } else {
      setCurrent(numericValue || 0);
    }
  }, [value]);

  return (
    <span>
      {prefix}
      {current.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

const sparklineData = [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 25 }, { v: 18 }, { v: 30 }];

export function MetricCard({ type, title, value, trend, icon: Icon, available, current, total, percentage }) {
  const isPositive = trend?.startsWith('+');

  const renderCardContent = () => {
    switch (type) {
      case 'orders':
        return (
          <>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-medium text-text-secondary">{title}</span>
              <div className="p-2.5 rounded-xl bg-surface-higher text-text-muted group-hover:text-primary transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <div>
                <h4 className="text-4xl font-bold text-text-primary tracking-tight">
                  <AnimatedNumber value={value} />
                </h4>
                <div className="mt-3 text-xs flex items-center gap-1.5">
                  <span className={cn("font-medium px-2 py-0.5 rounded-md", isPositive ? "bg-success/10 text-success border border-success/20" : "bg-red-500/10 text-red-500")}>
                    <TrendingUp className="w-3 h-3 inline mr-1" />{trend}
                  </span>
                  <span className="text-text-muted">vs yesterday</span>
                </div>
              </div>
              <div className="w-16 h-10 opacity-70 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        );

      case 'revenue':
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-medium text-text-secondary">{title}</span>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <div>
                <h4 className="text-3xl font-bold text-primary tracking-tight">
                  <AnimatedNumber value={value} prefix="₹" />
                </h4>
                <div className="mt-3 text-xs flex items-center gap-1.5">
                  <span className={cn("font-medium px-2 py-0.5 rounded-md", isPositive ? "bg-success/10 text-success border border-success/20" : "bg-red-500/10 text-red-500")}>
                    {trend}
                  </span>
                </div>
              </div>
              <div className="w-16 h-10 opacity-70 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData.map(d => ({ v: d.v * 1.5 }))}>
                    <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        );

      case 'availability':
        return (
          <>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-medium text-text-secondary">{title}</span>
              <div className="p-2.5 rounded-xl bg-surface-higher text-text-muted group-hover:text-primary transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-baseline gap-2 mb-3">
                <h4 className="text-3xl font-bold text-text-primary tracking-tight">
                  <AnimatedNumber value={value} />
                </h4>
                <span className="text-sm text-text-muted">total</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-success font-medium">{available} Available</span>
                  <span className="text-red-400 font-medium">{value - available} Out</span>
                </div>
                <div className="w-full h-1.5 bg-surface-higher rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(available / value) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-success"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((value - available) / value) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-red-500"
                  />
                </div>
              </div>
            </div>
          </>
        );

      case 'capacity':
        const circ = 2 * Math.PI * 20;
        const offset = circ - (percentage / 100) * circ;

        return (
          <>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-medium text-text-secondary">{title}</span>
              <div className="p-2.5 rounded-xl bg-surface-higher text-text-muted group-hover:text-primary transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h4 className="text-3xl font-bold text-text-primary tracking-tight">
                  <AnimatedNumber value={current} /> <span className="text-xl text-text-muted font-normal">/ {total}</span>
                </h4>
                <div className="mt-3 text-xs font-medium text-primary">
                  {percentage}% Capacity
                </div>
              </div>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="20" className="stroke-surface-higher" strokeWidth="4" fill="none" />
                  <motion.circle
                    cx="28" cy="28" r="20"
                    className="stroke-primary"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div whileHover={{ y: -6, transition: { duration: 0.2 } }} className="h-full">
      <Card className="h-full bg-surface-elevated border-border hover:border-primary/30 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 group overflow-hidden">
        <CardContent className="p-6 h-full flex flex-col justify-between relative">
          {renderCardContent()}
        </CardContent>
      </Card>
    </motion.div>
  );
}
