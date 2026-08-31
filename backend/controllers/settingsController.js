import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

// =============================
// GET VENDOR SETTINGS
// =============================
export const getVendorSettings = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const user = await User.findById(req.user._id).select("name email");

    res.status(200).json({
      success: true,
      vendor: {
        _id: vendor._id,
        restaurantName: vendor.restaurantName,
        ownerName: user.name,
        email: user.email,
        phone: vendor.phone || "",
        city: vendor.city || "",
        address: vendor.address || "",
        isOpen: vendor.isOpen,
        openingTime: vendor.openingTime,
        closingTime: vendor.closingTime,
        gstPercentage: vendor.gstPercentage,
        serviceChargePercentage: vendor.serviceChargePercentage,
        minimumOrderAmount: vendor.minimumOrderAmount,
        acceptCash: vendor.acceptCash,
        acceptOnline: vendor.acceptOnline,
        subscriptionPlan: vendor.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error("Get Vendor Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =============================
// UPDATE VENDOR SETTINGS
// =============================
export const updateVendorSettings = async (req, res) => {
  try {
    const {
      restaurantName, ownerName, phone, city, address,
      isOpen, openingTime, closingTime,
      gstPercentage, serviceChargePercentage, minimumOrderAmount,
      acceptCash, acceptOnline,
    } = req.body;

    const vendor = await Vendor.findOne({ ownerId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Update vendor fields
    if (restaurantName !== undefined) vendor.restaurantName = restaurantName;
    if (phone !== undefined) vendor.phone = phone;
    if (city !== undefined) vendor.city = city;
    if (address !== undefined) vendor.address = address;
    if (isOpen !== undefined) vendor.isOpen = isOpen;
    if (openingTime !== undefined) vendor.openingTime = openingTime;
    if (closingTime !== undefined) vendor.closingTime = closingTime;
    if (gstPercentage !== undefined) vendor.gstPercentage = Number(gstPercentage);
    if (serviceChargePercentage !== undefined) vendor.serviceChargePercentage = Number(serviceChargePercentage);
    if (minimumOrderAmount !== undefined) vendor.minimumOrderAmount = Number(minimumOrderAmount);
    if (acceptCash !== undefined) vendor.acceptCash = acceptCash;
    if (acceptOnline !== undefined) vendor.acceptOnline = acceptOnline;

    await vendor.save();

    // Update owner name if changed
    if (ownerName !== undefined) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.name = ownerName;
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      vendor: {
        _id: vendor._id,
        restaurantName: vendor.restaurantName,
        ownerName: ownerName || (await User.findById(req.user._id).select("name")).name,
        email: (await User.findById(req.user._id).select("email")).email,
        phone: vendor.phone,
        city: vendor.city,
        address: vendor.address,
        isOpen: vendor.isOpen,
        openingTime: vendor.openingTime,
        closingTime: vendor.closingTime,
        gstPercentage: vendor.gstPercentage,
        serviceChargePercentage: vendor.serviceChargePercentage,
        minimumOrderAmount: vendor.minimumOrderAmount,
        acceptCash: vendor.acceptCash,
        acceptOnline: vendor.acceptOnline,
      },
    });
  } catch (error) {
    console.error("Update Vendor Settings Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =============================
// GET VENDOR PUBLIC INFO (for sidebar/dashboard)
// =============================
export const getVendorPublicInfo = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user._id }).select(
      "restaurantName city isOpen phone"
    );
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const user = await User.findById(req.user._id).select("name");
    res.status(200).json({
      success: true,
      restaurantName: vendor.restaurantName,
      city: vendor.city || "",
      isOpen: vendor.isOpen,
      ownerName: user?.name || "",
    });
  } catch (error) {
    console.error("Get Vendor Public Info Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =============================
// CHANGE PASSWORD
// =============================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
