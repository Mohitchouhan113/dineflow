import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  QrCode,
  Copy,
  Power,
  ExternalLink,
} from "lucide-react";

import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { showToast } from "../../components/ui/Toast";
import api from "../../api/axios";
import useSubscriptionLimits from '../../hooks/useSubscriptionLimits';

export default function Tables() {
  const { isAtLimit, getUsage, isRestricted } = useSubscriptionLimits();
  const [searchParams] = useSearchParams();
  const globalSearch = searchParams.get('search') || '';

  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

  const [qrModalTable, setQrModalTable] = useState(null);

  const [formData, setFormData] = useState({
    tableNumber: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // GET ALL TABLES
  // =========================================
  const fetchTables = async () => {
    try {
      setIsLoading(true);

      const res = await api.get("/api/vendor/tables");

      console.log("Tables API Response:", res.data);

      const tableList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.tables)
        ? res.data.tables
        : [];

      setTables(tableList);
    } catch (err) {
      console.error(
        "Failed to fetch tables:",
        err.response?.data || err.message
      );

      setTables([]);

      showToast(
        err.response?.data?.message || "Failed to load tables",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // =========================================
  // CREATE / UPDATE TABLE
  // =========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const tableNumber = String(
      formData.tableNumber || ""
    ).trim();

    if (!tableNumber) {
      setError("Table number is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        tableNumber,
      };

      if (editingTable) {
        await api.put(
          `/api/vendor/tables/${editingTable._id}`,
          payload
        );

        showToast("Table updated successfully", "success");
      } else {
        await api.post("/api/vendor/tables", payload);

        showToast("Table created successfully", "success");
      }

      setIsModalOpen(false);
      setEditingTable(null);

      setFormData({
        tableNumber: "",
      });

      await fetchTables();
    } catch (err) {
      console.error(
        "Backend error saving table:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Failed to save table."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================
  // ACTIVE / INACTIVE
  // =========================================
  const toggleStatus = async (table) => {
    const nextStatus = table.isActive === false;

    if (!nextStatus) {
      const confirm = window.confirm(
        `Deactivate Table ${table.tableNumber}?`
      );

      if (!confirm) return;
    }

    try {
      await api.patch(
        `/api/vendor/tables/${table._id}/status`,
        {
          isActive: nextStatus,
        }
      );

      showToast(
        nextStatus
          ? "Table activated successfully"
          : "Table deactivated successfully",
        "success"
      );

      await fetchTables();
    } catch (err) {
      console.error(
        "Table status error:",
        err.response?.data || err.message
      );

      showToast(
        err.response?.data?.message ||
          "Failed to update table status",
        "error"
      );
    }
  };

  // =========================================
  // OPEN CREATE / EDIT MODAL
  // =========================================
  const openModal = (table = null) => {
    setError("");

    if (table) {
      setEditingTable(table);

      setFormData({
        tableNumber: table.tableNumber || "",
      });
    } else {
      setEditingTable(null);

      setFormData({
        tableNumber: "",
      });
    }

    setIsModalOpen(true);
  };

  // =========================================
  // GET CORRECT CUSTOMER MENU URL
  // =========================================
  const getMenuUrl = (table) => {
    if (!table) return "";

    // Backend-generated QR URL gets first priority
    if (table.qrUrl) {
      return table.qrUrl;
    }

    const vendorId =
      typeof table.vendorId === "object"
        ? table.vendorId?._id
        : table.vendorId;

    if (!vendorId || !table._id) {
      return "";
    }

    return `${window.location.origin}/menu/${vendorId}/${table._id}`;
  };

  // =========================================
  // COPY CUSTOMER MENU URL
  // =========================================
  const handleCopyQR = async (table) => {
    try {
      const url = getMenuUrl(table);

      if (!url) {
        showToast("Menu URL not available", "error");
        return;
      }

      await navigator.clipboard.writeText(url);

      showToast("Menu URL copied successfully", "success");
    } catch (err) {
      console.error("Copy URL error:", err);

      showToast("Failed to copy menu URL", "error");
    }
  };

  // =========================================
  // OPEN CUSTOMER MENU
  // =========================================
 const navigate = useNavigate();

const handleOpenMenu = (table) => {
  const url = getMenuUrl(table);

  if (!url) return;

  const parsedUrl = new URL(url);
  navigate(parsedUrl.pathname, { state: { fromVendor: true } });
};

  // =========================================
  // PRINT QR
  // =========================================
  const handlePrintQR = (table) => {
    if (!table) return;

    const windowPrint = window.open(
      "",
      "",
      "width=800,height=700"
    );

    if (!windowPrint) {
      showToast(
        "Popup blocked. Please allow popups.",
        "error"
      );
      return;
    }

    windowPrint.document.write(`
      <html>
        <head>
          <title>DineFlow - Table ${table.tableNumber}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 30px;
              font-family: Arial, sans-serif;
              background: #ffffff;
            }

            .card {
              width: 360px;
              text-align: center;
              border: 4px solid #111;
              padding: 32px;
              border-radius: 20px;
            }

            .brand {
              font-size: 28px;
              font-weight: 800;
              margin: 0;
            }

            .subtitle {
              margin: 8px 0 24px;
              color: #666;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }

            .qr {
              width: 250px;
              height: 250px;
              object-fit: contain;
              margin: 15px auto 25px;
            }

            .table {
              font-size: 38px;
              font-weight: 900;
            }

            .scan {
              margin-top: 10px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>

        <body>
          <div class="card">
            <h2 class="brand">DineFlow</h2>

            <p class="subtitle">
              Scan to Order
            </p>

            ${
              table.qrCode
                ? `
                  <img
                    class="qr"
                    src="${table.qrCode}"
                    alt="QR Code"
                  />
                `
                : `
                  <div
                    class="qr"
                    style="
                      border: 3px solid #111;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                    "
                  >
                    No QR
                  </div>
                `
            }

            <div class="table">
              Table ${table.tableNumber}
            </div>

            <div class="scan">
              Scan the QR code to view the menu
            </div>
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);

    windowPrint.document.close();
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Tables & QR Codes
          </h1>

          <p className="text-text-secondary text-sm">
            Manage tables and generate QR menus.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => { if (!isAtLimit('tables') && !isRestricted) openModal(); }}
            variant="primary"
            className="gap-2"
            disabled={isAtLimit('tables') || isRestricted}
          >
            <Plus className="w-4 h-4" />
            Add Table
          </Button>
          {isAtLimit('tables') && <span className="text-[10px] text-red-400 font-medium">Table limit reached ({getUsage('tables').current}/{getUsage('tables').limit})</span>}
        </div>
      </div>

      {/* TABLE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-text-muted">
            Loading tables...
          </div>
        ) : (
          (() => {
            const filteredTables = globalSearch.trim()
              ? tables.filter((t) => {
                  const q = globalSearch.trim().toLowerCase();
                  return String(t.tableNumber || '').toLowerCase().includes(q);
                })
              : tables;
            if (filteredTables.length === 0) {
              return (
                <div className="col-span-full py-16 text-center text-text-muted">
                  {globalSearch.trim() ? 'No tables match your search.' : 'No tables found.'}
                </div>
              );
            }
            return filteredTables.map((table, i) => {
            const menuUrl = getMenuUrl(table);

            return (
              <motion.div
                key={table._id}
                initial={{
                  opacity: 0,
                  y: 15,
                  scale: 0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.05,
                }}
              >
                <Card className="h-full border-border/50 hover:border-primary/40 transition-all group">
                  <CardContent className="p-5 flex flex-col items-center relative text-center">
                    {/* STATUS */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                          table.isActive !== false
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-surface-elevated text-text-muted border-border"
                        }`}
                      >
                        {table.isActive !== false
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    {/* ACTIONS */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Edit table"
                        onClick={() => openModal(table)}
                        className="p-1.5 rounded-md bg-surface-elevated text-text-secondary hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title={
                          table.isActive !== false
                            ? "Deactivate table"
                            : "Activate table"
                        }
                        onClick={() => toggleStatus(table)}
                        className="p-1.5 rounded-md bg-surface-elevated text-text-secondary hover:text-primary transition-colors"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* QR */}
                    <button
                      type="button"
                      onClick={() =>
                        setQrModalTable(table)
                      }
                      className="w-28 h-28 bg-white p-2.5 rounded-xl shadow-sm mb-4 mt-7 cursor-pointer hover:scale-105 transition-transform"
                      title="View QR Code"
                    >
                      {table.qrCode ? (
                        <img
                          src={table.qrCode}
                          alt={`QR for Table ${table.tableNumber}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-black/80" />
                        </div>
                      )}
                    </button>

                    <h3 className="text-xl font-bold text-text-primary mb-4">
                      Table {table.tableNumber}
                    </h3>

                    {/* ACTION BAR */}
                    <div className="w-full pt-4 mt-auto border-t border-border/50 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs gap-1.5 h-9"
                        onClick={() =>
                          handleCopyQR(table)
                        }
                      >
                        <Copy className="w-3.5 h-3.5" />

                        Copy Link
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs gap-1.5 h-9 text-primary"
                        disabled={!menuUrl}
                        onClick={() =>
                          handleOpenMenu(table)
                        }
                      >
                        <ExternalLink className="w-3.5 h-3.5" />

                        View Menu
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          });
          })()
        )}
      </div>

      {/* CREATE / EDIT TABLE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setError("");
          }
        }}
        title={
          editingTable ? "Edit Table" : "Add Table"
        }
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Table Number / Name
            </label>

            <Input
              required
              type="text"
              value={formData.tableNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tableNumber: e.target.value,
                })
              }
              placeholder="e.g. T1"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => {
                setIsModalOpen(false);
                setError("");
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {editingTable
                ? "Update Table"
                : "Save Table"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR MODAL */}
      <Modal
        isOpen={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
        title="Table QR Code"
      >
        {qrModalTable && (
          <div className="flex flex-col items-center">
            <div
              id="print-area"
              className="w-72 bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border-4 border-black mb-6"
            >
              <h2 className="text-xl font-bold text-black mb-1">
                DineFlow
              </h2>

              <p className="text-xs text-gray-500 font-medium mb-6 uppercase tracking-wider">
                Scan to Order
              </p>

              <div className="w-48 h-48 mb-6">
                {qrModalTable.qrCode ? (
                  <img
                    src={qrModalTable.qrCode}
                    alt={`QR Code for Table ${qrModalTable.tableNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center border-4 border-black rounded-lg">
                    <QrCode className="w-24 h-24 text-black" />
                  </div>
                )}
              </div>

              <div className="text-3xl font-black text-black">
                Table {qrModalTable.tableNumber}
              </div>

              <p className="text-sm text-gray-500 mt-2">
                Scan to view the restaurant menu
              </p>
            </div>

            <div className="flex flex-wrap gap-3 w-full justify-center">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() =>
                  handleCopyQR(qrModalTable)
                }
              >
                <Copy className="w-4 h-4" />

                Copy URL
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() =>
                  handleOpenMenu(qrModalTable)
                }
              >
                <ExternalLink className="w-4 h-4" />

                Open Menu
              </Button>

              <Button
                type="button"
                variant="primary"
                className="gap-2"
                onClick={() =>
                  handlePrintQR(qrModalTable)
                }
              >
                Print QR
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}