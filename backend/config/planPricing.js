// Centralized plan pricing + feature limits — single source of truth
const PLAN_PRICING = {
  free:    { monthly: 0,    yearly: 0 },
  basic:   { monthly: 499,  yearly: 4999 },
  pro:     { monthly: 999,  yearly: 9999 },
  premium: { monthly: 1999, yearly: 19999 },
};

// null = unlimited
const PLAN_LIMITS = {
  free:    { menuItems: 5,   categories: 3,   chefs: 1,   tables: 5,   analyticsDays: 7,   qrOrdering: false, onlinePayments: false },
  basic:   { menuItems: 25,  categories: 8,   chefs: 2,   tables: 10,  analyticsDays: 7,   qrOrdering: true,  onlinePayments: true },
  pro:     { menuItems: 100, categories: 25,  chefs: 10,  tables: 50,  analyticsDays: 90,  qrOrdering: true,  onlinePayments: true },
  premium: { menuItems: null, categories: null, chefs: null, tables: null, analyticsDays: 365, qrOrdering: true, onlinePayments: true },
};

const GRACE_PERIOD_DAYS = 7;

export const getPlanAmount = (plan, cycle) => {
  const p = PLAN_PRICING[plan];
  if (!p) return 0;
  return p[cycle] || 0;
};

export const getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

// Check if a resource count is within plan limit
export const isWithinLimit = (plan, resource, currentCount) => {
  const limits = getPlanLimits(plan);
  const limit = limits[resource];
  if (limit === null || limit === undefined) return true; // null = unlimited
  return currentCount < limit;
};

// Get max allowed for a resource (null = unlimited)
export const getMaxAllowed = (plan, resource) => {
  const limits = getPlanLimits(plan);
  return limits[resource] ?? null;
};

// Check and update subscription status based on dates
export const checkSubscriptionStatus = async (Vendor) => {
  const now = new Date();
  const vendors = await Vendor.find({
    subscriptionPaymentStatus: { $in: ["pending", "overdue"] },
    nextDueDate: { $ne: null },
  });

  for (const vendor of vendors) {
    let updated = false;
    const nextDue = new Date(vendor.nextDueDate);
    const overdueDays = Math.floor((now - nextDue) / (1000 * 60 * 60 * 24));

    if (overdueDays > 0) {
      if (vendor.subscriptionPaymentStatus !== "overdue") {
        vendor.subscriptionPaymentStatus = "overdue";
        updated = true;
      }

      if (overdueDays <= GRACE_PERIOD_DAYS) {
        if (vendor.subscriptionStatus !== "grace") {
          vendor.subscriptionStatus = "grace";
          updated = true;
        }
      } else {
        if (vendor.subscriptionStatus !== "restricted") {
          vendor.subscriptionStatus = "restricted";
          vendor.gracePeriodEndsAt = new Date(nextDue.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
          updated = true;
        }
      }
    }

    if (updated) {
      await vendor.save();
    }
  }
};

export { PLAN_LIMITS, GRACE_PERIOD_DAYS };
export default PLAN_PRICING;
