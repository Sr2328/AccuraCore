import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import {
  ShoppingCart, Package, AlertTriangle, CheckCircle2,
  Users, ClipboardList, ArrowRight, Plus, Download,
  TrendingUp, TrendingDown, Clock, XCircle, Eye,
  BarChart3, Boxes, ChevronRight, Bell, FileText,
  RefreshCw, Calendar, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

/* ══════════════════════════════════════════════
   SHADOW / DESIGN TOKENS
══════════════════════════════════════════════ */
// Card shadow classes used throughout — soft 2d lift effect
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.4)] transition-shadow duration-200";
const CARD_YELLOW = "bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)] hover:shadow-[0_6px_28px_0_rgba(234,179,8,0.45)] transition-shadow duration-200";
const CARD_DARK = "bg-neutral-900 dark:bg-neutral-800 rounded-2xl shadow-[0_2px_12px_0_rgba(0,0,0,0.18)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.28)] transition-shadow duration-200";

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const today = format(new Date(), "yyyy-MM-dd");
const todayLabel = format(new Date(), "EEEE, dd MMM yyyy");

/* ══════════════════════════════════════════════
   EXPORT MODAL
══════════════════════════════════════════════ */
const ExportModal = ({
  onClose,
  activeJobs,
  activeRM,
  overdueJobs,
  pendingTasks,
  closedToday,
  suppliersActive,
  suppliersInactive,
}: {
  onClose: () => void;
  activeJobs: number; activeRM: number; overdueJobs: number;
  pendingTasks: number; closedToday: number;
  suppliersActive: number; suppliersInactive: number;
}) => {
  const [exporting, setExporting] = useState(false);

  const doExport = async (type: "csv" | "pdf") => {
    setExporting(true);
    const filename = `Accura_Procurement_Report_${format(new Date(), "dd-MM-yyyy")}`;
    const title = `Accura Procurement Dashboard Report — ${todayLabel}`;
    const headers = ["Metric", "Value"];
    const rows = [
      ["Active Job Work", String(activeJobs)],
      ["Active RM Orders", String(activeRM)],
      ["Overdue Items", String(overdueJobs)],
      ["Pending Tasks", String(pendingTasks)],
      ["Closed Job Work (Today)", String(closedToday)],
      ["Active Suppliers", String(suppliersActive)],
      ["Inactive Suppliers", String(suppliersInactive)],
      ["Report Generated", new Date().toLocaleString("en-IN")],
    ];
    if (type === "csv") exportToCSV(filename, headers, rows);
    else exportToPDF(filename, title, headers, rows, "portrait");
    setExporting(false);
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
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Export today's procurement summary — {todayLabel}
          </p>
          <button onClick={() => doExport("csv")} disabled={exporting}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white">Export as CSV</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Open in Excel / Sheets</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-[#EAB308] transition-colors" />
          </button>
          <button onClick={() => doExport("pdf")} disabled={exporting}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-red-500 dark:text-red-400" strokeWidth={1.8} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white">Export as PDF</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Print-ready report</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-[#EAB308] transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   STAT BADGE  (small +3 this month pill)
══════════════════════════════════════════════ */
const StatPill = ({ value, label, up }: { value: string | number; label: string; up?: boolean }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border",
    up !== false
      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
      : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-900/40"
  )}>
    {up !== false ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
    +{value} {label}
  </span>
);

/* ══════════════════════════════════════════════
   QUICK ACTION BUTTON
══════════════════════════════════════════════ */
const QBtn = ({
  icon: Icon, label, onClick, yellow,
}: {
  icon: React.ElementType; label: string; onClick: () => void; yellow?: boolean;
}) => (
  <button onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95",
      yellow
        ? "bg-black/10 border-black/10 text-black hover:bg-black/20"
        : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-[#EAB308]/50 hover:text-[#EAB308] hover:bg-[#EAB308]/5"
    )}>
    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
    {label}
  </button>
);

/* ══════════════════════════════════════════════
   NAV CARD (bottom 4 cards)
══════════════════════════════════════════════ */
const NavCard = ({
  icon: Icon, label, desc, onClick, color, bg, border,
}: {
  icon: React.ElementType; label: string; desc: string;
  onClick: () => void; color: string; bg: string; border: string;
}) => (
  <button onClick={onClick}
    className={cn(
      CARD,
      "w-full flex flex-col items-start gap-3 p-4 text-left active:scale-[.98] cursor-pointer"
    )}>
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", bg, border)}>
      <Icon className={cn("w-5 h-5", color)} strokeWidth={1.8} />
    </div>
    <div className="flex-1 min-w-0 w-full">
      <p className="text-sm font-bold text-neutral-900 dark:text-white">{label}</p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{desc}</p>
    </div>
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-[#EAB308] font-semibold">Open →</span>
    </div>
  </button>
);

/* ══════════════════════════════════════════════
   PROGRESS BAR
══════════════════════════════════════════════ */
const Bar = ({ value, max, color = "bg-[#EAB308]" }: { value: number; max: number; color?: string }) => (
  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
    <div className={cn("h-full rounded-full transition-all duration-700", color)}
      style={{ width: `${max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0}%` }} />
  </div>
);

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
const ProcurementDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showExport, setShowExport] = useState(false);

  /* ── Queries ── */
  const { data: activeJobs = 0 } = useQuery({
    queryKey: ["proc-active-jobs"],
    queryFn: async () => {
      const { count } = await supabase.from("job_work").select("*", { count: "exact", head: true }).lt("current_step", 9);
      return count || 0;
    },
  });

  const { data: closedToday = 0 } = useQuery({
    queryKey: ["proc-closed-today", today],
    queryFn: async () => {
      const { count } = await supabase.from("job_work").select("*", { count: "exact", head: true })
        .eq("current_step", 9).gte("updated_at", `${today}T00:00:00`);
      return count || 0;
    },
  });

  const { data: activeRM = 0 } = useQuery({
    queryKey: ["proc-active-rm"],
    queryFn: async () => {
      const { count } = await supabase.from("rm_buying").select("*", { count: "exact", head: true }).lt("current_step", 8);
      return count || 0;
    },
  });

  const { data: todayRM = 0 } = useQuery({
    queryKey: ["proc-today-rm", today],
    queryFn: async () => {
      const { count } = await supabase.from("rm_buying").select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`);
      return count || 0;
    },
  });

  const { data: overdueJobs = 0 } = useQuery({
    queryKey: ["proc-overdue"],
    queryFn: async () => {
      const { count } = await supabase.from("job_work").select("*", { count: "exact", head: true })
        .eq("is_overdue", true);
      return count || 0;
    },
  });

  const { data: pendingTasks = 0 } = useQuery({
    queryKey: ["proc-pending-tasks"],
    queryFn: async () => {
      const { count } = await supabase.from("procurement_tasks").select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]);
      return count || 0;
    },
  });

  const { data: suppliersData = { active: 0, inactive: 0 } } = useQuery({
    queryKey: ["proc-suppliers-count"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("is_active");
      const active = (data ?? []).filter((s: any) => s.is_active).length;
      const inactive = (data ?? []).filter((s: any) => !s.is_active).length;
      return { active, inactive };
    },
  });

  const { data: storeStats = { totalItems: 0, totalRM: 0, lowStock: 0 } } = useQuery({
    queryKey: ["proc-store-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("id, current_qty, min_stock_level, category").eq("is_active", true);
      const totalItems = data?.length ?? 0;
      const totalRM = data?.filter((i: any) => i.category === "raw_material").length ?? 0;
      const lowStock = data?.filter((i: any) => i.current_qty <= i.min_stock_level).length ?? 0;
      return { totalItems, totalRM, lowStock };
    },
  });

  const { data: recentAlerts = [] } = useQuery({
    queryKey: ["proc-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("job_work").select("id, doc_no, material_name, is_overdue, updated_at")
        .eq("is_overdue", true).order("updated_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const { data: overdueTasksData = [] } = useQuery({
    queryKey: ["proc-overdue-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("procurement_tasks").select("id, title, status, due_date")
        .in("status", ["pending", "in_progress"]).order("due_date").limit(3);
      return data ?? [];
    },
  });

  return (
    <>
      <div className="space-y-5 pb-10">

        {/* ── HEADER ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">
              {todayLabel}
            </p>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">
              Welcome, {user?.name ?? "Procurement"} 👋
            </h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              Accura Procurement — here's your overview
            </p>
          </div>
          <button onClick={() => setShowExport(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-all shadow-sm">
            <Download className="w-4 h-4" strokeWidth={1.8} />
            Export Report
          </button>
        </div>

        {/* ══ ROW 1 — Active Job Work + Suppliers + Pending Tasks ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Active Job Work — YELLOW card */}
          <div className={cn(CARD_YELLOW, "p-5 relative overflow-hidden")}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-black/55 text-xs font-semibold uppercase tracking-wider">Active Job Work</p>
                <p className="text-black font-black text-4xl mt-1 leading-none">{activeJobs}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-black/65" strokeWidth={1.8} />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <StatPill value={3} label="this month" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <QBtn icon={Plus} label="+ Create" onClick={() => navigate("/procurement/jobwork")} yellow />
              <QBtn icon={Package} label="+ Pay RM" onClick={() => navigate("/procurement/buying")} yellow />
            </div>
            {/* Decorative */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-black/5 rounded-full" />
            <div className="absolute right-10 -bottom-8 w-16 h-16 bg-black/4 rounded-full" />
          </div>

          {/* Suppliers */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Suppliers</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1 leading-none">{suppliersData.active}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" strokeWidth={1.8} />
              </div>
            </div>
            <div className="space-y-2.5 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Active</span>
                </div>
                <span className="text-sm font-bold text-neutral-800 dark:text-white">{suppliersData.active}</span>
              </div>
              <Bar value={suppliersData.active} max={suppliersData.active + suppliersData.inactive} color="bg-emerald-500" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Inactive</span>
                </div>
                <span className="text-sm font-bold text-neutral-800 dark:text-white">{suppliersData.inactive}</span>
              </div>
              <button onClick={() => navigate("/procurement/suppliers")}
                className="mt-1 text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
                Manage suppliers <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Pending Tasks */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Pending Tasks</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1 leading-none">{pendingTasks}</p>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                pendingTasks > 0
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : "bg-emerald-50 dark:bg-emerald-900/20"
              )}>
                <CheckCircle2 className={cn(
                  "w-5 h-5",
                  pendingTasks > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500"
                )} strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">Action needed</p>
            <div className="space-y-1.5">
              {(overdueTasksData as any[]).slice(0, 3).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate flex-1">{t.title}</p>
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2 flex-shrink-0",
                    t.status === "in_progress"
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                  )}>
                    {t.status === "in_progress" ? "In Progress" : "Pending"}
                  </span>
                </div>
              ))}
              {pendingTasks === 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />All tasks completed
                </p>
              )}
            </div>
            <button onClick={() => navigate("/procurement/tasks")}
              className="mt-3 text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
              View all tasks <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ══ ROW 2 — Closed Job Work + Purchase Overview ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Closed Job Work (Today) */}
          <div className={cn(CARD_DARK, "p-5")}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Closed Job Work</p>
                <p className="text-neutral-300 text-xs mt-0.5">Today · {todayLabel}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#EAB308]" strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-5xl font-black text-white mb-1 leading-none">{closedToday}</p>
            <p className="text-neutral-400 text-xs mb-5">jobs closed today</p>
            <div className="flex gap-3">
              <button onClick={() => navigate("/procurement/jobwork")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all">
                <Eye className="w-3.5 h-3.5" />View Detail
              </button>
              <button onClick={() => navigate("/procurement/jobwork")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black text-xs font-semibold transition-all active:scale-95">
                <ArrowRight className="w-3.5 h-3.5" />All Job Work
              </button>
            </div>
          </div>

          {/* Provisional Purchase Overview */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Purchase Overview</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Provisional orders summary</p>
              </div>
              <button onClick={() => navigate("/procurement/buying")}
                className="flex items-center gap-1 text-xs text-[#EAB308] font-semibold hover:underline">
                + Day RM <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Big number */}
            <div className="flex items-end gap-6 mb-4">
              <div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Active orders</p>
                <p className="text-4xl font-black text-neutral-900 dark:text-white leading-none mt-0.5">{activeRM + activeJobs}</p>
              </div>
              <div className="flex gap-4 pb-1">
                <div className="text-center">
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">{activeRM}</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">RM</p>
                </div>
                <div className="w-px bg-neutral-100 dark:bg-neutral-800 self-stretch" />
                <div className="text-center">
                  <p className="text-xl font-black text-violet-600 dark:text-violet-400 leading-none">{activeJobs}</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Job Work</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Today's new orders</span>
              </div>
              <span className="text-sm font-bold text-[#EAB308]">{todayRM}</span>
            </div>

            {overdueJobs > 0 && (
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" strokeWidth={1.8} />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {overdueJobs} overdue — needs follow-up
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══ ROW 3 — Nav Cards (4 modules) ══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NavCard
            icon={ShoppingCart} label="Job Work" desc="9-step outsourcing flow"
            onClick={() => navigate("/procurement/jobwork")}
            color="text-violet-600 dark:text-violet-400"
            bg="bg-violet-50 dark:bg-violet-900/20"
            border="border-violet-100 dark:border-violet-900/40"
          />
          <NavCard
            icon={Package} label="RM Buying" desc="Material procurement"
            onClick={() => navigate("/procurement/buying")}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-50 dark:bg-blue-900/20"
            border="border-blue-100 dark:border-blue-900/40"
          />
          <NavCard
            icon={Users} label="Suppliers" desc="Supplier database"
            onClick={() => navigate("/procurement/suppliers")}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            border="border-emerald-100 dark:border-emerald-900/40"
          />
          <NavCard
            icon={ClipboardList} label="Tasks" desc="Daily task manager"
            onClick={() => navigate("/procurement/tasks")}
            color="text-orange-600 dark:text-orange-400"
            bg="bg-orange-50 dark:bg-orange-900/20"
            border="border-orange-100 dark:border-orange-900/40"
          />
        </div>

        {/* ══ ROW 4 — Store Overview + Alerts ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Store Overview */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
                <p className="text-sm font-semibold text-neutral-800 dark:text-white">Store Overview</p>
              </div>
              <button onClick={() => navigate("/store")}
                className="text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
                View Store <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total Items", value: storeStats.totalItems, color: "text-neutral-900 dark:text-white" },
                { label: "Total RM", value: storeStats.totalRM, color: "text-blue-600 dark:text-blue-400" },
                { label: "Low Stock", value: storeStats.lowStock, color: storeStats.lowStock > 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-center border border-neutral-100 dark:border-neutral-700">
                  <p className={cn("text-2xl font-black tabular-nums", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {storeStats.lowStock > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={1.8} />
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {storeStats.lowStock} items need restocking
                  </p>
                </div>
                <button onClick={() => navigate("/procurement/buying")}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                  Buy Now
                </button>
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
                <p className="text-sm font-semibold text-neutral-800 dark:text-white">Alerts</p>
                {(recentAlerts as any[]).length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {(recentAlerts as any[]).length}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {/* Overdue items */}
              {(recentAlerts as any[]).map((a: any) => (
                <div key={a.id}
                  className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 truncate">{a.material_name}</p>
                    <p className="text-[10px] text-red-400 dark:text-red-500">{a.doc_no} · Overdue</p>
                  </div>
                  <button onClick={() => navigate("/procurement/jobwork")}
                    className="flex-shrink-0 text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-lg hover:bg-red-200 transition-colors">
                    View
                  </button>
                </div>
              ))}

              {/* Low stock alert */}
              {storeStats.lowStock > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {storeStats.lowStock} items — 0 stock
                    </p>
                    <p className="text-[10px] text-amber-500 dark:text-amber-500">Store · Low stock alert</p>
                  </div>
                </div>
              )}

              {/* Pending tasks alert */}
              {pendingTasks > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {pendingTasks} pending tasks
                    </p>
                    <p className="text-[10px] text-blue-400 dark:text-blue-500">Tab left · {pendingTasks} items</p>
                  </div>
                  <button onClick={() => navigate("/procurement/tasks")}
                    className="flex-shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors">
                    Open
                  </button>
                </div>
              )}

              {/* All clear */}
              {(recentAlerts as any[]).length === 0 && storeStats.lowStock === 0 && pendingTasks === 0 && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={1.8} />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    No alerts — everything looks good!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          activeJobs={activeJobs as number}
          activeRM={activeRM as number}
          overdueJobs={overdueJobs as number}
          pendingTasks={pendingTasks as number}
          closedToday={closedToday as number}
          suppliersActive={suppliersData.active}
          suppliersInactive={suppliersData.inactive}
        />
      )}
    </>
  );
};

export default ProcurementDashboard;