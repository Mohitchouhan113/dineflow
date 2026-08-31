import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { ChefHat } from 'lucide-react';

export function LiveOrders({ orders, onViewAll }) {
  return (
    <Card className="flex flex-col h-full bg-surface-elevated border-border hover:border-primary/30 transition-colors group">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg text-text-primary">Live Orders</CardTitle>
            <div className="relative flex items-center justify-center w-5 h-5 ml-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20 animate-ping"></span>
              <ChefHat className="w-3.5 h-3.5 text-primary relative z-10" />
            </div>
          </div>
          <button onClick={onViewAll} className="text-xs text-primary hover:text-primary-hover font-semibold tracking-wide uppercase transition-colors">View all</button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <motion.div 
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {orders.map((order) => (
            <motion.div 
              key={order.id}
              variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ x: 4, scale: 1.01 }}
              className="group/row flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-higher transition-all border border-border/50 hover:border-primary/30 cursor-default shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 rounded-full bg-border group-hover/row:bg-primary transition-colors" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-text-primary">{order.id}</span>
                    <span className="text-[10px] font-bold tracking-wider text-text-muted px-1.5 py-0.5 rounded bg-surface-elevated border border-border uppercase">Table {order.table}</span>
                  </div>
                  <div className="text-xs text-text-secondary flex items-center gap-2 font-medium">
                    <span className="text-primary">₹{order.amount.toLocaleString('en-IN')}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{order.time}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={order.status} />
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
