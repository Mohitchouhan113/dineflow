import React, {
  useState,
  useEffect,
  useRef,
} from "react";

import {
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  Search,
  ShoppingBag,
  X,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  ChevronRight,
} from "lucide-react";

import {
  getPublicMenu,
  placeOrder,
  createPayment,
  verifyPayment,
} from "../../api/publicApi";

import { getFoodImage } from "../../utils/getFoodImage";

export default function PublicMenu() {
  const { vendorId, tableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isVendorPreview = location.state?.fromVendor === true;

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [restaurant, setRestaurant] =
    useState(null);

  const [table, setTable] =
    useState(null);

  const [categories, setCategories] =
    useState([]);

  const [menuItems, setMenuItems] =
    useState([]);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [activeCategory, setActiveCategory] =
    useState("");

  // ==============================
  // CART
  // ==============================
  const [cart, setCart] =
    useState({});

  const [isCartOpen, setIsCartOpen] =
    useState(false);

  const [customerNote, setCustomerNote] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("online");

  const [isCheckingOut, setIsCheckingOut] =
    useState(false);

  const categoryRefs = useRef({});

  // ==============================
  // LOAD PUBLIC MENU
  // ==============================
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await getPublicMenu(
          vendorId,
          tableId
        );

        console.log(
          "PUBLIC MENU RESPONSE:",
          res.data
        );

        const data = res.data;

        // Restaurant
        setRestaurant(
          data.restaurant ||
            data.vendor || {
              name: "Restaurant",
            }
        );

        // Table
        setTable(
          data.table || {
            tableNumber: "Unknown",
          }
        );

        // =================================
        // FORMAT 1:
        // categories + menuItems
        // =================================
        if (Array.isArray(data.categories)) {
          const fetchedCategories =
            data.categories;

          setCategories(
            fetchedCategories
          );

          setMenuItems(
            Array.isArray(data.menuItems)
              ? data.menuItems
              : []
          );

          if (
            fetchedCategories.length > 0
          ) {
            setActiveCategory(
              fetchedCategories[0]._id
            );
          }

          return;
        }

        // =================================
        // FORMAT 2:
        // grouped menu
        // =================================
        if (Array.isArray(data.menu)) {
          const groupedCategories =
            data.menu.map((category) => ({
              _id: category._id,
              name: category.name,
              description:
                category.description,
            }));

          const groupedItems =
            data.menu.flatMap(
              (category) =>
                (
                  category.items || []
                ).map((item) => ({
                  ...item,

                  categoryId:
                    item.categoryId ||
                    category._id,
                }))
            );

          setCategories(
            groupedCategories
          );

          setMenuItems(
            groupedItems
          );

          if (
            groupedCategories.length > 0
          ) {
            setActiveCategory(
              groupedCategories[0]._id
            );
          }

          return;
        }

        setCategories([]);
        setMenuItems([]);
      } catch (err) {
        console.error(
          "Public Menu Error:",
          err.response?.data ||
            err.message
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to load menu. Invalid QR code or inactive table."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [vendorId, tableId]);

  // ==============================
  // CART QUANTITY
  // ==============================
  const updateQuantity = (
    item,
    delta
  ) => {
    setCart((prev) => {
      const current =
        prev[item._id]?.quantity ||
        0;

      const next = Math.max(
        0,
        current + delta
      );

      const newCart = {
        ...prev,
      };

      if (next === 0) {
        delete newCart[item._id];
      } else {
        newCart[item._id] = {
          item,
          quantity: next,
        };
      }

      return newCart;
    });
  };

  // ==============================
  // CART TOTAL
  // ==============================
  const cartTotal =
    Object.values(cart).reduce(
      (
        sum,
        { item, quantity }
      ) =>
        sum +
        Number(item.price || 0) *
          quantity,
      0
    );

  const cartCount =
    Object.values(cart).reduce(
      (sum, { quantity }) =>
        sum + quantity,
      0
    );

  // ==============================
  // CATEGORY SCROLL
  // ==============================
  const scrollToCategory = (
    categoryId
  ) => {
    setActiveCategory(
      categoryId
    );

    categoryRefs.current[
      categoryId
    ]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ==============================
  // RAZORPAY SCRIPT
  // ==============================
  const loadRazorpayScript =
    () => {
      return new Promise(
        (resolve) => {
          if (
            window.Razorpay
          ) {
            resolve(true);
            return;
          }

          const script =
            document.createElement(
              "script"
            );

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.onload =
            () =>
              resolve(true);

          script.onerror =
            () =>
              resolve(false);

          document.body.appendChild(
            script
          );
        }
      );
    };

  // ==============================
  // CHECKOUT
  // ==============================
  const handleCheckout =
    async () => {
      if (
        cartCount === 0 ||
        isCheckingOut
      ) {
        return;
      }

      try {
        setIsCheckingOut(true);

        const items =
          Object.values(
            cart
          ).map(
            ({
              item,
              quantity,
            }) => ({
              menuItemId:
                item._id,

              quantity,
            })
          );

        // ========================
        // CREATE INTERNAL ORDER
        // ========================
        const orderRes =
          await placeOrder({
            vendorId,
            tableId,
            items,
            paymentMethod,
            customerNote:
              customerNote.trim(),
          });

        const order =
          orderRes.data.order ||
          orderRes.data;

        // ========================
        // CASH PAYMENT
        // ========================
        if (
          paymentMethod ===
          "cash"
        ) {
          setCart({});

          navigate(
            "/order-success",
            {
              state: {
                order,
                table,
                restaurant,
                status:
                  order.orderStatus ||
                  "pending",

                method:
                  "Cash",
              },
            }
          );

          return;
        }

        // ========================
        // ONLINE PAYMENT
        // ========================
        const scriptLoaded =
          await loadRazorpayScript();

        if (!scriptLoaded) {
          alert(
            "Unable to load Razorpay. Please check your internet connection."
          );

          setIsCheckingOut(
            false
          );

          return;
        }

        const paymentRes =
          await createPayment({
            orderId:
              order._id,
          });

        const {
          key,
          razorpayOrderId,
          amount,
          currency,
        } =
          paymentRes.data
            .payment;

        const options = {
          key,

          amount,

          currency,

          name:
            restaurant?.name ||
            "DineFlow",

          description: `Order at Table ${
            table?.tableNumber ||
            ""
          }`,

          order_id:
            razorpayOrderId,

          theme: {
            color:
              "#F59E0B",
          },

          handler:
            async (
              response
            ) => {
              try {
                setIsCheckingOut(
                  true
                );

                await verifyPayment({
                  orderId:
                    order._id,

                  razorpay_order_id:
                    response.razorpay_order_id,

                  razorpay_payment_id:
                    response.razorpay_payment_id,

                  razorpay_signature:
                    response.razorpay_signature,
                });

                setCart({});

                navigate(
                  "/order-success",
                  {
                    state: {
                      order: {
                        ...order,
                        paymentStatus:
                          "paid",
                      },

                      table,
                      restaurant,

                      status:
                        order.orderStatus ||
                        "pending",

                      method:
                        "Online",
                    },
                  }
                );
              } catch (
                err
              ) {
                console.error(
                  "Payment verification error:",
                  err
                );

                alert(
                  err.response
                    ?.data
                    ?.message ||
                    "Payment verification failed. Please contact staff."
                );

                setIsCheckingOut(
                  false
                );
              }
            },

          modal: {
            ondismiss:
              function () {
                setIsCheckingOut(
                  false
                );
              },
          },
        };

        const razorpay =
          new window.Razorpay(
            options
          );

        razorpay.open();
      } catch (err) {
        console.error(
          "Checkout Error:",
          err.response?.data ||
            err.message
        );

        alert(
          err.response?.data
            ?.message ||
            "Failed to place order. Please try again."
        );

        setIsCheckingOut(
          false
        );
      }
    };

  // ==============================
  // THEME
  // ==============================
  const theme =
    "bg-[#FDFBF7] text-[#2C2825] font-sans selection:bg-amber-200 selection:text-amber-900";

  // ==============================
  // LOADING
  // ==============================
  if (isLoading) {
    return (
      <div
        className={`min-h-screen ${theme} flex flex-col items-center justify-center`}
      >
        <div className="w-12 h-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin mb-4" />

        <p className="text-[#5C5549] font-medium">
          Preparing your
          menu...
        </p>
      </div>
    );
  }

  // ==============================
  // ERROR
  // ==============================
  if (error) {
    return (
      <div
        className={`min-h-screen ${theme} flex flex-col items-center justify-center p-6 text-center`}
      >
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold mb-2">
          Oops!
        </h2>

        <p className="text-[#5C5549] max-w-md">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${theme} pb-32`}
    >
      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-[#EAE5D9] shadow-sm">
        <div className="px-5 sm:px-6 pt-6 pb-4 max-w-5xl mx-auto">
          {isVendorPreview && (
            <button
              type="button"
              onClick={() => navigate("/vendor/dashboard")}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#5C5549] hover:text-amber-700 transition-colors"
            >
              <span className="text-lg leading-none">&larr;</span>
              Back to Dashboard
            </button>
          )}
          <div className="flex justify-between items-start mb-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1816] tracking-tight">
                {restaurant?.name ||
                  "Restaurant"}
              </h1>

              <p className="text-sm font-medium text-amber-600 flex items-center gap-1.5 mt-1">
                Table{" "}
                {
                  table?.tableNumber
                }

                <span className="w-1 h-1 rounded-full bg-amber-600/50" />

                <span className="text-[#8C8477]">
                  Scan. Order.
                  Enjoy.
                </span>
              </p>
            </div>

            {restaurant?.logo && (
              <img
                src={
                  restaurant.logo
                }
                alt={
                  restaurant.name ||
                  "Restaurant logo"
                }
                className="w-12 h-12 rounded-full border border-[#EAE5D9] object-cover shadow-sm"
              />
            )}
          </div>

          {/* Restaurant Closed Banner */}
          {restaurant?.isOpen === false && (
            <div className="mx-4 mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-center">
              <p className="text-red-600 font-semibold text-sm">🍽️ Restaurant is currently closed</p>
              <p className="text-red-400 text-xs mt-1">Ordering is temporarily unavailable. Please try again later.</p>
            </div>
          )}

          {/* SEARCH */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8477]" />

            <input
              type="text"
              placeholder="Search dishes..."
              value={
                searchQuery
              }
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              className="w-full bg-[#F5F2EA] border border-[#EAE5D9] rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-shadow placeholder:text-[#8C8477]"
            />
          </div>
        </div>

        {/* CATEGORY NAV */}
        <div className="max-w-5xl mx-auto px-5 sm:px-6 pb-4 overflow-x-auto no-scrollbar flex gap-2">
          {categories.map(
            (category) => (
              <button
                key={
                  category._id
                }
                type="button"
                onClick={() =>
                  scrollToCategory(
                    category._id
                  )
                }
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeCategory ===
                  category._id
                    ? "bg-[#2C2825] text-white shadow-md"
                    : "bg-[#F5F2EA] text-[#5C5549] hover:bg-[#EAE5D9]"
                }`}
              >
                {category.name}
              </button>
            )
          )}
        </div>
      </header>

      {/* ============================= */}
      {/* MENU */}
      {/* ============================= */}
      <main className="max-w-5xl mx-auto px-5 sm:px-6 pt-7 space-y-10">
        {categories.length ===
        0 ? (
          <div className="py-20 text-center">
            <h3 className="text-lg font-bold mb-2">
              Menu unavailable
            </h3>

            <p className="text-[#8C8477]">
              No categories are
              available right now.
            </p>
          </div>
        ) : (
          restaurant?.subscriptionStatus === 'restricted' ? (
            <div className="py-20 text-center">
              <p className="text-[#8C8477] font-medium">
                Online ordering is temporarily unavailable.
              </p>
            </div>
          ) : (
            categories.map(
            (category) => {
              // ==============================
              // IMPORTANT FIX:
              // backend uses categoryId
              // ==============================
              const items =
                menuItems.filter(
                  (item) => {
                    const itemCategoryId =
                      typeof item.categoryId ===
                      "object"
                        ? item
                            .categoryId
                            ?._id
                        : item.categoryId;

                    const sameCategory =
                      String(
                        itemCategoryId ||
                          ""
                      ) ===
                      String(
                        category._id
                      );

                    const matchesSearch =
                      item.name
                        ?.toLowerCase()
                        .includes(
                          searchQuery
                            .trim()
                            .toLowerCase()
                        );

                    return (
                      sameCategory &&
                      matchesSearch
                    );
                  }
                );

              if (
                items.length ===
                0
              ) {
                return null;
              }

              return (
                <section
                  key={
                    category._id
                  }
                  ref={(element) =>
                    (categoryRefs.current[
                      category._id
                    ] = element)
                  }
                  className="scroll-mt-52"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {
                        category.name
                      }
                    </h2>

                    <span className="text-sm font-normal text-[#8C8477] bg-[#F5F2EA] px-2 py-0.5 rounded-full">
                      {
                        items.length
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(
                      (
                        item,
                        index
                      ) => {
                        const qty =
                          cart[
                            item
                              ._id
                          ]
                            ?.quantity ||
                          0;

                        const isVeg =
                          item.foodType ===
                          "veg";

                        return (
                          <motion.article
                            key={
                              item._id
                            }
                            initial={{
                              opacity: 0,
                              y: 12,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              duration: 0.3,
                              delay:
                                index *
                                0.04,
                            }}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE5D9] flex gap-4"
                          >
                            {/* CONTENT */}
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {/* VEG / NON-VEG */}
                                <div
                                  className={`w-4 h-4 rounded-sm border ${
                                    isVeg
                                      ? "border-green-600 bg-green-50"
                                      : "border-red-600 bg-red-50"
                                  } flex items-center justify-center shrink-0`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      isVeg
                                        ? "bg-green-600"
                                        : "bg-red-600"
                                    }`}
                                  />
                                </div>

                                <h3 className="font-bold text-[#1A1816] truncate">
                                  {
                                    item.name
                                  }
                                </h3>
                              </div>

                              <p className="text-sm text-[#5C5549] mb-3 line-clamp-2 leading-snug">
                                {item.description ||
                                  "Freshly prepared for you."}
                              </p>

                              <div className="mt-auto flex items-center justify-between gap-3">
                                <span className="font-bold text-amber-700 text-lg">
                                  ₹
                                  {
                                    item.price
                                  }
                                </span>

                                {item.isAvailable ===
                                false ? (
                                  <span className="text-xs font-medium bg-[#F5F2EA] text-[#8C8477] px-3 py-2 rounded-lg">
                                    Unavailable
                                  </span>
                                ) : qty >
                                  0 ? (
                                  <div className="flex items-center bg-[#F5F2EA] rounded-xl p-1 border border-[#EAE5D9]">
                                    <button
                                      type="button"
                                      aria-label={`Remove one ${item.name}`}
                                      onClick={() =>
                                        updateQuantity(
                                          item,
                                          -1
                                        )
                                      }
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-[#5C5549] shadow-sm hover:text-[#1A1816] transition-colors"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>

                                    <span className="w-8 text-center font-bold text-[#1A1816]">
                                      {
                                        qty
                                      }
                                    </span>

                                    <button
                                      type="button"
                                      aria-label={`Add one ${item.name}`}
                                      onClick={() =>
                                        updateQuantity(
                                          item,
                                          1
                                        )
                                      }
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-600 text-white shadow-sm hover:bg-amber-700 transition-colors"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(
                                        item,
                                        1
                                      )
                                    }
                                    className="px-5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm rounded-xl transition-colors shadow-sm"
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* IMAGE */}
                            <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 shadow-sm bg-[#F5F2EA]">
                              <img
                                src={getFoodImage(item)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/food-images/default-food.jpg";
                                }}
                              />
                            </div>

                          </motion.article>
                        );
                      }
                    )}
                  </div>
                </section>
              );
            }
          )
          )
        )}

        {categories.length >
          0 &&
          menuItems.length ===
            0 && (
            <div className="py-20 text-center">
              <h3 className="font-bold text-lg mb-2">
                No dishes
                available
              </h3>

              <p className="text-[#8C8477]">
                Please check
                again later.
              </p>
            </div>
          )}
      </main>

      {/* ============================= */}
      {/* STICKY CART */}
      {/* ============================= */}
      <AnimatePresence>
        {cartCount > 0 &&
          !isCartOpen && (
            <motion.div
              initial={{
                y: 100,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: 100,
                opacity: 0,
              }}
              className="fixed bottom-5 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[500px] z-40"
            >
              <button
                type="button"
                onClick={() =>
                  setIsCartOpen(
                    true
                  )
                }
                className="w-full bg-[#1A1816] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between hover:bg-black transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>

                  <div className="text-left">
                    <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                      {
                        cartCount
                      }{" "}
                      items
                    </div>

                    <div className="font-bold">
                      View Cart
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">
                    ₹
                    {cartTotal.toFixed(
                      2
                    )}
                  </span>

                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* ============================= */}
      {/* CART DRAWER */}
      {/* ============================= */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() =>
                !isCheckingOut &&
                setIsCartOpen(
                  false
                )
              }
            />

            <motion.div
              initial={{
                y: "100%",
              }}
              animate={{
                y: 0,
              }}
              exit={{
                y: "100%",
              }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: 0.4,
              }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 flex flex-col max-h-[90vh] shadow-2xl max-w-2xl mx-auto"
            >
              {/* HANDLE */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-[#EAE5D9] rounded-full" />
              </div>

              {/* TITLE */}
              <div className="px-6 pb-4 flex justify-between items-center border-b border-[#EAE5D9]">
                <h2 className="text-2xl font-bold text-[#1A1816]">
                  Your Cart
                </h2>

                <button
                  type="button"
                  disabled={
                    isCheckingOut
                  }
                  onClick={() =>
                    setIsCartOpen(
                      false
                    )
                  }
                  className="p-2 bg-[#F5F2EA] rounded-full text-[#5C5549] disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {Object.values(
                  cart
                ).length ===
                0 ? (
                  <div className="text-center py-10 text-[#8C8477]">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />

                    <p className="font-medium">
                      Your cart is
                      empty.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ITEMS */}
                    <div className="space-y-4">
                      {Object.values(
                        cart
                      ).map(
                        ({
                          item,
                          quantity,
                        }) => (
                          <div
                            key={
                              item._id
                            }
                            className="flex gap-4"
                          >
                            <div className="w-16 h-16 rounded-xl bg-[#F5F2EA] overflow-hidden shrink-0 flex items-center justify-center border border-[#EAE5D9]">
                              <img
                                src={getFoodImage(item)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/food-images/default-food.jpg";
                                }}
                              />
                            </div>

                            <div className="flex-1">
                              <h4 className="font-bold text-[#1A1816] mb-1">
                                {
                                  item.name
                                }
                              </h4>

                              <div className="font-medium text-amber-700 text-sm mb-2">
                                ₹
                                {
                                  item.price
                                }
                              </div>

                              <div className="flex items-center bg-[#F5F2EA] rounded-lg p-1 w-max border border-[#EAE5D9]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      item,
                                      -1
                                    )
                                  }
                                  className="w-7 h-7 rounded flex items-center justify-center bg-white text-[#5C5549] shadow-sm"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <span className="w-8 text-center font-bold text-[#1A1816] text-sm">
                                  {
                                    quantity
                                  }
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      item,
                                      1
                                    )
                                  }
                                  className="w-7 h-7 rounded flex items-center justify-center bg-amber-600 text-white shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="font-bold text-[#1A1816]">
                              ₹
                              {(
                                Number(
                                  item.price ||
                                    0
                                ) *
                                quantity
                              ).toFixed(
                                2
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* NOTE / PAYMENT */}
                    <div className="border-t border-[#EAE5D9] pt-6 space-y-5">
                      <div>
                        <label className="text-sm font-bold text-[#1A1816] mb-2 block">
                          Add a note
                          for the
                          kitchen
                        </label>

                        <textarea
                          value={
                            customerNote
                          }
                          onChange={(
                            e
                          ) =>
                            setCustomerNote(
                              e.target
                                .value
                            )
                          }
                          placeholder="E.g. Less spicy, extra sauce..."
                          className="w-full bg-[#F5F2EA] border border-[#EAE5D9] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none h-20"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold text-[#1A1816] mb-3 block">
                          Payment
                          Method
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentMethod(
                                "online"
                              )
                            }
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                              paymentMethod ===
                              "online"
                                ? "border-amber-600 bg-amber-50 text-amber-900"
                                : "border-[#EAE5D9] bg-white text-[#5C5549]"
                            }`}
                          >
                            <CreditCard className="w-6 h-6 mb-2" />

                            <span className="font-bold text-sm">
                              Pay
                              Online
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setPaymentMethod(
                                "cash"
                              )
                            }
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                              paymentMethod ===
                              "cash"
                                ? "border-amber-600 bg-amber-50 text-amber-900"
                                : "border-[#EAE5D9] bg-white text-[#5C5549]"
                            }`}
                          >
                            <Banknote className="w-6 h-6 mb-2" />

                            <span className="font-bold text-sm">
                              Pay Cash
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* CHECKOUT */}
              {cartCount > 0 && (
                <div className="p-6 bg-white border-t border-[#EAE5D9] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#5C5549] font-medium">
                      Estimated
                      Total
                    </span>

                    <span className="text-2xl font-black text-[#1A1816]">
                      ₹
                      {cartTotal.toFixed(
                        2
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCheckout
                    }
                    disabled={
                      isCheckingOut || restaurant?.isOpen === false
                    }
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-70 text-white font-bold text-lg py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98]"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                        Processing...
                      </>
                    ) : (
                      <>
                        Place Order

                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}