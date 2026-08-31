import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/vendor/Dashboard';
import Chefs from './pages/vendor/Chefs';
import Categories from './pages/vendor/Categories';
import Menu from './pages/vendor/Menu';
import Tables from './pages/vendor/Tables';
import Orders from './pages/vendor/Orders';
import Analytics from './pages/vendor/Analytics';
import Billing from './pages/vendor/Billing';
import Settings from './pages/vendor/Settings';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVendors from './pages/admin/AdminVendors';
import AdminVendorDetail from './pages/admin/AdminVendorDetail';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import ChefDashboard from './pages/chef/ChefDashboard';
import PublicMenu from './pages/public/PublicMenu';
import OrderSuccess from './pages/public/OrderSuccess';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <>
      <SocketProvider>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Public Customer Routes */}
          <Route path="/menu/:vendorId/:tableId" element={<PublicMenu />} />
          <Route path="/order-success" element={<OrderSuccess />} />

          {/* Chef Route */}
          <Route path="/chef/dashboard" element={<ChefDashboard />} />

          {/* Admin Routes (superAdmin only) */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["superAdmin"]}><AdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="vendors/:vendorId" element={<AdminVendorDetail />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
          
          {/* Vendor Routes (vendorAdmin only) */}
          <Route path="/vendor" element={<ProtectedRoute allowedRoles={["vendorAdmin"]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="menu" element={<Menu />} />
            <Route path="categories" element={<Categories />} />
            <Route path="chefs" element={<Chefs />} />
            <Route path="tables" element={<Tables />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<div className="p-8">Page Not Found</div>} />
          </Route>
        </Routes>
      </Router>
      </SocketProvider>
    </>
  );
}

export default App;
