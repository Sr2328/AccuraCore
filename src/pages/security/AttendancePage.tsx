import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Search, Clock, CheckCircle2, ChevronDown, ChevronUp, UserCheck, Users, LogOut, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";

const today = format(new Date(), "yyyy-MM-dd");
const todayLabel = format(new Date(), "EEEE, dd MMM yyyy");

/* Safe time display — in_time/out_time are timestamptz */
const fmtTime = (t?: string | null, secs = false): string => {
  if (!t || t.trim() === "") return "—";
  try {
    const date = new Date(t);
    if (isNaN(date.getTime())) return "—";
    return format(date, secs ? "hh:mm:ss a" : "hh:mm a");
  } catch {
    return "—";
  }
};

export default function SecurityAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpanded] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  /* ── Queries ── */
  const { data: employees = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, departments(name)")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["attendance-today", today],   // ✅ full key
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", today);
      return data || [];
    },
    refetchInterval: 10000,
  });

  /* ── Mark IN ── */
  const markIn = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.from("attendance").insert({
        employee_id: employeeId,
        date: today,
        in_time: new Date().toISOString(),          // ✅ timestamptz
        marked_by: user?.id,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-today", today] }); // ✅ full key
      qc.invalidateQueries({ queryKey: ["sec-attendance", today] });
      qc.invalidateQueries({ queryKey: ["admin-attendance-today", today] });
      toast.success("IN time marked successfully");
      setLoadingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark IN");
      setLoadingId(null);
    },
  });

  /* ── Mark OUT ── */
  const markOut = useMutation({
    mutationFn: async (attendanceId: string) => {
      const { error } = await supabase
        .from("attendance")
        .update({ out_time: new Date().toISOString() })          // ✅ timestamptz
        .eq("id", attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-today", today] }); // ✅ full key
      qc.invalidateQueries({ queryKey: ["sec-attendance", today] });
      qc.invalidateQueries({ queryKey: ["admin-attendance-today", today] });
      toast.success("OUT time marked successfully");
      setLoadingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark OUT");
      setLoadingId(null);
    },
  });

  /* ── Derived ── */
  const attendanceMap = new Map((todayAttendance as any[]).map((a: any) => [a.employee_id, a]));
  const filtered = (employees as any[]).filter((e: any) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    (e.user_id_custom ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const checkedIn = (todayAttendance as any[]).filter((a: any) => a.in_time).length;
  const checkedOut = (todayAttendance as any[]).filter((a: any) => a.out_time).length;
  const approved = (todayAttendance as any[]).filter((a: any) => a.employee_approved).length;

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">{todayLabel}</p>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">Attendance Management</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">Mark employee IN / OUT for today</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: (employees as any[]).length, color: "text-neutral-900 dark:text-white", bg: "bg-neutral-50 dark:bg-neutral-800", icon: Users },
          { label: "Checked In", value: checkedIn, color: "text-[#EAB308]", bg: "bg-[#EAB308]/10", icon: UserCheck },
          { label: "Checked Out", value: checkedOut, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", icon: LogOut },
          { label: "Approved", value: approved, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className={cn(CARD, "p-4 flex items-center gap-3")}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
              <s.icon className={cn("w-5 h-5", s.color)} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{s.label}</p>
              <p className={cn("text-2xl font-black tabular-nums leading-tight", s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Table Card ── */}
      <div className={cn(CARD, "overflow-hidden")}>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-sm font-semibold text-neutral-800 dark:text-white flex-1">Mark Attendance</p>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors"
            />
          </div>
        </div>

        {/* Table — scrollable horizontally on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                {["Employee", "Dept", "Shift", "IN", "OUT", "Hours", "Status", "Action", ""].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp: any) => {
                const att = attendanceMap.get(emp.id) as any;
                const isExpanded = expandedId === emp.id;
                const isLoading = loadingId === emp.id;

                return (
                  <>
                    <tr
                      key={emp.id}
                      className="border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : emp.id)}
                    >
                      {/* Employee */}
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EAB308]/15 flex items-center justify-center text-xs font-bold text-[#EAB308] flex-shrink-0">
                            {emp.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-800 dark:text-white truncate">{emp.name}</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">{emp.user_id_custom}</p>
                          </div>
                        </div>
                      </td>

                      {/* Dept */}
                      <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 text-xs">
                        {emp.departments?.name || "—"}
                      </td>

                      {/* Shift */}
                      <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 text-xs">
                        {emp.shift || "—"}
                      </td>

                      {/* IN ✅ fixed display */}
                      <td className="py-3 px-3 text-center">
                        <span className={cn("text-sm font-medium", att?.in_time ? "text-neutral-800 dark:text-white" : "text-neutral-300 dark:text-neutral-600")}>
                          {fmtTime(att?.in_time)}
                        </span>
                      </td>

                      {/* OUT ✅ fixed display */}
                      <td className="py-3 px-3 text-center">
                        <span className={cn("text-sm font-medium", att?.out_time ? "text-neutral-800 dark:text-white" : "text-neutral-300 dark:text-neutral-600")}>
                          {fmtTime(att?.out_time)}
                        </span>
                      </td>

                      {/* Hours */}
                      <td className="py-3 px-3 text-center text-neutral-500 dark:text-neutral-400 text-xs">
                        {att?.total_hours ? `${att.total_hours}h` : "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {att?.employee_approved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-3 h-3" />Locked
                          </span>
                        ) : att?.in_time ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40">
                            <Clock className="w-3 h-3" />Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-100 dark:border-neutral-700">
                            Not Marked
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        {att?.employee_approved ? (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">Locked</span>
                        ) : !att ? (
                          <button
                            disabled={isLoading}
                            onClick={() => { setLoadingId(emp.id); markIn.mutate(emp.id); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EAB308] hover:bg-yellow-500 text-black text-xs font-bold transition-all active:scale-95 disabled:opacity-60">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                            Mark IN
                          </button>
                        ) : !att.out_time ? (
                          <button
                            disabled={isLoading}
                            onClick={() => { setLoadingId(emp.id); markOut.mutate(att.id); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all active:scale-95 border border-neutral-200 dark:border-neutral-700 disabled:opacity-60">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                            Mark OUT
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Complete</span>
                        )}
                      </td>

                      {/* Expand toggle */}
                      <td className="py-3 pr-5 pl-1">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                          : <ChevronDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${emp.id}-detail`}>
                        <td colSpan={9} className="bg-neutral-50/80 dark:bg-neutral-800/40 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                            {/* Profile */}
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-[#EAB308]/15 flex items-center justify-center text-2xl font-black text-[#EAB308] flex-shrink-0">
                                {emp.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-neutral-900 dark:text-white">{emp.name}</p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                                  {emp.departments?.name}{emp.designation ? ` · ${emp.designation}` : ""}
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                  Shift: {emp.shift || "N/A"} · Joined: {emp.joining_date || "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Attendance detail */}
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                <span className="text-neutral-400 dark:text-neutral-500">Date</span>
                                <span className="font-medium text-neutral-800 dark:text-white">
                                  {format(new Date(), "dd MMM yyyy")} ({format(new Date(), "EEE")})
                                </span>

                                <span className="text-neutral-400 dark:text-neutral-500">IN Time</span>
                                <span className="font-medium text-neutral-800 dark:text-white">
                                  {fmtTime(att?.in_time, true)} {/* ✅ fixed */}
                                </span>

                                <span className="text-neutral-400 dark:text-neutral-500">OUT Time</span>
                                <span className="font-medium text-neutral-800 dark:text-white">
                                  {fmtTime(att?.out_time, true)} {/* ✅ fixed */}
                                </span>

                                <span className="text-neutral-400 dark:text-neutral-500">Total Hours</span>
                                <span className="font-medium text-neutral-800 dark:text-white">
                                  {att?.total_hours ? `${att.total_hours} hrs` : "—"}
                                </span>

                                <span className="text-neutral-400 dark:text-neutral-500">Employee Approval</span>
                                <span className={cn("font-semibold",
                                  att?.employee_approved
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                )}>
                                  {att?.employee_approved ? "✓ Approved" : "Pending"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
                    {search ? "No employees match your search" : "No employees found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {filtered.length} of {(employees as any[]).length} employees · Auto-refreshes every 10s
          </p>
        </div>
      </div>
    </div>
  );
}