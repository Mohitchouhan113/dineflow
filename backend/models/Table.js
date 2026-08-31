import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },

    qrCode: {
      type: String,
      default: "",
    },

    qrUrl: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

tableSchema.index(
  { vendorId: 1, tableNumber: 1 },
  { unique: true }
);

const Table = mongoose.model("Table", tableSchema);

export default Table;