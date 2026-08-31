import mongoose from "mongoose";

import Vendor from "../models/Vendor.js";
import Table from "../models/Table.js";
import Category from "../models/Category.js";
import MenuItem from "../models/MenuItem.js";

// ==============================
// GET PUBLIC MENU
// ==============================
export const getPublicMenu = async (req, res) => {
  try {
    const { vendorId, tableId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    // Check vendor
    const vendor = await Vendor.findOne({
      _id: vendorId,
      isActive: true,
    }    ).select(
      "restaurantName phone address logo subscriptionPlan isActive subscriptionStatus isOpen openingTime closingTime"
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or inactive",
      });
    }

    // Check table belongs to same vendor
    const table = await Table.findOne({
      _id: tableId,
      vendorId,
      isActive: true,
    }).select("tableNumber isActive");

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found or inactive",
      });
    }

    // Get active categories
    const categories = await Category.find({
      vendorId,
      isActive: true,
    })
      .select("name description")
      .sort({ createdAt: 1 });

    // Get available menu items
    const menuItems = await MenuItem.find({
      vendorId,
      isActive: true,
      isAvailable: true,
    })
      .select(
        "categoryId name description price image foodType isAvailable"
      )
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,

      restaurant: {
        _id: vendor._id,
        name: vendor.restaurantName,
        phone: vendor.phone,
        address: vendor.address,
        logo: vendor.logo,
        subscriptionStatus: vendor.subscriptionStatus || "active",
        isOpen: vendor.isOpen !== false,
        openingTime: vendor.openingTime || "09:00",
        closingTime: vendor.closingTime || "23:00",
      },

      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
      },

      categories,

      menuItems,
    });
  } catch (error) {
    console.error("Public Menu Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};