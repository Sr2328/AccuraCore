import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Users, UserCheck, UserX, Banknote, ShieldCheck,
  ShoppingCart, Package, UtensilsCrossed, AlertTriangle,
  ChevronRight, TrendingUp, Download, BarChart3, FileText,
  XCircle, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

/* ══════════════════════════════════════════════
   DESIGN TOKENS — same as Procurement + Security
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.4)] transition-shadow duration-200";
const CARD_YELLOW = "bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)] hover:shadow-[0_6px_28px_0_rgba(234,179,8,0.45)] transition-shadow duration-200";
const CARD_DARK = "bg-neutral-900 dark:bg-neutral-800 rounded-2xl shadow-[0_2px_12px_0_rgba(0,0,0,0.18)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.28)] transition-shadow duration-200";

const today = format(new Date(), "yyyy-MM-dd");
const todayLabel = format(new Date(), "EEEE, dd MMMM yyyy");

/* ── Stat Card ── */
const StatCard = ({ title, value, subtitle, icon: Icon, yellow }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; yellow?: boolean;
}) => (
  <div className={cn("p-5 flex items-center justify-between gap-4", yellow ? CARD_YELLOW : CARD)}>
    <div>
      <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1.5",
        yellow ? "text-black/55" : "text-neutral-400 dark:text-neutral-500")}>
        {title}
      </p>
      <p className={cn("text-3xl font-black tabular-nums leading-none",
        yellow ? "text-black" : "text-neutral-900 dark:text-white")}>
        {value}
      </p>
      {subtitle && (
        <p className={cn("text-xs mt-1.5", yellow ? "text-black/55" : "text-neutral-400 dark:text-neutral-500")}>
          {subtitle}
        </p>
      )}
    </div>
    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
      yellow ? "bg-black/10" : "bg-neutral-50 dark:bg-neutral-800")}>
      <Icon className={cn("w-5 h-5", yellow ? "text-black/65" : "text-neutral-400 dark:text-neutral-500")}
        strokeWidth={1.8} />
    </div>
  </div>
);

/* ── Section Card ── */
const SC = ({ title, action, children, noPad }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; noPad?: boolean;
}) => (
  <div className={cn(CARD, "overflow-hidden")}>
    {title && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <p className="text-sm font-semibold text-neutral-800 dark:text-white">{title}</p>
        {action}
      </div>
    )}
    <div className={noPad ? "" : "p-5"}>{children}</div>
  </div>
);

/* ── Avatar ── */
const Avatar = ({ name }: { name?: string }) => (
  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
      {name?.charAt(0)?.toUpperCase() ?? "?"}
    </span>
  </div>
);

/* ── Bar ── */
const Bar = ({ value, max, color = "bg-[#EAB308]" }: { value: number; max: number; color?: string }) => (
  <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
    <div className={cn("h-full rounded-full transition-all duration-500", color)}
      style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
);

/* ── View All ── */
const ViewAll = ({ label = "View all", onClick }: { label?: string; onClick?: () => void }) => (
  <button onClick={onClick}
    className="flex items-center gap-0.5 text-xs text-[#EAB308] font-semibold hover:underline">
    {label} <ChevronRight className="w-3.5 h-3.5" />
  </button>
);

