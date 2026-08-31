import React from 'react';
import { cn } from '../../utils/cn';

const statusStyles = {
  Pending: "bg-surface-elevated text-text-secondary border-border",
  Accepted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Preparing: "bg-primary/10 text-primary border-primary/20",
  Ready: "bg-success/10 text-success border-success/20",
  Completed: "bg-surface-elevated text-text-muted border-border",
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      statusStyles[status] || statusStyles.Pending,
      className
    )}>
      {status}
    </span>
  );
}
