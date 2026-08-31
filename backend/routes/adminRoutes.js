import express from "express";
import { createVendor, getAllVendors, getVendorById, updateVendor, updateVendorStatus, getAdminDashboard, getVendorDetail, getPayments, updateSubscriptionPayment, getAdminAnalytics, updateSubscriptionStatus, changeVendorPlan, getPlanChangeHistory } from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("superAdmin"));

// Dashboard
router.get("/dashboard", getAdminDashboard);

// Vendors
router.get("/vendors", getAllVendors);
router.get("/vendors/:id", getVendorById);
router.get("/vendors/:id/detail", getVendorDetail);
router.post("/vendors", createVendor);
router.put("/vendors/:id", updateVendor);
router.patch("/vendors/:id/status", updateVendorStatus);

// Subscription Payments
router.get("/payments", getPayments);
router.patch("/vendors/:id/subscription-payment", updateSubscriptionPayment);
router.patch("/vendors/:id/subscription-status", updateSubscriptionStatus);
router.patch("/vendors/:id/plan", changeVendorPlan);
router.get("/vendors/:id/plan-history", getPlanChangeHistory);

// Analytics
router.get("/analytics", getAdminAnalytics);

export default router;
