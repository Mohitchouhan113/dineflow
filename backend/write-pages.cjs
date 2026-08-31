const fs = require('fs');
const path = require('path');

function write(rel, content) {
  fs.writeFileSync(path.join(__dirname, '..', rel), content);
  console.log('Created:', rel);
}

// Admin Dashboard
write('frontend/src/pages/admin/AdminDashboard.jsx', `import React, { useState, useEffect, useCallback } from 'react';
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
            </AreaChart></div>
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
`);

// Admin Vendors
write('frontend/src/pages/admin/AdminVendors.jsx', `import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Eye, Power, PowerOff, Store } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../api/axios';

export default function AdminVendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const fetchVendors = useCallback(async () => {
    try { const res = await api.get('/api/admin/vendors'); setVendors(res.data.vendors || []); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const toggleStatus = async (id, current) => {
    if (!window.confirm(current ? "Deactivate this restaurant?" : "Activate this restaurant?")) return;
    try { await api.patch(\`/api/admin/vendors/\${id}/status\`, { isActive: !current }); fetchVendors(); } catch(e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.restaurantName?.toLowerCase().includes(q) || v.ownerId?.name?.toLowerCase().includes(q) || v.ownerId?.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? v.isActive : !v.isActive);
    const matchPlan = planFilter === 'all' || v.subscriptionPlan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  if (loading) return <div className="space-y-4"><div className="h-10 w-48 rounded bg-surface animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-48 rounded-2xl bg-surface border border-border/40 animate-pulse"/>)}</div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-text-primary">Vendors</h1><p className="text-text-secondary text-sm">Manage all restaurants on the platform.</p></div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"/><Input className="pl-9" placeholder="Search restaurants..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select value={planFilter} onChange={e=>setPlanFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary"><option value="all">All Plans</option><option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option></select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length===0?<div className="col-span-full text-center py-12 text-text-muted">No vendors found.</div>:filtered.map((v,i)=>(
          <motion.div key={v._id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
            <Card className="border-border/40 hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Store className="w-5 h-5 text-primary"/></div>
                    <div><p className="font-semibold text-text-primary">{v.restaurantName}</p><p className="text-xs text-text-muted">{v.ownerId?.name || '—'} • {v.ownerId?.email || '—'}</p></div>
                  </div>
                  <button onClick={()=>toggleStatus(v._id, v.isActive)} className={"p-1.5 rounded-lg transition-colors "+(v.isActive?"text-success hover:bg-success/10":"text-red-400 hover:bg-red-500/10")} title={v.isActive?"Deactivate":"Activate"}>
                    {v.isActive?<Power className="w-4 h-4"/>:<PowerOff className="w-4 h-4"/>}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-surface-elevated/30"><p className="text-lg font-bold text-text-primary">{v.totalOrders||0}</p><p className="text-[10px] text-text-muted">Orders</p></div>
                  <div className="text-center p-2 rounded-lg bg-surface-elevated/30"><p className="text-lg font-bold text-primary">₹{(v.totalSales||0).toLocaleString('en-IN')}</p><p className="text-[10px] text-text-muted">Sales</p></div>
                  <div className="text-center p-2 rounded-lg bg-surface-elevated/30"><p className={"text-lg font-bold "+(v.isActive?"text-success":"text-red-400")}>{v.isActive?"Active":"Off"}</p><p className="text-[10px] text-text-muted">Status</p></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase">{v.subscriptionPlan||'free'}</span>
                  <span className={"px-2 py-0.5 rounded-full font-semibold "+(v.subscriptionPaymentStatus==='paid'?"bg-success/10 text-success":"bg-yellow-500/10 text-yellow-400")}>{v.subscriptionPaymentStatus||'pending'}</span>
                </div>
                <Button onClick={()=>navigate(\`/admin/vendors/\${v._id}\`} variant="ghost" className="w-full mt-3 gap-2 text-sm"><Eye className="w-4 h-4"/> View Details</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
`);

