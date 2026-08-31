import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Store, ShoppingBag, DollarSign, Utensils, Users, ChefHat, Table2, CreditCard, Calendar, Clock, Ban, ArrowUpDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import ChangePlanModal from '../../components/admin/ChangePlanModal';

const STATUS_COLORS = { pending:'bg-yellow-500/10 text-yellow-400', accepted:'bg-blue-500/10 text-blue-400', preparing:'bg-orange-500/10 text-orange-400', ready:'bg-emerald-500/10 text-emerald-400', completed:'bg-green-500/10 text-green-400', cancelled:'bg-red-500/10 text-red-400' };

export default function AdminVendorDetail() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState('7 Days');
  const [showChangePlan, setShowChangePlan] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await api.get(`/api/admin/vendors/${vendorId}/detail`); setData(res.data); } catch(e) { console.error(e); } finally { setLoading(false); }
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

  const planLabel = (p) => ({ free:'Free', basic:'Basic', pro:'Pro', premium:'Premium' }[p] || 'Free');
  const subStatus = v.subscriptionStatus || 'active';
  const subPayStatus = v.subscriptionPaymentStatus || 'pending';
  const subStatusLabel = { active:'Active', grace:'Grace', restricted:'Restricted' }[subStatus] || subStatus;
  const subStatusColor = subStatus === 'restricted' ? 'bg-red-500/10 text-red-400' : subStatus === 'grace' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-success/10 text-success';
  const payStatusLabel = { paid:'Paid', pending:'Pending', overdue:'Overdue' }[subPayStatus] || subPayStatus;
  const payStatusColor = subPayStatus === 'paid' ? 'bg-success/10 text-success' : subPayStatus === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

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

      {/* Subscription Info */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border/30">
          <CreditCard className="w-5 h-5 text-primary"/>
          <CardTitle className="text-lg text-text-primary">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Plan</p><p className="text-sm font-bold text-text-primary">{planLabel(v.subscriptionPlan)}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Billing Cycle</p><p className="text-sm font-bold text-text-primary capitalize">{v.billingCycle || 'Monthly'}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Amount</p><p className="text-sm font-bold text-primary">₹{(v.subscriptionAmount||0).toLocaleString('en-IN')}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Payment</p><span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-bold "+payStatusColor}>{payStatusLabel}</span></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Access</p><span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-bold "+subStatusColor}>{subStatusLabel}</span></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Next Due</p><p className="text-sm font-bold text-text-primary">{fmtDate(v.nextDueDate)}</p></div>
          </div>
          {subStatus === 'grace' && v.gracePeriodEndsAt && (
            <div className="mt-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400"/>
              <span className="text-xs text-yellow-400 font-medium">Grace Period Ends: {fmtDate(v.gracePeriodEndsAt)}</span>
            </div>
          )}            {subStatus === 'restricted' && (
            <div className="mt-3 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400"/>
              <span className="text-xs text-red-400 font-medium">Vendor is restricted — new resource creation and QR ordering blocked</span>
            </div>
          )}
          <div className="mt-4">
            <Button onClick={() => setShowChangePlan(true)} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30">
              <ArrowUpDown className="w-4 h-4" /> Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>
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
            </AreaChart></ResponsiveContainer></div>
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
      <ChangePlanModal
        vendor={v}
        isOpen={showChangePlan}
        onClose={() => setShowChangePlan(false)}
        onPlanChanged={() => fetchData()}
      />
    </div>
  );
}
