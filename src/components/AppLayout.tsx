import { useState } from "react";
import { useAuth, getRoleLabel, UserRole } from "@/lib/auth-context";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Shield, ShoppingCart, Package,
  Bell, LogOut, Menu, X, Factory, ClipboardList,
  FileText, MessageSquare, Settings, Briefcase, AlertCircle,
  TrendingUp, TrendingDown, CreditCard, ChevronRight,
  HelpCircle,
  Layers,
} from "lucide-react";

interface NavItem { label: string; path: string; icon: React.ElementType; }

/* ── Help item appended to every role automatically ── */
const HELP_ITEM: NavItem = { label: "Help & Support", path: "/help", icon: HelpCircle };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "User Management", path: "/admin/users", icon: Users },
    { label: "Attendance View", path: "/admin/attendance", icon: ClipboardList },
    { label: "HR View", path: "/admin/hr", icon: Briefcase },
    { label: "Procurement View", path: "/admin/procurement", icon: ShoppingCart },
    { label: "Security View", path: "/admin/security", icon: Shield },
    { label: "Store View", path: "/admin/store", icon: Package },
    { label: "Notifications", path: "/notifications", icon: Bell },
    { label: "Complaints", path: "/complaints", icon: AlertCircle },
    { label: "Messages", path: "/messages", icon: MessageSquare },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ],
  hr: [
    { label: "Dashboard", path: "/hr", icon: LayoutDashboard },
    { label: "Employees", path: "/hr/employees", icon: Users },
    { label: "Attendance", path: "/hr/attendance", icon: ClipboardList },
    { label: "Payroll", path: "/hr/payroll", icon: FileText },
    { label: "Leave", path: "/hr/leave", icon: Briefcase },
    { label: "Gate Pass", path: "/hr/gatepass", icon: Shield },
    { label: "Notifications", path: "/notifications", icon: Bell },
    { label: "Complaints", path: "/complaints", icon: AlertCircle },
    { label: "Messages", path: "/messages", icon: MessageSquare },
  ],
  security: [
    { label: "Dashboard", path: "/security", icon: LayoutDashboard },
    { label: "Attendance", path: "/security/attendance", icon: ClipboardList },
    { label: "Gate Pass", path: "/security/gatepass", icon: Shield },
    { label: "Canteen", path: "/security/canteen", icon: Users },
    { label: "Material", path: "/security/material", icon: Package },
  ],
  procurement: [
    { label: "Dashboard", path: "/procurement", icon: LayoutDashboard },
    { label: "Job Work", path: "/procurement/jobwork", icon: ShoppingCart },
    { label: "RM Buying", path: "/procurement/buying", icon: Package },
    { label: "Suppliers", path: "/procurement/suppliers", icon: Users },
    { label: "Tasks", path: "/procurement/tasks", icon: ClipboardList },
    { label: "Messages", path: "/messages", icon: MessageSquare },
    { label: "APEPL", path: "/apepl", icon: Layers }
  ],
  employee: [
    { label: "Dashboard", path: "/employee", icon: LayoutDashboard },
    { label: "Approvals", path: "/employee/approvals", icon: ClipboardList },
    { label: "Attendance", path: "/employee/attendance", icon: FileText },
    { label: "Payslips", path: "/employee/payslips", icon: Briefcase },
    { label: "Leave", path: "/employee/leave", icon: Shield },
    { label: "Notifications", path: "/notifications", icon: Bell },
    { label: "Complaints", path: "/complaints", icon: AlertCircle },
    { label: "Messages", path: "/messages", icon: MessageSquare },
    { label: "ID Card", path: "/employee/idcard", icon: CreditCard },
  ],
  store: [
    { label: "Dashboard", path: "/store", icon: LayoutDashboard },
    { label: "Inventory", path: "/store/inventory", icon: Package },
    { label: "Stock In", path: "/store/stockin", icon: TrendingUp },
    { label: "Stock Out", path: "/store/stockout", icon: TrendingDown },
    { label: "Alerts", path: "/store/alerts", icon: Bell },
    { label: "Messages", path: "/messages", icon: MessageSquare },
  ],
};

