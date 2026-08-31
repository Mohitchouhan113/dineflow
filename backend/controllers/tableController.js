import QRCode from "qrcode";
import mongoose from "mongoose";
import Table from "../models/Table.js";

// CREATE TABLE
export const createTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;

    if (!tableNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Table number is required",
      });
    }

    const existingTable = await Table.findOne({
      vendorId: req.user.vendorId,
      tableNumber: tableNumber.trim(),
    });

    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: "Table already exists",
      });
    }

    const table = await Table.create({
      vendorId: req.user.vendorId,
      tableNumber: tableNumber.trim(),
    });

    // Frontend URL
    const qrUrl = `http://localhost:5173/menu/${req.user.vendorId}/${table._id}`;

    // QR image as base64 data URL
    const qrCode = await QRCode.toDataURL(qrUrl);

    table.qrUrl = qrUrl;
    table.qrCode = qrCode;

    await table.save();

    res.status(201).json({
      success: true,
      message: "Table created successfully",
      table,
    });
  } catch (error) {
    console.error("Create Table Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET ALL TABLES
export const getAllTables = async (req, res) => {
  try {
    const tables = await Table.find({
      vendorId: req.user.vendorId,
    }).sort({ tableNumber: 1 });

    res.status(200).json({
      success: true,
      count: tables.length,
      tables,
    });
  } catch (error) {
    console.error("Get Tables Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET SINGLE TABLE
export const getTableById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    res.status(200).json({
      success: true,
      table,
    });
  } catch (error) {
    console.error("Get Table Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// UPDATE TABLE
export const updateTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    if (tableNumber?.trim()) {
      const duplicate = await Table.findOne({
        vendorId: req.user.vendorId,
        tableNumber: tableNumber.trim(),
        _id: { $ne: table._id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Table number already exists",
        });
      }

      table.tableNumber = tableNumber.trim();
    }

    await table.save();

    res.status(200).json({
      success: true,
      message: "Table updated successfully",
      table,
    });
  } catch (error) {
    console.error("Update Table Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// TABLE ACTIVE / INACTIVE
export const updateTableStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    table.isActive = isActive;
    await table.save();

    res.status(200).json({
      success: true,
      message: isActive
        ? "Table activated successfully"
        : "Table deactivated successfully",
      table,
    });
  } catch (error) {
    console.error("Table Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};