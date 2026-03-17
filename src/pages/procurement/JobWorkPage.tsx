import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Plus, Search, AlertTriangle, ChevronRight,
  FileText, Phone, Mail, MessageSquare, CheckCircle2,
  Clock, Truck, RotateCcw, ShieldCheck, BadgeCheck,
  Receipt, X, Calendar, User, Package, Circle,
  ChevronDown, Loader2, Upload, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
type JobWork = {
  id: string; doc_no: string | null; division: string; process_type: string | null;
  department_id: string | null; supplier_id: string | null; material_name: string;
  material_grade: string | null; quantity: number; unit: string | null;
  dispatch_purpose: string | null; responsible_person: string | null;
  requirement_doc_url: string | null; expected_return_date: string | null;
  dispatch_mode: string | null; delivery_person_name: string | null;
  vehicle_number: string | null; challan_url: string | null;
  security_handover_at: string | null; security_handover_by: string | null;
  dispatch_date: string | null; outward_challan_url: string | null;
  tat_days: number | null; is_overdue: boolean | null; overdue_notified_at: string | null;
  return_date: string | null; received_qty: number | null; balance_qty: number | null;
  ref_person_id: string | null; ref_person_approved: boolean | null;
  ref_person_approved_at: string | null; ref_person_remarks: string | null;
  high_authority_id: string | null; high_authority_approved: boolean | null;
  high_authority_approved_at: string | null; high_authority_remarks: string | null;
  invoice_number: string | null; invoice_amount: number | null; invoice_url: string | null;
  current_step: number | null; status: string | null; remarks: string | null;
  created_by: string | null; created_at: string | null; updated_at: string | null;
  suppliers?: { id: string; name: string; contact_person?: string | null; phone?: string | null } | null;
  departments?: { name: string } | null;
};

type Supplier = { id: string; name: string; contact_person: string | null; phone: string | null };

/* ══════════════════════════════════════════════
   STEP CONFIG
══════════════════════════════════════════════ */
const STEPS = [
  { n: 1, label: "Requirement Created", status: "requirement", icon: FileText },
  { n: 2, label: "Challan Created", status: "challan", icon: FileText },
  { n: 3, label: "Security Handover", status: "security_handover", icon: ShieldCheck },
  { n: 4, label: "Dispatched to Supplier", status: "dispatched", icon: Truck },
  { n: 5, label: "In Process", status: "in_process", icon: Clock },
  { n: 6, label: "Material Returned", status: "material_returned", icon: RotateCcw },
  { n: 7, label: "Ref Person Approval", status: "ref_approved", icon: User },
  { n: 8, label: "High Authority Approval", status: "ha_approved", icon: BadgeCheck },
  { n: 9, label: "Closed · Invoice Received", status: "closed", icon: Receipt },
];

/* Step-specific extra fields shown when advancing */
const STEP_FIELDS: Record<number, { key: string; label: string; type: string; required?: boolean }[]> = {
  2: [{ key: "challan_url", label: "Challan Document URL", type: "text" }],
  3: [
    { key: "security_handover_by", label: "Handed over by", type: "text" },
    { key: "security_handover_at", label: "Handover date/time", type: "datetime-local" },
  ],
  4: [
    { key: "dispatch_date", label: "Dispatch date", type: "date", required: true },
    { key: "dispatch_mode", label: "Dispatch mode", type: "select:Road,Courier,Hand Delivery,Rail" },
    { key: "vehicle_number", label: "Vehicle number", type: "text" },
    { key: "delivery_person_name", label: "Delivery person", type: "text" },
    { key: "outward_challan_url", label: "Outward challan URL", type: "text" },
    { key: "expected_return_date", label: "Expected return date", type: "date" },
    { key: "tat_days", label: "TAT days", type: "number" },
  ],
  6: [
    { key: "return_date", label: "Return date", type: "date", required: true },
    { key: "received_qty", label: "Received qty", type: "number", required: true },
  ],
  7: [
    { key: "ref_person_remarks", label: "Ref person remarks", type: "textarea" },
  ],
  8: [
    { key: "high_authority_remarks", label: "HA remarks", type: "textarea" },
  ],
  9: [
    { key: "invoice_number", label: "Invoice number", type: "text" },
    { key: "invoice_amount", label: "Invoice amount (₹)", type: "number" },
    { key: "invoice_url", label: "Invoice URL", type: "text" },
  ],
};

