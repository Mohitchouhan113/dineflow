import mongoose from "mongoose";

const subscriptionPlanChangeSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  previousPlan: {
    type: String,
    enum: ["free", "basic", "pro", "premium"],
    required: true,
  },
  newPlan: {
    type: String,
    enum: ["free", "basic", "pro", "premium"],
    required: true,
  },
  previousBillingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
  },
  newBillingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
  },
  previousAmount: {
    type: Number,
    default: 0,
  },
  newAmount: {
    type: Number,
    default: 0,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  changedByRole: {
    type: String,
    default: "superAdmin",
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: "",
  },
});

export default mongoose.model("SubscriptionPlanChange", subscriptionPlanChangeSchema);
