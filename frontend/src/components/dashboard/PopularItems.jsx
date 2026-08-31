import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { TrendingUp } from 'lucide-react';

export function PopularItems({ items }) {
  return (
    <Card className="flex flex-col h-full border-border/50 bg-surface">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-text-primary">Popular Items</CardTitle>
          <button className="text-xs text-primary hover:text-primary-hover font-semibold tracking-wide uppercase transition-colors">Full menu</button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {items.map((item, index) => (
            <motion.div 
              key={item.id} 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-surface-elevated/50 hover:bg-surface-elevated transition-all border border-border/30 hover:border-primary/20 group cursor-default shadow-sm hover:shadow-md hover:-translate-y-1"
            >
              <div className="w-16 h-16 rounded-xl bg-surface-higher flex items-center justify-center text-text-muted font-bold text-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                {item.name.charAt(0)}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-text-primary text-sm truncate group-hover:text-primary transition-colors">{item.name}</h4>
                <div className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                  <span className="font-medium text-text-primary">{item.orders} orders</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-success bg-success/10 w-fit px-1.5 py-0.5 rounded">
                  <TrendingUp className="w-3 h-3" />
                  {item.trend || "+12%"}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