/* ══════════════════════════════════════════════
   STATUS CONFIG
══════════════════════════════════════════════ */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  requirement: { label: "Requirement", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" },
  challan: { label: "Challan", cls: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40" },
  security_handover: { label: "Handover", cls: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40" },
  dispatched: { label: "Dispatched", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40" },
  in_process: { label: "In Process", cls: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/40" },
  material_returned: { label: "Returned", cls: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40" },
  ref_approved: { label: "Ref Approved", cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40" },
  ha_approved: { label: "HA Approved", cls: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/40" },
  closed: { label: "Closed", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700" },
};

const getStatus = (job: JobWork) => {
  if (job.is_overdue) return { label: "Overdue", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40" };
  return STATUS_MAP[job.status ?? ""] ?? { label: "Pending", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700" };
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const fd = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy") : "—";
const ft = (d?: string | null) => d ? format(new Date(d), "hh:mm a") : "";
const fds = (d?: string | null) => d ? format(new Date(d), "dd.MM.yyyy") : "";
const ago = (d?: string | null) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "";
const inr = (n?: number | null) => n != null ? `₹${n.toLocaleString("en-IN")}` : "—";

const stepTimestamp = (job: JobWork, n: number): string | null => {
  switch (n) {
    case 1: return job.created_at;
    case 2: return job.challan_url ? job.updated_at : null;
    case 3: return job.security_handover_at;
    case 4: return job.dispatch_date;
    case 5: return job.dispatch_date;
    case 6: return job.return_date;
    case 7: return job.ref_person_approved_at;
    case 8: return job.high_authority_approved_at;
    case 9: return job.status === "closed" ? job.updated_at : null;
    default: return null;
  }
};

const stepSub = (job: JobWork, n: number): string | null => {
  switch (n) {
    case 1: return [job.division, job.process_type].filter(Boolean).join(" · ");
    case 2: return job.doc_no ?? null;
    case 3: return job.security_handover_by ? `By: ${job.security_handover_by}` : null;
    case 4: return [job.delivery_person_name, job.vehicle_number].filter(Boolean).join(" · ") || null;
    case 5: return job.tat_days ? `TAT: ${job.tat_days} days` : null;
    case 6: return job.received_qty != null ? `Received: ${job.received_qty} ${job.unit ?? ""}` : null;
    case 7: return job.ref_person_remarks ?? null;
    case 8: return job.high_authority_remarks ?? null;
    case 9: return job.invoice_number ? `Invoice: ${job.invoice_number}` : null;
    default: return null;
  }
};

/* Build update payload when advancing step */
const buildStepPayload = (nextStep: number, fields: Record<string, string>, job: JobWork): Record<string, any> => {
  const now = new Date().toISOString();
  const base: Record<string, any> = {
    current_step: nextStep,
    status: STEPS[nextStep - 1]?.status ?? "requirement",
    updated_at: now,
  };
  // merge extra fields
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== "") base[k] = v;
  });
  // step-specific auto fields
  if (nextStep === 3 && !base.security_handover_at) base.security_handover_at = now;
  if (nextStep === 7) { base.ref_person_approved = true; base.ref_person_approved_at = now; }
  if (nextStep === 8) { base.high_authority_approved = true; base.high_authority_approved_at = now; }
  if (nextStep === 9) { base.status = "closed"; }
  return base;
};

/* ══════════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════════ */
const StatusBadge = ({ job }: { job: JobWork }) => {
  const { label, cls } = getStatus(job);
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

/* Input primitives */
const inputCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors";
const labelCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

const Field = ({
  label, type = "text", value, onChange, placeholder, required, options,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; options?: string[];
}) => (
  <div>
    <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {type === "textarea" ? (
      <textarea value={value} onChange={e => onChange(e.target.value)}
        rows={3} placeholder={placeholder}
        className={cn(inputCls, "resize-none")} />
    ) : type.startsWith("select:") ? (
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">Select…</option>
        {type.replace("select:", "").split(",").map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} className={inputCls} />
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

/* ══════════════════════════════════════════════
   NEW JOB WORK MODAL
══════════════════════════════════════════════ */
const NewJobWorkModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (job: JobWork) => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    division: "Tool Room",
    process_type: "",
    material_name: "",
    material_grade: "",
    quantity: "",
    unit: "pcs",
    supplier_id: "",
    dispatch_purpose: "",
    responsible_person: "",
    expected_return_date: "",
    remarks: "",
  });
  const [error, setError] = useState("");

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name, contact_person, phone").eq("is_active", true).order("name");
      return (data ?? []) as Supplier[];
    },
  });

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.material_name.trim()) throw new Error("Material name is required");
      if (!form.quantity || isNaN(Number(form.quantity))) throw new Error("Valid quantity is required");

      const { data, error } = await supabase
        .from("job_work")
        .insert({
          division: form.division,
          process_type: form.process_type || null,
          material_name: form.material_name.trim(),
          material_grade: form.material_grade || null,
          quantity: Number(form.quantity),
          unit: form.unit || null,
          supplier_id: form.supplier_id || null,
          dispatch_purpose: form.dispatch_purpose || null,
          responsible_person: form.responsible_person || null,
          expected_return_date: form.expected_return_date || null,
          remarks: form.remarks || null,
          current_step: 1,
          status: "requirement",
        })
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .single();

      if (error) throw error;
      return data as unknown as JobWork;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job-work-all"] });
      onCreated(data);
    },
    onError: (e: any) => setError(e.message ?? "Failed to create job work"),
  });

  const PROCESS_TYPES = ["Polishing", "Hardening", "CG", "Laser Welding", "CMM", "Vacuum Heat Treatment", "Other"];

  return (
    <Modal title="New Job Work" onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Job Work"}
          </button>
        </div>
      }>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Division */}
      <div>
        <label className={labelCls}>Division<span className="text-red-500 ml-0.5">*</span></label>
        <div className="flex gap-2">
          {["Tool Room", "Moulding"].map(d => (
            <button key={d} onClick={() => setForm(f => ({ ...f, division: d }))}
              className={cn("flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                form.division === d
                  ? "bg-[#EAB308] border-[#EAB308] text-black"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
              )}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Process type */}
      <div>
        <label className={labelCls}>Process Type</label>
        <select value={form.process_type} onChange={e => setForm(f => ({ ...f, process_type: e.target.value }))} className={inputCls}>
          <option value="">Select process…</option>
          {PROCESS_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <Field label="Material Name" value={form.material_name} onChange={set("material_name")} placeholder="e.g. Core insert" required />
      <Field label="Material Grade" value={form.material_grade} onChange={set("material_grade")} placeholder="e.g. SKD-11, NAK-80" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" type="number" value={form.quantity} onChange={set("quantity")} placeholder="0" required />
        <Field label="Unit" type="select:pcs,kg,set,nos,mm" value={form.unit} onChange={set("unit")} />
      </div>

      {/* Supplier */}
      <div>
        <label className={labelCls}>Supplier</label>
        <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} className={inputCls}>
          <option value="">Select supplier…</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <Field label="Dispatch Purpose" value={form.dispatch_purpose} onChange={set("dispatch_purpose")} placeholder="Purpose of dispatch" />
      <Field label="Responsible Person" value={form.responsible_person} onChange={set("responsible_person")} placeholder="Name" />
      <Field label="Expected Return Date" type="date" value={form.expected_return_date} onChange={set("expected_return_date")} />
      <Field label="Remarks" type="textarea" value={form.remarks} onChange={set("remarks")} placeholder="Optional remarks…" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   ADVANCE STEP MODAL
══════════════════════════════════════════════ */
const AdvanceStepModal = ({ job, onClose }: { job: JobWork; onClose: (updated?: JobWork) => void }) => {
  const qc = useQueryClient();
  const nextStep = (job.current_step ?? 1) + 1;
  const nextStepInfo = STEPS[nextStep - 1];
  const extraFields = STEP_FIELDS[nextStep] ?? [];
  const [fields, setFields] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  const setF = (k: string) => (v: string) => setFields(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      // Validate required
      for (const f of extraFields) {
        if (f.required && !fields[f.key]) throw new Error(`${f.label} is required`);
      }
      const payload = buildStepPayload(nextStep, fields, job);
      if (remarks) payload.remarks = remarks;

      // Also log a step_doc entry
      const { data, error } = await supabase
        .from("job_work")
        .update(payload)
        .eq("id", job.id)
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .single();
      if (error) throw error;

      // Insert step doc record
      await supabase.from("job_work_step_docs").upsert({
        job_work_id: job.id,
        step_number: nextStep,
        step_name: nextStepInfo?.label ?? "",
        remarks: remarks || null,
      });

      return data as unknown as JobWork;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job-work-all"] });
      qc.invalidateQueries({ queryKey: ["jw-docs", job.id] });
      onClose(data);
    },
    onError: (e: any) => setError(e.message ?? "Failed to update"),
  });

  if (!nextStepInfo) return null;

  return (
    <Modal
      title={`Advance to Step ${nextStep}: ${nextStepInfo.label}`}
      onClose={() => onClose()}
      footer={
        <div className="flex gap-3">
          <button onClick={() => onClose()} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Updating…</> : <>Mark as {nextStepInfo.label}</>}
          </button>
        </div>
      }>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Current → Next indicator */}
      <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div className="text-center flex-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Current</p>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{STEPS[(job.current_step ?? 1) - 1]?.label}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#EAB308] flex-shrink-0" />
        <div className="text-center flex-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Advancing to</p>
          <p className="text-sm font-semibold text-[#EAB308]">{nextStepInfo.label}</p>
        </div>
      </div>

      {/* Step-specific fields */}
      {extraFields.map(f => (
        <Field
          key={f.key}
          label={f.label}
          type={f.type}
          value={fields[f.key] ?? ""}
          onChange={setF(f.key)}
          required={f.required}
        />
      ))}

      <Field label="Step Remarks (optional)" type="textarea" value={remarks} onChange={setRemarks} placeholder="Any notes for this step…" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   LOG COMMUNICATION MODAL
══════════════════════════════════════════════ */
const LogCommModal = ({ jobId, onClose }: { jobId: string; onClose: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    communication_type: "whatsapp",
    contact_person: "",
    notes: "",
    follow_up_needed: false,
    follow_up_date: "",
  });
  const [error, setError] = useState("");
  const set = (k: string) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.notes.trim()) throw new Error("Notes are required");
      const { error } = await supabase.from("job_work_communications").insert({
        job_work_id: jobId,
        communication_type: form.communication_type,
        contact_person: form.contact_person || null,
        notes: form.notes.trim(),
        follow_up_needed: form.follow_up_needed,
        follow_up_date: form.follow_up_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jw-comms", jobId] });
      onClose();
    },
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Log"}
          </button>
        </div>
      }>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Type selector */}
      <div>
        <label className={labelCls}>Communication type</label>
        <div className="grid grid-cols-4 gap-2">
          {COMM_TYPES.map(ct => (
            <button key={ct.value} onClick={() => setForm(f => ({ ...f, communication_type: ct.value }))}
              className={cn("flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-colors",
                form.communication_type === ct.value
                  ? "bg-[#EAB308] border-[#EAB308] text-black"
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

      {/* Follow up */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.follow_up_needed}
            onChange={e => setForm(f => ({ ...f, follow_up_needed: e.target.checked }))}
            className="w-4 h-4 rounded accent-[#EAB308]" />
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
   TRACKING TIMELINE
══════════════════════════════════════════════ */
const Timeline = ({ job, docs }: { job: JobWork; docs: any[] }) => {
  const cur = job.current_step ?? 1;
  return (
    <div>
      {STEPS.map((s, idx) => {
        const done = cur > s.n, current = cur === s.n, last = idx === STEPS.length - 1;
        const ts = stepTimestamp(job, s.n);
        const sub = stepSub(job, s.n);
        const doc = docs.find(d => d.step_number === s.n);
        return (
          <div key={s.n} className="flex gap-3.5">
            <div className="flex flex-col items-center" style={{ width: 28 }}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-colors",
                done ? "bg-[#EAB308] border-[#EAB308] text-black"
                  : current ? "bg-white dark:bg-neutral-900 border-[#EAB308] text-[#EAB308]"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600"
              )}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  : current ? <s.icon className="w-3 h-3" strokeWidth={2} />
                    : <Circle className="w-3 h-3" strokeWidth={1.5} />}
              </div>
              {!last && <div className={cn("w-px flex-1 my-1", done ? "bg-[#EAB308]" : "bg-neutral-200 dark:bg-neutral-700")} style={{ minHeight: 24 }} />}
            </div>
            <div className={cn("flex-1 pb-4", last && "pb-0")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold leading-snug",
                    done ? "text-neutral-800 dark:text-white"
                      : current ? "text-[#CA8A04] dark:text-[#EAB308]"
                        : "text-neutral-300 dark:text-neutral-600"
                  )}>
                    {s.label}
                    {current && job.is_overdue && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-2.5 h-2.5" />OVERDUE
                      </span>
                    )}
                  </p>
                  {sub && (done || current) && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</p>}
                  {doc?.doc_url && (
                    <a href={doc.doc_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#EAB308] hover:underline mt-1">
                      <FileText className="w-3 h-3" />View document
                    </a>
                  )}
                  {doc?.remarks && <p className="text-xs text-neutral-400 dark:text-neutral-500 italic mt-0.5">{doc.remarks}</p>}
                  {s.n === 7 && job.ref_person_approved && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Approved by ref person</p>}
                  {s.n === 8 && job.high_authority_approved && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />High authority approved</p>}
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
const Detail = ({ job: initialJob, onBack }: { job: JobWork; onBack: () => void }) => {
  const [job, setJob] = useState(initialJob);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showLogComm, setShowLogComm] = useState(false);
  const { label, cls } = getStatus(job);
  const canAdvance = (job.current_step ?? 1) < 9;

  const { data: docs = [] } = useQuery({
    queryKey: ["jw-docs", job.id],
    queryFn: async () => {
      const { data } = await supabase.from("job_work_step_docs").select("*").eq("job_work_id", job.id).order("step_number");
      return data ?? [];
    },
  });

  const { data: comms = [] } = useQuery({
    queryKey: ["jw-comms", job.id],
    queryFn: async () => {
      const { data } = await supabase.from("job_work_communications").select("*").eq("job_work_id", job.id).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
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
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{job.doc_no ?? "Job Work"}</h2>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", cls)}>{label}</span>
              {job.is_overdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-2 py-0.5 rounded-lg">
                  <AlertTriangle className="w-3 h-3" />Overdue
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
              {[job.division, job.process_type, job.suppliers?.name].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowLogComm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log</span>
            </button>
            {canAdvance && (
              <button onClick={() => setShowAdvance(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Update Status</span>
                <span className="sm:hidden">Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Step progress bar */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Progress</p>
            <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
              Step {job.current_step ?? 1} / 9 · {Math.round(((job.current_step ?? 1) / 9) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", job.is_overdue ? "bg-red-400" : "bg-[#EAB308]")}
              style={{ width: `${Math.round(((job.current_step ?? 1) / 9) * 100)}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex justify-between mt-3">
            {STEPS.map(s => (
              <div key={s.n} title={s.label} className={cn(
                "w-2 h-2 rounded-full transition-colors",
                (job.current_step ?? 1) > s.n ? "bg-[#EAB308]"
                  : (job.current_step ?? 1) === s.n ? "bg-[#EAB308] ring-2 ring-[#EAB308]/30"
                    : "bg-neutral-200 dark:bg-neutral-700"
              )} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* LEFT: Timeline + Comms */}
          <div className="lg:col-span-3 space-y-4">
            <SC title="Trip Info" icon={Truck}
              action={
                canAdvance ? (
                  <button onClick={() => setShowAdvance(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#EAB308] hover:underline">
                    <ArrowRight className="w-3.5 h-3.5" />Advance step
                  </button>
                ) : undefined
              }>
              <Timeline job={job} docs={docs as any[]} />
            </SC>

            <SC title="Communications" icon={MessageSquare}
              action={
                <button onClick={() => setShowLogComm(true)}
                  className="flex items-center gap-1 text-xs font-medium text-[#EAB308] hover:underline">
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
                  <button onClick={() => setShowLogComm(true)}
                    className="mt-2 text-xs text-[#EAB308] hover:underline font-medium">
                    + Log first communication
                  </button>
                </div>
              )}
            </SC>
          </div>

          {/* RIGHT: Details */}
          <div className="lg:col-span-2 space-y-4">
            <SC title="Material-Details" icon={Package}>
              <DR label="Material" value={job.material_name} />
              <DR label="Grade" value={job.material_grade} />
              <DR label="Quantity" value={`${job.quantity}${job.unit ? " " + job.unit : ""}`} />
              <DR label="Division" value={job.division} />
              <DR label="Process" value={job.process_type} />
              <DR label="Supplier" value={job.suppliers?.name} />
              <DR label="Purpose" value={job.dispatch_purpose} />
            </SC>

            <SC title="Sender Details" icon={User}>
              <DR label="Supplier" value={job.suppliers?.name} />
              <DR label="Contact" value={job.suppliers?.contact_person} />
              <DR label="Phone" value={job.suppliers?.phone} />
              <DR label="Responsible" value={job.responsible_person} />
            </SC>

            <SC title="Dispatch Info" icon={Truck}>
              <DR label="Dispatched" value={fd(job.dispatch_date)} />
              <DR label="Mode" value={job.dispatch_mode} />
              <DR label="Vehicle No." value={job.vehicle_number} />
              <DR label="Delivery By" value={job.delivery_person_name} />
              <DR label="Expected Return" value={fd(job.expected_return_date)} />
              <DR label="TAT" value={job.tat_days ? `${job.tat_days} days` : null} />
            </SC>

            {(job.current_step ?? 1) >= 6 && (
              <SC title="Return & Invoice" icon={Receipt}>
                <DR label="Returned" value={fd(job.return_date)} />
                <DR label="Received Qty" value={job.received_qty != null ? `${job.received_qty} ${job.unit ?? ""}` : null} />
                <DR label="Balance Qty" value={job.balance_qty != null ? `${job.balance_qty} ${job.unit ?? ""}` : null} />
                <DR label="Invoice No." value={job.invoice_number} />
                <DR label="Amount" value={inr(job.invoice_amount)} />
                {job.invoice_url && (
                  <a href={job.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#EAB308] hover:underline mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <FileText className="w-3.5 h-3.5" />View Invoice
                  </a>
                )}
              </SC>
            )}

            {job.remarks && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Remarks</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{job.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdvance && (
        <AdvanceStepModal job={job} onClose={updated => {
          setShowAdvance(false);
          if (updated) setJob(updated);
        }} />
      )}
      {showLogComm && <LogCommModal jobId={job.id} onClose={() => setShowLogComm(false)} />}
    </>
  );
};

/* ══════════════════════════════════════════════
   LIST ROW
══════════════════════════════════════════════ */
const Row = ({ job, onClick }: { job: JobWork; onClick: () => void }) => {
  const step = job.current_step ?? 1;
  const pct = Math.round((step / 9) * 100);
  return (
    <div onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{job.doc_no ?? "—"}</span>
          <StatusBadge job={job} />
          {job.is_overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/40 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-2.5 h-2.5" />OVERDUE
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">
          {job.material_name}
          {job.material_grade && <span className="font-normal text-neutral-400 dark:text-neutral-500"> · {job.material_grade}</span>}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
          {[job.division, job.process_type, job.suppliers?.name].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="hidden md:flex flex-col gap-1 w-36 flex-shrink-0">
        <div className="flex justify-between">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Step {step}/9</span>
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", job.is_overdue ? "bg-red-400" : "bg-[#EAB308]")}
            style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
          {STEPS[Math.min(step - 1, 8)]?.label}
        </span>
      </div>

      <div className="hidden sm:block text-right flex-shrink-0 min-w-[90px]">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{fd(job.expected_return_date)}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{ago(job.updated_at)}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function ProcurementJobWorkPage() {
  const [selected, setSelected] = useState<JobWork | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [divFilter, setDiv] = useState("all");
  const [tab, setTab] = useState<"active" | "closed">("active");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["job-work-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_work")
        .select("*, suppliers(id, name, contact_person, phone), departments(name)")
        .order("created_at", { ascending: false });
      return (data ?? []) as JobWork[];
    },
  });

  const filtered = jobs.filter(j => {
    const active = (j.current_step ?? 1) < 9;
    if (tab === "active" && !active) return false;
    if (tab === "closed" && active) return false;
    if (divFilter !== "all" && j.division !== divFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        j.material_name.toLowerCase().includes(q) ||
        (j.doc_no ?? "").toLowerCase().includes(q) ||
        (j.process_type ?? "").toLowerCase().includes(q) ||
        (j.suppliers?.name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const overdueCount = jobs.filter(j => j.is_overdue).length;
  const activeCount = jobs.filter(j => (j.current_step ?? 1) < 9).length;
  const closedCount = jobs.filter(j => (j.current_step ?? 1) >= 9).length;

  if (selected) return <Detail job={selected} onBack={() => setSelected(null)} />;

  return (
    <>
      <div className="space-y-5 pb-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Job Work</h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              {activeCount} active
              {overdueCount > 0 && <> · <span className="text-red-500 font-medium">{overdueCount} overdue</span></>}
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus className="w-4 h-4" strokeWidth={2} />New Job Work
          </button>
        </div>

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" strokeWidth={1.8} />
            <p className="text-sm text-red-700 dark:text-red-300">
              <span className="font-semibold">{overdueCount} job{overdueCount > 1 ? "s" : ""}</span> have exceeded expected return date.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: jobs.length, color: "text-neutral-900 dark:text-white" },
            { label: "Active", value: activeCount, color: "text-blue-600 dark:text-blue-400" },
            { label: "Overdue", value: overdueCount, color: "text-red-500 dark:text-red-400" },
            { label: "Closed", value: closedCount, color: "text-neutral-400 dark:text-neutral-500" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-4 py-3 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List card */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
            <div className="flex gap-0.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
              {(["active", "closed"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                    tab === t
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}>
                  {t} <span className="text-xs opacity-60">({t === "active" ? activeCount : closedCount})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search material, doc no, supplier…"
                  className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select value={divFilter} onChange={e => setDiv(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-[#EAB308]/60">
                <option value="all">All Divisions</option>
                <option value="Tool Room">Tool Room</option>
                <option value="Moulding">Moulding</option>
              </select>
            </div>
          </div>

          {/* Column header */}
          <div className="hidden md:grid grid-cols-[1fr_160px_100px_20px] gap-4 px-5 py-2 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Material / Details</span>
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Progress</span>
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-right">Due</span>
            <span />
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" />
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-3">Loading…</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(job => <Row key={job.id} job={job} onClick={() => setSelected(job)} />)
          ) : (
            <div className="py-16 text-center">
              <div className="w-10 h-10 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center mx-auto mb-3">
                <Package className="w-5 h-5 text-neutral-300 dark:text-neutral-600" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {search ? "No results found" : "No job work found"}
              </p>
              <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-1">
                {search ? "Try a different search" : "Create a new job work order to get started"}
              </p>
              {!search && (
                <button onClick={() => setShowNew(true)}
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <Plus className="w-4 h-4" />New Job Work
                </button>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{filtered.length} of {jobs.length} records</p>
            </div>
          )}
        </div>
      </div>

      {/* New Job Work modal */}
      {showNew && (
        <NewJobWorkModal
          onClose={() => setShowNew(false)}
          onCreated={job => {
            setShowNew(false);
            setSelected(job);
          }}
        />
      )}
    </>
  );
}