/* ══════════════════════════════════════════════
   EXPORT MODAL
══════════════════════════════════════════════ */
const ExportModal = ({ onClose, data }: {
  onClose: () => void;
  data: { totalEmployees: number; presentCount: number; absentCount: number; activeGatePasses: number; activeJobs: number; lowStock: number; todayCanteen: number };
}) => {
  const doExport = (type: "csv" | "pdf") => {
    const filename = `Accura_Admin_Report_${format(new Date(), "dd-MM-yyyy")}`;
    const title = `Accura Admin Dashboard Report — ${todayLabel}`;
    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Employees", String(data.totalEmployees)],
      ["Present Today", String(data.presentCount)],
      ["Absent Today", String(data.absentCount)],
      ["Attendance Rate", `${data.totalEmployees > 0 ? Math.round((data.presentCount / data.totalEmployees) * 100) : 0}%`],
      ["Active Gate Passes", String(data.activeGatePasses)],
      ["Active Job Work", String(data.activeJobs)],
      ["Low Stock Items", String(data.lowStock)],
      ["Canteen Today", String(data.todayCanteen)],
      ["Report Generated", new Date().toLocaleString("en-IN")],
    ];
    if (type === "csv") exportToCSV(filename, headers, rows);
    else exportToPDF(filename, title, headers, rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-neutral-400" strokeWidth={1.8} />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">Export Report</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Today's summary — {todayLabel}</p>
          {[
            { type: "csv" as const, icon: FileText, label: "Export as CSV", sub: "Open in Excel / Sheets", iconBg: "bg-emerald-50 dark:bg-emerald-900/20", iconCl: "text-emerald-600 dark:text-emerald-400" },
            { type: "pdf" as const, icon: BarChart3, label: "Export as PDF", sub: "Print-ready report", iconBg: "bg-red-50 dark:bg-red-900/20", iconCl: "text-red-500 dark:text-red-400" },
          ].map(e => (
            <button key={e.type} onClick={() => doExport(e.type)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 transition-all group">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", e.iconBg)}>
                  <e.icon className={cn("w-4 h-4", e.iconCl)} strokeWidth={1.8} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white">{e.label}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{e.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-[#EAB308] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user } = useAuth();
  const [showExport, setShowExport] = useState(false);

  const { data: totalEmployees = 0 } = useQuery({
    queryKey: ["admin-total-employees"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles")
        .select("*", { count: "exact", head: true }).eq("is_active", true);
      return count || 0;
    },
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["admin-attendance-today", today],
    queryFn: async () => {
      const { data } = await supabase.from("attendance")
        .select("*, profiles(name, departments(name))").eq("date", today).limit(8);
      return data || [];
    },
  });

  const { data: activeGatePasses = 0 } = useQuery({
    queryKey: ["admin-gate-passes"],
    queryFn: async () => {
      const { count } = await supabase.from("gate_passes")
        .select("*", { count: "exact", head: true }).in("status", ["created", "approved", "exited"]);
      return count || 0;
    },
  });

  const { data: activeJobs = [] } = useQuery({
    queryKey: ["admin-active-jobs"],
    queryFn: async () => {
      const { data } = await supabase.from("job_work")
        .select("*, suppliers(name)").lt("current_step", 9)
        .order("updated_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items")
        .select("id, name, current_qty, min_stock_level").eq("is_active", true);
      return (data || []).filter((i: any) => i.current_qty <= i.min_stock_level);
    },
  });

  const { data: todayCanteen = 0 } = useQuery({
    queryKey: ["admin-canteen", today],
    queryFn: async () => {
      const { count } = await supabase.from("canteen_logs")
        .select("*", { count: "exact", head: true }).eq("date", today);
      return count || 0;
    },
  });

  const presentCount = (todayAttendance as any[]).filter(a => a.in_time).length;
  const absentCount = totalEmployees - presentCount;
  const approvedCount = (todayAttendance as any[]).filter(a => a.employee_approved).length;
  const attendancePct = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  return (
    <>
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">{todayLabel}</p>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">
              Welcome, {user?.name} 👋
            </h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">Here's your complete overview for today</p>
          </div>
          <button onClick={() => setShowExport(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-all shadow-sm">
            <Download className="w-4 h-4" strokeWidth={1.8} />Export Report
          </button>
        </div>

        {/* ── Welcome Banner ── */}
        <div className={cn(CARD_YELLOW, "px-6 py-5 relative overflow-hidden")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <p className="text-black/55 text-sm font-medium">Today's attendance</p>
              <p className="text-black font-black text-2xl mt-0.5 leading-tight">{presentCount} / {totalEmployees} Present</p>
              <p className="text-black/55 text-sm mt-1">{attendancePct}% rate · {todayCanteen as number} lunches marked</p>
            </div>
            <div className="flex gap-3">
              {[
                { label: "Present", value: `${attendancePct}%` },
                { label: "Absent", value: absentCount },
                { label: "Approved", value: approvedCount },
              ].map(s => (
                <div key={s.label} className="bg-black/10 rounded-xl px-3 py-2.5 text-center min-w-[60px]">
                  <p className="text-black font-black text-xl leading-none">{s.value}</p>
                  <p className="text-black/55 text-[10px] mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-black/5 rounded-full" />
          <div className="absolute right-20 -bottom-10 w-20 h-20 bg-black/4 rounded-full" />
        </div>

        {/* ── Stats Row 1 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Employees" value={totalEmployees} subtitle="Active workforce" icon={Users} />
          <StatCard title="Present Today" value={presentCount} subtitle={`${attendancePct}% rate`} icon={UserCheck} yellow />
          <StatCard title="Absent Today" value={absentCount} subtitle="Not checked in" icon={UserX} />
          <StatCard title="Gate Passes" value={activeGatePasses} subtitle="Open passes" icon={ShieldCheck} />
        </div>

        {/* ── Stats Row 2 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Jobs" value={(activeJobs as any[]).length} subtitle="Procurement" icon={ShoppingCart} />
          <StatCard title="Low Stock" value={lowStockItems.length} subtitle="Below minimum" icon={Package} />
          <StatCard title="Canteen Today" value={todayCanteen} subtitle="Lunches marked" icon={UtensilsCrossed} />
          <StatCard title="Salary" value="Pending" subtitle={format(new Date(), "MMMM yyyy")} icon={Banknote} />
        </div>

        {/* ── Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Attendance */}
          <SC title="Recent Attendance" noPad action={<ViewAll />}>
            {(todayAttendance as any[]).length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {(todayAttendance as any[]).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <Avatar name={item.profiles?.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{item.profiles?.name}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{item.profiles?.departments?.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {item.in_time ? format(new Date(item.in_time), "hh:mm a") : "—"}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full", item.employee_approved ? "bg-emerald-500" : "bg-amber-400")} />
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {item.employee_approved ? "Approved" : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No attendance data for today</p>
              </div>
            )}
          </SC>

          {/* Job Work */}
          <SC title="Active Job Work" noPad action={<ViewAll />}>
            {(activeJobs as any[]).length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {(activeJobs as any[]).map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{item.material_name}</p>
                        {item.is_overdue && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/40 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-2.5 h-2.5" />Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{item.suppliers?.name} · {item.process_type}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 max-w-[100px]">
                          <Bar value={item.current_step} max={9} />
                        </div>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">Step {item.current_step}/9</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No active job work</p>
              </div>
            )}
          </SC>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Store Alerts */}
          <SC title="Store Alerts" action={<ViewAll label="View store" />}>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {(lowStockItems as any[]).map((item, i) => {
                  const pct = item.min_stock_level > 0 ? (item.current_qty / item.min_stock_level) * 100 : 0;
                  const isEmpty = item.current_qty === 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1.5">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.name}</p>
                        <p className={cn("text-xs font-semibold",
                          isEmpty ? "text-red-500" : pct < 50 ? "text-amber-500" : "text-neutral-400 dark:text-neutral-500")}>
                          {item.current_qty} / {item.min_stock_level}
                        </p>
                      </div>
                      <Bar value={item.current_qty} max={item.min_stock_level || 1}
                        color={isEmpty ? "bg-red-400" : pct < 50 ? "bg-amber-400" : "bg-[#EAB308]"} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                <p className="text-sm text-neutral-400 dark:text-neutral-500">All items above minimum level</p>
              </div>
            )}
          </SC>

          {/* Payroll */}
          <SC title="Payroll Overview">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total", value: totalEmployees, color: "text-neutral-900 dark:text-white" },
                { label: "Processed", value: 0, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Pending", value: totalEmployees, color: "text-amber-600 dark:text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-center border border-neutral-100 dark:border-neutral-700">
                  <p className={cn("text-2xl font-black tabular-nums", s.color)}>{s.value}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <button className="w-full bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm rounded-xl py-3 transition-all shadow-[0_2px_8px_0_rgba(234,179,8,0.3)] hover:shadow-[0_4px_16px_0_rgba(234,179,8,0.4)]">
              Process {format(new Date(), "MMMM")} Salary
            </button>
            <div className="mt-4 space-y-0.5">
              {[
                { label: "Leave Requests", count: 4, icon: TrendingUp },
                { label: "Gate Pass Pending", count: activeGatePasses, icon: ShieldCheck },
                { label: "Overdue Job Work", count: (activeJobs as any[]).filter((j: any) => j.is_overdue).length, icon: AlertTriangle },
              ].map(a => (
                <button key={a.label}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group">
                  <div className="flex items-center gap-2">
                    <a.icon className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">
                      {a.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-neutral-800 dark:text-white">{a.count}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </SC>
        </div>

        {/* ── Full Day Summary Dark Card ── */}
        <div className={cn(CARD_DARK, "p-5")}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#EAB308]" strokeWidth={1.8} />
            <p className="text-sm font-semibold text-white">Full Day Summary</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Staff", value: totalEmployees, color: "text-white" },
              { label: "Present", value: presentCount, color: "text-[#EAB308]" },
              { label: "Gate Passes", value: activeGatePasses, color: "text-blue-400" },
              { label: "Job Work", value: (activeJobs as any[]).length, color: "text-violet-400" },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className={cn("text-2xl font-black tabular-nums", s.color)}>{s.value}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          data={{
            totalEmployees: totalEmployees as number,
            presentCount,
            absentCount,
            activeGatePasses: activeGatePasses as number,
            activeJobs: (activeJobs as any[]).length,
            lowStock: lowStockItems.length,
            todayCanteen: todayCanteen as number,
          }}
        />
      )}
    </>
  );
};

export default AdminDashboard;