// Admin Vendor Detail
write('frontend/src/pages/admin/AdminVendorDetail.jsx', `import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Store, ShoppingBag, DollarSign, Utensils, Users, ChefHat, Table2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

const STATUS_COLORS = { pending:'bg-yellow-500/10 text-yellow-400', accepted:'bg-blue-500/10 text-blue-400', preparing:'bg-orange-500/10 text-orange-400', ready:'bg-emerald-500/10 text-emerald-400', completed:'bg-green-500/10 text-green-400', cancelled:'bg-red-500/10 text-red-400' };

export default function AdminVendorDetail() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState('7 Days');

  const fetchData = useCallback(async () => {
    try { const res = await api.get(\`/api/admin/vendors/\${vendorId}/detail\`); setData(res.data); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, [vendorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="space-y-4"><div className="h-8 w-32 rounded bg-surface animate-pulse"/><div className="grid grid-cols-6 gap-4">{[...Array(6)].map((_,i)=><div key={i} className="h-24 rounded-xl bg-surface animate-pulse"/>)}</div></div>;
  if (!data) return <div className="text-center py-12 text-text-muted">Vendor not found.</div>;

  const v = data.vendor || {};
  const st = data.stats || {};
  const series = data.revenueSeries || {};
  const chartMap = {'7 Days':series['7d']||[],'30 Days':series['30d']||[],'90 Days':series['90d']||[]};
  const chartData = chartMap[chartFilter]||[];
  const breakdown = data.statusBreakdown || {};
  const topItems = data.topItems || [];
  const recentOrders = data.recentOrders || [];

  const perfCards = [
    {label:'Total Orders',value:st.totalOrders||0,icon:ShoppingBag,color:'text-blue-400',bg:'bg-blue-500/10'},
    {label:'Paid Revenue',value:'₹'+(st.paidRevenue||0).toLocaleString('en-IN'),icon:DollarSign,color:'text-primary',bg:'bg-primary/10'},
    {label:'Menu Items',value:st.activeMenuItems||0,icon:Utensils,color:'text-emerald-400',bg:'bg-emerald-500/10'},
    {label:'Chefs',value:st.totalChefs||0,icon:ChefHat,color:'text-orange-400',bg:'bg-orange-500/10'},
    {label:'Tables',value:st.totalTables||0,icon:Table2,color:'text-purple-400',bg:'bg-purple-500/10'},
    {label:'Status',value:v.isActive?'Active':'Inactive',icon:Store,color:v.isActive?'text-success':'text-red-400',bg:v.isActive?'bg-success/10':'bg-red-500/10'},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={()=>navigate('/admin/vendors')} variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4"/> Back</Button>
        <div><h1 className="text-2xl font-bold text-text-primary">{v.restaurantName||'Restaurant'}</h1><p className="text-text-secondary text-sm">{v.ownerId?.name||'—'} • {v.ownerId?.email||'—'} • {v.phone||'No phone'} • {v.city||v.address||''}</p></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {perfCards.map((c,i)=>(
          <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
            <Card className="border-border/40"><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-text-muted uppercase">{c.label}</span>
              <div className={"w-8 h-8 rounded-lg flex items-center justify-center "+c.bg}><c.icon className={"w-4 h-4 "+c.color}/></div></div>
              <p className="text-xl font-bold text-text-primary">{c.value}</p>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
            <CardTitle className="text-lg text-text-primary">Sales Trend</CardTitle>
            <div className="flex gap-1 p-1 rounded-xl bg-surface-elevated border border-border/50">
              {['7 Days','30 Days','90 Days'].map(f=>(<button key={f} onClick={()=>setChartFilter(f)} className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors "+(chartFilter===f?"bg-surface-higher text-primary":"text-text-secondary hover:text-text-primary")}>{f}</button>))}
            </div>
          </CardHeader>
          <CardContent className="pt-6"><div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="vdGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,190,100,0.05)"/>
              <XAxis dataKey="name" stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9e9389" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>"₹"+v}/>
              <Tooltip content={({active,payload,label})=>active&&payload?.length?<div className="bg-surface-higher/95 backdrop-blur-xl border border-border/50 p-3 rounded-xl"><p className="text-xs text-text-secondary">{label}</p><p className="text-sm font-bold text-primary">₹{payload[0].value.toLocaleString('en-IN')}</p></div>:null}/>
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#vdGrad)"/>
            </AreaChart></div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Order Status</CardTitle></CardHeader>
          <CardContent className="pt-4"><div className="space-y-3">
            {Object.entries(breakdown).filter(([,v])=>v>0).map(([k,v])=>(
              <div key={k} className="flex items-center justify-between"><span className={"px-2 py-0.5 rounded-full text-xs font-semibold "+STATUS_COLORS[k]}>{k}</span><span className="text-sm font-bold text-text-primary">{v}</span></div>
            ))}
            {Object.values(breakdown).every(v=>v===0)&&<p className="text-text-muted text-sm text-center py-4">No orders</p>}
          </div></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40">
          <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Top Selling Items</CardTitle></CardHeader>
          <CardContent className="pt-4"><div className="space-y-3">
            {topItems.length===0?<p className="text-text-muted text-sm text-center py-4">No data</p>:topItems.map((item,i)=>(
              <div key={i} className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i+1}</span><span className="text-sm text-text-primary">{item.name}</span></div>
              <div className="flex items-center gap-3"><span className="text-xs text-text-muted">{item.quantity} sold</span><span className="text-sm font-bold text-primary">₹{item.revenue.toLocaleString('en-IN')}</span></div></div>
            ))}
          </div></CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="pb-2 border-b border-border/30"><CardTitle className="text-lg text-text-primary">Recent Orders</CardTitle></CardHeader>
          <CardContent className="pt-4">
            {recentOrders.length===0?<p className="text-text-muted text-sm text-center py-4">No orders</p>:(
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentOrders.map((o,i)=>(
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-elevated/30 transition-colors">
                    <div><p className="text-sm font-medium text-text-primary">{o.id}</p><p className="text-xs text-text-muted">Table {o.table}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-primary">₹{o.amount}</p><span className={"text-[10px] px-1.5 py-0.5 rounded-full font-semibold "+STATUS_COLORS[o.status]}>{o.status}</span></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`);

