import Vendor from "../models/Vendor.js";
import { getPlanLimits, isWithinLimit } from "../config/planPricing.js";
import MenuItem from "../models/MenuItem.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Table from "../models/Table.js";

// Resource model map
const RESOURCE_MODELS = {
  menuItems: MenuItem,
  categories: Category,
  chefs: (vendorId) => User.find({ vendorId, role: "chef" }).countDocuments(),
  tables: Table,
};

// Count resources for a vendor
async function countResources(vendorId, resource) {
  if (resource === "chefs") {
    return await User.find({ vendorId, role: "chef" }).countDocuments();
  }
  const Model = RESOURCE_MODELS[resource];
  if (!Model) return 0;
  return await Model.countDocuments({ vendorId });
}

// Middleware factory: enforces plan limit for a resource type
export function enforcePlanLimit(resource) {
  return async (req, res, next) => {
    try {
      const vendorId = req.user.vendorId;
      if (!vendorId) {
        return res.status(403).json({ success: false, message: "Vendor access required" });
      }

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendor not found" });
      }

      // Check restricted mode
      if (vendor.subscriptionStatus === "restricted") {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_RESTRICTED",
          message: "Your subscription is restricted due to an overdue payment. Complete payment to restore access.",
          subscriptionStatus: vendor.subscriptionStatus,
          paymentStatus: vendor.subscriptionPaymentStatus,
        });
      }

      // Check plan limit
      const plan = vendor.subscriptionPlan || "free";
      const currentCount = await countResources(vendorId, resource);
      const limits = getPlanLimits(plan);
      const limit = limits[resource];

      // null = unlimited
      if (limit !== null && currentCount >= limit) {
        const resourceLabel = resource.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
        return res.status(403).json({
          success: false,
          code: "PLAN_LIMIT_REACHED",
          resource,
          current: currentCount,
          limit,
          plan,
          message: `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows up to ${limit} ${resourceLabel.toLowerCase()}.`,
        });
      }

      // Attach vendor info for controllers
      req.vendorSubscription = { plan, limits, currentCount };
      next();
    } catch (error) {
      console.error("Subscription guard error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
}

// Middleware to check restricted mode only (for order creation)
export function checkRestricted(req, res, next) {
  Vendor.findById(req.user.vendorId)
    .then((vendor) => {
      if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
      if (vendor.subscriptionStatus === "restricted") {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_RESTRICTED",
          message: "Order creation is restricted due to an overdue subscription payment.",
        });
      }
      next();
    })
    .catch((err) => {
      console.error("Restricted check error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    });
}
