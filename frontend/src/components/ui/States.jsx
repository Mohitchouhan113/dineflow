import React from 'react';
import { motion } from 'framer-motion';

export function LoadingSkeleton({ className }) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}
      className={`bg-surface-elevated/50 rounded-xl border border-border/20 ${className}`}
    />
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/50 rounded-2xl bg-surface/50 w-full mt-6">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4 border border-border/30">
          <Icon className="w-8 h-8 text-text-muted" />
        </div>
      )}
      <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
}