function getNavItems(role: UserRole): NavItem[] {
  let base: NavItem[];
  if (["toolroom_high", "moulding_high", "tool_room_head"].includes(role)) base = NAV_BY_ROLE.admin;
  else if (["accountant"].includes(role)) base = NAV_BY_ROLE.hr;
  else if (["ref_person"].includes(role)) base = NAV_BY_ROLE.procurement;
  else if (["cad_cam"].includes(role)) base = NAV_BY_ROLE.employee;
  else base = NAV_BY_ROLE[role] || NAV_BY_ROLE.employee;
  // Append Help to every role (avoid duplicate if somehow already present)
  return base.some(n => n.path === "/help") ? base : [...base, HELP_ITEM];
}

const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" }) => (
  <div className={cn(
    "rounded-full bg-[#EAB308] flex items-center justify-center font-bold text-black flex-shrink-0",
    size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs"
  )}>
    {name.charAt(0).toUpperCase()}
  </div>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { data: allNotifs } = await supabase.from("notifications").select("id").limit(100);
      const { data: reads } = await supabase.from("notification_reads").select("notification_id").eq("user_id", user?.id!);
      const readIds = new Set(reads?.map((r: any) => r.notification_id) || []);
      return (allNotifs || []).filter((n: any) => !readIds.has(n.id)).length;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  if (!user) return null;

  const navItems = getNavItems(user.role);
  const currentPage = navItems.find(n =>
    location.pathname === n.path || (n.path !== "/" && location.pathname.startsWith(n.path + "/"))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">

      {/* ── SIDEBAR ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        "bg-neutral-950 border-r border-neutral-800 shadow-[2px_0_16px_0_rgba(0,0,0,0.4)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#EAB308] flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_0_rgba(234,179,8,0.4)]">
            <Factory className="w-5 h-5 text-black" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate leading-tight">Accura Precision</p>
            <p className="text-[10px] text-neutral-500 truncate">ERP System</p>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-800 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-2.5 border-b border-neutral-800/60">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#EAB308] bg-[#EAB308]/10 border border-[#EAB308]/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            {getRoleLabel(user.role)}
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
            const isNotif = item.path === "/notifications";
            const isHelp = item.path === "/help";

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-[#EAB308] text-black shadow-[0_2px_8px_0_rgba(234,179,8,0.3)]"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
                  // Thin separator line above Help item
                  isHelp && "mt-1.5 pt-1.5 border-t border-neutral-800"
                )}
              >
                <item.icon
                  className={cn("w-4 h-4 flex-shrink-0 transition-colors",
                    isActive ? "text-black" : "text-neutral-500 group-hover:text-neutral-200"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="truncate flex-1">{item.label}</span>
                {isNotif && unreadCount > 0 && (
                  <span className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0",
                    isActive ? "bg-black/20 text-black" : "bg-red-500 text-white"
                  )}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {isActive && !isNotif && (
                  <ChevronRight className="w-3.5 h-3.5 text-black/50 flex-shrink-0" strokeWidth={2} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="flex-shrink-0 p-3 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-neutral-800 transition-colors group">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user.email || user.user_id_custom}</p>
            </div>
            <button onClick={logout} title="Logout"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-500 hover:bg-red-900/20 transition-colors flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 h-14 flex items-center gap-3 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] dark:shadow-none">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex-shrink-0">
            <Menu className="w-5 h-5" strokeWidth={1.8} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="hidden lg:flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">Accura ERP</span>
              {currentPage && (
                <>
                  <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{currentPage.label}</span>
                </>
              )}
            </div>
            <span className="lg:hidden text-sm font-bold text-neutral-900 dark:text-white truncate">
              {currentPage?.label ?? "Accura ERP"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => navigate("/notifications")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
              <Bell className="w-5 h-5" strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-neutral-900" />
              )}
            </button>

            <button
              onClick={() => navigate(user.role === "employee" ? "/employee" : `/${user.role}`)}
              className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Avatar name={user.name} size="sm" />
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-neutral-800 dark:text-white truncate max-w-[100px]">{user.name}</p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{getRoleLabel(user.role)}</p>
              </div>
            </button>

            <div className="sm:hidden"><Avatar name={user.name} size="sm" /></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-neutral-50 dark:bg-neutral-950">
          {children}
        </main>
      </div>
    </div>
  );
}