// Admin Payments
write('frontend/src/pages/admin/AdminPayments.jsx', `import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchPayments = useCallback(async () => {
    try { const res = await api.get('/api/admin/payments'); setPayments(res.data.payments || []); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const markPaid = async (vendorId) => {
    if (!window.confirm("Confirm subscription payment received?")) return;
    try {
      setUpdatingId(vendorId);
      await api.patch(\`/api/admin/vendors/\${vendorId}/subscription-payment\`, { paymentStatus: 'paid', lastPaymentDate: new Date().toISOString() });
      fetchPayments();
    } catch(e) { alert(e.response?.data?.message||'Failed'); } finally { setUpdatingId(null); }
  };

  const markOverdue = async (vendorId) => {
    try { setUpdatingId(vendorId); await api.patch(\`/api/admin/vendors/\${vendorId}/subscription-payment\`, { paymentStatus: 'overdue' }); fetchPayments(); } catch(e) { alert('Failed'); } finally { setUpdatingId(null); }
  };

  const filtered = payments.filter(p => filter === 'all' || p.paymentStatus === filter);
  const stats = { all: payments.length, paid: payments.filter(p=>p.paymentStatus==='paid').length, pending: payments.filter(p=>p.paymentStatus==='pending').length, overdue: payments.filter(p=>p.paymentStatus==='overdue').length };

  if (loading) return <div className="space-y-4"><div className="h-10 w-48 rounded bg-surface animate-pulse"/></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-text-primary">Subscription Payments</h1><p className="text-text-secondary text-sm">Manage vendor subscription payment status.</p></div>
      <div className="flex gap-2 flex-wrap">
        {[{k:'all',l:'All'},{k:'paid',l:'Paid',c:'text-success'},{k:'pending',l:'Pending',c:'text-yellow-400'},{k:'overdue',l:'Overdue',c:'text-red-400'}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} className={"px-4 py-2 rounded-xl text-sm font-semibold border transition-colors "+(filter===f.k?"bg-surface-higher border-primary/30 text-primary":"border-border/50 text-text-secondary hover:text-text-primary")}>{f.l} ({stats[f.k]||0})</button>
        ))}
      </div>
      <Card className="border-border/40">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-semibold">Restaurant</th><th className="pb-3 font-semibold">Owner</th><th className="pb-3 font-semibold">Plan</th><th className="pb-3 font-semibold">Amount</th><th className="pb-3 font-semibold">Payment Status</th><th className="pb-3 font-semibold">Last Payment</th><th className="pb-3 font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border/30">
                {filtered.length===0?<tr><td colSpan={7} className="py-8 text-center text-text-muted">No payments found</td></tr>:filtered.map((p,i)=>(
                  <tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 font-medium text-text-primary">{p.restaurantName}</td>
                    <td className="py-3 text-text-secondary">{p.ownerName}</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">{p.plan}</span></td>
                    <td className="py-3 text-text-primary">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3">
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold "+(p.paymentStatus==='paid'?"bg-success/10 text-success":p.paymentStatus==='overdue'?"bg-red-500/10 text-red-400":"bg-yellow-500/10 text-yellow-400")}>
                        {p.paymentStatus==='paid'?<CheckCircle className="w-3 h-3"/>:p.paymentStatus==='overdue'?<AlertTriangle className="w-3 h-3"/>:<Clock className="w-3 h-3"/>}
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 text-text-muted text-xs">{p.lastPaymentDate ? new Date(p.lastPaymentDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {p.paymentStatus!=='paid'&&<Button onClick={()=>markPaid(p.vendorId)} disabled={updatingId===p.vendorId} variant="ghost" className="text-xs px-2 py-1 h-auto text-success hover:bg-success/10">{updatingId===p.vendorId?'...':'Mark Paid'}</Button>}
                        {p.paymentStatus!=='overdue'&&p.paymentStatus!=='paid'&&<Button onClick={()=>markOverdue(p.vendorId)} disabled={updatingId===p.vendorId} variant="ghost" className="text-xs px-2 py-1 h-auto text-red-400 hover:bg-red-500/10">Overdue</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

// Admin Analytics
write('frontend/src/pages/admin/AdminAnalytics.jsx', `import React, { useState, useEffect, useCallback } from 'react';
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
    try { setLoading(true); const res = await api.get(\`/api/admin/analytics?range=\${range}\`); setData(res.data); } catch(e) { console.error(e); } finally { setLoading(false); }
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
            </AreaChart></div>
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
`);

console.log('All admin pages created');
