import Vendor from "../models/Vendor.js";
import { getPlanLimits, checkSubscriptionStatus } from "../config/planPricing.js";

// Attach subscription status to all vendor requests
export async function attachSubscriptionInfo(req, res, next) {
  try {
    if (!req.user?.vendorId) return next();

    const vendor = await Vendor.findById(req.user.vendorId);
    if (!vendor) return next();

    const plan = vendor.subscriptionPlan || "free";
    const limits = getPlanLimits(plan);

    req.vendorSubscription = {
      plan,
      status: vendor.subscriptionStatus || "active",
      paymentStatus: vendor.subscriptionPaymentStatus || "pending",
      limits,
      nextDueDate: vendor.nextDueDate,
      gracePeriodEndsAt: vendor.gracePeriodEndsAt,
    };

    next();
  } catch (err) {
    next();
  }
}

// Enforce analytics max range based on plan
export function enforceAnalyticsRange(req, res, next) {
  try {
    const plan = req.vendorSubscription?.plan || "free";
    const limits = getPlanLimits(plan);
    const maxDays = limits.analyticsDays || 7;
    const requestedRange = parseInt(req.query.range, 10) || 7;

    if (requestedRange > maxDays) {
      return res.status(403).json({
        success: false,
        code: "ANALYTICS_RANGE_RESTRICTED",
        message: `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows analytics up to ${maxDays} days only. Please upgrade your plan for extended analytics.`,
        requestedRange,
        maxAllowedRange: maxDays,
        plan,
      });
    }

    next();
  } catch {
    next();
  }
}

// Run subscription status checks periodically (call from server startup)
export function startSubscriptionChecker(VendorModel) {
  // Check every 5 minutes
  setInterval(() => {
    checkSubscriptionStatus(VendorModel).catch((err) =>
      console.error("Subscription checker error:", err)
    );
  }, 5 * 60 * 1000);

  // Also run immediately
  checkSubscriptionStatus(VendorModel).catch((err) =>
    console.error("Subscription checker initial error:", err)
  );
}
