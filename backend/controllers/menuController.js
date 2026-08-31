import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";
import Category from "../models/Category.js";
import cloudinary, {
  uploadToCloudinary,
} from "../config/cloudinary.js";


// ==============================
// CREATE MENU ITEM
// ==============================
export const createMenuItem = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      description,
      price,
      foodType,
    } = req.body;

    if (
      !categoryId ||
      !name?.trim() ||
      price === undefined ||
      !foodType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Category, name, price and food type are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    if (!["veg", "nonVeg"].includes(foodType)) {
      return res.status(400).json({
        success: false,
        message: "foodType must be veg or nonVeg",
      });
    }

    const numericPrice = Number(price);

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    const category = await Category.findOne({
      _id: categoryId,
      vendorId: req.user.vendorId,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Valid category not found",
      });
    }

   let imageUrl = "";
let imagePublicId = "";

// ==============================
// CLOUDINARY IMAGE UPLOAD
// ==============================
if (req.file) {

  console.log("FILE RECEIVED:", {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });

  console.log("Starting Cloudinary upload...");

  const uploadedImage = await uploadToCloudinary(
    req.file.buffer
  );

  console.log(
    "Cloudinary upload success:",
    uploadedImage.secure_url
  );

  imageUrl = uploadedImage.secure_url;
  imagePublicId = uploadedImage.public_id;
}
    const menuItem = await MenuItem.create({
      vendorId: req.user.vendorId,
      categoryId,
      name: name.trim(),
      description: description?.trim() || "",
      price: numericPrice,
      image: imageUrl,
      imagePublicId,
      foodType,
    });

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Create Menu Item Error:", error);

    res.status(500).json({
      success: false,
      message:
        error.message || "Server error",
    });
  }
};

// ==============================
// GET ALL MENU ITEMS
// ==============================
export const getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({
      vendorId: req.user.vendorId,
    })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: menuItems.length,
      menuItems,
    });
  } catch (error) {
    console.error("Get Menu Items Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// GET SINGLE MENU ITEM
// ==============================
export const getMenuItemById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    }).populate("categoryId", "name");

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.status(200).json({
      success: true,
      menuItem,
    });
  } catch (error) {
    console.error("Get Menu Item Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// UPDATE MENU ITEM
// ==============================
export const updateMenuItem = async (req, res) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(req.params.id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const {
      categoryId,
      name,
      description,
      price,
      foodType,
    } = req.body;

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    if (categoryId) {
      if (
        !mongoose.Types.ObjectId.isValid(categoryId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const category = await Category.findOne({
        _id: categoryId,
        vendorId: req.user.vendorId,
        isActive: true,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      menuItem.categoryId = categoryId;
    }

    if (name?.trim()) {
      menuItem.name = name.trim();
    }

    if (description !== undefined) {
      menuItem.description =
        description.trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (
        Number.isNaN(numericPrice) ||
        numericPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be valid",
        });
      }

      menuItem.price = numericPrice;
    }

    if (foodType !== undefined) {
      if (
        !["veg", "nonVeg"].includes(foodType)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "foodType must be veg or nonVeg",
        });
      }

      menuItem.foodType = foodType;
    }

    // NEW IMAGE UPLOAD
    if (req.file) {
      // delete previous Cloudinary image
      if (menuItem.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(
            menuItem.imagePublicId
          );
        } catch (deleteError) {
          console.error(
            "Old image delete error:",
            deleteError
          );
        }
      }

      const uploadedImage =
        await uploadToCloudinary(
          req.file.buffer
        );

      menuItem.image =
        uploadedImage.secure_url;

      menuItem.imagePublicId =
        uploadedImage.public_id;
    }

    await menuItem.save();

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Update Menu Item Error:", error);

    res.status(500).json({
      success: false,
      message:
        error.message || "Server error",
    });
  }
};

// ==============================
// UPDATE AVAILABILITY
// ==============================
export const updateMenuItemAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isAvailable must be true or false",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    menuItem.isAvailable = isAvailable;

    await menuItem.save();

    res.status(200).json({
      success: true,
      message: isAvailable
        ? "Menu item is now available"
        : "Menu item is now unavailable",
      menuItem,
    });
  } catch (error) {
    console.error("Availability Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};