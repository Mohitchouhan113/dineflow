import bcrypt from "bcryptjs";
import User from "../models/User.js";

// ==============================
// CREATE CHEF
// ==============================
export const createChef = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const chef = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "chef",
      vendorId: req.user.vendorId,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Chef created successfully",
      chef: {
        _id: chef._id,
        name: chef.name,
        email: chef.email,
        role: chef.role,
        vendorId: chef.vendorId,
        isActive: chef.isActive,
      },
    });
  } catch (error) {
    console.error("Create Chef Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// GET ALL CHEFS
// ==============================
export const getAllChefs = async (req, res) => {
  try {
    const chefs = await User.find({
      role: "chef",
      vendorId: req.user.vendorId,
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: chefs.length,
      chefs,
    });
  } catch (error) {
    console.error("Get Chefs Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// GET SINGLE CHEF
// ==============================
export const getChefById = async (req, res) => {
  try {
    const chef = await User.findOne({
      _id: req.params.id,
      role: "chef",
      vendorId: req.user.vendorId,
    }).select("-password");

    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    res.status(200).json({
      success: true,
      chef,
    });
  } catch (error) {
    console.error("Get Chef Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// UPDATE CHEF
// ==============================
export const updateChef = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const chef = await User.findOne({
      _id: req.params.id,
      role: "chef",
      vendorId: req.user.vendorId,
    });

    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    if (name) {
      chef.name = name;
    }

    if (email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: chef._id },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }

      chef.email = email.toLowerCase();
    }

    if (password) {
      chef.password = await bcrypt.hash(password, 10);
    }

    await chef.save();

    res.status(200).json({
      success: true,
      message: "Chef updated successfully",
      chef: {
        _id: chef._id,
        name: chef.name,
        email: chef.email,
        role: chef.role,
        vendorId: chef.vendorId,
        isActive: chef.isActive,
      },
    });
  } catch (error) {
    console.error("Update Chef Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// ACTIVATE / DEACTIVATE CHEF
// ==============================
export const updateChefStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const chef = await User.findOne({
      _id: req.params.id,
      role: "chef",
      vendorId: req.user.vendorId,
    });

    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    chef.isActive = isActive;

    await chef.save();

    res.status(200).json({
      success: true,
      message: isActive
        ? "Chef activated successfully"
        : "Chef deactivated successfully",
      chef: {
        _id: chef._id,
        name: chef.name,
        email: chef.email,
        isActive: chef.isActive,
      },
    });
  } catch (error) {
    console.error("Chef Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};