import express from "express";

import {
  createChef,
  getAllChefs,
  getChefById,
  updateChef,
  updateChefStatus,
} from "../controllers/vendorController.js";

import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
} from "../controllers/categoryController.js";

import {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  updateMenuItemAvailability,
} from "../controllers/menuController.js";

import {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  updateTableStatus,
  regenerateQR,
} from "../controllers/tableController.js";

import upload from "../middleware/uploadMiddleware.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

import { getVendorOrders, getActiveOrderForTable, updatePaymentStatus, getDashboardSummary, getVendorAnalytics } from "../controllers/orderController.js";
import { getVendorSettings, updateVendorSettings, getVendorPublicInfo, changePassword } from "../controllers/settingsController.js";
import { getBillingInfo, createSubscriptionOrder, verifySubscriptionPayment, getSubscriptionStatus, getSubscriptionUsage } from "../controllers/billingController.js";
import { enforcePlanLimit, checkRestricted } from "../middleware/subscriptionGuard.js";
import { attachSubscriptionInfo, enforceAnalyticsRange } from "../middleware/subscriptionInfo.js";

const router = express.Router();

// Vendor Admin only
router.use(protect);
router.use(authorizeRoles("vendorAdmin"));
router.use(attachSubscriptionInfo);

router.post("/chefs", enforcePlanLimit("chefs"), createChef);

router.get("/chefs", getAllChefs);

router.get("/chefs/:id", getChefById);

router.put("/chefs/:id", updateChef);

router.patch("/chefs/:id/status", updateChefStatus);

// ==============================
// CATEGORY ROUTES
// ==============================

router.post("/categories", enforcePlanLimit("categories"), createCategory);

router.get("/categories", getAllCategories);

router.get("/categories/:id", getCategoryById);

router.put("/categories/:id", updateCategory);

router.patch(
  "/categories/:id/status",
  updateCategoryStatus
);

// ==============================
// MENU ROUTES
// ==============================

router.post(
  "/menu-items",
  enforcePlanLimit("menuItems"),
  upload.single("image"),
  createMenuItem
);

router.get("/menu-items", getAllMenuItems);

router.get("/menu-items/:id", getMenuItemById);

router.put(
  "/menu-items/:id",
  upload.single("image"),
  updateMenuItem
);

router.patch(
  "/menu-items/:id/availability",
  updateMenuItemAvailability
);


// ==============================
// DASHBOARD
// ==============================
router.get("/dashboard/summary", getDashboardSummary);
router.get("/analytics", enforceAnalyticsRange, getVendorAnalytics);

// ==============================
// ORDER ROUTES
// ==============================
router.get("/orders", getVendorOrders);
router.patch("/orders/:id/payment-status", updatePaymentStatus);
router.get("/tables/:tableId/active-order", getActiveOrderForTable);

// ==============================
// SETTINGS ROUTES
// ==============================
router.get("/settings", getVendorSettings);
router.put("/settings", updateVendorSettings);
router.get("/info", getVendorPublicInfo);
router.put("/change-password", changePassword);

// ==============================
// BILLING & SUBSCRIPTION ROUTES
// ==============================
router.get("/billing", getBillingInfo);
router.post("/subscription/create-order", createSubscriptionOrder);
router.post("/subscription/verify-payment", verifySubscriptionPayment);
router.get("/subscription/status", getSubscriptionStatus);
router.get("/subscription/usage", getSubscriptionUsage);

//table
router.post("/tables", enforcePlanLimit("tables"), createTable);

router.get("/tables", getAllTables);

router.get("/tables/:id", getTableById);

router.put("/tables/:id", updateTable);

router.patch("/tables/:id/status", updateTableStatus);
router.post("/tables/:id/regenerate-qr", regenerateQR);

export default router;