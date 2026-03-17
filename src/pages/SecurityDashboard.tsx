import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  UserCheck, ClipboardList, UtensilsCrossed, Package,
  ChevronRight, Users, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const today = format(new Date(), "yyyy-MM-dd");
const todayLabel = format(new Date(), "EEEE, dd MMM yyyy");

const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.4)] transition-shadow duration-200";
const CARD_YELLOW = "bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)] hover:shadow-[0_6px_28px_0_rgba(234,179,8,0.45)] transition-shadow duration-200";
const CARD_DARK = "bg-neutral-900 dark:bg-neutral-800 rounded-2xl shadow-[0_2px_12px_0_rgba(0,0,0,0.18)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.28)] transition-shadow duration-200";

/* ── Nav Card ── */
const NavCard = ({ icon: Icon, label, desc, onClick, color, bg, border }: {
  icon: React.ElementType; label: string; desc: string; onClick: () => void;
  color: string; bg: string; border: string;
}) => (
  <button onClick={onClick}
    className={cn(CARD, "w-full flex flex-col items-start gap-3 p-4 text-left active:scale-[.98] cursor-pointer")}>
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", bg, border)}>
      <Icon className={cn("w-5 h-5", color)} strokeWidth={1.8} />
    </div>
    <div className="w-full">
      <p className="text-sm font-bold text-neutral-900 dark:text-white">{label}</p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{desc}</p>
    </div>
    <span className="text-xs text-[#EAB308] font-semibold">Open →</span>
  </button>
);

