import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Vendor from "../models/Vendor.js";
import SubscriptionPayment from "../models/SubscriptionPayment.js";
import MenuItem from "../models/MenuItem.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Table from "../models/Table.js";
import { getPlanAmount, getPlanLimits, GRACE_PERIOD_DAYS } from "../config/planPricing.js";

// ==============================
// GET /api/vendor/billing
// ==============================
export const getBillingInfo = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    // Auto-check overdue
    if (
      vendor.subscriptionPaymentStatus === "pending" &&
      vendor.nextDueDate &&
      new Date() > new Date(vendor.nextDueDate)
    ) {
      vendor.subscriptionPaymentStatus = "overdue";
      await vendor.save();
    }

    // Fetch payment history
    const history = await SubscriptionPayment.find({
      vendorId: vendor._id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      billing: {
        plan: vendor.subscriptionPlan,
        billingCycle: vendor.billingCycle,
        amount: vendor.subscriptionAmount,
        paymentStatus: vendor.subscriptionPaymentStatus,
        subscriptionStatus: vendor.subscriptionStatus,
        lastPaymentDate: vendor.lastPaymentDate,
        nextDueDate: vendor.nextDueDate,
        subscriptionStartDate: vendor.subscriptionStartDate,
        subscriptionEndDate: vendor.subscriptionEndDate,
        restaurantName: vendor.restaurantName,
      },
      history: history.map((h) => ({
        _id: h._id,
        plan: h.plan,
        billingCycle: h.billingCycle,
        amount: h.amount,
        paymentMethod: h.paymentMethod,
        status: h.status,
        paidAt: h.paidAt,
        razorpayPaymentId: h.razorpayPaymentId,
        razorpayOrderId: h.razorpayOrderId,
        billingPeriodStart: h.billingPeriodStart,
        billingPeriodEnd: h.billingPeriodEnd,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get Billing Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// POST /api/vendor/subscription/create-order
// ==============================
export const createSubscriptionOrder = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    if (vendor.subscriptionPaymentStatus === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Subscription already paid" });
    }

    // Free plan = no payment needed
    if (vendor.subscriptionPlan === "free" || vendor.subscriptionAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "No payment required for free plan" });
    }

    const amount = vendor.subscriptionAmount;
    const currency = "INR";
    const receipt = `sub_${vendor._id}_${Date.now()}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency,
      receipt,
    });

    // Create subscription payment record
    const subscriptionPayment = await SubscriptionPayment.create({
      vendorId: vendor._id,
      plan: vendor.subscriptionPlan,
      billingCycle: vendor.billingCycle,
      amount,
      paymentMethod: "razorpay",
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      billingPeriodStart: new Date(),
      billingPeriodEnd: vendor.nextDueDate || new Date(),
    });

    res.status(201).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      subscriptionPaymentId: subscriptionPayment._id,
    });
  } catch (error) {
    console.error("Create Subscription Order Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create payment order" });
  }
};

// ==============================
// POST /api/vendor/subscription/verify-payment
// ==============================
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscriptionPaymentId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required",
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Mark failed
      if (subscriptionPaymentId) {
        await SubscriptionPayment.findByIdAndUpdate(subscriptionPaymentId, {
          status: "failed",
        });
      }
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    // Find the subscription payment record
    const subPayment = subscriptionPaymentId
      ? await SubscriptionPayment.findById(subscriptionPaymentId)
      : await SubscriptionPayment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!subPayment) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription payment record not found" });
    }

    // Update subscription payment record
    subPayment.razorpayPaymentId = razorpay_payment_id;
    subPayment.status = "paid";
    subPayment.paidAt = new Date();
    await subPayment.save();

    // Update vendor subscription
    const vendor = await Vendor.findById(req.user.vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const now = new Date();
    let nextDue = new Date(now);

    if (vendor.billingCycle === "yearly") {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    } else {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    vendor.subscriptionPaymentStatus = "paid";
    vendor.subscriptionStatus = "active";
    vendor.lastPaymentDate = now;
    vendor.subscriptionStartDate = now;
    vendor.subscriptionEndDate = nextDue;
    vendor.nextDueDate = nextDue;
    vendor.gracePeriodEndsAt = null;
    await vendor.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("subscription-payment-updated", {
        vendorId: vendor._id.toString(),
        restaurantName: vendor.restaurantName,
        paymentStatus: "paid",
        plan: vendor.subscriptionPlan,
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      billing: {
        plan: vendor.subscriptionPlan,
        billingCycle: vendor.billingCycle,
        amount: vendor.subscriptionAmount,
        paymentStatus: vendor.subscriptionPaymentStatus,
        lastPaymentDate: vendor.lastPaymentDate,
        nextDueDate: vendor.nextDueDate,
      },
    });
  } catch (error) {
    console.error("Verify Subscription Payment Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};

// ==============================
// GET /api/vendor/subscription/status
// ==============================
export const getSubscriptionStatus = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const plan = vendor.subscriptionPlan || "free";
    const limits = getPlanLimits(plan);
    const now = new Date();
    const graceDaysRemaining = vendor.nextDueDate && vendor.subscriptionStatus === "grace"
      ? Math.max(0, GRACE_PERIOD_DAYS - Math.floor((now - new Date(vendor.nextDueDate)) / (1000 * 60 * 60 * 24)))
      : null;

    res.status(200).json({
      success: true,
      subscription: {
        plan,
        status: vendor.subscriptionStatus || "active",
        paymentStatus: vendor.subscriptionPaymentStatus || "pending",
        nextDueDate: vendor.nextDueDate,
        gracePeriodEndsAt: vendor.gracePeriodEndsAt,
        graceDaysRemaining,
        isRestricted: vendor.subscriptionStatus === "restricted",
        isGrace: vendor.subscriptionStatus === "grace",
      },
    });
  } catch (error) {
    console.error("Get Subscription Status Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// GET /api/vendor/subscription/usage
// =============================
export const getSubscriptionUsage = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const plan = vendor.subscriptionPlan || "free";
    const limits = getPlanLimits(plan);
    const vendorId = vendor._id;

    const [menuItems, categories, chefs, tables] = await Promise.all([
      MenuItem.countDocuments({ vendorId }),
      Category.countDocuments({ vendorId }),
      User.countDocuments({ vendorId, role: "chef" }),
      Table.countDocuments({ vendorId }),
    ]);

    res.status(200).json({
      success: true,
      usage: {
        menuItems: { current: menuItems, limit: limits.menuItems },
        categories: { current: categories, limit: limits.categories },
        chefs: { current: chefs, limit: limits.chefs },
        tables: { current: tables, limit: limits.tables },
        analyticsDays: limits.analyticsDays,
      },
    });
  } catch (error) {
    console.error("Get Subscription Usage Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
