import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
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

// Same vendor ke andar duplicate category name avoid karne ke liye
categorySchema.index(
  { vendorId: 1, name: 1 },
  { unique: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;