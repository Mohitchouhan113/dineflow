import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Store, ShoppingBag, DollarSign, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

const STATUS_COLORS = { pending:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', accepted:'bg-blue-500/10 text-blue-400 border-blue-500/20', preparing:'bg-orange-500/10 text-orange-400 border-orange-500/20', ready:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', completed:'bg-green-500/10 text-green-400 border-green-500/20', cancelled:'bg-red-500/10 text-red-400 border-red-500/20' };

function formatTimeAgo(d) { if (!d) return ''; const ms = Date.now()-new Date(d); const m=Math.floor(ms/60000); if(m<1) return 'Just now'; if(m<60) return m+'m ago'; const h=Math.floor(m/60); if(h<24) return h+'h ago'; return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState('7 Days');

  const fetchData = useCallback(async () => {
    try { const res = await api.get('/api/admin/dashboard'); setData(res.data); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const r = () => fetchData();
    window.addEventListener('socket:new-order', r);
    window.addEventListener('socket:payment-status-updated', r);
    return () => { window.removeEventListener('socket:new-order', r); window.removeEventListener('socket:payment-status-updated', r); };
  }, [fetchData]);

  if (loading) return <div className="space-y-6"><div className="h-10 w-48 rounded bg-surface animate-pulse" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">{[...Array(5)].map((_,i)=><div key={i} className="h-32 rounded-2xl bg-surface border border-border/40 animate-pulse"/>)}</div></div>;

  const s = data?.summary || {};
  const series = data?.revenueSeries || {};
  const chartMap = { '7 Days': series['7d']||[], '30 Days': series['30d']||[], '90 Days': series['90d']||[] };
  const chartData = chartMap[chartFilter] || chartMap['7 Days'];
  const vendorPerf = data?.vendorPerformance || [];
  const recentOrders = data?.recentOrders || [];

  const metrics = [
    { label:'Total Vendors', value:s.totalVendors||0, icon:Store, color:'text-primary', bg:'bg-primary/10' },
    { label:'Active Restaurants', value:s.activeVendors||0, icon:Store, color:'text-success', bg:'bg-success/10' },
    { label:'Total Orders', value:s.totalOrders||0, icon:ShoppingBag, color:'text-blue-400', bg:'bg-blue-500/10' },
    { label:'Platform Sales', value:'₹'+(s.totalSales||0).toLocaleString('en-IN'), icon:DollarSign, color:'text-primary', bg:'bg-primary/10' },
    { label:'Pending Payments', value:s.pendingPayments||0, icon:AlertTriangle, color:'text-red-400', bg:'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-text-primary">Platform Overview</h1><p className="text-text-secondary text-sm">Monitor all restaurants and platform performance.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m,i) => (
          <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
            <Card className="border-border/40 hover:border-primary/20 transition-colors"><CardContent className="p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-text-muted uppercase tracking-wider">{m.label}</span>
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center "+m.bg}><m.icon className={"w-5 h-5 "+m.color} /></div></div>
              <p className="text-3xl font-bold text-text-primary">{m.value}</p>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
            <CardTitle className="text-lg text-text-primary">Platform Revenue</CardTitle>
            <div className="flex gap-1 p-1 rounded-xl bg-surface-elevated border border-border/50">
              {['7 Days','30 Days','90 Days'].map(f=>(<button key={f} onClick={()=>setChartFilter(f)} className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors "+(chartFilter===f?"bg-surface-higher text-primary":"text-text-secondary hover:text-text-primary")}>{f}</button>))}
            </div>
          </CardHeader>
          <CardContent className="pt-6"><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:10,right:10,left:0,bottom:0}}>
              <defs><linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,190,100,0.05)"/>
              <XAxis dataKey="name" stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>"₹"+v/1000+"k"}/>
              <Tooltip content={({active,payload,label})=>active&&payload?.length?<div className="bg-surface-higher/95 backdrop-blur-xl border border-border/50 p-3 rounded-xl shadow-xl"><p className="text-xs text-text-secondary">{label}</p><p className="text-sm font-bold text-primary">₹{payload[0].value.toLocaleString('en-IN')}</p></div>:null}/>
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#adminGrad)"/>
            </AreaChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Vendor Performance</CardTitle></CardHeader>
          <CardContent className="pt-4"><div className="space-y-3 max-h-[300px] overflow-y-auto">
            {vendorPerf.length===0?<p className="text-text-muted text-sm text-center py-4">No data</p>:vendorPerf.map((v,i)=>(
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated/30 transition-colors">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i+1}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-text-primary truncate">{v.name}</p><p className="text-xs text-text-muted">{v.orders} orders</p></div>
                <span className="text-sm font-bold text-primary">₹{v.revenue.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div></CardContent>
        </Card>
      </div>
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
          <CardTitle className="text-lg text-text-primary">Recent Orders</CardTitle><span className="text-xs text-text-muted">Platform-wide</span>
        </CardHeader>
        <CardContent className="pt-4">
          {recentOrders.length===0?<p className="text-text-muted text-sm text-center py-6">No recent orders</p>:(
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-muted uppercase tracking-wider">
              <th className="pb-3 font-semibold">Order</th><th className="pb-3 font-semibold">Restaurant</th><th className="pb-3 font-semibold">Amount</th><th className="pb-3 font-semibold">Payment</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold text-right">Time</th>
            </tr></thead><tbody className="divide-y divide-border/30">
              {recentOrders.map((o,i)=>(<tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="py-3 font-medium text-text-primary">{o.id}</td><td className="py-3 text-text-secondary">{o.vendor}</td><td className="py-3 font-medium text-primary">₹{o.amount}</td>
                <td className="py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-elevated text-text-secondary border border-border">{o.method==='online'?'Online':'Cash'}</span></td>
                <td className="py-3"><span className={"inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border "+(STATUS_COLORS[o.status]||'bg-surface-elevated text-text-muted border-border')}>{o.status}</span></td>
                <td className="py-3 text-right text-text-muted text-xs">{formatTimeAgo(o.createdAt)}</td>
              </tr>))}
            </tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
