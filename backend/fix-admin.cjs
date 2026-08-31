const fs = require('fs');

const content = fs.readFileSync('backend/controllers/adminController.js', 'utf8');
const getVendorDetailStart = content.indexOf('export const getVendorDetail');
const truncated = content.substring(0, getVendorDetailStart);

const getVendorDetail = `
export const getVendorDetail = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate("ownerId", "name email role isActive");
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    const vendorId = vendor._id;
    const [orders, menuItems, chefs, tables] = await Promise.all([
      Order.find({ vendorId }).populate("tableId", "tableNumber").sort({ createdAt: -1 }),
      MenuItem.find({ vendorId }), User.find({ role: "chef", vendorId }), Table.find({ vendorId }),
    ]);
    const totalOrders = orders.length;
    const paidRevenue = Math.round(orders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.totalAmount, 0));
    const activeMenuItems = menuItems.filter(m => m.isActive !== false).length;
    const statusBreakdown = { pending: 0, accepted: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => { if (statusBreakdown[o.orderStatus] !== undefined) statusBreakdown[o.orderStatus]++; });
    const itemMap = {};
    orders.forEach(o => { o.items.forEach(item => { if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 }; itemMap[item.name].quantity += item.quantity; itemMap[item.name].revenue += item.total; }); });
    const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5).map(i => ({ ...i, revenue: Math.round(i.revenue) }));
    const now = new Date();
    const buildSeries = (days) => {
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const label = days <= 7 ? d.toLocaleDateString("en-US", { weekday: "short" }) : d.getDate() + " " + d.toLocaleDateString("en-US", { month: "short" });
        const rev = orders.filter(o => o.paymentStatus === "paid" && o.createdAt >= dayStart && o.createdAt < dayEnd).reduce((s, o) => s + o.totalAmount, 0);
        series.push({ name: label, revenue: Math.round(rev) });
      }
      return series;
    };
    const recentOrders = orders.slice(0, 10).map(o => ({ id: "ORD-" + o._id.toString().slice(-4).toUpperCase(), table: o.tableId?.tableNumber || "—", amount: o.totalAmount, status: o.orderStatus, payment: o.paymentStatus, method: o.paymentMethod, createdAt: o.createdAt }));
    res.status(200).json({ success: true, vendor: vendor.toObject(), stats: { totalOrders, paidRevenue, activeMenuItems, totalChefs: chefs.length, totalTables: tables.length }, statusBreakdown, topItems, revenueSeries: { "7d": buildSeries(7), "30d": buildSeries(30), "90d": buildSeries(90) }, recentOrders });
  } catch (error) {
    console.error("Vendor Detail Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPayments = async (req, res) => {
  try {
    const vendors = await Vendor.find().populate("ownerId", "name email").sort({ createdAt: -1 });
    const payments = vendors.map(v => ({ vendorId: v._id, restaurantName: v.restaurantName, ownerName: v.ownerId?.name || "—", ownerEmail: v.ownerId?.email || "—", plan: v.subscriptionPlan, amount: v.subscriptionAmount || 0, paymentStatus: v.subscriptionPaymentStatus || "pending", subscriptionStatus: v.subscriptionStatus || "active", startDate: v.subscriptionStartDate, endDate: v.subscriptionEndDate, lastPaymentDate: v.lastPaymentDate }));
    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error("Get Payments Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateSubscriptionPayment = async (req, res) => {
  try {
    const { paymentStatus, amount, startDate, endDate } = req.body;
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    if (paymentStatus) vendor.subscriptionPaymentStatus = paymentStatus;
    if (amount !== undefined) vendor.subscriptionAmount = Number(amount);
    if (startDate) vendor.subscriptionStartDate = new Date(startDate);
    if (endDate) vendor.subscriptionEndDate = new Date(endDate);
    if (paymentStatus === "paid") vendor.lastPaymentDate = new Date();
    await vendor.save();
    res.status(200).json({ success: true, message: "Subscription payment updated", vendor });
  } catch (error) {
    console.error("Update Subscription Payment Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminAnalytics = async (req, res) => {
  try {
    const { range } = req.query;
    const days = parseInt(range, 10) || 7;
    const now = new Date();
    const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - (days - 1));
    const dayStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const [orders, vendors] = await Promise.all([Order.find({ createdAt: { $gte: dayStart, $lt: endOfDay } }).populate("tableId", "tableNumber"), Vendor.find()]);
    const paidOrders = orders.filter(o => o.paymentStatus === "paid");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
    const trendMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const key = dStart.toISOString().slice(0, 10);
      const label = days <= 7 ? d.toLocaleDateString("en-US", { weekday: "short" }) : d.getDate() + " " + d.toLocaleDateString("en-US", { month: "short" });
      trendMap[key] = { name: label, revenue: 0, orders: 0 };
    }
    orders.forEach(o => { const key = new Date(o.createdAt).toISOString().slice(0, 10); if (trendMap[key]) { trendMap[key].orders++; if (o.paymentStatus === "paid") trendMap[key].revenue += o.totalAmount; } });
    const salesTrend = Object.values(trendMap).map(v => ({ ...v, revenue: Math.round(v.revenue) }));
    const cashOrders = orders.filter(o => o.paymentMethod === "cash");
    const onlineOrders = orders.filter(o => o.paymentMethod === "online");
    const paymentBreakdown = { cash: { count: cashOrders.length, revenue: Math.round(cashOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.totalAmount, 0)) }, online: { count: onlineOrders.length, revenue: Math.round(onlineOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.totalAmount, 0)) } };
    const vendorRankMap = {};
    orders.forEach(o => { const vId = o.vendorId?.toString(); if (!vId) return; if (!vendorRankMap[vId]) vendorRankMap[vId] = { vendorId: vId, orders: 0, revenue: 0 }; vendorRankMap[vId].orders++; if (o.paymentStatus === "paid") vendorRankMap[vId].revenue += o.totalAmount; });
    const vendorRanking = Object.values(vendorRankMap).map(v => { const vendor = vendors.find(vd => vd._id.toString() === v.vendorId); return { name: vendor?.restaurantName || "—", orders: v.orders, revenue: Math.round(v.revenue), avgOrder: v.orders > 0 ? Math.round(v.revenue / v.orders) : 0 }; }).sort((a, b) => b.revenue - a.revenue);
    const activeVendorIds = new Set(orders.map(o => o.vendorId?.toString()));
    res.status(200).json({ success: true, summary: { totalRevenue: Math.round(totalRevenue), totalOrders: orders.length, avgOrderValue, activeVendors: activeVendorIds.size, totalVendors: vendors.length }, salesTrend, paymentBreakdown, vendorRanking });
  } catch (error) {
    console.error("Admin Analytics Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
`;

fs.writeFileSync('backend/controllers/adminController.js', truncated + getVendorDetail);
console.log('Written ' + (truncated + getVendorDetail).split('\n').length + ' lines');
console.log('Has getPayments: ' + (truncated + getVendorDetail).includes('getPayments'));
console.log('Has getAdminAnalytics: ' + (truncated + getVendorDetail).includes('getAdminAnalytics'));
