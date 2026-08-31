import Category from "../models/Category.js";

// ==============================
// CREATE CATEGORY
// ==============================
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    if (!req.user.vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is not linked with this account",
      });
    }

    const existingCategory = await Category.findOne({
      vendorId: req.user.vendorId,
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      vendorId: req.user.vendorId,
      name: name.trim(),
      description: description?.trim() || "",
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// GET ALL CATEGORIES
// ==============================
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      vendorId: req.user.vendorId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// GET SINGLE CATEGORY
// ==============================
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// UPDATE CATEGORY
// ==============================
export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await Category.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name?.trim() && name.trim() !== category.name) {
      const duplicateCategory = await Category.findOne({
        vendorId: req.user.vendorId,
        name: name.trim(),
        _id: { $ne: category._id },
      });

      if (duplicateCategory) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }

      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// CATEGORY STATUS
// ==============================
export const updateCategoryStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const category = await Category.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = isActive;

    await category.save();

    res.status(200).json({
      success: true,
      message: isActive
        ? "Category activated successfully"
        : "Category deactivated successfully",
      category,
    });
  } catch (error) {
    console.error("Category Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};