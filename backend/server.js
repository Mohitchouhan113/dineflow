import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import chefRoutes from "./routes/chefRoutes.js";
import { startSubscriptionChecker } from "./middleware/subscriptionInfo.js";
import Vendor from "./models/Vendor.js";

dotenv.config();

connectDB();

// Start subscription status checker
startSubscriptionChecker(Vendor);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route + Health Check (used by uptime monitors to prevent cold starts)
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Restaurant Saas API is Running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/chef", chefRoutes);

// =============================================
// GLOBAL ERROR HANDLER (Express 5 requires this)
// Without it, unhandled errors DROP the connection
// =============================================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
});

// =============================================
// SOCKET.IO SETUP
// =============================================
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Expose io to controllers via req.app.get("io")
app.set("io", io);

// Socket connection handling
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join vendor-specific room
  socket.on("join-vendor-room", (vendorId) => {
    if (!vendorId) return;
    const roomId = `vendor:${String(vendorId)}`;
    socket.join(roomId);
    console.log(`[Socket] ${socket.id} joined ${roomId}`);
  });

  // Join chef room (same vendor room)
  socket.on("join-chef-room", (vendorId) => {
    if (!vendorId) return;
    const roomId = `vendor:${String(vendorId)}`;
    socket.join(roomId);
    console.log(`[Socket] Chef ${socket.id} joined ${roomId}`);
  });

  // Join order-specific room (for customer OrderSuccess page)
  socket.on("join-order-room", (orderId) => {
    if (!orderId) return;
    socket.join(`order:${orderId}`);
    console.log(`[Socket] ${socket.id} joined order:${orderId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready`);
});