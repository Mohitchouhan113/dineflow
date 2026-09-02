import crypto from "crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";

import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import razorpay from "../config/razorpay.js";

// ==============================
// HELPER: Get Razorpay instance
// for a given vendor.
// If vendor has paymentSettings with
// valid credentials and isGatewayActive,
// use vendor-specific keys.
// Otherwise fall back to global keys.
// ==============================
async function getRazorpayForVendor(vendorId) {
  if (!vendorId) {
    return { instance: razorpay, keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET };
  }

  const vendor = await Vendor.findById(vendorId).select("paymentSettings");
  if (
    vendor?.paymentSettings?.isGatewayActive &&
    vendor.paymentSettings.razorpayKeyId &&
    vendor.paymentSettings.razorpayKeySecret
  ) {
    const vendorRazorpay = new Razorpay({
      key_id: vendor.paymentSettings.razorpayKeyId,
      key_secret: vendor.paymentSettings.razorpayKeySecret,
    });
    return {
      instance: vendorRazorpay,
      keyId: vendor.paymentSettings.razorpayKeyId,
      keySecret: vendor.paymentSettings.razorpayKeySecret,
    };
  }

  // Fallback to global Razorpay credentials
  return { instance: razorpay, keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET };
}

// ==============================
// CREATE RAZORPAY ORDER
// ==============================
export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "online") {
      return res.status(400).json({
        success: false,
        message: "This order is not an online payment order",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid",
      });
    }

    // Get vendor-specific or global Razorpay instance
    const { instance: rpInstance, keyId } = await getRazorpayForVendor(order.vendorId);

    // Razorpay expects amount in paise
    const amountInPaise = Math.round(
      order.totalAmount * 100
    );

    const options = {
      amount: amountInPaise,
      currency: "INR",

      // Receipt maximum 40 chars
      receipt: `rcpt_${order._id}`,

      notes: {
        internalOrderId: order._id.toString(),
        vendorId: order.vendorId.toString(),
        tableId: order.tableId.toString(),
      },
    };

    const razorpayOrder =
      await rpInstance.orders.create(options);

    order.razorpayOrderId = razorpayOrder.id;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment order created successfully",

      payment: {
        key: keyId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },

      order: {
        _id: order._id,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error(
      "Create Razorpay Order Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to create payment order",
    });
  }
};

// ==============================
// VERIFY RAZORPAY PAYMENT
// ==============================
export const verifyRazorpayPayment = async (
  req,
  res
) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !orderId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      order.razorpayOrderId !== razorpay_order_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID mismatch",
      });
    }

    // Get vendor-specific or global Razorpay secret for signature verification
    const { keySecret } = await getRazorpayForVendor(order.vendorId);

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        keySecret
      )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      order.paymentStatus = "failed";
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    order.paymentStatus = "paid";
    order.razorpayPaymentId =
      razorpay_payment_id;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",

      order: {
        _id: order._id,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        razorpayPaymentId:
          order.razorpayPaymentId,
      },
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
          paymentStatus: order.paymentStatus,
          updatedAt: order.updatedAt,
        });
      }
    } catch (e) {
      console.error("Socket emit payment-status-updated error:", e);
    }
  } catch (error) {
    console.error(
      "Verify Payment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Payment verification error",
    });
  }
};