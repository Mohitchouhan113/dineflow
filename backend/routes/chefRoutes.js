import express from "express";

import {
  getChefOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

import {
  authorizeRoles,
} from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router.use(authorizeRoles("chef"));

router.get("/orders", getChefOrders);

router.patch(
  "/orders/:id/status",
  updateOrderStatus
);

export default router;