import express from "express";
import { getPublicMenu } from "../controllers/publicController.js";

import {
  placeOrder,
} from "../controllers/orderController.js";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/paymentController.js"; 

const router = express.Router();

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Public route working",
  });
});

router.get("/menu/:vendorId/:tableId", getPublicMenu);
router.post("/orders", placeOrder);

// Razorpay
router.post("/payments/create", createRazorpayOrder);

router.post("/payments/verify", verifyRazorpayPayment);


export default router;