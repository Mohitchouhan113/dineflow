import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Lightweight route guard.
 * Reads user info from localStorage (set at login time).
 * If the required role doesn't match, redirect to /login.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  let user = null;

  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }

  // Not logged in at all
  if (!user || !localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      if (user.role === "superAdmin") {
        return <Navigate to="/admin/dashboard" replace />;
      }
      if (user.role === "chef") {
        return <Navigate to="/chef/dashboard" replace />;
      }
      if (user.role === "vendorAdmin") {
        return <Navigate to="/vendor/dashboard" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
