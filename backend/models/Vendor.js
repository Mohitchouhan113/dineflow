import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    logo: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    openingTime: {
      type: String,
      default: "09:00",
    },

    closingTime: {
      type: String,
      default: "23:00",
    },

    gstPercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 50,
    },

    serviceChargePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    acceptCash: {
      type: Boolean,
      default: true,
    },

    acceptOnline: {
      type: Boolean,
      default: true,
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "basic", "pro", "premium"],
      default: "free",
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    nextDueDate: {
      type: Date,
      default: null,
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "trial", "grace", "restricted"],
      default: "active",
    },

    subscriptionPaymentStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },

    subscriptionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    subscriptionStartDate: {
      type: Date,
      default: null,
    },

    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    lastPaymentDate: {
      type: Date,
      default: null,
    },

    gracePeriodEndsAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;