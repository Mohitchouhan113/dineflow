import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/axios';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7');

  const fetchData = useCallback(async () => {
    try { setLoading(true); const res = await api.get(`/api/admin/analytics?range=${range}`); setData(res.data); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary || {};
  const trend = data?.salesTrend || [];
  const payments = data?.paymentBreakdown || {};
  const ranking = data?.vendorRanking || [];

  const metrics = [
    {label:'Platform Sales',value:'₹'+(s.totalRevenue||0).toLocaleString('en-IN'),icon:DollarSign,color:'text-primary',bg:'bg-primary/10'},
    {label:'Total Orders',value:s.totalOrders||0,icon:ShoppingBag,color:'text-blue-400',bg:'bg-blue-500/10'},
    {label:'Avg Order Value',value:'₹'+(s.avgOrderValue||0).toLocaleString('en-IN'),icon:TrendingUp,color:'text-emerald-400',bg:'bg-emerald-500/10'},
    {label:'Active Vendors',value:(s.activeVendors||0)+'/'+(s.totalVendors||0),icon:Users,color:'text-orange-400',bg:'bg-orange-500/10'},
  ];

  const paymentPie = [{name:'Cash',value:payments.cash?.count||0},{name:'Online',value:payments.online?.count||0}];
  const PIE_COLORS = ['#f59e0b','#3b82f6'];

  if (loading && !data) return <div className="space-y-6"><div className="h-10 w-48 rounded bg-surface animate-pulse"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-text-primary">Platform Analytics</h1><p className="text-text-secondary text-sm">Cross-platform sales and performance insights.</p></div>
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border/50">
          {[{v:'7',l:'7 Days'},{v:'30',l:'30 Days'},{v:'90',l:'90 Days'}].map(({v,l})=>(<button key={v} onClick={()=>setRange(v)} className={"px-4 py-2 rounded-lg text-xs font-semibold transition-all "+(range===v?"bg-surface-higher text-primary shadow-sm border border-border/50":"text-text-secondary hover:text-text-primary")}>{l}</button>))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m,i)=>(
          <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
            <Card className="border-border/40"><CardContent className="p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-text-muted uppercase tracking-wider">{m.label}</span>
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center "+m.bg}><m.icon className={"w-5 h-5 "+m.color}/></div></div>
              <p className="text-3xl font-bold text-text-primary">{m.value}</p>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Sales Trend</CardTitle></CardHeader>
          <CardContent className="pt-6"><div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="aaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,190,100,0.05)"/>
              <XAxis dataKey="name" stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>"₹"+v/1000+"k"}/>
              <Tooltip content={({active,payload,label})=>active&&payload?.length?<div className="bg-surface-higher/95 backdrop-blur-xl border border-border/50 p-3 rounded-xl"><p className="text-xs text-text-secondary">{label}</p><p className="text-sm font-bold text-primary">₹{payload[0].value.toLocaleString('en-IN')}</p></div>:null}/>
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#aaGrad)"/>
            </AreaChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Payment Methods</CardTitle></CardHeader>
          <CardContent className="pt-4"><div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {paymentPie.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
            </Pie><Tooltip content={({active,payload})=>active&&payload?.length?<div className="bg-surface-higher/95 border border-border/50 p-2 rounded-lg text-xs"><span className="font-bold">{payload[0].name}: {payload[0].value} orders</span></div>:null}/></PieChart></ResponsiveContainer>
          </div></CardContent>
        </Card>
      </div>
      <Card className="border-border/40">
        <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Vendor Ranking</CardTitle></CardHeader>
        <CardContent className="pt-4">
          {ranking.length===0?<p className="text-text-muted text-sm text-center py-6">No data for this period</p>:(
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-muted uppercase tracking-wider">
              <th className="pb-3 font-semibold">#</th><th className="pb-3 font-semibold">Restaurant</th><th className="pb-3 font-semibold">Orders</th><th className="pb-3 font-semibold">Revenue</th><th className="pb-3 font-semibold">Avg Order</th>
            </tr></thead><tbody className="divide-y divide-border/30">
              {ranking.map((r,i)=>(<tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="py-3"><span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i+1}</span></td>
                <td className="py-3 font-medium text-text-primary">{r.name}</td>
                <td className="py-3 text-text-secondary">{r.orders}</td>
                <td className="py-3 font-bold text-primary">₹{r.revenue.toLocaleString('en-IN')}</td>
                <td className="py-3 text-text-secondary">₹{r.avgOrder.toLocaleString('en-IN')}</td>
              </tr>))}
            </tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
