import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export function RestaurantStatus({ data }) {
  const menuValue = data?.availableItems != null && data?.totalActiveItems != null
    ? `${data.availableItems} / ${data.totalActiveItems}`
    : '—';
  const statuses = [
    { label: 'Kitchen', value: 'Online', positive: true },
    { label: 'QR Ordering', value: 'Active', positive: true },
    { label: 'Online Payments', value: 'Active', positive: true },
    { label: 'Menu Items', value: menuValue, positive: data?.availableItems === data?.totalActiveItems, warning: data?.availableItems != data?.totalActiveItems },
  ];

  return (
    <Card className="h-full bg-surface-elevated border-border/50 hover:border-primary/30 transition-colors group">
      <CardHeader className="pb-4 border-b border-border/30">
        <CardTitle className="text-lg text-text-primary">System Health</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          {statuses.map((status, i) => (
            <div key={i} className="p-4 rounded-2xl bg-surface border border-border/40 hover:border-primary/30 hover:bg-surface-higher transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{status.label}</span>
                {status.positive ? (
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success/30 animate-ping"></span>
                    <CheckCircle2 className="w-4 h-4 text-success relative z-10" />
                  </div>
                ) : (
                  <AlertCircle className="w-4 h-4 text-primary" />
                )}
              </div>
              <p className={cn(
                "text-lg font-bold",
                status.positive ? "text-text-primary" : "text-primary"
              )}>
                {status.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
