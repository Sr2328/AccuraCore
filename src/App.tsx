import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, getRoleDashboardPath } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";

// Pages
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import AdminAttendanceView from "@/pages/admin/AdminAttendanceView";
import AdminHRView from "@/pages/admin/AdminHRView";
import AdminProcurementView from "@/pages/admin/AdminProcurementView";
import AdminSecurityView from "@/pages/admin/AdminSecurityView";
import AdminStoreView from "@/pages/admin/AdminStoreView";

import SecurityDashboard from "@/pages/SecurityDashboard";
import SecurityAttendance from "@/pages/security/AttendancePage";
import SecurityGatePass from "@/pages/security/GatePassPage";
import SecurityCanteen from "@/pages/security/CanteenPage";
import SecurityMaterial from "@/pages/security/MaterialPage";

import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AttendanceHistory from "@/pages/employee/AttendanceHistory";
import EmployeeLeavePage from "@/pages/employee/LeavePage";
import PayslipsPage from "@/pages/employee/PayslipsPage";
import IDCardPage from "@/pages/employee/IDCardPage";

import HRDashboard from "@/pages/HRDashboard";
import HREmployees from "@/pages/hr/EmployeesPage";
import HRAttendance from "@/pages/hr/AttendancePage";
import HRPayroll from "@/pages/hr/PayrollPage";
import HRLeave from "@/pages/hr/LeavePage";
import HRGatePass from "@/pages/hr/GatePassViewPage";

import ProcurementDashboard from "@/pages/ProcurementDashboard";
import ProcurementJobWork from "@/pages/procurement/JobWorkPage";
import ProcurementRMBuying from "@/pages/procurement/RMBuyingPage";
import ProcurementSuppliers from "@/pages/procurement/SuppliersPage";
import ProcurementTasks from "@/pages/procurement/TasksPage";
import APEPLPage from "@/pages/procurement/Apeplpage";
import DocumentManagement from "./pages/procurement/Documentmanagement";

import StoreDashboard from "@/pages/StoreDashboard";
import StoreInventory from "@/pages/store/InventoryPage";
import StockInPage from "@/pages/store/StockInPage";
import StockOutPage from "@/pages/store/StockOutPage";
import AlertsPage from "@/pages/store/AlertsPage";

import MessagesPage from "@/pages/MessagesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ComplaintsPage from "@/pages/ComplaintsPage";
import HelpPage from "@/pages/HelpPage";   // ✅ correct import
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDashboardPath(user!.role)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* ── Admin ── */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute><AdminAttendanceView /></ProtectedRoute>} />
      <Route path="/admin/hr" element={<ProtectedRoute><AdminHRView /></ProtectedRoute>} />
      <Route path="/admin/procurement" element={<ProtectedRoute><AdminProcurementView /></ProtectedRoute>} />
      <Route path="/admin/security" element={<ProtectedRoute><AdminSecurityView /></ProtectedRoute>} />
      <Route path="/admin/store" element={<ProtectedRoute><AdminStoreView /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />

      {/* ── Security ── */}
      <Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
      <Route path="/security/attendance" element={<ProtectedRoute><SecurityAttendance /></ProtectedRoute>} />
      <Route path="/security/gatepass" element={<ProtectedRoute><SecurityGatePass /></ProtectedRoute>} />
      <Route path="/security/canteen" element={<ProtectedRoute><SecurityCanteen /></ProtectedRoute>} />
      <Route path="/security/material" element={<ProtectedRoute><SecurityMaterial /></ProtectedRoute>} />

      {/* ── HR ── */}
      <Route path="/hr" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />
      <Route path="/hr/employees" element={<ProtectedRoute><HREmployees /></ProtectedRoute>} />
      <Route path="/hr/attendance" element={<ProtectedRoute><HRAttendance /></ProtectedRoute>} />
      <Route path="/hr/payroll" element={<ProtectedRoute><HRPayroll /></ProtectedRoute>} />
      <Route path="/hr/leave" element={<ProtectedRoute><HRLeave /></ProtectedRoute>} />
      <Route path="/hr/gatepass" element={<ProtectedRoute><HRGatePass /></ProtectedRoute>} />
      <Route path="/hr/*" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />

      {/* ── Procurement ── */}
      <Route path="/procurement" element={<ProtectedRoute><ProcurementDashboard /></ProtectedRoute>} />
      <Route path="/procurement/jobwork" element={<ProtectedRoute><ProcurementJobWork /></ProtectedRoute>} />
      <Route path="/procurement/buying" element={<ProtectedRoute><ProcurementRMBuying /></ProtectedRoute>} />
      <Route path="/procurement/suppliers" element={<ProtectedRoute><ProcurementSuppliers /></ProtectedRoute>} />
      <Route path="/procurement/tasks" element={<ProtectedRoute><ProcurementTasks /></ProtectedRoute>} />
      <Route path="/apepl" element={<ProtectedRoute><APEPLPage /></ProtectedRoute>} />
      <Route path="/procurement/DocumentManagement" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />   {/* ✅ new route for documents */}

      {/* ── Employee ── */}
      <Route path="/employee" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/approvals" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/attendance" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
      <Route path="/employee/payslips" element={<ProtectedRoute><PayslipsPage /></ProtectedRoute>} />
      <Route path="/employee/leave" element={<ProtectedRoute><EmployeeLeavePage /></ProtectedRoute>} />
      <Route path="/employee/idcard" element={<ProtectedRoute><IDCardPage /></ProtectedRoute>} />
      <Route path="/employee/*" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />

      {/* ── Store ── */}
      <Route path="/store" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
      <Route path="/store/inventory" element={<ProtectedRoute><StoreInventory /></ProtectedRoute>} />
      <Route path="/store/stockin" element={<ProtectedRoute><StockInPage /></ProtectedRoute>} />
      <Route path="/store/stockout" element={<ProtectedRoute><StockOutPage /></ProtectedRoute>} />
      <Route path="/store/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/store/*" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />

      {/* ── Shared ── */}
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />

      {/* ── Help & Support ── */}
      <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />   {/* ✅ wired */}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;