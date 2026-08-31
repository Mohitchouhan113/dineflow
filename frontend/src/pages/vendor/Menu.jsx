import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Search,
  Filter,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "../../components/ui/Card";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

import api from "../../api/axios";
import { getFoodImage } from "../../utils/getFoodImage";
import useSubscriptionLimits from '../../hooks/useSubscriptionLimits';


export default function Menu() {
  const { isAtLimit, getUsage, isRestricted } = useSubscriptionLimits();
  // ========================================
  // URL SEARCH PARAMS
  // ========================================

  const [searchParams, setSearchParams] = useSearchParams();

  // ========================================
  // DATA
  // ========================================

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  // ========================================
  // MODAL
  // ========================================

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState(null);

  // ========================================
  // SEARCH — synced with URL ?search= param
  // ========================================

  const searchQuery = searchParams.get("search") || "";

  const setSearchQuery = (value) => {
    if (value.trim()) {
      setSearchParams({ search: value.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // ========================================
  // FILTERS
  // ========================================

  const [filters, setFilters] = useState({
    category: "all",
    foodType: "all",
    availability: "all",
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Helper: safely extract categoryId._id
  const getCategoryId = (item) =>
    typeof item.categoryId === "object"
      ? item.categoryId?._id
      : item.categoryId;

  // Count active filters
  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.foodType !== "all" ? 1 : 0) +
    (filters.availability !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      category: "all",
      foodType: "all",
      availability: "all",
    });
    setShowFilterPanel(false);
  };

  // Close filter panel when clicking outside
  const filterRef = React.useRef(null);

  React.useEffect(() => {
    if (!showFilterPanel) return;
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterPanel]);

  // ========================================
  // IMAGE
  // ========================================

  const [imageFile, setImageFile] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  // ========================================
  // FORM
  // ========================================

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    foodType: "veg",
  });

  // ========================================
  // FETCH DATA
  // ========================================

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [itemsRes, categoryRes] =
        await Promise.all([
          api.get("/api/vendor/menu-items"),
          api.get("/api/vendor/categories"),
        ]);

      console.log(
        "MENU ITEMS RESPONSE:",
        itemsRes.data
      );

      console.log(
        "CATEGORY RESPONSE:",
        categoryRes.data
      );

      // Backend:
      // {
      //   success: true,
      //   count: x,
      //   menuItems: [...]
      // }

      const menuItemList =
        Array.isArray(itemsRes.data)
          ? itemsRes.data
          : Array.isArray(
              itemsRes.data?.menuItems
            )
          ? itemsRes.data.menuItems
          : [];

      // Backend:
      // {
      //   success: true,
      //   categories: [...]
      // }

      const categoryList =
        Array.isArray(categoryRes.data)
          ? categoryRes.data
          : Array.isArray(
              categoryRes.data?.categories
            )
          ? categoryRes.data.categories
          : [];

      setItems(menuItemList);
      setCategories(categoryList);
    } catch (err) {
      console.error(
        "Fetch menu data error:",
        err.response?.data || err.message
      );

      setItems([]);
      setCategories([]);

      setError(
        err.response?.data?.message ||
          "Failed to load menu data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ========================================
  // OPEN CREATE / EDIT MODAL
  // ========================================

  const openModal = (item = null) => {
    setError("");
    setImageFile(null);

    if (item) {
      setEditingItem(item);

      const categoryId =
        typeof item.categoryId === "object"
          ? item.categoryId?._id
          : item.categoryId;

      setFormData({
        name: item.name || "",
        description: item.description || "",
        price: item.price || "",
        categoryId: categoryId || "",
        foodType: item.foodType || "veg",
      });

      setImagePreview(item.image || "");
    } else {
      setEditingItem(null);

      setFormData({
        name: "",
        description: "",
        price: "",
        categoryId:
          categories[0]?._id || "",
        foodType: "veg",
      });

      setImagePreview("");
    }

    setIsModalOpen(true);
  };

  // ========================================
  // CLOSE MODAL
  // ========================================

  const closeModal = () => {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  // ========================================
  // IMAGE CHANGE
  // ========================================

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Only JPG, JPEG, PNG and WEBP images are allowed"
      );

      e.target.value = "";
      return;
    }

    // 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");

      e.target.value = "";
      return;
    }

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // ========================================
  // REMOVE SELECTED IMAGE
  // ========================================

  const removeSelectedImage = () => {
    setImageFile(null);

    // Editing item ho to existing image wapas
    if (editingItem?.image) {
      setImagePreview(editingItem.image);
    } else {
      setImagePreview("");
    }
  };

  // ========================================
  // CREATE / UPDATE MENU ITEM
  // ========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return;

    try {
      setIsSaving(true);
      setError("");

      if (!formData.name.trim()) {
        setError("Item name is required");
        return;
      }

      if (!formData.categoryId) {
        setError("Category is required");
        return;
      }

      if (
        formData.price === "" ||
        Number(formData.price) < 0
      ) {
        setError("Valid price is required");
        return;
      }

      const data = new FormData();

      // IMPORTANT:
      // Backend expects these exact names

      data.append(
        "name",
        formData.name.trim()
      );

      data.append(
        "description",
        formData.description.trim()
      );

      data.append(
        "price",
        String(formData.price)
      );

      data.append(
        "categoryId",
        formData.categoryId
      );

      data.append(
        "foodType",
        formData.foodType
      );

      // Actual file
      if (imageFile) {
        data.append(
          "image",
          imageFile
        );
      }

      if (editingItem) {
        await api.put(
          `/api/vendor/menu-items/${editingItem._id}`,
          data
        );
      } else {
        await api.post(
          "/api/vendor/menu-items",
          data
        );
      }

      closeModal();

      await fetchData();
    } catch (err) {
      console.error(
        "Save Menu Item Error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Failed to save menu item"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================
  // TOGGLE AVAILABILITY
  // ========================================

  const toggleAvailability = async (
    id,
    currentStatus
  ) => {
    try {
      await api.patch(
        `/api/vendor/menu-items/${id}/availability`,
        {
          isAvailable:
            currentStatus === false,
        }
      );

      await fetchData();
    } catch (err) {
      console.error(
        "Availability Error:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          "Failed to update availability"
      );
    }
  };

  // ========================================
  // CATEGORY NAME
  // ========================================

  const getCategoryName = (item) => {
    if (
      typeof item.categoryId === "object" &&
      item.categoryId?.name
    ) {
      return item.categoryId.name;
    }

    const categoryId =
      typeof item.categoryId === "object"
        ? item.categoryId?._id
        : item.categoryId;

    return (
      categories.find(
        (category) =>
          String(category._id) ===
          String(categoryId)
      )?.name || "Uncategorized"
    );
  };

  // ========================================
  // SEARCH + FILTERS
  // ========================================

  const filteredItems =
    Array.isArray(items)
      ? items.filter((item) => {
          // Search filter
          const matchesSearch = !searchQuery.trim() ||
            item.name
              ?.toLowerCase()
              .includes(searchQuery.trim().toLowerCase());

          // Category filter
          const matchesCategory =
            filters.category === "all" ||
            String(getCategoryId(item)) === String(filters.category);

          // Food type filter
          const matchesFoodType =
            filters.foodType === "all" ||
            item.foodType === filters.foodType;

          // Availability filter
          const matchesAvailability =
            filters.availability === "all" ||
            (filters.availability === "available" && item.isAvailable !== false) ||
            (filters.availability === "unavailable" && item.isAvailable === false);

          return matchesSearch && matchesCategory && matchesFoodType && matchesAvailability;
        })
      : [];

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-6">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Menu Items
          </h1>

          <p className="text-text-secondary text-sm">
            Manage your restaurant offerings.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => { if (!isAtLimit('menuItems') && !isRestricted) openModal(); }}
            variant="primary"
            className="gap-2 shrink-0"
            disabled={isAtLimit('menuItems') || isRestricted}
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
          {isAtLimit('menuItems') && <span className="text-[10px] text-red-400 font-medium">Menu limit reached ({getUsage('menuItems').current}/{getUsage('menuItems').limit})</span>}
        </div>
      </div>

      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {error && !isModalOpen && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* SEARCH */}
      {/* ================================= */}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />

          <Input
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            placeholder="Search menu items..."
            className="pl-10"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-[10px] font-bold text-background min-w-[18px] text-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {showFilterPanel && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-xl z-50 p-4 space-y-4">
              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="flex h-9 w-full rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Food Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Food Type</label>
                <div className="flex gap-2">
                  {["all", "veg", "nonVeg"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilters({...filters, foodType: type})}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        filters.foodType === type
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {type === "all" ? "All" : type === "veg" ? "Veg" : "Non-Veg"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Availability</label>
                <div className="flex gap-2">
                  {["all", "available", "unavailable"].map((avail) => (
                    <button
                      key={avail}
                      onClick={() => setFilters({...filters, availability: avail})}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        filters.availability === avail
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {avail === "all" ? "All" : avail === "available" ? "In Stock" : "Out of Stock"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <button
                  onClick={clearFilters}
                  className="text-xs text-text-muted hover:text-primary transition-colors font-medium"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================= */}
      {/* MENU GRID */}
      {/* ================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-text-muted">
            Loading menu items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-16 text-center text-text-muted">
            {activeFilterCount > 0 || searchQuery.trim()
              ? "No items match your search or filters."
              : "No menu items found."
            }
          </div>
        ) : (
          filteredItems.map(
            (item, index) => (
              <motion.div
                key={item._id}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.3,
                  delay:
                    index * 0.05,
                }}
              >
                <Card className="h-full border-border/50 hover:border-primary/30 transition-all group flex flex-col overflow-hidden">
                  <CardContent className="p-0 flex-1 flex flex-col">

                    {/* ===================== */}
                    {/* IMAGE */}
                    {/* ===================== */}

                    <div className="h-44 bg-surface-elevated relative overflow-hidden">

                      <img
                        src={getFoodImage(item)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/food-images/default-food.jpg";
                        }}
                      />

                      {/* FOOD TYPE */}

                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-background/90 backdrop-blur-md shadow-sm border border-border/50">
                        {item.foodType ===
                        "veg" ? (
                          <span className="text-success">
                            Veg
                          </span>
                        ) : (
                          <span className="text-red-500">
                            Non-Veg
                          </span>
                        )}
                      </div>

                      {/* EDIT */}

                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() =>
                            openModal(item)
                          }
                          className="p-2 rounded-lg bg-background/90 text-text-secondary hover:text-primary backdrop-blur-md shadow-sm border border-border/50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* ===================== */}
                    {/* CARD CONTENT */}
                    {/* ===================== */}

                    <div className="p-4 flex-1 flex flex-col">

                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-semibold text-text-primary leading-tight">
                          {item.name}
                        </h3>

                        <span className="font-bold text-primary shrink-0">
                          ₹{item.price}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted mb-4 line-clamp-2">
                        {item.description ||
                          "No description"}
                      </p>

                      {/* CATEGORY + AVAILABILITY */}

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50 gap-3">

                        <span className="text-xs text-text-secondary truncate">
                          {getCategoryName(
                            item
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            toggleAvailability(
                              item._id,
                              item.isAvailable
                            )
                          }
                          className={`text-xs font-medium px-2.5 py-1 rounded transition-colors shrink-0 ${
                            item.isAvailable !==
                            false
                              ? "bg-success/10 text-success hover:bg-success/20"
                              : "bg-surface-elevated text-text-muted hover:text-text-primary"
                          }`}
                        >
                          {item.isAvailable !==
                          false
                            ? "Available"
                            : "Unavailable"}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          )
        )}
      </div>

      {/* ================================= */}
      {/* ADD / EDIT MODAL */}
      {/* ================================= */}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          editingItem
            ? "Edit Menu Item"
            : "Add Menu Item"
        }
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* MODAL ERROR */}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* ============================= */}
          {/* NAME + PRICE */}
          {/* ============================= */}

          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-1.5 col-span-2 sm:col-span-1">

              <label className="text-sm font-medium text-text-primary">
                Name
              </label>

              <Input
                required
                disabled={isSaving}
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name:
                      e.target.value,
                  })
                }
                placeholder="Paneer Tikka Pizza"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">

              <label className="text-sm font-medium text-text-primary">
                Price (₹)
              </label>

              <Input
                required
                type="number"
                min="0"
                step="0.01"
                disabled={isSaving}
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price:
                      e.target.value,
                  })
                }
                placeholder="299"
              />
            </div>
          </div>

          {/* ============================= */}
          {/* DESCRIPTION */}
          {/* ============================= */}

          <div className="space-y-1.5">

            <label className="text-sm font-medium text-text-primary">
              Description
            </label>

            <textarea
              disabled={isSaving}
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent min-h-[90px] resize-none"
              value={
                formData.description
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description:
                    e.target.value,
                })
              }
              placeholder="Freshly prepared delicious food..."
            />
          </div>

          {/* ============================= */}
          {/* CATEGORY + TYPE */}
          {/* ============================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* CATEGORY */}

            <div className="space-y-1.5">

              <label className="text-sm font-medium text-text-primary">
                Category
              </label>

              <select
                required
                disabled={isSaving}
                value={
                  formData.categoryId
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    categoryId:
                      e.target.value,
                  })
                }
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">
                  Select category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category._id
                      }
                      value={
                        category._id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* FOOD TYPE */}

            <div className="space-y-1.5">

              <label className="text-sm font-medium text-text-primary">
                Type
              </label>

              <select
                disabled={isSaving}
                value={
                  formData.foodType
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foodType:
                      e.target.value,
                  })
                }
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="veg">
                  Vegetarian
                </option>

                <option value="nonVeg">
                  Non-Vegetarian
                </option>
              </select>
            </div>
          </div>

          {/* ============================= */}
          {/* IMAGE UPLOAD */}
          {/* ============================= */}

          <div className="space-y-3">

            <label className="text-sm font-medium text-text-primary">
              Food Image
            </label>

            {/* UPLOAD BOX */}

            <label
              className={`
                flex flex-col items-center justify-center
                border-2 border-dashed border-border
                rounded-xl p-5
                cursor-pointer
                hover:border-primary/50
                hover:bg-primary/5
                transition-all
                ${
                  isSaving
                    ? "opacity-50 pointer-events-none"
                    : ""
                }
              `}
            >
              <Upload className="w-6 h-6 text-primary mb-2" />

              <span className="text-sm font-medium text-text-primary">
                Choose food image
              </span>

              <span className="text-xs text-text-muted mt-1">
                JPG, PNG or WEBP
                up to 5MB
              </span>

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={
                  handleImageChange
                }
                className="hidden"
              />
            </label>

            {/* IMAGE PREVIEW */}

            {imagePreview && (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border bg-surface-elevated">

                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-full object-cover"
                />

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={
                    removeSelectedImage
                  }
                  className="
                    absolute
                    top-3
                    right-3
                    w-8
                    h-8
                    rounded-full
                    bg-black/70
                    hover:bg-black
                    text-white
                    flex
                    items-center
                    justify-center
                    transition-colors
                  "
                >
                  <X className="w-4 h-4" />
                </button>

                {imageFile && (
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    {
                      imageFile.name
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================= */}
          {/* ACTIONS */}
          {/* ============================= */}

          <div className="pt-4 flex justify-end gap-3">

            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={closeModal}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
            >
              {isSaving
                ? "Uploading..."
                : editingItem
                ? "Update Item"
                : "Save Item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}