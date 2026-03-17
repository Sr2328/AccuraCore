import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Download, Eye, ArrowLeft, CheckCircle2, Circle, FileText,
  ShieldCheck, Truck, Clock, RotateCcw, User, BadgeCheck,
  Receipt, AlertTriangle, MessageSquare, Plus, X, Loader2,
  ChevronRight, Package, BarChart3, TrendingUp, CreditCard,
  Banknote, Send, ExternalLink, ImageIcon, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import DateRangeFilter from "@/components/ui/DateRangeFilter";

/* ══════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.4)] transition-shadow duration-200";
const CARD_YELLOW = "bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)]";
const CARD_DARK = "bg-neutral-900 dark:bg-neutral-800 rounded-2xl shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";
const inputCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors";
const labelCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const JW_STEPS = [
  { n: 1, label: "Requirement Received", icon: FileText },
  { n: 2, label: "Challan Prepared", icon: FileText },
  { n: 3, label: "Handed to Security", icon: ShieldCheck },
  { n: 4, label: "Material Dispatched", icon: Truck },
  { n: 5, label: "In Process at Supplier", icon: Clock },
  { n: 6, label: "Material Returned", icon: RotateCcw },
  { n: 7, label: "Ref Person Approval", icon: User },
  { n: 8, label: "High Authority Approval", icon: BadgeCheck },
  { n: 9, label: "Closed · Invoice Received", icon: Receipt },
];

const RM_STEPS = [
  { n: 1, label: "Requirement Created", icon: FileText },
  { n: 2, label: "Slip Sent to Suppliers", icon: Send },
  { n: 3, label: "Rate Comparison", icon: BarChart3 },
  { n: 4, label: "Processing Report", icon: FileText },
  { n: 5, label: "Authority Approval", icon: BadgeCheck },
  { n: 6, label: "PO Raised", icon: Receipt },
  { n: 7, label: "Tracking", icon: Truck },
  { n: 8, label: "Material Received", icon: CheckCircle2 },
];

const CHART_COLORS = ["#EAB308", "#3B82F6", "#10B981", "#8B5CF6", "#F97316", "#EC4899"];

const inr = (n?: number | null) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const fd = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy") : "—";
const fdt = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy, hh:mm a") : "—";

/* ══════════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════════ */
const SC = ({ title, icon: Icon, children, action }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) => (
  <div className={cn(CARD, "overflow-hidden")}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />}
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</span>
      </div>
      {action}
    </div>
    <div className="px-4 py-3">{children}</div>
  </div>
);

const DR = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
    <span className="text-sm text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex-shrink-0">{label}</span>
    <span className="text-sm font-medium text-neutral-800 dark:text-white text-right">{value ?? "—"}</span>
  </div>
);

