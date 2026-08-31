import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";
import Category from "../models/Category.js";
import SubscriptionPlanChange from "../models/SubscriptionPlanChange.js";
import { getPlanAmount, getPlanLimits } from "../config/planPricing.js";
import PLAN_PRICING from "../config/planPricing.js";

export const createVendor = async (req, res) => {
  try {
    const {
      ownerName, email: emailAlias, password, confirmPassword,
      restaurantName, phone, city, address,
      subscriptionPlan, subscriptionAmount, billingCycle,
      isActive, subscriptionPaymentStatus,
    } = req.body;
    const ownerEmail = emailAlias || req.body.ownerEmail;

    // Required field validation
    if (!ownerName || !ownerEmail || !password || !restaurantName) {
      return res.status(400).json({ success: false, message: "Owner name, email, password and restaurant name are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Duplicate email check
    const existingUser = await User.findOne({ email: ownerEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    // Validate plan
    const validPlans = ["free", "basic", "pro", "premium"];
    const plan = validPlans.includes(subscriptionPlan) ? subscriptionPlan : "free";
    const cycle = ["monthly", "yearly"].includes(billingCycle) ? billingCycle : "monthly";

    // Auto-calculate amount from plan if not explicitly provided
    let amount = Number(subscriptionAmount) || 0;
    if (PLAN_PRICING[plan]) {
      amount = PLAN_PRICING[plan][cycle];
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const vendorAdmin = await User.create({
      name: ownerName,
      email: ownerEmail.toLowerCase(),
      password: hashedPassword,
      role: "vendorAdmin",
      vendorId: null,
      isActive: isActive !== false,
    });

    // Calculate next due date
    const now = new Date();
    const nextDue = new Date(now);
    if (cycle === "yearly") {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    } else {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    // Create vendor
    const vendor = await Vendor.create({
      restaurantName,
      ownerId: vendorAdmin._id,
      phone: phone || "",
      city: city || "",
      address: address || "",
      isActive: isActive !== false,
      subscriptionPlan: plan,
      billingCycle: cycle,
      subscriptionAmount: amount,
      subscriptionStatus: "active",
      subscriptionPaymentStatus: subscriptionPaymentStatus || "pending",
      subscriptionStartDate: now,
      subscriptionEndDate: nextDue,
      nextDueDate: nextDue,
    });

    // Link vendor to user
    vendorAdmin.vendorId = vendor._id;
    await vendorAdmin.save();

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
      vendorAdmin: { _id: vendorAdmin._id, name: vendorAdmin.name, email: vendorAdmin.email },
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().populate("ownerId", "name email role isActive").sort({ createdAt: -1 });
    const vendorStats = await Order.aggregate([{ $group: { _id: "$vendorId", totalOrders: { $sum: 1 }, totalSales: { $sum: "$totalAmount" }, paidSales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } } } }]);
    const statsMap = {};
    vendorStats.forEach(s => { statsMap[s._id.toString()] = s; });
    const vendorsWithStats = vendors.map(v => ({ ...v.toObject(), totalOrders: statsMap[v._id.toString()]?.totalOrders || 0, totalSales: Math.round(statsMap[v._id.toString()]?.totalSales || 0), paidSales: Math.round(statsMap[v._id.toString()]?.paidSales || 0) }));
    res.status(200).json({ success: true, count: vendorsWithStats.length, vendors: vendorsWithStats });
  } catch (error) {
    console.error("Get Vendors Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate("ownerId", "name email role isActive");
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error("Get Vendor Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { restaurantName, phone, address, subscriptionPlan } = req.body;
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    if (restaurantName) vendor.restaurantName = restaurantName;
    if (phone !== undefined) vendor.phone = phone;
    if (address !== undefined) vendor.address = address;
    if (subscriptionPlan) vendor.subscriptionPlan = subscriptionPlan;
    await vendor.save();
    res.status(200).json({ success: true, message: "Vendor updated successfully", vendor });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateVendorStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ success: false, message: "isActive must be true or false" });
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    vendor.isActive = isActive;
    await vendor.save();
    await User.findByIdAndUpdate(vendor.ownerId, { isActive });
    res.status(200).json({ success: true, message: isActive ? "Vendor activated" : "Vendor deactivated", vendor });
  } catch (error) {
    console.error("Vendor Status Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminDashboard = async (req, res) => {
  try {
    const [vendors, orderStats, allOrders, menuItems, chefs, tables] = await Promise.all([
      Vendor.find(),
      Order.aggregate([{ $group: { _id: "$vendorId", totalOrders: { $sum: 1 }, totalSales: { $sum: "$totalAmount" }, paidSales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } } } }]),
      Order.find().populate("tableId", "tableNumber").sort({ createdAt: -1 }),
      MenuItem.find(), User.find({ role: "chef" }), Table.find(),
    ]);
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.isActive).length;
    const totalOrders = allOrders.length;
    const totalSales = Math.round(allOrders.reduce((sum, o) => sum + o.totalAmount, 0));
    const pendingPayments = vendors.filter(v => v.subscriptionPaymentStatus === "pending" || v.subscriptionPaymentStatus === "overdue").length;
    const now = new Date();
    const buildSeries = (days) => {
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const label = days <= 7 ? d.toLocaleDateString("en-US", { weekday: "short" }) : `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
        const dayRevenue = allOrders.filter(o => o.paymentStatus === "paid" && o.createdAt >= dayStart && o.createdAt < dayEnd).reduce((s, o) => s + o.totalAmount, 0);
        const dayOrders = allOrders.filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd).length;
        series.push({ name: label, revenue: Math.round(dayRevenue), orders: dayOrders });
      }
      return series;
    };
    const vendorPerf = vendors.map(v => { const stats = orderStats.find(s => s._id?.toString() === v._id.toString()); return { name: v.restaurantName, orders: stats?.totalOrders || 0, revenue: Math.round(stats?.totalSales || 0) }; }).sort((a, b) => b.revenue - a.revenue);
    const recentOrders = allOrders.slice(0, 10).map(o => ({ id: `ORD-${o._id.toString().slice(-4).toUpperCase()}`, vendor: vendors.find(v => v._id.toString() === o.vendorId?.toString())?.restaurantName || "—", table: o.tableId?.tableNumber || "—", amount: o.totalAmount, status: o.orderStatus, payment: o.paymentStatus, method: o.paymentMethod, createdAt: o.createdAt }));
    res.status(200).json({ success: true, summary: { totalVendors, activeVendors, totalOrders, totalSales: Math.round(totalSales), pendingPayments, totalMenuItems: menuItems.length, totalChefs: chefs.length, totalTables: tables.length }, revenueSeries: { "7d": buildSeries(7), "30d": buildSeries(30), "90d": buildSeries(90) }, vendorPerformance: vendorPerf, recentOrders });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getVendorDetail = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate("ownerId", "name email role isActive");
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    const vendorId = vendor._id;
    const [orders, menuItems, chefs, tables, categories] = await Promise.all([
      Order.find({ vendorId }).populate("tableId", "tableNumber").sort({ createdAt: -1 }),
      MenuItem.find({ vendorId }), User.find({ role: "chef", vendorId }), Table.find({ vendorId }),
      Category.find({ vendorId }),
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
    res.status(200).json({ success: true, vendor: vendor.toObject(), stats: { totalOrders, paidRevenue, activeMenuItems, totalCategories: categories.length, totalChefs: chefs.length, totalTables: tables.length }, statusBreakdown, topItems, revenueSeries: { "7d": buildSeries(7), "30d": buildSeries(30), "90d": buildSeries(90) }, recentOrders });
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

// Super Admin: override subscription status + payment status
export const updateSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionPaymentStatus, subscriptionPlan, subscriptionAmount, billingCycle } = req.body;
    
    // Validate subscriptionStatus if provided
    if (subscriptionStatus !== undefined) {
      const validStatuses = ["active", "grace", "restricted"];
      if (!validStatuses.includes(subscriptionStatus)) {
        return res.status(400).json({ success: false, message: "Invalid subscription status" });
      }
    }

    // Validate subscriptionPaymentStatus if provided
    if (subscriptionPaymentStatus !== undefined) {
      const validPaymentStatuses = ["paid", "pending", "overdue"];
      if (!validPaymentStatuses.includes(subscriptionPaymentStatus)) {
        return res.status(400).json({ success: false, message: "Invalid payment status" });
      }
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    if (subscriptionStatus !== undefined) {
      vendor.subscriptionStatus = subscriptionStatus;
      if (subscriptionStatus === "active") {
        vendor.gracePeriodEndsAt = null;
      }
    }

    if (subscriptionPaymentStatus !== undefined) {
      vendor.subscriptionPaymentStatus = subscriptionPaymentStatus;
    }

    // Allow plan/amount changes (for admin plan management)
    const validPlans = ["free", "basic", "pro", "premium"];
    if (subscriptionPlan !== undefined && validPlans.includes(subscriptionPlan)) {
      vendor.subscriptionPlan = subscriptionPlan;
    }
    if (subscriptionAmount !== undefined && typeof subscriptionAmount === 'number' && subscriptionAmount >= 0) {
      vendor.subscriptionAmount = subscriptionAmount;
    }
    if (billingCycle !== undefined && ["monthly", "yearly"].includes(billingCycle)) {
      vendor.billingCycle = billingCycle;
    }

    await vendor.save();

    // Reload from DB to confirm
    const updated = await Vendor.findById(req.params.id);
    res.status(200).json({
      success: true,
      message: `Subscription status updated`,
      vendor: {
        _id: updated._id,
        subscriptionStatus: updated.subscriptionStatus,
        subscriptionPaymentStatus: updated.subscriptionPaymentStatus,
        subscriptionPlan: updated.subscriptionPlan,
        subscriptionAmount: updated.subscriptionAmount,
        billingCycle: updated.billingCycle,
      },
    });
  } catch (error) {
    console.error("Update Subscription Status Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Super Admin: change vendor subscription plan
export const changeVendorPlan = async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const { plan, billingCycle } = req.body;

    // Validate vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    // Validate plan
    const validPlans = ["basic", "pro", "premium"];
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan. Must be: basic, pro, or premium" });
    }

    // Validate billing cycle
    const validCycles = ["monthly", "yearly"];
    const newCycle = billingCycle && validCycles.includes(billingCycle) ? billingCycle : vendor.billingCycle || "monthly";

    // Get pricing from centralized config (never trust frontend amount)
    const newAmount = getPlanAmount(plan, newCycle);
    const newLimits = getPlanLimits(plan);

    // Snapshot current usage for comparison
    const prevPlan = vendor.subscriptionPlan || "free";
    const prevCycle = vendor.billingCycle || "monthly";
    const prevAmount = vendor.subscriptionAmount || 0;

    const [menuCount, catCount, chefCount, tableCount] = await Promise.all([
      MenuItem.countDocuments({ vendorId: vendor._id }),
      Category.countDocuments({ vendorId: vendor._id }),
      User.countDocuments({ vendorId: vendor._id, role: "chef" }),
      Table.countDocuments({ vendorId: vendor._id }),
    ]);

    // Build usage vs new limits
    const usage = {
      menuItems: { current: menuCount, limit: newLimits.menuItems },
      categories: { current: catCount, limit: newLimits.categories },
      chefs: { current: chefCount, limit: newLimits.chefs },
      tables: { current: tableCount, limit: newLimits.tables },
    };

    // Check for downgrade warnings (usage exceeds new limits)
    const exceedingResources = [];
    for (const [resource, u] of Object.entries(usage)) {
      if (u.limit !== null && u.limit !== undefined && u.current > u.limit) {
        exceedingResources.push({ resource, current: u.current, limit: u.limit });
      }
    }

    // Determine if payment status should change
    // If plan/price changed, set payment status to pending
    const priceChanged = prevAmount !== newAmount || prevPlan !== plan;
    const newPaymentStatus = priceChanged ? "pending" : vendor.subscriptionPaymentStatus;

    // Record plan history
    await SubscriptionPlanChange.create({
      vendorId: vendor._id,
      previousPlan: prevPlan,
      newPlan: plan,
      previousBillingCycle: prevCycle,
      newBillingCycle: newCycle,
      previousAmount: prevAmount,
      newAmount,
      changedBy: req.user._id,
      changedByRole: req.user.role,
      reason: req.body.reason || `Plan changed from ${prevPlan} to ${plan}`,
    });

    // Update vendor
    vendor.subscriptionPlan = plan;
    vendor.billingCycle = newCycle;
    vendor.subscriptionAmount = newAmount;
    if (priceChanged) {
      vendor.subscriptionPaymentStatus = newPaymentStatus;
    }
    await vendor.save();

    // Reload to confirm
    const updated = await Vendor.findById(vendorId);

    res.status(200).json({
      success: true,
      message: `Plan changed from ${prevPlan} to ${plan}`,
      vendor: {
        _id: updated._id,
        restaurantName: updated.restaurantName,
        subscriptionPlan: updated.subscriptionPlan,
        billingCycle: updated.billingCycle,
        subscriptionAmount: updated.subscriptionAmount,
        subscriptionPaymentStatus: updated.subscriptionPaymentStatus,
        subscriptionStatus: updated.subscriptionStatus,
        nextDueDate: updated.nextDueDate,
      },
      usage,
      exceedingResources,
      priceChanged,
    });
  } catch (error) {
    console.error("Change Vendor Plan Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Super Admin: get plan change history for a vendor
export const getPlanChangeHistory = async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const changes = await SubscriptionPlanChange.find({ vendorId })
      .sort({ changedAt: -1 })
      .limit(20)
      .lean();
    res.status(200).json({ success: true, changes });
  } catch (error) {
    console.error("Get Plan Change History Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