/* ── Progress Bar ── */
const Bar = ({ value, max, color = "bg-[#EAB308]" }: { value: number; max: number; color?: string }) => (
  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
    <div className={cn("h-full rounded-full transition-all duration-700", color)}
      style={{ width: `${max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0}%` }} />
  </div>
);

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["sec-attendance", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, profiles(name, departments(name))")
        .eq("date", today)
        .limit(6);
      return data || [];
    },
  });

  const { data: totalEmployees = 0 } = useQuery({
    queryKey: ["sec-total-emp"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count || 0;
    },
  });

  const { data: activeGatePasses = 0 } = useQuery({
    queryKey: ["sec-gate-passes"],
    queryFn: async () => {
      const { count } = await supabase.from("gate_passes").select("*", { count: "exact", head: true })
        .in("status", ["created", "approved", "exited"]);
      return count || 0;
    },
  });

  const { data: todayCanteen = 0 } = useQuery({
    queryKey: ["sec-canteen", today],
    queryFn: async () => {
      const { count } = await supabase.from("canteen_logs").select("*", { count: "exact", head: true }).eq("date", today);
      return count || 0;
    },
  });

  const { data: pendingMaterial = 0 } = useQuery({
    queryKey: ["sec-material"],
    queryFn: async () => {
      const { count } = await supabase.from("job_work").select("*", { count: "exact", head: true })
        .in("current_step", [3, 4]);
      return count || 0;
    },
  });

  const { data: recentPasses = [] } = useQuery({
    queryKey: ["sec-recent-passes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gate_passes")
        .select("*, profiles(name)")
        .in("status", ["created", "approved", "exited"])
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  const checkedIn = (todayAttendance as any[]).filter((a: any) => a.in_time).length;
  const absent = totalEmployees - checkedIn;
  const approved = (todayAttendance as any[]).filter((a: any) => a.employee_approved).length;
  const attendPct = totalEmployees > 0 ? Math.round((checkedIn / totalEmployees) * 100) : 0;

  const PASS_STATUS: Record<string, { label: string; cls: string }> = {
    created: { label: "Pending", cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40" },
    approved: { label: "Approved", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" },
    exited: { label: "Outside", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40" },
    returned: { label: "Returned", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" },
    closed: { label: "Closed", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700" },
  };

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">{todayLabel}</p>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">
          Security Dashboard
        </h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
          Attendance · Gate Pass · Canteen · Material
        </p>
      </div>

      {/* ── ROW 1: Yellow attendance card + gate pass + canteen ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Checked In — Yellow */}
        <div className={cn(CARD_YELLOW, "p-5 relative overflow-hidden")}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-black/55 text-xs font-semibold uppercase tracking-wider">Checked In Today</p>
              <p className="text-black font-black text-4xl mt-1 leading-none">{checkedIn}</p>
              <p className="text-black/55 text-xs mt-1">out of {totalEmployees} employees</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-black/65" strokeWidth={1.8} />
            </div>
          </div>
          {/* Mini breakdown */}
          <div className="flex gap-3 mt-3 mb-4">
            <div className="bg-black/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-black font-bold text-lg leading-none">{attendPct}%</p>
              <p className="text-black/55 text-[10px] mt-0.5">Present</p>
            </div>
            <div className="bg-black/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-black font-bold text-lg leading-none">{absent}</p>
              <p className="text-black/55 text-[10px] mt-0.5">Absent</p>
            </div>
            <div className="bg-black/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-black font-bold text-lg leading-none">{approved}</p>
              <p className="text-black/55 text-[10px] mt-0.5">Approved</p>
            </div>
          </div>
          <button onClick={() => navigate("/security/attendance")}
            className="flex items-center gap-1.5 bg-black/10 hover:bg-black/20 text-black text-xs font-semibold px-3 py-1.5 rounded-xl transition-all">
            <UserCheck className="w-3.5 h-3.5" />Mark Attendance
          </button>
          {/* Decorative */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-black/5 rounded-full" />
        </div>

        {/* Gate Passes */}
        <div className={cn(CARD, "p-5")}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Active Gate Passes</p>
              <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1 leading-none">{activeGatePasses}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-500 dark:text-blue-400" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">Open passes today</p>

          {/* Recent passes */}
          <div className="space-y-1.5">
            {(recentPasses as any[]).slice(0, 3).map((p: any, i: number) => {
              const st = PASS_STATUS[p.status] ?? PASS_STATUS.created;
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate flex-1">{p.profiles?.name ?? "—"}</p>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border ml-2 flex-shrink-0", st.cls)}>{st.label}</span>
                </div>
              );
            })}
            {(recentPasses as any[]).length === 0 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">No active passes</p>
            )}
          </div>
          <button onClick={() => navigate("/security/gatepass")}
            className="mt-3 text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
            Manage gate passes <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Canteen + Material */}
        <div className="flex flex-col gap-4">
          {/* Canteen */}
          <div className={cn(CARD, "p-4 flex items-center gap-4")}>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-900/40">
              <UtensilsCrossed className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Canteen Today</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-white leading-tight">{todayCanteen}</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">lunch entries</p>
            </div>
            <button onClick={() => navigate("/security/canteen")}
              className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-[#EAB308] hover:bg-[#EAB308]/10 transition-colors flex-shrink-0">
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>

          {/* Pending Material */}
          <div className={cn(
            pendingMaterial > 0 ? CARD_DARK : CARD,
            "p-4 flex items-center gap-4"
          )}>
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border",
              pendingMaterial > 0
                ? "bg-amber-500/20 border-amber-500/30"
                : "bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700"
            )}>
              <Package className={cn("w-5 h-5", pendingMaterial > 0 ? "text-amber-400" : "text-neutral-400 dark:text-neutral-500")} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs", pendingMaterial > 0 ? "text-neutral-400" : "text-neutral-400 dark:text-neutral-500")}>
                Pending Material
              </p>
              <p className={cn("text-2xl font-black leading-tight", pendingMaterial > 0 ? "text-white" : "text-neutral-900 dark:text-white")}>
                {pendingMaterial}
              </p>
              <p className={cn("text-[10px]", pendingMaterial > 0 ? "text-neutral-400" : "text-neutral-400 dark:text-neutral-500")}>
                awaiting action
              </p>
            </div>
            <button onClick={() => navigate("/security/material")}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                pendingMaterial > 0
                  ? "bg-white/5 text-neutral-400 hover:bg-[#EAB308]/20 hover:text-[#EAB308]"
                  : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-[#EAB308] hover:bg-[#EAB308]/10"
              )}>
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Attendance progress + recent list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Attendance breakdown */}
        <div className={cn(CARD, "p-5")}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">Attendance Breakdown</p>
            </div>
            <button onClick={() => navigate("/security/attendance")}
              className="text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Ring-less progress indicators */}
          <div className="space-y-3 mb-4">
            {[
              { label: "Present", value: checkedIn, max: totalEmployees, color: "bg-[#EAB308]", text: "text-[#EAB308]" },
              { label: "Absent", value: absent, max: totalEmployees, color: "bg-red-400", text: "text-red-500 dark:text-red-400" },
              { label: "Approved", value: approved, max: checkedIn || 1, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
              { label: "Canteen", value: todayCanteen as number, max: checkedIn || 1, color: "bg-blue-400", text: "text-blue-600 dark:text-blue-400" },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</span>
                  <span className={cn("text-xs font-bold", s.text)}>{s.value}</span>
                </div>
                <Bar value={s.value} max={s.max} color={s.color} />
              </div>
            ))}
          </div>

          {/* Recent attendance */}
          <div className="space-y-1">
            {(todayAttendance as any[]).slice(0, 5).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0">
                <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                    {(a.profiles?.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{a.profiles?.name}</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{a.profiles?.departments?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                    {a.in_time ? format(new Date(a.in_time), "hh:mm a") : "—"}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", a.employee_approved ? "bg-emerald-500" : "bg-amber-400")} />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {a.employee_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(todayAttendance as any[]).length === 0 && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
                No attendance marked yet today
              </p>
            )}
          </div>
        </div>

        {/* Quick actions — right column */}
        <div className="flex flex-col gap-4">
          {/* Today summary dark card */}
          <div className={cn(CARD_DARK, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[#EAB308]" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-white">Today's Summary</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Staff", value: totalEmployees, color: "text-white" },
                { label: "Checked In", value: checkedIn, color: "text-[#EAB308]" },
                { label: "Gate Passes", value: activeGatePasses, color: "text-blue-400" },
                { label: "Canteen", value: todayCanteen, color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                  <p className={cn("text-2xl font-black tabular-nums", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nav cards 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <NavCard icon={UserCheck} label="Attendance" desc="IN / OUT tracking" onClick={() => navigate("/security/attendance")}
              color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/20" border="border-yellow-100 dark:border-yellow-900/40" />
            <NavCard icon={ClipboardList} label="Gate Pass" desc="Return & Non-Return" onClick={() => navigate("/security/gatepass")}
              color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-900/40" />
            <NavCard icon={UtensilsCrossed} label="Canteen" desc="Mark lunch entries" onClick={() => navigate("/security/canteen")}
              color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" border="border-emerald-100 dark:border-emerald-900/40" />
            <NavCard icon={Package} label="Material" desc="Dispatch & receive" onClick={() => navigate("/security/material")}
              color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/20" border="border-orange-100 dark:border-orange-900/40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;