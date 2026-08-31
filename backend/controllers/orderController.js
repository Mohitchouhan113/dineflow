import mongoose from "mongoose";

import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import Table from "../models/Table.js";
import MenuItem from "../models/MenuItem.js";

// ==============================
// VENDOR DASHBOARD SUMMARY
// ==============================
export const getDashboardSummary = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const now = new Date();

    // Today boundaries (local server time)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Run all queries in parallel
    const [
      todaysOrders,
      todaysPaidOrders,
      allOrders,
      menuItems,
      tables,
      activeOrders,
    ] = await Promise.all([
      // Today's orders count
      Order.countDocuments({ vendorId, createdAt: { $gte: todayStart, $lt: todayEnd } }),
      // Today's revenue (paid orders only)
      Order.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), createdAt: { $gte: todayStart, $lt: todayEnd }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // All orders for revenue series + popular items
      Order.find({ vendorId }).populate("tableId", "tableNumber").sort({ createdAt: -1 }),
      // Menu items
      MenuItem.find({ vendorId, isActive: true }),
      // Tables
      Table.find({ vendorId, isActive: true }),
      // Active orders (for occupied tables)
      Order.find({ vendorId, orderStatus: { $in: ["pending", "accepted", "preparing", "ready"] } }),
    ]);

    const todaysRevenue = todaysPaidOrders.length > 0 ? todaysPaidOrders[0].total : 0;

    // Total revenue from ALL paid orders (not just today)
    const totalPaidAgg = await Order.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = totalPaidAgg.length > 0 ? totalPaidAgg[0].total : 0;

    // Menu items stats
    const availableItems = menuItems.filter((m) => m.isAvailable !== false).length;
    const totalActiveItems = menuItems.length;

    // Occupied tables
    const occupiedTableIds = new Set(activeOrders.map((o) => o.tableId?.toString()));
    const totalActiveTables = tables.length;
    const occupiedTables = tables.filter((t) => occupiedTableIds.has(t._id.toString())).length;

    // Revenue series for 7d / 30d / 90d
    const buildRevenueSeries = (days) => {
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayRevenue = allOrders
          .filter((o) => {
            const oDate = new Date(o.createdAt);
            return o.paymentStatus === "paid" && oDate >= dayStart && oDate < dayEnd;
          })
          .reduce((sum, o) => sum + o.totalAmount, 0);

        const label = days <= 7
          ? d.toLocaleDateString("en-US", { weekday: "short" })
          : days <= 30
          ? `${d.getDate()}`
          : `W${Math.ceil((d.getDate()) / 7)}`;

        series.push({ name: label, revenue: Math.round(dayRevenue) });
      }
      // Deduplicate labels for 90d (group by week)
      if (days === 90) {
        const weekMap = [];
        series.forEach((s) => {
          const existing = weekMap.find((w) => w.name === s.name);
          if (existing) {
            existing.revenue += s.revenue;
          } else {
            weekMap.push({ ...s });
          }
        });
        return weekMap;
      }
      return series;
    };

    // Live orders (active statuses)
    const liveOrders = allOrders
      .filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.orderStatus))
      .slice(0, 5)
      .map((o) => ({
        id: `ORD-${o._id.toString().slice(-4).toUpperCase()}`,
        table: o.tableId?.tableNumber || "—",
        amount: o.totalAmount,
        status: o.orderStatus.charAt(0).toUpperCase() + o.orderStatus.slice(1),
        time: formatTimeAgo(o.createdAt),
        createdAt: o.createdAt,
      }));

    // Popular items (top 3 by order count)
    const itemCountMap = {};
    allOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemCountMap[item.name]) {
          itemCountMap[item.name] = { name: item.name, count: 0 };
        }
        itemCountMap[item.name].count += item.quantity;
      });
    });
    const popularItems = Object.values(itemCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item, i) => ({ id: i + 1, name: item.name, orders: item.count }));

    // Yesterday comparison for trends
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);

    const [yesterdayOrders, yesterdayPaid] = await Promise.all([
      Order.countDocuments({ vendorId, createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd } }),
      Order.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);
    const yesterdayRevenue = yesterdayPaid.length > 0 ? yesterdayPaid[0].total : 0;

    const orderTrend = yesterdayOrders > 0
      ? `${todaysOrders >= yesterdayOrders ? "+" : ""}${Math.round(((todaysOrders - yesterdayOrders) / yesterdayOrders) * 100)}%`
      : "+0%";
    const revenueTrend = yesterdayRevenue > 0
      ? `${todaysRevenue >= yesterdayRevenue ? "+" : ""}${Math.round(((todaysRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)}%`
      : "+0%";

    res.status(200).json({
      success: true,
      summary: {
        todaysOrders,
        todaysRevenue: Math.round(totalRevenue),
        orderTrend,
        revenueTrend,
        availableItems,
        totalActiveItems,
        occupiedTables,
        totalActiveTables,
      },
      revenueSeries: {
        "7d": buildRevenueSeries(7),
        "30d": buildRevenueSeries(30),
        "90d": buildRevenueSeries(90),
      },
      liveOrders,
      popularItems,
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ==============================
// CUSTOMER PLACE ORDER
// ==============================
export const placeOrder = async (req, res) => {
  try {
    const {
      vendorId,
      tableId,
      items,
      paymentMethod,
      customerNote,
    } = req.body;

    if (
      !vendorId ||
      !tableId ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Vendor, table and order items are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const vendor = await Vendor.findOne({
      _id: vendorId,
      isActive: true,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or inactive",
      });
    }

    // Check if restaurant is open
    if (vendor.isOpen === false) {
      return res.status(403).json({
        success: false,
        code: "RESTAURANT_CLOSED",
        message: "Restaurant is currently closed. Please try again later.",
      });
    }

    const table = await Table.findOne({
      _id: tableId,
      vendorId,
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found or inactive",
      });
    }

    if (
      paymentMethod &&
      !["cash", "online"].includes(paymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be cash or online",
      });
    }

    const finalItems = [];

    let subtotal = 0;

    for (const item of items) {
      const { menuItemId, quantity } = item;

      if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid menu item ID: ${menuItemId}`,
        });
      }

      const numericQuantity = Number(quantity);

      if (
        Number.isNaN(numericQuantity) ||
        numericQuantity < 1 ||
        !Number.isInteger(numericQuantity)
      ) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive integer",
        });
      }

      const menuItem = await MenuItem.findOne({
        _id: menuItemId,
        vendorId,
        isActive: true,
        isAvailable: true,
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found or unavailable",
        });
      }

      const itemTotal = menuItem.price * numericQuantity;

      subtotal += itemTotal;

      finalItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: numericQuantity,
        price: menuItem.price,
        total: itemTotal,
      });
    }

    // Abhi simple 5% tax
    const tax = Number((subtotal * 0.05).toFixed(2));

    const totalAmount = Number(
      (subtotal + tax).toFixed(2)
    );

    const order = await Order.create({
      vendorId,
      tableId,
      items: finalItems,
      subtotal,
      tax,
      totalAmount,
      paymentMethod: paymentMethod || "cash",
      paymentStatus: "pending",
      customerNote: customerNote?.trim() || "",
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });

    // Emit new-order event via Socket.IO
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`vendor:${vendorId}`).emit("new-order", {
          type: "new-order",
          orderId: order._id,
          orderNumber: `ORD-${order._id.toString().slice(-4).toUpperCase()}`,
          vendorId,
          table: table.tableNumber,
          total: totalAmount,
          paymentMethod: order.paymentMethod,
          status: order.orderStatus,
          createdAt: order.createdAt,
        });
      }
    } catch (e) {
      console.error("Socket emit new-order error:", e);
    }
  } catch (error) {
    console.error("Place Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// VENDOR GET ORDERS
// ==============================
export const getVendorOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      vendorId: req.user.vendorId,
    })
      .populate("tableId", "tableNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Vendor Orders Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// CHEF GET ORDERS
// ==============================
export const getChefOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      vendorId: req.user.vendorId,
    })
      .populate("tableId", "tableNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Chef Orders Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// VENDOR GET ACTIVE ORDER FOR TABLE
// ==============================
export const getActiveOrderForTable = async (req, res) => {
  try {
    const { tableId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const activeStatuses = ["pending", "accepted", "preparing", "ready"];

    const order = await Order.findOne({
      vendorId: req.user.vendorId,
      tableId,
      orderStatus: { $in: activeStatuses },
    })
      .populate("tableId", "tableNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      hasActiveOrder: !!order,
      order: order || null,
    });
  } catch (error) {
    console.error("Get Active Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// VENDOR UPDATE PAYMENT STATUS
// ==============================
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "paymentStatus is required",
      });
    }

    const allowedStatuses = ["pending", "paid", "failed"];

    if (!allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.paymentStatus = paymentStatus;

    // Auto-complete order when cash payment is confirmed as paid
    if (paymentStatus === "paid" && order.paymentMethod === "cash" && order.orderStatus !== "completed") {
      order.orderStatus = "completed";
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order,
    });

    // Emit payment-status-updated event via Socket.IO
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`vendor:${order.vendorId}`).emit("payment-status-updated", {
          type: "payment-status-updated",
          orderId: order._id,
          orderNumber: `ORD-${order._id.toString().slice(-4).toUpperCase()}`,
          vendorId: order.vendorId,
          paymentStatus,
          updatedAt: order.updatedAt,
        });

        // Also emit order-status-updated if order was auto-completed
        if (paymentStatus === "paid" && order.orderStatus === "completed") {
          io.to(`vendor:${order.vendorId}`).emit("order-status-updated", {
            type: "order-status-updated",
            orderId: order._id,
            orderNumber: `ORD-${order._id.toString().slice(-4).toUpperCase()}`,
            vendorId: order.vendorId,
            orderStatus: "completed",
            updatedAt: order.updatedAt,
          });
        }
      }
    } catch (e) {
      console.error("Socket emit payment-status-updated error:", e);
    }
  } catch (error) {
    console.error("Update Payment Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// CHEF UPDATE ORDER STATUS
// ==============================
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    
       if (!status) {
      return res.status(400).json({
        success: false,
        message: "Order status is required",
      });
    }

    const allowedStatuses = [
      "accepted",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = status;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });

    // Emit order-status-updated event via Socket.IO
    try {
      const io = req.app.get("io");
      if (io) {
        const statusPayload = {
          type: "order-status-updated",
          orderId: order._id.toString(),
          orderNumber: `ORD-${order._id.toString().slice(-4).toUpperCase()}`,
          vendorId: order.vendorId.toString(),
          status,
          updatedAt: order.updatedAt,
        };
        io.to(`vendor:${order.vendorId}`).emit("order-status-updated", statusPayload);
        io.to(`order:${order._id}`).emit("order-status-updated", statusPayload);
      }
    } catch (e) {
      console.error("Socket emit order-status-updated error:", e);
    }
  } catch (error) {
    console.error("Order Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// VENDOR ANALYTICS SUMMARY
// ==============================
export const getVendorAnalytics = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { range } = req.query; // "7", "30", "90"
    const days = parseInt(range, 10) || 7;
    const now = new Date();

    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));
    const dayStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Fetch all orders in the date range for this vendor
    const orders = await Order.find({
      vendorId,
      createdAt: { $gte: dayStart, $lt: endOfDay },
    })
      .populate('tableId', 'tableNumber')
      .sort({ createdAt: -1 });

    // --- Summary Cards ---
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
    const completedOrders = orders.filter(o => o.orderStatus === 'completed').length;
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    // --- Order Status Breakdown ---
    const statusCounts = { pending: 0, accepted: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => {
      if (statusCounts[o.orderStatus] !== undefined) {
        statusCounts[o.orderStatus]++;
      }
    });

    // --- Revenue & Orders Trend (daily) ---
    const trendMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const key = dStart.toISOString().slice(0, 10);
      const label = days <= 7
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
      trendMap[key] = { name: label, revenue: 0, orders: 0 };
    }

    orders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].orders++;
        if (o.paymentStatus === 'paid') {
          trendMap[key].revenue += o.totalAmount;
        }
      }
    });
    const revenueTrend = Object.values(trendMap).map(v => ({ ...v, revenue: Math.round(v.revenue) }));

    // --- Top Selling Items ---
    const itemMap = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemMap[item.name].quantity += item.quantity;
        itemMap[item.name].revenue += item.total;
      });
    });
    const topSellingItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(item => ({ ...item, revenue: Math.round(item.revenue) }));

    // --- Payment Overview ---
    const cashOrders = orders.filter(o => o.paymentMethod === 'cash');
    const onlineOrders = orders.filter(o => o.paymentMethod === 'online');
    const cashPaid = cashOrders.filter(o => o.paymentStatus === 'paid');
    const onlinePaid = onlineOrders.filter(o => o.paymentStatus === 'paid');
    const cashRevenue = cashPaid.reduce((s, o) => s + o.totalAmount, 0);
    const onlineRevenue = onlinePaid.reduce((s, o) => s + o.totalAmount, 0);

    const paymentOverview = {
      cash: { count: cashOrders.length, revenue: Math.round(cashRevenue), paidCount: cashPaid.length },
      online: { count: onlineOrders.length, revenue: Math.round(onlineRevenue), paidCount: onlinePaid.length },
    };

    // --- Table Performance ---
    const tableMap = {};
    orders.forEach(o => {
      const tableNum = o.tableId?.tableNumber || 'Takeaway';
      if (!tableMap[tableNum]) {
        tableMap[tableNum] = { table: tableNum, orders: 0, revenue: 0 };
      }
      tableMap[tableNum].orders++;
      if (o.paymentStatus === 'paid') {
        tableMap[tableNum].revenue += o.totalAmount;
      }
    });
    const tablePerformance = Object.values(tableMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map(t => ({ ...t, revenue: Math.round(t.revenue) }));

    // --- Recent Orders (last 10) ---
    const recentOrders = orders.slice(0, 10).map(o => ({
      id: `ORD-${o._id.toString().slice(-4).toUpperCase()}`,
      table: o.tableId?.tableNumber || '—',
      amount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.orderStatus,
      createdAt: o.createdAt,
    }));

    res.status(200).json({
      success: true,
      range: `${days}d`,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        avgOrderValue,
        completedOrders,
        completionRate,
      },
      statusBreakdown: statusCounts,
      revenueTrend,
      topSellingItems,
      paymentOverview,
      tablePerformance,
      recentOrders,
    });
  } catch (error) {
    console.error('Vendor Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};