const Modal = ({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode;
  footer?: React.ReactNode; wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={cn(
      "relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl max-h-[92vh] flex flex-col",
      wide ? "sm:max-w-2xl" : "sm:max-w-lg"
    )}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      {footer && <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">{footer}</div>}
    </div>
  </div>
);

/* Status badge */
const StepBadge = ({ step, total }: { step: number; total: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 max-w-[80px] h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
      <div className="h-full bg-[#EAB308] rounded-full" style={{ width: `${Math.round((step / total) * 100)}%` }} />
    </div>
    <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">{step}/{total}</span>
  </div>
);

/* ══════════════════════════════════════════════
   JOB WORK TIMELINE
══════════════════════════════════════════════ */
const JWTimeline = ({ job, docs }: { job: any; docs: any[] }) => {
  const cur = job.current_step ?? 1;
  const timestamps: Record<number, string | null> = {
    1: job.created_at, 2: job.challan_url ? job.updated_at : null,
    3: job.security_handover_at, 4: job.dispatch_date, 5: job.dispatch_date,
    6: job.return_date, 7: job.ref_person_approved_at,
    8: job.high_authority_approved_at, 9: job.status === "closed" ? job.updated_at : null,
  };
  return (
    <div>
      {JW_STEPS.map((s, idx) => {
        const done = cur > s.n, active = cur === s.n, last = idx === JW_STEPS.length - 1;
        const ts = timestamps[s.n];
        const doc = docs.find(d => d.step_number === s.n);
        return (
          <div key={s.n} className="flex gap-3.5">
            <div className="flex flex-col items-center" style={{ width: 28 }}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors",
                done ? "bg-[#EAB308] border-[#EAB308] text-black"
                  : active ? "bg-white dark:bg-neutral-900 border-[#EAB308] text-[#EAB308]"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600"
              )}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  : active ? <s.icon className="w-3 h-3" strokeWidth={2} />
                    : <Circle className="w-3 h-3" strokeWidth={1.5} />}
              </div>
              {!last && <div className={cn("w-px flex-1 my-1", done ? "bg-[#EAB308]" : "bg-neutral-200 dark:bg-neutral-700")} style={{ minHeight: 24 }} />}
            </div>
            <div className={cn("flex-1 pb-4", last && "pb-0")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold leading-snug",
                    done ? "text-neutral-800 dark:text-white"
                      : active ? "text-[#CA8A04] dark:text-[#EAB308]"
                        : "text-neutral-300 dark:text-neutral-600"
                  )}>{s.label}</p>
                  {doc?.remarks && (done || active) && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 italic">{doc.remarks}</p>}
                  {doc?.doc_url && (
                    <a href={doc.doc_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#EAB308] hover:underline mt-1">
                      <FileText className="w-3 h-3" />View document
                    </a>
                  )}
                  {s.n === 7 && job.ref_person_approved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Ref approved</p>}
                  {s.n === 8 && job.high_authority_approved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />HA approved</p>}
                </div>
                {ts && (done || active) && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{format(new Date(ts), "hh:mm a")}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{format(new Date(ts), "dd.MM.yyyy")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════════════════════════════════
   SEND MESSAGE MODAL
══════════════════════════════════════════════ */
const SendMessageModal = ({ referenceId, referenceType, onClose }: {
  referenceId: string; referenceType: string; onClose: () => void;
}) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !body.trim()) throw new Error("Subject and message are required");
      // Find procurement users to send to
      const { data: procUsers } = await supabase
        .from("user_roles").select("user_id").eq("role", "procurement");
      const toIds = (procUsers ?? []).map((u: any) => u.user_id);
      if (toIds.length === 0) throw new Error("No procurement staff found");
      // Insert a message for each procurement user
      const msgs = toIds.map((toId: string) => ({
        from_user_id: user?.id,
        to_user_id: toId,
        subject: subject.trim(),
        body: body.trim(),
        reference_type: referenceType,
        reference_id: referenceId,
      }));
      const { error } = await supabase.from("messages").insert(msgs);
      if (error) throw error;
    },
    onSuccess: () => onClose(),
    onError: (e: any) => setError(e.message),
  });

  return (
    <Modal title="Message to Procurement" onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send Message</>}
          </button>
        </div>
      }>
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>}
      <div>
        <label className={labelCls}>Subject<span className="text-red-500 ml-0.5">*</span></label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} placeholder="e.g. Query regarding PO #RM-2024-001" />
      </div>
      <div>
        <label className={labelCls}>Message<span className="text-red-500 ml-0.5">*</span></label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className={cn(inputCls, "resize-none")}
          placeholder="Write your message to procurement team…" />
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   JOB WORK DETAIL VIEW
══════════════════════════════════════════════ */
const JWDetail = ({ job, onBack }: { job: any; onBack: () => void }) => {
  const [showMsg, setShowMsg] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["admin-jw-docs", job.id],
    queryFn: async () => {
      const { data } = await supabase.from("job_work_step_docs").select("*").eq("job_work_id", job.id).order("step_number");
      return data ?? [];
    },
  });

  const { data: comms = [] } = useQuery({
    queryKey: ["admin-jw-comms", job.id],
    queryFn: async () => {
      const { data } = await supabase.from("job_work_communications").select("*").eq("job_work_id", job.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const exportDetail = (type: "csv" | "pdf") => {
    const filename = `JW_${job.doc_no ?? job.id}_detail`;
    const title = `Job Work Detail — ${job.doc_no ?? job.id}`;
    const headers = ["Field", "Value"];
    const rows = [
      ["Doc No", job.doc_no ?? "—"],
      ["Material", job.material_name],
      ["Grade", job.material_grade ?? "—"],
      ["Quantity", `${job.quantity} ${job.unit ?? ""}`],
      ["Division", job.division],
      ["Process", job.process_type ?? "—"],
      ["Supplier", job.suppliers?.name ?? "—"],
      ["Current Step", `${job.current_step} / 9`],
      ["Status", job.status ?? "—"],
      ["Expected Return", job.expected_return_date ? fd(job.expected_return_date) : "—"],
      ["Actual Return", job.return_date ? fd(job.return_date) : "—"],
      ["Invoice No", job.invoice_number ?? "—"],
      ["Invoice Amount", job.invoice_amount != null ? inr(job.invoice_amount) : "—"],
      ["Overdue", job.is_overdue ? "Yes" : "No"],
      ["Remarks", job.remarks ?? "—"],
    ];
    if (type === "csv") exportToCSV(filename, headers, rows);
    else exportToPDF(filename, title, headers, rows);
  };

  return (
    <>
      <div className="space-y-4 pb-8">
        {/* Back bar */}
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.8} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{job.doc_no ?? "Job Work"}</h2>
              {job.is_overdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-2 py-0.5 rounded-lg">
                  <AlertTriangle className="w-3 h-3" />Overdue
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              {[job.division, job.process_type, job.suppliers?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowMsg(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />Message
            </button>
            <div className="flex gap-1">
              <button onClick={() => exportDetail("csv")}
                className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
                CSV
              </button>
              <button onClick={() => exportDetail("pdf")}
                className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={cn(CARD, "px-5 py-4")}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-neutral-800 dark:text-white">Progress</p>
            <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
              Step {job.current_step ?? 1} / 9 · {Math.round(((job.current_step ?? 1) / 9) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
            <div className={cn("h-full rounded-full transition-all", job.is_overdue ? "bg-red-400" : "bg-[#EAB308]")}
              style={{ width: `${Math.round(((job.current_step ?? 1) / 9) * 100)}%` }} />
          </div>
          <div className="flex justify-between">
            {JW_STEPS.map(s => (
              <div key={s.n} title={s.label} className={cn("w-2 h-2 rounded-full",
                (job.current_step ?? 1) > s.n ? "bg-[#EAB308]"
                  : (job.current_step ?? 1) === s.n ? "bg-[#EAB308] ring-2 ring-[#EAB308]/30"
                    : "bg-neutral-200 dark:bg-neutral-700"
              )} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* LEFT: Timeline */}
          <div className="lg:col-span-3 space-y-4">
            <SC title="Trip Tracking" icon={Truck}>
              <JWTimeline job={job} docs={docs as any[]} />
            </SC>

            {/* Communications */}
            {(comms as any[]).length > 0 && (
              <SC title="Communications" icon={MessageSquare}>
                <div className="space-y-2">
                  {(comms as any[]).map((c: any) => (
                    <div key={c.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 capitalize">{c.communication_type}</span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{fd(c.created_at)}</span>
                      </div>
                      {c.notes && <p className="text-sm text-neutral-500 dark:text-neutral-400">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              </SC>
            )}
          </div>

          {/* RIGHT: Details */}
          <div className="lg:col-span-2 space-y-4">
            <SC title="Job Details" icon={Package}>
              <DR label="Material" value={job.material_name} />
              <DR label="Grade" value={job.material_grade} />
              <DR label="Quantity" value={`${job.quantity} ${job.unit ?? ""}`} />
              <DR label="Division" value={job.division} />
              <DR label="Process" value={job.process_type} />
              <DR label="Supplier" value={job.suppliers?.name} />
              <DR label="TAT" value={job.tat_days ? `${job.tat_days} days` : null} />
            </SC>

            <SC title="Dispatch Info" icon={Truck}>
              <DR label="Dispatched" value={fd(job.dispatch_date)} />
              <DR label="Vehicle No." value={job.vehicle_number} />
              <DR label="Expected Return" value={fd(job.expected_return_date)} />
              <DR label="Actual Return" value={fd(job.return_date)} />
            </SC>

            {(job.current_step ?? 1) >= 6 && (
              <SC title="Return & Invoice" icon={Receipt}>
                <DR label="Received Qty" value={job.received_qty != null ? `${job.received_qty} ${job.unit ?? ""}` : null} />
                <DR label="Balance Qty" value={job.balance_qty != null ? `${job.balance_qty}  ${job.unit ?? ""}` : null} />
                <DR label="Invoice No." value={job.invoice_number} />
                <DR label="Amount" value={inr(job.invoice_amount)} />
                {job.invoice_url && (
                  <a href={job.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#EAB308] hover:underline mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <ExternalLink className="w-3.5 h-3.5" />View Invoice
                  </a>
                )}
              </SC>
            )}

            {job.remarks && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Remarks</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{job.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showMsg && <SendMessageModal referenceId={job.id} referenceType="job_work" onClose={() => setShowMsg(false)} />}
    </>
  );
};

/* ══════════════════════════════════════════════
   RM BUYING DETAIL VIEW
══════════════════════════════════════════════ */
const RMDetail = ({ order, onBack }: { order: any; onBack: () => void }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showMsg, setShowMsg] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");

  const { data: rates = [] } = useQuery({
    queryKey: ["admin-rm-rates", order.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_rates").select("*, suppliers(name)").eq("rm_buying_id", order.id).order("rate_per_unit");
      return data ?? [];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["admin-rm-docs", order.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_step_docs").select("*").eq("rm_buying_id", order.id).order("step_number");
      return data ?? [];
    },
  });

  const { data: comms = [] } = useQuery({
    queryKey: ["admin-rm-comms", order.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_communications").select("*").eq("rm_buying_id", order.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      if (!payRef.trim()) throw new Error("Payment reference is required");
      const { error } = await supabase.from("rm_buying").update({
        payment_status: "paid",
        payment_reference: payRef.trim(),
        payment_note: payNote || null,
        payment_date: new Date().toISOString(),
        payment_marked_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rm-view"] });
      setShowPayModal(false);
    },
    onError: (e: any) => setPayError(e.message),
  });

  const exportDetail = (type: "csv" | "pdf") => {
    const filename = `RM_${order.requirement_no ?? order.id}_detail`;
    const title = `RM Buying Detail — ${order.requirement_no ?? order.id}`;
    const headers = ["Field", "Value"];
    const rows = [
      ["Req No", order.requirement_no ?? "—"],
      ["Material", order.material_name],
      ["Category", order.category ?? "—"],
      ["Quantity", `${order.quantity} ${order.unit}`],
      ["Selected Supplier", order.suppliers?.name ?? "—"],
      ["Current Step", `${order.current_step} / 8`],
      ["Status", order.status ?? "—"],
      ["PO Number", order.po_number ?? "—"],
      ["Invoice No.", order.invoice_number ?? "—"],
      ["Invoice Amount", inr(order.invoice_amount)],
      ["Payment Status", order.payment_status ?? "—"],
      ["Payment Ref", order.payment_reference ?? "—"],
    ];
    if (type === "csv") exportToCSV(filename, headers, rows);
    else exportToPDF(filename, title, headers, rows);
  };

  const cur = order.current_step ?? 1;

  return (
    <>
      <div className="space-y-4 pb-8">
        {/* Back bar */}
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.8} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{order.requirement_no ?? "RM Order"}</h2>
              {order.payment_status === "paid" && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 rounded-lg">
                  <CheckCircle2 className="w-3 h-3" />Paid
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              {[order.material_name, order.category, order.suppliers?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button onClick={() => setShowMsg(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />Message
            </button>
            {order.payment_status !== "paid" && cur >= 8 && (
              <button onClick={() => setShowPayModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors">
                <CreditCard className="w-3.5 h-3.5" />Mark Paid
              </button>
            )}
            <div className="flex gap-1">
              <button onClick={() => exportDetail("csv")} className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">CSV</button>
              <button onClick={() => exportDetail("pdf")} className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">PDF</button>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className={cn(CARD, "px-5 py-4")}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-neutral-800 dark:text-white">Progress</p>
            <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">Step {cur} / 8 · {Math.round((cur / 8) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-[#EAB308] rounded-full transition-all" style={{ width: `${Math.round((cur / 8) * 100)}%` }} />
          </div>
          <div className="flex justify-between">
            {RM_STEPS.map(s => (
              <div key={s.n} title={s.label} className={cn("w-2 h-2 rounded-full",
                cur > s.n ? "bg-[#EAB308]" : cur === s.n ? "bg-[#EAB308] ring-2 ring-[#EAB308]/30" : "bg-neutral-200 dark:bg-neutral-700"
              )} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* LEFT */}
          <div className="lg:col-span-3 space-y-4">

            {/* RM Timeline */}
            <SC title="Step Tracking" icon={Truck}>
              <div>
                {RM_STEPS.map((s, idx) => {
                  const done = cur > s.n, active = cur === s.n, last = idx === RM_STEPS.length - 1;
                  const doc = (docs as any[]).find(d => d.step_number === s.n);
                  return (
                    <div key={s.n} className="flex gap-3.5">
                      <div className="flex flex-col items-center" style={{ width: 28 }}>
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors",
                          done ? "bg-[#EAB308] border-[#EAB308] text-black"
                            : active ? "bg-white dark:bg-neutral-900 border-[#EAB308] text-[#EAB308]"
                              : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600"
                        )}>
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} /> : active ? <s.icon className="w-3 h-3" strokeWidth={2} /> : <Circle className="w-3 h-3" strokeWidth={1.5} />}
                        </div>
                        {!last && <div className={cn("w-px flex-1 my-1", done ? "bg-[#EAB308]" : "bg-neutral-200 dark:bg-neutral-700")} style={{ minHeight: 24 }} />}
                      </div>
                      <div className={cn("flex-1 pb-4", last && "pb-0")}>
                        <p className={cn("text-sm font-semibold leading-snug",
                          done ? "text-neutral-800 dark:text-white" : active ? "text-[#CA8A04] dark:text-[#EAB308]" : "text-neutral-300 dark:text-neutral-600"
                        )}>{s.label}</p>
                        {doc?.doc_url && (
                          <a href={doc.doc_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#EAB308] hover:underline mt-1">
                            <FileText className="w-3 h-3" />View document
                          </a>
                        )}
                        {doc?.remarks && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 italic">{doc.remarks}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SC>

            {/* Rate Comparison */}
            {(rates as any[]).length > 0 && (
              <SC title="Rate Comparison" icon={BarChart3}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        {["Supplier", "Rate/Unit", "Total", "Lead Time", "Notes"].map(h => (
                          <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(rates as any[]).map((r: any, i) => {
                        const isLowest = i === 0; // sorted by rate_per_unit asc
                        return (
                          <tr key={r.id} className={cn("border-b border-neutral-50 dark:border-neutral-800/60 last:border-0", isLowest && "bg-[#EAB308]/5")}>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-1.5">
                                {isLowest && <span className="text-[10px] font-bold text-[#EAB308]">★ Best</span>}
                                <span className="text-sm font-medium text-neutral-800 dark:text-white">{r.suppliers?.name ?? "—"}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-semibold text-neutral-800 dark:text-white">{inr(r.rate_per_unit)}</td>
                            <td className="py-2.5 px-2 text-neutral-600 dark:text-neutral-400">{inr(r.total_amount)}</td>
                            <td className="py-2.5 px-2 text-neutral-400 dark:text-neutral-500">{r.lead_time_days ? `${r.lead_time_days}d` : "—"}</td>
                            <td className="py-2.5 px-2 text-neutral-400 dark:text-neutral-500 text-xs">{r.notes ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SC>
            )}

            {/* Communications */}
            {(comms as any[]).length > 0 && (
              <SC title="Communications" icon={MessageSquare}>
                <div className="space-y-2">
                  {(comms as any[]).map((c: any) => (
                    <div key={c.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 capitalize">{c.communication_type}</span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{fd(c.created_at)}</span>
                      </div>
                      {c.notes && <p className="text-sm text-neutral-500 dark:text-neutral-400">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              </SC>
            )}
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-4">
            <SC title="Order Details" icon={Package}>
              <DR label="Req No." value={order.requirement_no} />
              <DR label="Material" value={order.material_name} />
              <DR label="Category" value={order.category} />
              <DR label="Quantity" value={`${order.quantity} ${order.unit}`} />
              <DR label="Supplier" value={order.suppliers?.name} />
              <DR label="PO Number" value={order.po_number} />
            </SC>

            {/* Invoice / Proforma */}
            {(cur >= 6 || order.proforma_invoice_url || order.invoice_number) && (
              <SC title="Invoice & Documents" icon={Receipt}>
                {order.proforma_invoice_url && (
                  <a href={order.proforma_invoice_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900/30 mb-3 hover:bg-blue-100 transition-colors group">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                      <div>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Proforma Invoice</p>
                        <p className="text-[10px] text-blue-500 dark:text-blue-400">Uploaded by procurement</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600" />
                  </a>
                )}
                {order.invoice_url && (
                  <a href={order.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-900/30 mb-3 hover:bg-emerald-100 transition-colors group">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Final Invoice</p>
                        <p className="text-[10px] text-emerald-500 dark:text-emerald-400">Proof of purchase</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600" />
                  </a>
                )}
                <DR label="Invoice No." value={order.invoice_number} />
                <DR label="Invoice Amount" value={inr(order.invoice_amount)} />
              </SC>
            )}

            {/* Payment status */}
            <SC title="Payment" icon={Banknote}>
              {order.payment_status === "paid" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Payment Confirmed</p>
                      <p className="text-[10px] text-emerald-500">{fdt(order.payment_date)}</p>
                    </div>
                  </div>
                  <DR label="Reference" value={order.payment_reference} />
                  {order.payment_note && <DR label="Note" value={order.payment_note} />}
                </div>
              ) : cur >= 8 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Payment pending — material received</p>
                  </div>
                  <button onClick={() => setShowPayModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm rounded-xl py-2.5 transition-all">
                    <CreditCard className="w-4 h-4" />Mark as Paid
                  </button>
                </div>
              ) : (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">Available after material is received (Step 8)</p>
              )}
            </SC>
          </div>
        </div>
      </div>

      {/* Message modal */}
      {showMsg && <SendMessageModal referenceId={order.id} referenceType="rm_buying" onClose={() => setShowMsg(false)} />}

      {/* Mark as Paid modal */}
      {showPayModal && (
        <Modal title="Mark as Paid" onClose={() => { setShowPayModal(false); setPayError(""); }}
          footer={
            <div className="flex gap-3">
              <button onClick={() => setShowPayModal(false)} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
              <button onClick={() => markPaid.mutate()} disabled={markPaid.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {markPaid.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle2 className="w-4 h-4" />Confirm Payment</>}
              </button>
            </div>
          }>
          {payError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{payError}</p>}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{order.requirement_no}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{order.material_name} · {inr(order.invoice_amount)}</p>
          </div>
          <div>
            <label className={labelCls}>Payment Reference / UTR<span className="text-red-500 ml-0.5">*</span></label>
            <input value={payRef} onChange={e => setPayRef(e.target.value)} className={inputCls} placeholder="e.g. UTR123456789 or Cheque No." />
          </div>
          <div>
            <label className={labelCls}>Payment Note (optional)</label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)} className={inputCls} placeholder="Any additional note" />
          </div>
        </Modal>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
const AdminProcurementView = () => {
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [activeTab, setTab] = useState<"overview" | "jobwork" | "rmbuying" | "suppliers">("overview");
  const [selectedJW, setSelectedJW] = useState<any>(null);
  const [selectedRM, setSelectedRM] = useState<any>(null);

  /* ── Queries ── */
  const { data: jobs = [], isLoading: loadingJW } = useQuery({
    queryKey: ["admin-jw-view", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("job_work")
        .select("*, suppliers(name)")
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: rmOrders = [], isLoading: loadingRM } = useQuery({
    queryKey: ["admin-rm-view", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying")
        .select("*, suppliers:selected_supplier_id(name)")
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["admin-suppliers-view"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("name");
      return data || [];
    },
  });

  /* ── Derived stats ── */
  const jwTotal = (jobs as any[]).reduce((s, j: any) => s + (j.invoice_amount ?? 0), 0);
  const rmTotal = (rmOrders as any[]).reduce((s, o: any) => s + (o.invoice_amount ?? 0), 0);
  const totalSpend = jwTotal + rmTotal;
  const overdueJW = (jobs as any[]).filter((j: any) => j.is_overdue).length;
  const pendingPay = (rmOrders as any[]).filter((o: any) => o.current_step >= 8 && o.payment_status !== "paid").length;

  /* Chart data */
  const pieData = [
    { name: "Job Work", value: jwTotal },
    { name: "RM Buying", value: rmTotal },
  ].filter(d => d.value > 0);

  const jwByProcess = (jobs as any[]).reduce((acc: any, j: any) => {
    const k = j.process_type || "Other";
    acc[k] = (acc[k] ?? 0) + (j.invoice_amount ?? 0);
    return acc;
  }, {});
  const jwBarData = Object.entries(jwByProcess).map(([name, value]) => ({ name, value })).sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 6);

  const rmByCat = (rmOrders as any[]).reduce((acc: any, o: any) => {
    const k = o.category || "Other";
    acc[k] = (acc[k] ?? 0) + (o.invoice_amount ?? 0);
    return acc;
  }, {});
  const rmBarData = Object.entries(rmByCat).map(([name, value]) => ({ name, value })).sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 6);

  /* Export all */
  const exportAll = (type: "csv" | "pdf") => {
    const fn = `Procurement_${fromDate}_to_${toDate}`;
    const headers = ["Type", "Doc No", "Material", "Supplier", "Amount", "Status"];
    const rows = [
      ...(jobs as any[]).map((j: any) => ["JW", j.doc_no ?? "—", j.material_name, j.suppliers?.name ?? "—", inr(j.invoice_amount), j.status ?? "—"]),
      ...(rmOrders as any[]).map((o: any) => ["RM", o.requirement_no ?? "—", o.material_name, o.suppliers?.name ?? "—", inr(o.invoice_amount), o.status ?? "—"]),
    ];
    if (type === "csv") exportToCSV(fn, headers, rows);
    else exportToPDF(fn, `Procurement Report (${fromDate} to ${toDate})`, headers, rows, "landscape");
  };

  /* Sub-views */
  if (selectedJW) return <JWDetail job={selectedJW} onBack={() => setSelectedJW(null)} />;
  if (selectedRM) return <RMDetail order={selectedRM} onBack={() => setSelectedRM(null)} />;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "jobwork", label: `Job Work (${(jobs as any[]).length})` },
    { id: "rmbuying", label: `RM Buying (${(rmOrders as any[]).length})` },
    { id: "suppliers", label: `Suppliers (${(suppliers as any[]).length})` },
  ] as const;

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Eye className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Procurement</h1>
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">View Only</span>
          </div>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Admin read-only view of all procurement activities</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => exportAll("csv")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={() => exportAll("pdf")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-xs transition-colors">
            <Download className="w-3.5 h-3.5" />PDF
          </button>
        </div>
      </div>

      {/* Date filter */}
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={cn(
              "px-4 py-2 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
              activeTab === t.id
                ? "bg-[#EAB308] border-[#EAB308] text-black shadow-[0_2px_8px_0_rgba(234,179,8,0.3)]"
                : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/40 hover:text-neutral-700 dark:hover:text-white"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Spend", value: inr(totalSpend), color: "text-neutral-900 dark:text-white", yellow: true },
              { label: "Job Work Spend", value: inr(jwTotal), color: "text-violet-600 dark:text-violet-400", yellow: false },
              { label: "RM Buying Spend", value: inr(rmTotal), color: "text-blue-600 dark:text-blue-400", yellow: false },
              { label: "Pending Payments", value: pendingPay, color: "text-amber-600 dark:text-amber-400", yellow: false },
            ].map(s => (
              <div key={s.label} className={cn("rounded-2xl p-5", s.yellow ? CARD_YELLOW : CARD)}>
                <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1.5", s.yellow ? "text-black/55" : "text-neutral-400 dark:text-neutral-500")}>{s.label}</p>
                <p className={cn("text-2xl font-black tabular-nums leading-tight", s.yellow ? "text-black" : s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Active JW", value: (jobs as any[]).filter((j: any) => j.current_step < 9).length, color: "text-neutral-900 dark:text-white" },
              { label: "Closed JW", value: (jobs as any[]).filter((j: any) => j.current_step >= 9).length, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Overdue JW", value: overdueJW, color: overdueJW > 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400" },
              { label: "Active RM Orders", value: (rmOrders as any[]).filter((o: any) => o.current_step < 8).length, color: "text-neutral-900 dark:text-white" },
            ].map(s => (
              <div key={s.label} className={cn(CARD, "px-4 py-3 text-center")}>
                <p className={cn("text-2xl font-black tabular-nums", s.color)}>{s.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Spend split pie */}
            {pieData.length > 0 && (
              <SC title="Spend Breakdown" icon={BarChart3}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => inr(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </SC>
            )}

            {/* JW by process */}
            {jwBarData.length > 0 && (
              <SC title="Job Work Spend by Process" icon={TrendingUp}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={jwBarData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-neutral-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => inr(v)} />
                    <Bar dataKey="value" fill="#EAB308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SC>
            )}

            {/* RM by category */}
            {rmBarData.length > 0 && (
              <SC title="RM Spend by Category" icon={TrendingUp}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rmBarData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-neutral-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => inr(v)} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SC>
            )}

            {/* Top suppliers */}
            <SC title="Top Suppliers by Spend" icon={Package}>
              {(() => {
                const bySupp: Record<string, number> = {};
                (jobs as any[]).forEach((j: any) => { const k = j.suppliers?.name ?? "Unknown"; bySupp[k] = (bySupp[k] ?? 0) + (j.invoice_amount ?? 0); });
                (rmOrders as any[]).forEach((o: any) => { const k = o.suppliers?.name ?? "Unknown"; bySupp[k] = (bySupp[k] ?? 0) + (o.invoice_amount ?? 0); });
                const top = Object.entries(bySupp).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const maxVal = top[0]?.[1] ?? 1;
                return top.length > 0 ? (
                  <div className="space-y-3">
                    {top.map(([name, val]) => (
                      <div key={name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium truncate">{name}</span>
                          <span className="text-sm font-bold text-neutral-800 dark:text-white ml-2 flex-shrink-0">{inr(val)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#EAB308] rounded-full" style={{ width: `${Math.round((val / maxVal) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">No spend data yet</p>;
              })()}
            </SC>
          </div>
        </div>
      )}

      {/* ── JOB WORK TAB ── */}
      {activeTab === "jobwork" && (
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="hidden md:grid grid-cols-[1fr_140px_120px_100px_80px] gap-3 px-5 py-2.5 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
            {["Material / Details", "Progress", "Supplier", "Amount", ""].map(h => (
              <span key={h} className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {loadingJW ? (
            <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" /></div>
          ) : (jobs as any[]).length > 0 ? (
            (jobs as any[]).map((j: any) => (
              <div key={j.id} onClick={() => setSelectedJW(j)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{j.doc_no ?? "—"}</span>
                    {j.is_overdue && <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 px-1.5 py-0.5 rounded">OVERDUE</span>}
                  </div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{j.material_name}
                    {j.material_grade && <span className="font-normal text-neutral-400 dark:text-neutral-500"> · {j.material_grade}</span>}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{[j.division, j.process_type].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="hidden md:flex flex-col gap-1 w-36 flex-shrink-0">
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">Step {j.current_step ?? 1}/9</span>
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{Math.round(((j.current_step ?? 1) / 9) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", j.is_overdue ? "bg-red-400" : "bg-[#EAB308]")} style={{ width: `${Math.round(((j.current_step ?? 1) / 9) * 100)}%` }} />
                  </div>
                </div>
                <div className="hidden md:block w-28 flex-shrink-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{j.suppliers?.name ?? "—"}</p>
                </div>
                <div className="hidden md:block w-20 text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white">{j.invoice_amount != null ? inr(j.invoice_amount) : "—"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
              </div>
            ))
          ) : (
            <div className="py-16 text-center"><p className="text-sm text-neutral-400 dark:text-neutral-500">No job work in this period</p></div>
          )}
          {(jobs as any[]).length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{(jobs as any[]).length} records</p>
              <p className="text-sm font-bold text-neutral-800 dark:text-white">Total: {inr(jwTotal)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── RM BUYING TAB ── */}
      {activeTab === "rmbuying" && (
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="hidden md:grid grid-cols-[1fr_130px_120px_100px_80px_80px] gap-3 px-5 py-2.5 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
            {["Material / Details", "Progress", "Supplier", "Amount", "Payment", ""].map(h => (
              <span key={h} className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {loadingRM ? (
            <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" /></div>
          ) : (rmOrders as any[]).length > 0 ? (
            (rmOrders as any[]).map((o: any) => (
              <div key={o.id} onClick={() => setSelectedRM(o)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 group">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{o.requirement_no ?? "—"}</span>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{o.material_name}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{o.category ?? "—"}</p>
                </div>
                <div className="hidden md:flex flex-col gap-1 w-32 flex-shrink-0">
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">Step {o.current_step ?? 1}/8</span>
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{Math.round(((o.current_step ?? 1) / 8) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#EAB308] rounded-full" style={{ width: `${Math.round(((o.current_step ?? 1) / 8) * 100)}%` }} />
                  </div>
                </div>
                <div className="hidden md:block w-28 flex-shrink-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{o.suppliers?.name ?? "—"}</p>
                </div>
                <div className="hidden md:block w-20 text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white">{o.invoice_amount != null ? inr(o.invoice_amount) : "—"}</p>
                </div>
                <div className="hidden md:block w-20 text-right flex-shrink-0">
                  {o.payment_status === "paid" ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-1.5 py-0.5 rounded">Paid</span>
                  ) : o.current_step >= 8 ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">Pending</span>
                  ) : <span className="text-[10px] text-neutral-300 dark:text-neutral-600">—</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
              </div>
            ))
          ) : (
            <div className="py-16 text-center"><p className="text-sm text-neutral-400 dark:text-neutral-500">No RM orders in this period</p></div>
          )}
          {(rmOrders as any[]).length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{(rmOrders as any[]).length} records</p>
              <p className="text-sm font-bold text-neutral-800 dark:text-white">Total: {inr(rmTotal)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── SUPPLIERS TAB ── */}
      {activeTab === "suppliers" && (
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="hidden md:grid grid-cols-[1fr_100px_140px_80px_80px] gap-3 px-5 py-2.5 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
            {["Supplier", "Type", "Contact", "TAT", "Status"].map(h => (
              <span key={h} className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {(suppliers as any[]).length > 0 ? (
            (suppliers as any[]).map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{s.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{s.city ?? "—"}</p>
                  </div>
                </div>
                <div className="hidden md:block w-24">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-lg border",
                    s.supplier_type === "job_work" ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40"
                      : s.supplier_type === "raw_material" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
                  )}>
                    {s.supplier_type?.replace("_", " ") ?? "—"}
                  </span>
                </div>
                <div className="hidden md:block w-36 min-w-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{s.contact_person ?? "—"}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{s.phone ?? ""}</p>
                </div>
                <div className="hidden md:block w-20 text-right">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.tat_days != null ? `${s.tat_days}d` : "—"}</p>
                </div>
                <div className="w-16 text-right flex-shrink-0">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                    s.is_active
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
                      : "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/40"
                  )}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center"><p className="text-sm text-neutral-400 dark:text-neutral-500">No suppliers found</p></div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProcurementView;