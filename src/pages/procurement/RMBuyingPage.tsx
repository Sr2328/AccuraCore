import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Plus, Search, AlertTriangle, ChevronRight,
  FileText, Phone, Mail, MessageSquare, CheckCircle2,
  Clock, ShieldCheck, BadgeCheck, Receipt, X, Calendar,
  User, Package, Circle, Loader2, ArrowRight, Send,
  BarChart2, ClipboardList, ShoppingBag, Truck, Tag,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
type RMBuying = {
  id: string;
  requirement_no: string | null;
  material_name: string;
  material_grade: string | null;
  material_size: string | null;
  quantity: number;
  unit: string | null;
  category: string | null;
  department_id: string | null;
  required_by_date: string | null;
  last_purchase_rate: number | null;
  high_authority_id: string | null;
  high_authority_approved: boolean | null;
  high_authority_approved_at: string | null;
  high_authority_remarks: string | null;
  selected_supplier_id: string | null;
  po_number: string | null;
  po_date: string | null;
  po_url: string | null;
  expected_delivery_date: string | null;
  is_overdue: boolean | null;
  overdue_notified_at: string | null;
  received_qty: number | null;
  balance_qty: number | null;
  received_date: string | null;
  invoice_number: string | null;
  invoice_amount: number | null;
  invoice_url: string | null;
  current_step: number | null;
  status: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  suppliers?: { id: string; name: string; contact_person?: string | null; phone?: string | null } | null;
  departments?: { name: string } | null;
};

type Supplier = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null };

type RMRate = {
  id: string;
  rm_buying_id: string;
  supplier_id: string;
  rate_per_unit: number | null;
  total_amount: number | null;
  availability: string | null;
  lead_time_days: number | null;
  gst_percent: number | null;
  is_recommended: boolean | null;
  slip_sent: boolean | null;
  slip_sent_via: string | null;
  slip_sent_at: string | null;
  created_at: string | null;
  suppliers?: { name: string };
};

/* ══════════════════════════════════════════════
   STEP CONFIG
══════════════════════════════════════════════ */
const STEPS = [
  { n: 1, label: "Requirement Created", status: "requirement_created", icon: ClipboardList },
  { n: 2, label: "Slip Sent to Suppliers", status: "slip_sent", icon: Send },
  { n: 3, label: "Rate Comparison", status: "rate_comparison", icon: BarChart2 },
  { n: 4, label: "Processing Report", status: "processing_report", icon: FileText },
  { n: 5, label: "Authority Approval", status: "authority_approval", icon: BadgeCheck },
  { n: 6, label: "PO Raised", status: "po_raised", icon: ShoppingBag },
  { n: 7, label: "Tracking", status: "tracking", icon: Truck },
  { n: 8, label: "Material Received", status: "material_received", icon: Package },
];

const STEP_FIELDS: Record<number, { key: string; label: string; type: string; required?: boolean }[]> = {
  2: [], // Step 2 uses SlipSendModal — no direct rm_buying fields needed
  4: [
    { key: "high_authority_remarks", label: "Processing report remarks", type: "textarea" },
  ],
  5: [
    { key: "high_authority_remarks", label: "Authority remarks", type: "textarea" },
  ],
  6: [
    { key: "po_number", label: "PO Number", type: "text", required: true },
    { key: "po_date", label: "PO Date", type: "date", required: true },
    { key: "po_url", label: "PO Document URL", type: "text" },
    { key: "expected_delivery_date", label: "Expected delivery date", type: "date" },
  ],
  7: [
    { key: "expected_delivery_date", label: "Updated delivery date", type: "date" },
  ],
  8: [
    { key: "received_qty", label: "Received qty", type: "number", required: true },
    { key: "received_date", label: "Received date", type: "date", required: true },
    { key: "invoice_number", label: "Invoice number", type: "text" },
    { key: "invoice_amount", label: "Invoice amount (₹)", type: "number" },
    { key: "invoice_url", label: "Invoice URL", type: "text" },
  ],
};

/* ══════════════════════════════════════════════
   STATUS CONFIG
══════════════════════════════════════════════ */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  requirement_created: { label: "Requirement", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" },
  slip_sent: { label: "Slip Sent", cls: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40" },
  rate_comparison: { label: "Rate Comparison", cls: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40" },
  processing_report: { label: "Processing", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40" },
  authority_approval: { label: "Auth Approval", cls: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/40" },
  po_raised: { label: "PO Raised", cls: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40" },
  tracking: { label: "Tracking", cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40" },
  material_received: { label: "Received", cls: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/40" },
};

const getStatus = (r: RMBuying) => {
  if (r.is_overdue) return { label: "Overdue", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40" };
  return STATUS_MAP[r.status ?? ""] ?? { label: "Pending", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700" };
};

const CATEGORIES = ["Steel", "Electrical", "Consumables", "Stationery", "Tools", "Custom"];

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const fd = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy") : "—";
const ft = (d?: string | null) => d ? format(new Date(d), "hh:mm a") : "";
const fds = (d?: string | null) => d ? format(new Date(d), "dd.MM.yyyy") : "";
const ago = (d?: string | null) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "";
const inr = (n?: number | null) => n != null ? `₹${n.toLocaleString("en-IN")}` : "—";

const stepTimestamp = (r: RMBuying, n: number): string | null => {
  switch (n) {
    case 1: return r.created_at;
    case 2: return r.updated_at;
    case 3: return r.updated_at;
    case 4: return r.updated_at;
    case 5: return r.high_authority_approved_at;
    case 6: return r.po_date;
    case 7: return r.updated_at;
    case 8: return r.received_date;
    default: return null;
  }
};

const stepSub = (r: RMBuying, n: number): string | null => {
  switch (n) {
    case 1: return [r.category, r.material_grade, r.material_size].filter(Boolean).join(" · ");
    case 2: return r.requirement_no ?? null;
    case 3: return null;
    case 4: return null;
    case 5: return r.high_authority_remarks ?? null;
    case 6: return r.po_number ? `PO: ${r.po_number}` : null;
    case 7: return r.expected_delivery_date ? `Expected: ${fd(r.expected_delivery_date)}` : null;
    case 8: return r.received_qty != null ? `Received: ${r.received_qty} ${r.unit ?? ""}` : null;
    default: return null;
  }
};

const buildStepPayload = (nextStep: number, fields: Record<string, string>, remarks: string): Record<string, any> => {
  const now = new Date().toISOString();
  const base: Record<string, any> = {
    current_step: nextStep,
    status: STEPS[nextStep - 1]?.status ?? "requirement_created",
    updated_at: now,
  };
  Object.entries(fields).forEach(([k, v]) => { if (v !== "") base[k] = v; });
  if (nextStep === 5) { base.high_authority_approved = true; base.high_authority_approved_at = now; }
  if (remarks) base.remarks = remarks;
  return base;
};

/* ══════════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════════ */
const StatusBadge = ({ r }: { r: RMBuying }) => {
  const { label, cls } = getStatus(r);
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", cls)}>{label}</span>;
};

const DR = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
    <span className="text-sm text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex-shrink-0">{label}</span>
    <span className="text-sm font-medium text-neutral-800 dark:text-white text-right">{value ?? "—"}</span>
  </div>
);

const SC = ({ title, icon: Icon, children, action }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
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

const inputCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 transition-colors";
const labelCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

const Field = ({
  label, type = "text", value, onChange, placeholder, required, disabled,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; disabled?: boolean;
}) => (
  <div>
    <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {type === "textarea" ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        placeholder={placeholder} disabled={disabled}
        className={cn(inputCls, "resize-none", disabled && "opacity-50 cursor-not-allowed")} />
    ) : type.startsWith("select:") ? (
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={cn(inputCls, disabled && "opacity-50 cursor-not-allowed")}>
        <option value="">Select…</option>
        {type.replace("select:", "").split(",").map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} disabled={disabled}
        className={cn(inputCls, disabled && "opacity-50 cursor-not-allowed")} />
    )}
  </div>
);

/* ══════════════════════════════════════════════
   MODAL WRAPPER
══════════════════════════════════════════════ */
const Modal = ({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 dark:text-neutral-500">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      {footer && <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">{footer}</div>}
    </div>
  </div>
);

const Btn = ({ onClick, disabled, loading, children, variant = "primary", className }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean;
  children: React.ReactNode; variant?: "primary" | "outline"; className?: string;
}) => (
  <button onClick={onClick} disabled={disabled || loading}
    className={cn(
      "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2",
      variant === "primary"
        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
        : "border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800",
      className
    )}>
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

/* ══════════════════════════════════════════════
   NEW REQUIREMENT MODAL
══════════════════════════════════════════════ */
const NewRequirementModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (r: RMBuying) => void }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    material_name: "", material_grade: "", material_size: "",
    quantity: "", unit: "kg", category: "Steel",
    required_by_date: "", last_purchase_rate: "", remarks: "",
  });
  const [error, setError] = useState("");
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.material_name.trim()) throw new Error("Material name is required");
      if (!form.quantity || isNaN(Number(form.quantity))) throw new Error("Valid quantity is required");
      const { data, error } = await supabase
        .from("rm_buying")
        .insert({
          material_name: form.material_name.trim(),
          material_grade: form.material_grade || null,
          material_size: form.material_size || null,
          quantity: Number(form.quantity),
          unit: form.unit,
          category: form.category,
          required_by_date: form.required_by_date || null,
          last_purchase_rate: form.last_purchase_rate ? Number(form.last_purchase_rate) : null,
          remarks: form.remarks || null,
          current_step: 1,
          status: "requirement_created",
          created_by: user?.id,
        })
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .single();
      if (error) throw error;
      return data as unknown as RMBuying;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["rm-buying-all"] }); onCreated(data); },
    onError: (e: any) => setError(e.message ?? "Failed to create"),
  });

  return (
    <Modal title="New RM Requirement" onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Requirement"}
          </Btn>
        </div>
      }>
      {error && <ErrBox msg={error} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Material Name" value={form.material_name} onChange={set("material_name")} placeholder="e.g. MS Flat" required />
        <div>
          <label className={labelCls}>Category<span className="text-red-500 ml-0.5">*</span></label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Grade" value={form.material_grade} onChange={set("material_grade")} placeholder="e.g. IS 2062" />
        <Field label="Size" value={form.material_size} onChange={set("material_size")} placeholder="e.g. 50x10mm" />
        <Field label="Last Rate (₹)" type="number" value={form.last_purchase_rate} onChange={set("last_purchase_rate")} placeholder="0" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" type="number" value={form.quantity} onChange={set("quantity")} placeholder="0" required />
        <Field label="Unit" type="select:kg,pcs,set,nos,mtr,ltr,box" value={form.unit} onChange={set("unit")} />
      </div>

      <Field label="Required by Date" type="date" value={form.required_by_date} onChange={set("required_by_date")} />
      <Field label="Remarks" type="textarea" value={form.remarks} onChange={set("remarks")} placeholder="Optional remarks…" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   RATE COMPARISON MODAL (Step 2 → 3)
══════════════════════════════════════════════ */
const RateComparisonModal = ({ rm, onClose }: { rm: RMBuying; onClose: (updated?: RMBuying) => void }) => {
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name, contact_person, phone").eq("is_active", true).order("name");
      return (data ?? []) as Supplier[];
    },
  });

  const { data: existingRates = [], refetch } = useQuery<RMRate[]>({
    queryKey: ["rm-rates", rm.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_rates").select("*, suppliers(name)").eq("rm_buying_id", rm.id).order("created_at");
      return (data ?? []) as RMRate[];
    },
  });

  const [newRate, setNewRate] = useState({ supplier_id: "", rate_per_unit: "", gst_percent: "", lead_time_days: "", availability: "", slip_sent_via: "WhatsApp" });
  const setNR = (k: string) => (v: string) => setNewRate(r => ({ ...r, [k]: v }));

  const addRate = useMutation({
    mutationFn: async () => {
      if (!newRate.supplier_id) throw new Error("Select a supplier");
      const qty = rm.quantity;
      const rate = Number(newRate.rate_per_unit) || 0;
      const gst = Number(newRate.gst_percent) || 0;
      const total = rate * qty * (1 + gst / 100);
      const { error } = await supabase.from("rm_buying_rates").upsert({
        rm_buying_id: rm.id,
        supplier_id: newRate.supplier_id,
        rate_per_unit: rate || null,
        total_amount: total || null,
        gst_percent: gst || null,
        lead_time_days: Number(newRate.lead_time_days) || null,
        availability: newRate.availability || null,
        slip_sent: true,
        slip_sent_via: newRate.slip_sent_via,
        slip_sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      setNewRate({ supplier_id: "", rate_per_unit: "", gst_percent: "", lead_time_days: "", availability: "", slip_sent_via: "WhatsApp" });
    },
    onError: (e: any) => setError(e.message),
  });

  const recommend = useMutation({
    mutationFn: async (rateId: string) => {
      const rate = existingRates.find(r => r.id === rateId);
      if (!rate) return;
      // clear all recommended
      await supabase.from("rm_buying_rates").update({ is_recommended: false }).eq("rm_buying_id", rm.id);
      await supabase.from("rm_buying_rates").update({ is_recommended: true }).eq("id", rateId);
      // advance step & set selected supplier
      const { data, error } = await supabase.from("rm_buying").update({
        current_step: 3,
        status: "rate_comparison",
        selected_supplier_id: rate.supplier_id,
        updated_at: new Date().toISOString(),
      }).eq("id", rm.id).select("*, suppliers(id, name, contact_person, phone), departments(name)").single();
      if (error) throw error;
      return data as unknown as RMBuying;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rm-buying-all"] });
      qc.invalidateQueries({ queryKey: ["rm-rates", rm.id] });
      if (data) onClose(data);
    },
    onError: (e: any) => setError(e.message),
  });

  const lowest = existingRates.reduce((best: RMRate | null, r) => {
    if (!r.total_amount) return best;
    if (!best || (r.total_amount < (best.total_amount ?? Infinity))) return r;
    return best;
  }, null);

  return (
    <Modal title="Rate Comparison" onClose={() => onClose()}
      footer={
        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onClose()}>Close</Btn>
        </div>
      }>
      {error && <ErrBox msg={error} />}

      {/* Add rate row */}
      <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-800/50 space-y-3">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Add Supplier Rate</p>
        <div>
          <label className={labelCls}>Supplier<span className="text-red-500 ml-0.5">*</span></label>
          <select value={newRate.supplier_id} onChange={e => setNR("supplier_id")(e.target.value)} className={inputCls}>
            <option value="">Select supplier…</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Rate/Unit (₹)" type="number" value={newRate.rate_per_unit} onChange={setNR("rate_per_unit")} placeholder="0" />
          <Field label="GST %" type="number" value={newRate.gst_percent} onChange={setNR("gst_percent")} placeholder="18" />
          <Field label="Lead days" type="number" value={newRate.lead_time_days} onChange={setNR("lead_time_days")} placeholder="7" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Availability" value={newRate.availability} onChange={setNR("availability")} placeholder="In stock / 2 weeks" />
          <Field label="Slip via" type="select:WhatsApp,Email,Phone,In-Person" value={newRate.slip_sent_via} onChange={setNR("slip_sent_via")} />
        </div>
        <button onClick={() => addRate.mutate()} disabled={addRate.isPending}
          className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {addRate.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <><Plus className="w-4 h-4" />Add Rate</>}
        </button>
      </div>

      {/* Rate table */}
      {existingRates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Supplier Rates ({existingRates.length})</p>
          {existingRates.map(r => (
            <div key={r.id} className={cn(
              "rounded-xl border p-3 transition-colors",
              r.is_recommended
                ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/15"
                : r.id === lowest?.id
                  ? "border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10"
                  : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">{r.suppliers?.name ?? "—"}</p>
                    {r.is_recommended && (
                      <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">SELECTED</span>
                    )}
                    {r.id === lowest?.id && !r.is_recommended && (
                      <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">LOWEST</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">₹{r.rate_per_unit?.toLocaleString("en-IN") ?? "—"}/unit</span>
                    {r.gst_percent != null && <span className="text-xs text-neutral-400">GST {r.gst_percent}%</span>}
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Total: {inr(r.total_amount)}</span>
                    {r.lead_time_days != null && <span className="text-xs text-neutral-400">{r.lead_time_days}d lead</span>}
                    {r.availability && <span className="text-xs text-neutral-400">{r.availability}</span>}
                  </div>
                  {r.slip_sent && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1">
                      <Send className="w-3 h-3" />Slip sent via {r.slip_sent_via}
                    </p>
                  )}
                </div>
                {!r.is_recommended && (
                  <button onClick={() => recommend.mutate(r.id)} disabled={recommend.isPending}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                    Select
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {existingRates.length === 0 && (
        <div className="text-center py-6">
          <BarChart2 className="w-8 h-8 text-neutral-200 dark:text-neutral-700 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">No rates added yet</p>
          <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-0.5">Add supplier rates above</p>
        </div>
      )}
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   SLIP SEND MODAL  (Step 1 → 2)
══════════════════════════════════════════════ */
const SlipSendModal = ({ rm, onClose }: { rm: RMBuying; onClose: (updated?: RMBuying) => void }) => {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailOverrides, setEmailOverrides] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, contact_person, phone, email")
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as Supplier[];
    },
  });

  const today = format(new Date(), "dd MMM yyyy");

  /* Build the formatted slip text */
  const buildSlip = (supplierName: string, contactPerson?: string | null) => {
    const lines: string[] = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "        MATERIAL ENQUIRY SLIP",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Ref No  : ${rm.requirement_no ?? "—"}`,
      `Date    : ${today}`,
      "",
      `To      : ${supplierName}`,
      contactPerson ? `Attn    : ${contactPerson}` : "",
      "",
      "Dear Sir/Ma'am,",
      "",
      "We request you to kindly provide your best",
      "quotation for the below material at the earliest.",
      "",
      "─────────────────────────────────────",
      "  MATERIAL DETAILS",
      "─────────────────────────────────────",
      `  Material : ${rm.material_name}`,
      rm.material_grade ? `  Grade    : ${rm.material_grade}` : "",
      rm.material_size ? `  Size     : ${rm.material_size}` : "",
      `  Category : ${rm.category ?? "—"}`,
      `  Quantity : ${rm.quantity} ${rm.unit ?? ""}`,
      rm.required_by_date ? `  Req. By  : ${format(new Date(rm.required_by_date), "dd MMM yyyy")}` : "",
      rm.last_purchase_rate != null
        ? `  Last Rate: ₹${rm.last_purchase_rate}/${rm.unit ?? "unit"} (reference only)`
        : "",
      "─────────────────────────────────────",
      "",
      "Please share:",
      "  • Rate per unit (excluding GST)",
      "  • GST %",
      "  • Availability / delivery timeline",
      "  • Any other terms & conditions",
      "",
      remarks ? `Note: ${remarks}` : "",
      "",
      "Regards,",
      "Procurement Team",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ].filter(l => l !== null);
    return lines.join("\n");
  };

  const toggleSupplier = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copySlip = (supplierName: string, contact?: string | null) => {
    navigator.clipboard.writeText(buildSlip(supplierName, contact));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGmail = (supplier: Supplier) => {
    const email = emailOverrides[supplier.id] ?? supplier.email ?? "";
    const subject = encodeURIComponent(
      `Material Enquiry – ${rm.material_name}${rm.material_grade ? " " + rm.material_grade : ""} | ${rm.requirement_no ?? today}`
    );
    const body = encodeURIComponent(buildSlip(supplier.name, supplier.contact_person));
    const url = email
      ? `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`
      : `https://mail.google.com/mail/?view=cm&su=${subject}&body=${body}`;
    window.open(url, "_blank");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.size === 0) throw new Error("Select at least one supplier to send the slip to");
      const now = new Date().toISOString();

      // Insert rm_buying_rates rows for each selected supplier
      const inserts = Array.from(selectedIds).map(sid => ({
        rm_buying_id: rm.id,
        supplier_id: sid,
        slip_sent: true,
        slip_sent_via: emailOverrides[sid] ? "Email" : "WhatsApp",
        slip_sent_at: now,
      }));
      const { error: rateErr } = await supabase.from("rm_buying_rates").insert(inserts);
      if (rateErr) throw rateErr;

      // Advance rm_buying to step 2
      const { data, error } = await supabase
        .from("rm_buying")
        .update({
          current_step: 2,
          status: "slip_sent",
          updated_at: now,
          remarks: remarks || null,
        })
        .eq("id", rm.id)
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .single();
      if (error) throw error;

      await supabase.from("rm_buying_step_docs").upsert({
        rm_buying_id: rm.id,
        step_number: 2,
        step_name: "Slip Sent to Suppliers",
        remarks: `Slip sent to ${selectedIds.size} supplier(s)${remarks ? " — " + remarks : ""}`,
      });

      return data as unknown as RMBuying;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rm-buying-all"] });
      qc.invalidateQueries({ queryKey: ["rm-step-docs", rm.id] });
      qc.invalidateQueries({ queryKey: ["rm-rates", rm.id] });
      onClose(data);
    },
    onError: (e: any) => setError(e.message ?? "Failed to send slip"),
  });

  const selectedSuppliers = suppliers.filter(s => selectedIds.has(s.id));

  return (
    <Modal
      title="Send Enquiry Slip to Suppliers"
      onClose={() => onClose()}
      footer={
        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onClose()}>Cancel</Btn>
          <Btn onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {mutation.isPending
              ? "Marking as Sent…"
              : `Mark Slip Sent (${selectedIds.size} supplier${selectedIds.size !== 1 ? "s" : ""})`}
          </Btn>
        </div>
      }>

      {error && <ErrBox msg={error} />}

      {/* Step indicator */}
      <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div className="text-center flex-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Current</p>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Requirement Created</p>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <div className="text-center flex-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Advancing to</p>
          <p className="text-sm font-semibold text-emerald-500">Slip Sent to Suppliers</p>
        </div>
      </div>

      {/* Slip preview */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Enquiry Slip Preview</label>
          <button
            onClick={() => copySlip(selectedSuppliers[0]?.name ?? "Supplier", selectedSuppliers[0]?.contact_person)}
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            {copied ? <CheckCircle2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy slip"}
          </button>
        </div>
        <pre className="w-full text-xs font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 max-h-48 overflow-y-auto leading-relaxed">
          {buildSlip(selectedSuppliers[0]?.name ?? "[Supplier Name]", selectedSuppliers[0]?.contact_person)}
        </pre>
      </div>

      {/* Remarks (updates slip Note line live) */}
      <Field
        label="Additional Note (appears in slip)"
        type="textarea"
        value={remarks}
        onChange={setRemarks}
        placeholder="e.g. Urgent requirement, please revert by EOD"
      />

      {/* Supplier selection */}
      <div>
        <label className={labelCls}>
          Select Suppliers to Send Slip
          <span className="text-red-500 ml-0.5">*</span>
          {selectedIds.size > 0 && (
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">{selectedIds.size} selected</span>
          )}
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {suppliers.map(s => {
            const sel = selectedIds.has(s.id);
            const emailVal = emailOverrides[s.id] ?? s.email ?? "";
            return (
              <div key={s.id}
                className={cn(
                  "rounded-xl border transition-colors",
                  sel
                    ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/15"
                    : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                )}>
                {/* Supplier row */}
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  onClick={() => toggleSupplier(s.id)}>
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                    sel ? "bg-emerald-500 border-emerald-500" : "border-neutral-300 dark:border-neutral-600"
                  )}>
                    {sel && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">{s.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {[s.contact_person, s.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {sel && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); copySlip(s.name, s.contact_person); }}
                        title="Copy slip for this supplier"
                        className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openGmail(s); }}
                        title="Open in Gmail"
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 flex items-center justify-center text-red-500 hover:text-red-600 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Email input when selected */}
                {sel && (
                  <div className="px-3 pb-3 pt-0" onClick={e => e.stopPropagation()}>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                      <input
                        type="email"
                        value={emailVal}
                        onChange={e => setEmailOverrides(prev => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="supplier@email.com (for Gmail)"
                        className={cn(inputCls, "pl-8 text-xs py-1.5")}
                      />
                    </div>
                    {emailVal && (
                      <button
                        onClick={() => openGmail({ ...s, email: emailVal })}
                        className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                        Open in Gmail for {s.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {suppliers.length === 0 && (
            <div className="text-center py-6 text-sm text-neutral-400 dark:text-neutral-500">
              No active suppliers found. Add suppliers first.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};


const AdvanceStepModal = ({ rm, onClose }: { rm: RMBuying; onClose: (updated?: RMBuying) => void }) => {
  const qc = useQueryClient();
  const nextStep = (rm.current_step ?? 1) + 1;
  const nextStepInfo = STEPS[nextStep - 1];
  const extraFields = STEP_FIELDS[nextStep] ?? [];
  const [fields, setFields] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  const setF = (k: string) => (v: string) => setFields(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      for (const f of extraFields) {
        if (f.required && !fields[f.key]) throw new Error(`${f.label} is required`);
      }
      const payload = buildStepPayload(nextStep, fields, remarks);
      const { data, error } = await supabase
        .from("rm_buying")
        .update(payload)
        .eq("id", rm.id)
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .single();
      if (error) throw error;

      await supabase.from("rm_buying_step_docs").upsert({
        rm_buying_id: rm.id,
        step_number: nextStep,
        step_name: nextStepInfo?.label ?? "",
        remarks: remarks || null,
      });

      return data as unknown as RMBuying;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rm-buying-all"] });
      qc.invalidateQueries({ queryKey: ["rm-step-docs", rm.id] });
      onClose(data);
    },
    onError: (e: any) => setError(e.message ?? "Failed to update"),
  });

  if (!nextStepInfo) return null;

  return (
    <Modal title={`Advance to Step ${nextStep}: ${nextStepInfo.label}`} onClose={() => onClose()}
      footer={
        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onClose()}>Cancel</Btn>
          <Btn onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {mutation.isPending ? "Updating…" : `Mark as ${nextStepInfo.label}`}
          </Btn>
        </div>
      }>
      {error && <ErrBox msg={error} />}

      <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div className="text-center flex-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Current</p>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{STEPS[(rm.current_step ?? 1) - 1]?.label}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <div className="text-center flex-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Advancing to</p>
          <p className="text-sm font-semibold text-emerald-500">{nextStepInfo.label}</p>
        </div>
      </div>

      {extraFields.map(f => (
        <Field key={f.key} label={f.label} type={f.type} value={fields[f.key] ?? ""} onChange={setF(f.key)} required={f.required} />
      ))}

      <Field label="Step Remarks (optional)" type="textarea" value={remarks} onChange={setRemarks} placeholder="Any notes for this step…" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   LOG COMMUNICATION MODAL
══════════════════════════════════════════════ */
const LogCommModal = ({ rmId, onClose }: { rmId: string; onClose: () => void }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    communication_type: "whatsapp",
    contact_person: "", notes: "",
    follow_up_needed: false, follow_up_date: "",
  });
  const [error, setError] = useState("");
  const set = (k: string) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.notes.trim()) throw new Error("Notes are required");
      const { error } = await supabase.from("rm_buying_communications").insert({
        rm_buying_id: rmId,
        communication_type: form.communication_type,
        contact_person: form.contact_person || null,
        notes: form.notes.trim(),
        follow_up_needed: form.follow_up_needed,
        follow_up_date: form.follow_up_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rm-comms", rmId] }); onClose(); },
    onError: (e: any) => setError(e.message ?? "Failed to log"),
  });

  const COMM_TYPES = [
    { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { value: "call", label: "Call", icon: Phone },
    { value: "email", label: "Email", icon: Mail },
    { value: "visit", label: "Visit", icon: User },
  ];

  return (
    <Modal title="Log Communication" onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save Log"}
          </Btn>
        </div>
      }>
      {error && <ErrBox msg={error} />}

      <div>
        <label className={labelCls}>Communication type</label>
        <div className="grid grid-cols-4 gap-2">
          {COMM_TYPES.map(ct => (
            <button key={ct.value} onClick={() => setForm(f => ({ ...f, communication_type: ct.value }))}
              className={cn("flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-colors",
                form.communication_type === ct.value
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300"
              )}>
              <ct.icon className="w-4 h-4" strokeWidth={1.8} />
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Contact person" value={form.contact_person} onChange={set("contact_person") as any} placeholder="Who did you speak with?" />
      <Field label="Notes" type="textarea" value={form.notes} onChange={set("notes") as any} placeholder="What was discussed?" required />

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.follow_up_needed}
            onChange={e => setForm(f => ({ ...f, follow_up_needed: e.target.checked }))}
            className="w-4 h-4 rounded accent-emerald-500" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Follow-up needed</span>
        </label>
        {form.follow_up_needed && (
          <div className="mt-2">
            <Field label="Follow-up date" type="date" value={form.follow_up_date} onChange={set("follow_up_date") as any} />
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   ERROR BOX
══════════════════════════════════════════════ */
const ErrBox = ({ msg }: { msg: string }) => (
  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
    <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>
  </div>
);

/* ══════════════════════════════════════════════
   TRACKING TIMELINE
══════════════════════════════════════════════ */
const Timeline = ({ rm, docs }: { rm: RMBuying; docs: any[] }) => {
  const cur = rm.current_step ?? 1;
  return (
    <div>
      {STEPS.map((s, idx) => {
        const done = cur > s.n, current = cur === s.n, last = idx === STEPS.length - 1;
        const ts = stepTimestamp(rm, s.n);
        const sub = stepSub(rm, s.n);
        const doc = docs.find(d => d.step_number === s.n);
        return (
          <div key={s.n} className="flex gap-3.5">
            <div className="flex flex-col items-center" style={{ width: 28 }}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-colors",
                done ? "bg-emerald-500 border-emerald-500 text-white"
                  : current ? "bg-white dark:bg-neutral-900 border-emerald-500 text-emerald-500"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600"
              )}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  : current ? <s.icon className="w-3 h-3" strokeWidth={2} />
                    : <Circle className="w-3 h-3" strokeWidth={1.5} />}
              </div>
              {!last && <div className={cn("w-px flex-1 my-1", done ? "bg-emerald-400" : "bg-neutral-200 dark:bg-neutral-700")} style={{ minHeight: 24 }} />}
            </div>
            <div className={cn("flex-1 pb-4", last && "pb-0")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold leading-snug",
                    done ? "text-neutral-800 dark:text-white"
                      : current ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-300 dark:text-neutral-600"
                  )}>
                    {s.label}
                    {current && rm.is_overdue && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-2.5 h-2.5" />OVERDUE
                      </span>
                    )}
                  </p>
                  {sub && (done || current) && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</p>}
                  {doc?.doc_url && (
                    <a href={doc.doc_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1">
                      <FileText className="w-3 h-3" />View document
                    </a>
                  )}
                  {doc?.remarks && <p className="text-xs text-neutral-400 dark:text-neutral-500 italic mt-0.5">{doc.remarks}</p>}
                  {s.n === 5 && rm.high_authority_approved && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />Authority approved
                    </p>
                  )}
                </div>
                {ts && (done || current) && (
                  <div className="text-right flex-shrink-0">
                    {ft(ts) && <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{ft(ts)}</p>}
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{fds(ts)}</p>
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
   DETAIL VIEW
══════════════════════════════════════════════ */
const Detail = ({ rm: initialRM, onBack }: { rm: RMBuying; onBack: () => void }) => {
  const [rm, setRM] = useState(initialRM);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showSlip, setShowSlip] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [showLogComm, setShowLogComm] = useState(false);
  const { label, cls } = getStatus(rm);
  const canAdvance = (rm.current_step ?? 1) < 8;
  const isSlipStep = (rm.current_step ?? 1) === 1;   // Step 1→2: send slip
  const isRateStep = (rm.current_step ?? 1) === 2;   // Step 2→3: rate comparison

  const { data: docs = [] } = useQuery({
    queryKey: ["rm-step-docs", rm.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_step_docs").select("*").eq("rm_buying_id", rm.id).order("step_number");
      return data ?? [];
    },
  });

  const { data: comms = [] } = useQuery({
    queryKey: ["rm-comms", rm.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_communications").select("*").eq("rm_buying_id", rm.id).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: rates = [] } = useQuery<RMRate[]>({
    queryKey: ["rm-rates", rm.id],
    queryFn: async () => {
      const { data } = await supabase.from("rm_buying_rates").select("*, suppliers(name)").eq("rm_buying_id", rm.id).order("total_amount");
      return (data ?? []) as RMRate[];
    },
  });

  const CommIco = ({ type }: { type: string }) => {
    const t = type?.toLowerCase();
    if (t === "call") return <Phone className="w-3.5 h-3.5" strokeWidth={1.8} />;
    if (t === "email") return <Mail className="w-3.5 h-3.5" strokeWidth={1.8} />;
    if (t === "visit") return <User className="w-3.5 h-3.5" strokeWidth={1.8} />;
    return <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.8} />;
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
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{rm.requirement_no ?? "RM Requirement"}</h2>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", cls)}>{label}</span>
              {rm.is_overdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-2 py-0.5 rounded-lg">
                  <AlertTriangle className="w-3 h-3" />Overdue
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
              {[rm.category, rm.material_name, rm.suppliers?.name].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowLogComm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log</span>
            </button>
            {isSlipStep && (
              <button onClick={() => setShowSlip(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send Slip</span>
                <span className="sm:hidden">Slip</span>
              </button>
            )}
            {isRateStep && (
              <button onClick={() => setShowRates(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rates</span>
              </button>
            )}
            {canAdvance && !isSlipStep && !isRateStep && (
              <button onClick={() => setShowAdvance(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Update Status</span>
                <span className="sm:hidden">Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Progress</p>
            <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
              Step {rm.current_step ?? 1} / 8 · {Math.round(((rm.current_step ?? 1) / 8) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", rm.is_overdue ? "bg-red-400" : "bg-emerald-500")}
              style={{ width: `${Math.round(((rm.current_step ?? 1) / 8) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map(s => (
              <div key={s.n} title={s.label} className={cn(
                "w-2 h-2 rounded-full transition-colors",
                (rm.current_step ?? 1) > s.n ? "bg-emerald-500"
                  : (rm.current_step ?? 1) === s.n ? "bg-emerald-500 ring-2 ring-emerald-500/30"
                    : "bg-neutral-200 dark:bg-neutral-700"
              )} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* LEFT */}
          <div className="lg:col-span-3 space-y-4">
            <SC title="Procurement Flow" icon={ClipboardList}
              action={
                isSlipStep ? (
                  <button onClick={() => setShowSlip(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    <Send className="w-3.5 h-3.5" />Send slip
                  </button>
                ) : canAdvance && !isRateStep ? (
                  <button onClick={() => setShowAdvance(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    <ArrowRight className="w-3.5 h-3.5" />Advance step
                  </button>
                ) : isRateStep ? (
                  <button onClick={() => setShowRates(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    <BarChart2 className="w-3.5 h-3.5" />Manage rates
                  </button>
                ) : undefined
              }>
              <Timeline rm={rm} docs={docs as any[]} />
            </SC>

            {/* Rate comparison summary */}
            {rates.length > 0 && (
              <SC title={`Rate Comparison (${rates.length} suppliers)`} icon={BarChart2}
                action={
                  <button onClick={() => setShowRates(true)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    Edit
                  </button>
                }>
                <div className="space-y-2">
                  {rates.map(r => (
                    <div key={r.id} className={cn(
                      "flex items-center justify-between gap-3 p-2.5 rounded-xl border",
                      r.is_recommended
                        ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/15"
                        : "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50"
                    )}>
                      <div className="flex items-center gap-2 min-w-0">
                        {r.is_recommended && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2} />}
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{r.suppliers?.name ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">₹{r.rate_per_unit?.toLocaleString("en-IN") ?? "—"}/unit</span>
                        <span className="text-sm font-bold text-neutral-800 dark:text-white">{inr(r.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SC>
            )}

            <SC title="Communications" icon={MessageSquare}
              action={
                <button onClick={() => setShowLogComm(true)} className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                  <Plus className="w-3.5 h-3.5" />Log
                </button>
              }>
              {(comms as any[]).length > 0 ? (
                <div className="space-y-2">
                  {(comms as any[]).map((c: any) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                      <div className="w-7 h-7 rounded-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 text-neutral-400 dark:text-neutral-500">
                        <CommIco type={c.communication_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 capitalize">
                            {c.communication_type}
                            {c.contact_person && <span className="font-normal text-neutral-400 dark:text-neutral-500"> · {c.contact_person}</span>}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 flex-shrink-0">{ago(c.created_at)}</p>
                        </div>
                        {c.notes && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{c.notes}</p>}
                        {c.follow_up_needed && c.follow_up_date && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3" />Follow up: {fd(c.follow_up_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">No communications logged yet</p>
                  <button onClick={() => setShowLogComm(true)} className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    + Log first communication
                  </button>
                </div>
              )}
            </SC>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-4">
            <SC title="Material Details" icon={Tag}>
              <DR label="Material" value={rm.material_name} />
              <DR label="Grade" value={rm.material_grade} />
              <DR label="Size" value={rm.material_size} />
              <DR label="Category" value={rm.category} />
              <DR label="Quantity" value={`${rm.quantity}${rm.unit ? " " + rm.unit : ""}`} />
              <DR label="Req. By" value={fd(rm.required_by_date)} />
              {rm.last_purchase_rate != null && (
                <DR label="Last Rate" value={inr(rm.last_purchase_rate) + `/${rm.unit ?? "unit"}`} />
              )}
            </SC>

            <SC title="Supplier" icon={User}>
              <DR label="Supplier" value={rm.suppliers?.name} />
              <DR label="Contact" value={rm.suppliers?.contact_person} />
              <DR label="Phone" value={rm.suppliers?.phone} />
            </SC>

            {(rm.current_step ?? 1) >= 6 && (
              <SC title="Purchase Order" icon={ShoppingBag}>
                <DR label="PO Number" value={rm.po_number} />
                <DR label="PO Date" value={fd(rm.po_date)} />
                <DR label="Expected" value={fd(rm.expected_delivery_date)} />
                {rm.po_url && (
                  <a href={rm.po_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <FileText className="w-3.5 h-3.5" />View PO
                  </a>
                )}
              </SC>
            )}

            {(rm.current_step ?? 1) >= 8 && (
              <SC title="Receipt & Invoice" icon={Receipt}>
                <DR label="Received Qty" value={rm.received_qty != null ? `${rm.received_qty} ${rm.unit ?? ""}` : null} />
                <DR label="Balance Qty" value={rm.balance_qty != null ? `${rm.balance_qty}  ${rm.unit ?? ""}` : null} />
                <DR label="Received Date" value={fd(rm.received_date)} />
                <DR label="Invoice No." value={rm.invoice_number} />
                <DR label="Amount" value={inr(rm.invoice_amount)} />
                {rm.invoice_url && (
                  <a href={rm.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <FileText className="w-3.5 h-3.5" />View Invoice
                  </a>
                )}
              </SC>
            )}

            {(rm.current_step ?? 1) >= 5 && (
              <SC title="Authority Approval" icon={BadgeCheck}>
                <DR label="Approved" value={rm.high_authority_approved ? "Yes" : "Pending"} />
                <DR label="Date" value={fd(rm.high_authority_approved_at)} />
                <DR label="Remarks" value={rm.high_authority_remarks} />
              </SC>
            )}

            {rm.remarks && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Remarks</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{rm.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSlip && (
        <SlipSendModal rm={rm} onClose={updated => { setShowSlip(false); if (updated) setRM(updated); }} />
      )}
      {showAdvance && (
        <AdvanceStepModal rm={rm} onClose={updated => { setShowAdvance(false); if (updated) setRM(updated); }} />
      )}
      {showRates && (
        <RateComparisonModal rm={rm} onClose={updated => { setShowRates(false); if (updated) setRM(updated); }} />
      )}
      {showLogComm && <LogCommModal rmId={rm.id} onClose={() => setShowLogComm(false)} />}
    </>
  );
};

/* ══════════════════════════════════════════════
   LIST ROW
══════════════════════════════════════════════ */
const Row = ({ rm, onClick }: { rm: RMBuying; onClick: () => void }) => {
  const step = rm.current_step ?? 1;
  const pct = Math.round((step / 8) * 100);
  return (
    <div onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{rm.requirement_no ?? "—"}</span>
          <StatusBadge r={rm} />
          {rm.is_overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-2.5 h-2.5" />OVERDUE
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">
          {rm.material_name}
          {rm.material_grade && <span className="font-normal text-neutral-400 dark:text-neutral-500"> · {rm.material_grade}</span>}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
          {[rm.category, `${rm.quantity} ${rm.unit ?? ""}`, rm.suppliers?.name].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="hidden md:flex flex-col gap-1 w-36 flex-shrink-0">
        <div className="flex justify-between">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Step {step}/8</span>
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", rm.is_overdue ? "bg-red-400" : "bg-emerald-500")}
            style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
          {STEPS[Math.min(step - 1, 7)]?.label}
        </span>
      </div>

      <div className="hidden sm:block text-right flex-shrink-0 min-w-[90px]">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{fd(rm.required_by_date)}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{ago(rm.updated_at)}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function RMBuyingPage() {
  const [selected, setSelected] = useState<RMBuying | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCat] = useState("all");
  const [tab, setTab] = useState<"active" | "received">("active");

  const { data: rms = [], isLoading } = useQuery({
    queryKey: ["rm-buying-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rm_buying")
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .order("created_at", { ascending: false });
      return (data ?? []) as RMBuying[];
    },
  });

  const filtered = rms.filter(r => {
    const received = (r.current_step ?? 1) >= 8;
    if (tab === "active" && received) return false;
    if (tab === "received" && !received) return false;
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.material_name.toLowerCase().includes(q) ||
        (r.requirement_no ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q) ||
        (r.suppliers?.name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const overdueCount = rms.filter(r => r.is_overdue).length;
  const activeCount = rms.filter(r => (r.current_step ?? 1) < 8).length;
  const receivedCount = rms.filter(r => (r.current_step ?? 1) >= 8).length;

  if (selected) return <Detail rm={selected} onBack={() => setSelected(null)} />;

  return (
    <>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">RM / Material Buying</h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              {activeCount} active
              {overdueCount > 0 && <> · <span className="text-red-500 font-medium">{overdueCount} overdue</span></>}
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[.98] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus className="w-4 h-4" strokeWidth={2} />New Requirement
          </button>
        </div>

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" strokeWidth={1.8} />
            <p className="text-sm text-red-700 dark:text-red-300">
              <span className="font-semibold">{overdueCount} requirement{overdueCount > 1 ? "s" : ""}</span> have exceeded expected delivery date.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: rms.length, color: "text-neutral-900 dark:text-white" },
            { label: "Active", value: activeCount, color: "text-blue-600 dark:text-blue-400" },
            { label: "Overdue", value: overdueCount, color: "text-red-500 dark:text-red-400" },
            { label: "Received", value: receivedCount, color: "text-neutral-400 dark:text-neutral-500" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-4 py-3 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Step legend */}
        <div className="flex flex-wrap gap-1.5">
          {STEPS.map(s => (
            <span key={s.n} className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-2 py-1 rounded-lg">
              <span className="font-bold text-neutral-500 dark:text-neutral-400">{s.n}.</span> {s.label}
            </span>
          ))}
        </div>

        {/* List card */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
            <div className="flex gap-0.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
              {(["active", "received"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                    tab === t
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}>
                  {t} <span className="text-xs opacity-60">({t === "active" ? activeCount : receivedCount})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search material, req no, supplier…"
                  className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 transition-colors" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select value={catFilter} onChange={e => setCat(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-emerald-500/60">
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Column header */}
          <div className="hidden md:grid grid-cols-[1fr_160px_100px_20px] gap-4 px-5 py-2 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Material / Details</span>
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Progress</span>
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-right">Req. By</span>
            <span />
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-3">Loading…</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(r => <Row key={r.id} rm={r} onClick={() => setSelected(r)} />)
          ) : (
            <div className="py-16 text-center">
              <div className="w-10 h-10 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center mx-auto mb-3">
                <Package className="w-5 h-5 text-neutral-300 dark:text-neutral-600" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {search ? "No results found" : "No requirements found"}
              </p>
              <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-1">
                {search ? "Try a different search" : "Create a new RM requirement to get started"}
              </p>
              {!search && (
                <button onClick={() => setShowNew(true)}
                  className="mt-4 inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <Plus className="w-4 h-4" />New Requirement
                </button>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{filtered.length} of {rms.length} records</p>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewRequirementModal
          onClose={() => setShowNew(false)}
          onCreated={r => { setShowNew(false); setSelected(r); }}
        />
      )}
    </>
  );
}