import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import {
  Plus, Search, X, ArrowLeft, ChevronRight, Download,
  Package, Layers, FileText, Send, CheckCircle2, Loader2,
  MessageSquare, Mail, Star, CreditCard, Truck, Edit2,
  Copy, Printer, BarChart3, Boxes, BadgeCheck, Receipt,
  Clock, AlertTriangle, ExternalLink, Hash, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════ TOKENS ══════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";
const CARD_Y = "bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)]";
const iCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors";
const lCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

/* ══════════════════════════════ CONSTANTS ══════════════════════════════ */
const GRADES = ["NAK-80", "SKD-61", "SKD-11", "S50C", "C-45", "P-20", "H-13", "SS-420", "2083", "718", "2311", "8407", "STAVAX", "ELMAX", "Other"];

const S: Record<string, { label: string; cls: string; dot: string }> = {
  inquiry_pending: { label: "Pending", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700", dot: "bg-neutral-400" },
  inquiry_sent: { label: "Inquiry Sent", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40", dot: "bg-blue-500" },
  rates_received: { label: "Rates Received", cls: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40", dot: "bg-violet-500" },
  comparing: { label: "Comparing", cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40", dot: "bg-amber-500" },
  supplier_selected: { label: "Supplier Selected", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40", dot: "bg-orange-500" },
  po_raised: { label: "PO Raised", cls: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40", dot: "bg-indigo-500" },
  confirmed: { label: "Confirmed", cls: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40", dot: "bg-teal-500" },
  in_transit: { label: "In Transit", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40", dot: "bg-blue-400" },
  received: { label: "Received ✓", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/40", dot: "bg-red-500" },
};

const PO_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700" },
  sent: { label: "Sent", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" },
  confirmed: { label: "Confirmed", cls: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40" },
  in_transit: { label: "In Transit", cls: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40" },
  received: { label: "Received", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" },
  paid: { label: "Paid ✓", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/40" },
};

const PROJ_S: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" },
  completed: { label: "Completed", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700" },
  on_hold: { label: "On Hold", cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/40" },
};

/* ══════════════════════════════ HELPERS ══════════════════════════════ */
const inr = (n?: number | null) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const fd = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy") : "—";
const fdt = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy, hh:mm a") : "—";
const now = () => new Date().toISOString();

/* ══════════════════════════════ SHARED UI ══════════════════════════════ */
const SBadge = ({ status, map = S }: { status: string; map?: Record<string, any> }) => {
  const c = map[status] ?? map[Object.keys(map)[0]];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-semibold", c.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot ?? "bg-neutral-400")} />
      {c.label}
    </span>
  );
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

const Modal = ({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={cn("relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl max-h-[92vh] flex flex-col", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      {footer && <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">{footer}</div>}
    </div>
  </div>
);

const F = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div><label className={lCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{children}</div>
);

/* ══════════════════════════════ RECEIPT ══════════════════════════════
   Shows ONLY material details - no project name per requirement
═══════════════════════════════════════════════════════════════════════ */
function buildInquiryText(req: any): string {
  const dims = [req.size_length, req.size_width, req.size_height].filter(Boolean);
  return `*MATERIAL RATE INQUIRY*
━━━━━━━━━━━━━━━━━━━━
*From:* Accura Precision Engineering Pvt. Ltd.
*Plot 197, Sector-8, IMT Manesar, Gurugram*
*Ref No.:* ${req.req_no ?? "—"}  |  *Date:* ${fd(req.created_at)}
━━━━━━━━━━━━━━━━━━━━
*MATERIAL REQUIRED:*

• Description   : ${req.material_name}
• Grade         : *${req.material_grade}*${(req.equivalent_grades?.length) ? `\n• Equivalents    : ${req.equivalent_grades.join(", ")}` : ""}
• Size (L×W×H)  : ${dims.length ? dims.join(" × ") + " mm" : "As per drawing"}
• Weight (approx): ${req.weight_kg != null ? req.weight_kg + " kg" : "To be calculated"}
• Quantity      : ${req.quantity} ${req.unit}${req.hrc_required ? `\n• HRC Required   : ${req.hrc_required}` : ""}${req.surface_finish ? `\n• Surface Finish : ${req.surface_finish}` : ""}${req.heat_treatment ? `\n• Heat Treatment : ${req.heat_treatment}` : ""}${req.special_notes ? `\n• Special Notes  : ${req.special_notes}` : ""}
━━━━━━━━━━━━━━━━━━━━
*Please confirm:*
1. Is this material available?
2. Best rate per kg / per piece
3. Delivery timeline from order

*Delivery Address:*
Plot 197, Sector-8, IMT Manesar,
Gurugram, Haryana — 122051

_Rate inquiry only — not a purchase order._
━━━━━━━━━━━━━━━━━━━━`;
}

const ReceiptView = ({ req }: { req: any }) => {
  const ref = useRef<HTMLDivElement>(null);
  const dims = [req.size_length, req.size_width, req.size_height].filter(Boolean);
  const dimsStr = dims.length ? dims.join(" × ") + " mm" : "—";
  const txt = buildInquiryText(req);

  const doPrint = () => {
    const el = ref.current; if (!el) return;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>Inquiry ${req.req_no}</title>
      <style>body{font-family:Segoe UI,sans-serif;margin:0;padding:20px;background:#fff}*{box-sizing:border-box}</style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4">
      {/* ── RECEIPT CARD — material only, no project name ── */}
      <div ref={ref} className="bg-white border-2 border-neutral-200 rounded-2xl overflow-hidden">
        {/* Header strip */}
        <div style={{ background: "#EAB308", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#000" }}>ACCURA PRECISION ENGINEERING PVT. LTD.</div>
            <div style={{ fontSize: 10, color: "rgba(0,0,0,0.6)", marginTop: 2 }}>Plot 197, Sector-8, IMT Manesar, Gurugram, Haryana — 122051</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#000" }}>MATERIAL RATE INQUIRY</div>
            <div style={{ fontSize: 11, color: "rgba(0,0,0,0.7)", marginTop: 3 }}>Ref: {req.req_no ?? "—"}</div>
            <div style={{ fontSize: 10, color: "rgba(0,0,0,0.6)" }}>Date: {fd(req.created_at)}</div>
          </div>
        </div>

        {/* Material table */}
        <div style={{ padding: "14px 18px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                {["Description", "Grade", "Size (L×W×H)", "Weight", "Qty", "HRC", "Surface Finish"].map(h => (
                  <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "9px 8px", fontWeight: 600 }}>{req.material_name}</td>
                <td style={{ padding: "9px 8px" }}>
                  <span style={{ fontWeight: 900, color: "#b45309", fontSize: 14 }}>{req.material_grade}</span>
                  {(req.equivalent_grades?.length > 0) && <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Equiv: {req.equivalent_grades.join(", ")}</div>}
                </td>
                <td style={{ padding: "9px 8px", fontFamily: "monospace" }}>{dimsStr}</td>
                <td style={{ padding: "9px 8px" }}>{req.weight_kg != null ? `${req.weight_kg} kg` : "—"}</td>
                <td style={{ padding: "9px 8px", fontWeight: 700 }}>{req.quantity} {req.unit}</td>
                <td style={{ padding: "9px 8px" }}>{req.hrc_required ?? "—"}</td>
                <td style={{ padding: "9px 8px" }}>{req.surface_finish ?? "—"}</td>
              </tr>
            </tbody>
          </table>

          {/* Extra specs */}
          {(req.heat_treatment || req.special_notes) && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6 }}>
              {req.heat_treatment && <div style={{ fontSize: 11, marginBottom: 3 }}><strong>Heat Treatment:</strong> {req.heat_treatment}</div>}
              {req.special_notes && <div style={{ fontSize: 11 }}><strong>Notes:</strong> {req.special_notes}</div>}
            </div>
          )}

          {/* Rate inquiry note */}
          <div style={{ marginTop: 12, padding: "8px 10px", background: "#eff6ff", border: "1px dashed #93c5fd", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>RATE INQUIRY — Rate not mentioned</div>
            <div style={{ fontSize: 11, color: "#2563eb", marginTop: 3 }}>
              Please confirm: (1) Material availability &amp; grade offered, (2) Best rate per kg / per piece, (3) Delivery timeline from order confirmation.
            </div>
          </div>

          {/* Delivery */}
          <div style={{ marginTop: 10, fontSize: 11, color: "#555" }}>
            <strong>Delivery Address:</strong> Plot 197, Sector-8, IMT Manesar, Gurugram, Haryana — 122051
          </div>
        </div>

        <div style={{ background: "#f9f9f9", borderTop: "1px solid #eee", padding: "8px 18px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "#aaa" }}>This is a rate inquiry only — not a purchase order</div>
          <div style={{ fontSize: 10, color: "#aaa" }}>Generated: {fdt(new Date().toISOString())}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button onClick={doPrint}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
          <Printer className="w-4 h-4" />Print
        </button>
        <button onClick={() => { navigator.clipboard.writeText(txt); }}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
          <Copy className="w-4 h-4" />Copy
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(txt)}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
          <MessageSquare className="w-4 h-4" />WhatsApp
        </a>
        <a href={`mailto:?subject=${encodeURIComponent("Material Inquiry - " + req.req_no)}&body=${encodeURIComponent(txt)}`}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors">
          <Mail className="w-4 h-4" />Email
        </a>
      </div>
    </div>
  );
};

/* ══════════════════════════════ PO PRINT ══════════════════════════════ */
const POPrint = ({ po, req, project, supplier }: { po: any; req: any; project: any; supplier: any }) => {
  const ref = useRef<HTMLDivElement>(null);
  const doPrint = () => {
    const el = ref.current; if (!el) return;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>PO ${po.po_no}</title>
      <style>body{font-family:Segoe UI,sans-serif;margin:0;padding:20px;background:#fff}*{box-sizing:border-box}table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;text-align:left;border:1px solid #ddd}th{background:#f5f5f5;font-size:11px;text-transform:uppercase}</style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4">
      <div ref={ref} className="bg-white border-2 border-neutral-200 rounded-2xl overflow-hidden text-sm">
        {/* Header */}
        <div style={{ background: "#EAB308", padding: "14px 18px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#000" }}>ACCURA PRECISION ENGINEERING PVT. LTD.</div>
            <div style={{ fontSize: 10, color: "rgba(0,0,0,0.6)" }}>Plot 197, Sector-8, IMT Manesar, Gurugram, Haryana</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#000" }}>PURCHASE ORDER</div>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.7)", marginTop: 3 }}>{po.po_no}</div>
            <div style={{ fontSize: 10, color: "rgba(0,0,0,0.6)" }}>Date: {fd(po.created_at)}</div>
          </div>
        </div>

        {/* Supplier + Project info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #eee" }}>
          <div style={{ padding: "12px 18px", borderRight: "1px solid #eee" }}>
            <div style={{ fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Supplier / Vendor</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{supplier?.name ?? "—"}</div>
            {supplier?.contact_person && <div style={{ fontSize: 11, color: "#555" }}>{supplier.contact_person}</div>}
            {supplier?.phone && <div style={{ fontSize: 11, color: "#555" }}>{supplier.phone}</div>}
            {supplier?.gst_number && <div style={{ fontSize: 11, color: "#555" }}>GSTIN: {supplier.gst_number}</div>}
          </div>
          <div style={{ padding: "12px 18px" }}>
            <div style={{ fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Delivery To</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Accura Precision Engineering Pvt. Ltd.</div>
            <div style={{ fontSize: 11, color: "#555" }}>Plot 197, Sector-8, IMT Manesar</div>
            <div style={{ fontSize: 11, color: "#555" }}>Gurugram, Haryana — 122051</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}><strong>Project:</strong> {project.project_no}</div>
            {po.delivery_date && <div style={{ fontSize: 11, color: "#555" }}><strong>Delivery by:</strong> {fd(po.delivery_date)}</div>}
          </div>
        </div>

        {/* Material table */}
        <div style={{ padding: "14px 18px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1a1a1a" }}>
                {["#", "Material Description", "Grade", "Size", "Qty", "Rate", "Taxable Amt", "GST", "Total"].map(h => (
                  <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>1</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", fontWeight: 600 }}>{req.material_name}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", fontWeight: 700, color: "#b45309" }}>{req.material_grade}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", fontFamily: "monospace", fontSize: 11 }}>
                  {[req.size_length, req.size_width, req.size_height].filter(Boolean).join("×") || "—"} mm
                </td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", fontWeight: 700 }}>{po.quantity} {po.unit}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>{inr(po.rate)}/unit</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>{inr(po.total_amount)}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>{po.tax_percent}% = {inr(po.tax_amount)}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", fontWeight: 700 }}>{inr(po.grand_total)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: "#fffbeb" }}>
                <td colSpan={8} style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>Grand Total</td>
                <td style={{ padding: "8px 10px", fontWeight: 900, fontSize: 14, color: "#b45309" }}>{inr(po.grand_total)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Terms + Invoice */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div style={{ padding: "10px", background: "#f9f9f9", borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Terms & Conditions</div>
              {po.payment_terms && <div style={{ fontSize: 11 }}><strong>Payment:</strong> {po.payment_terms}</div>}
              {po.special_instructions && <div style={{ fontSize: 11, marginTop: 4 }}>{po.special_instructions}</div>}
              {po.pi_number && <div style={{ fontSize: 11, marginTop: 4 }}><strong>PI Ref:</strong> {po.pi_number}</div>}
            </div>
            <div style={{ padding: "10px", background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#166534", marginBottom: 4 }}>Invoice Details</div>
              {po.invoice_number
                ? <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>Invoice: {po.invoice_number}</div>
                  <div style={{ fontSize: 11 }}>Amount: {inr(po.invoice_amount)}</div>
                  {po.received_at && <div style={{ fontSize: 11 }}>Received: {fd(po.received_at)}</div>}
                  <div style={{ fontSize: 11 }}>Payment: <strong>{po.payment_status}</strong></div>
                </>
                : <div style={{ fontSize: 11, color: "#888" }}>Invoice not yet received</div>
              }
            </div>
          </div>

          {/* Quotation ref */}
          {po.quotation_ref && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#555", padding: "6px 10px", background: "#f5f5f5", borderRadius: 6 }}>
              <strong>Quotation Reference:</strong> {po.quotation_ref}
              {po.quotation_date && ` dated ${fd(po.quotation_date)}`}
            </div>
          )}
        </div>

        <div style={{ background: "#f5f5f5", borderTop: "1px solid #eee", padding: "8px 18px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "#aaa" }}>Authorised by: Accura Precision Engineering Pvt. Ltd.</div>
          <div style={{ fontSize: 10, color: "#aaa" }}>Printed: {fdt(new Date().toISOString())}</div>
        </div>
      </div>

      <button onClick={doPrint}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-bold text-sm transition-colors">
        <Printer className="w-4 h-4" />Print PO / Invoice
      </button>
    </div>
  );
};

/* ══════════════════════════════ RATE COMPARISON ══════════════════════════════ */
const RateComparison = ({ req, rates, suppliers, onRefresh }: {
  req: any; rates: any[]; suppliers: any[]; onRefresh: () => void;
}) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editRate, setEditRate] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [err, setErr] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        requirement_id: req.id,
        supplier_id: form.supplier_id,
        is_available: form.is_available !== "false",
        available_grade: form.available_grade || req.material_grade,
        is_equivalent: form.is_equivalent === "true",
        equivalent_note: form.equivalent_note || null,
        rate_per_kg: form.rate_per_kg ? Number(form.rate_per_kg) : null,
        rate_per_piece: form.rate_per_piece ? Number(form.rate_per_piece) : null,
        total_amount: form.total_amount ? Number(form.total_amount) : null,
        lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
        delivery_note: form.delivery_note || null,
        quotation_ref: form.quotation_ref || null,
        comparison_notes: form.comparison_notes || null,
        entered_by: user?.id,
      };
      if (editRate?.id) {
        const { error } = await supabase.from("apepl_supplier_rates").update(payload).eq("id", editRate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("apepl_supplier_rates").upsert(payload, { onConflict: "requirement_id,supplier_id" });
        if (error) throw error;
      }
      await supabase.from("apepl_requirements").update({ status: "rates_received", updated_at: now() }).eq("id", req.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apepl-rates", req.id] }); qc.invalidateQueries({ queryKey: ["apepl-requirements"] }); setEditRate(null); setForm({}); setErr(""); onRefresh(); },
    onError: (e: any) => setErr(e.message),
  });

  const select = useMutation({
    mutationFn: async (rate: any) => {
      await supabase.from("apepl_supplier_rates").update({ is_selected: false }).eq("requirement_id", req.id);
      await supabase.from("apepl_supplier_rates").update({ is_selected: true }).eq("id", rate.id);
      await supabase.from("apepl_requirements").update({
        status: "supplier_selected",
        selected_supplier_id: rate.supplier_id,
        selected_rate: rate.rate_per_kg ?? rate.rate_per_piece,
        updated_at: now(),
      }).eq("id", req.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apepl-rates", req.id] }); qc.invalidateQueries({ queryKey: ["apepl-requirements"] }); onRefresh(); },
  });

  const doExport = () => {
    const headers = ["Supplier", "Available", "Grade Offered", "Equiv?", "Rate/kg", "Rate/pc", "Total", "Lead Time", "Quotation Ref", "Notes"];
    const rows = rates.map(r => [
      r.suppliers?.name ?? "—", r.is_available ? "Yes" : "No",
      r.available_grade ?? req.material_grade, r.is_equivalent ? `Yes — ${r.equivalent_note ?? ""}` : "No",
      r.rate_per_kg != null ? `₹${r.rate_per_kg}` : "—",
      r.rate_per_piece != null ? `₹${r.rate_per_piece}` : "—",
      r.total_amount != null ? `₹${r.total_amount}` : "—",
      r.lead_time_days != null ? `${r.lead_time_days}d` : "—",
      r.quotation_ref ?? "—", r.comparison_notes ?? "",
    ]);
    exportToPDF(`Rate_Comparison_${req.req_no}`,
      `Rate Comparison — ${req.req_no}\nMaterial: ${req.material_grade} | Qty: ${req.quantity} ${req.unit}`,
      headers, rows, "landscape");
  };

  const unsent = suppliers.filter(s => !rates.some(r => r.supplier_id === s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Rate Comparison — {req.material_grade}</p>
        <div className="flex gap-2">
          <button onClick={doExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
            <Download className="w-3.5 h-3.5" />Export PDF
          </button>
          {unsent.length > 0 && (
            <button onClick={() => { setEditRate({}); setForm({ supplier_id: unsent[0]?.id, is_available: "true", is_equivalent: "false" }); setErr(""); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black text-xs font-bold transition-colors">
              <Plus className="w-3.5 h-3.5" />Add Rate
            </button>
          )}
        </div>
      </div>

      {rates.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                {["Supplier", "Avail.", "Grade Offered", "Rate/kg", "Rate/pc", "Total", "Lead", "Quotation Ref", "Notes", ""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rates].sort((a, b) => ((a.rate_per_kg ?? a.rate_per_piece ?? 9e9) - (b.rate_per_kg ?? b.rate_per_piece ?? 9e9))).map((r, i) => {
                const isL = i === 0 && (r.rate_per_kg != null || r.rate_per_piece != null);
                return (
                  <tr key={r.id} className={cn("border-b border-neutral-50 dark:border-neutral-800/60 last:border-0", r.is_selected && "bg-[#EAB308]/5 dark:bg-[#EAB308]/10")}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.is_selected && <Star className="w-3.5 h-3.5 text-[#EAB308]" fill="currentColor" />}
                        {isL && !r.is_selected && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">★</span>}
                        <span className="font-medium text-neutral-800 dark:text-white text-xs">{r.suppliers?.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("text-xs font-bold", r.is_available ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                        {r.is_available ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{r.available_grade ?? req.material_grade}</p>
                      {r.is_equivalent && <p className="text-[10px] text-amber-600 italic">{r.equivalent_note}</p>}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-neutral-800 dark:text-white">{r.rate_per_kg != null ? inr(r.rate_per_kg) : "—"}</td>
                    <td className="px-3 py-3 text-xs text-neutral-600 dark:text-neutral-400">{r.rate_per_piece != null ? inr(r.rate_per_piece) : "—"}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-neutral-800 dark:text-white">{r.total_amount != null ? inr(r.total_amount) : "—"}</td>
                    <td className="px-3 py-3 text-xs text-neutral-400">{r.lead_time_days != null ? `${r.lead_time_days}d` : "—"}</td>
                    <td className="px-3 py-3 text-xs text-neutral-400">{r.quotation_ref ?? "—"}</td>
                    <td className="px-3 py-3 max-w-[100px]"><p className="text-[10px] text-neutral-400 truncate">{r.comparison_notes ?? "—"}</p></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditRate(r); setForm({ ...r, is_available: String(r.is_available ?? true), is_equivalent: String(r.is_equivalent ?? false) }); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        </button>
                        {!r.is_selected && r.is_available && (
                          <button onClick={() => select.mutate(r)} title="Select this supplier"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#EAB308] hover:bg-[#EAB308]/10 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
          <BarChart3 className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">No rates yet — add as you receive them</p>
        </div>
      )}

      {/* Add/Edit rate modal */}
      {editRate !== null && (
        <Modal title={editRate?.id ? "Edit Rate" : "Add Rate"} onClose={() => { setEditRate(null); setForm({}); setErr(""); }}>
          {err && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{err}</div>}

          {!editRate?.id && (
            <F label="Supplier" required>
              <select value={form.supplier_id ?? ""} onChange={e => setForm((f: any) => ({ ...f, supplier_id: e.target.value }))} className={iCls}>
                <option value="">Select supplier…</option>
                {unsent.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
          )}

          {/* Quotation entry */}
          <div className="grid grid-cols-2 gap-3">
            <F label="Quotation Reference">
              <input value={form.quotation_ref ?? ""} onChange={e => setForm((f: any) => ({ ...f, quotation_ref: e.target.value }))} placeholder="Quote # or ref" className={iCls} />
            </F>
            <F label="Quotation Date">
              <input type="date" value={form.quotation_date ?? ""} onChange={e => setForm((f: any) => ({ ...f, quotation_date: e.target.value }))} className={iCls} />
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Available?">
              <select value={String(form.is_available ?? "true")} onChange={e => setForm((f: any) => ({ ...f, is_available: e.target.value }))} className={iCls}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </F>
            <F label="Grade offered">
              <input value={form.available_grade ?? req.material_grade} onChange={e => setForm((f: any) => ({ ...f, available_grade: e.target.value }))} className={iCls} />
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Is equivalent?">
              <select value={String(form.is_equivalent ?? "false")} onChange={e => setForm((f: any) => ({ ...f, is_equivalent: e.target.value }))} className={iCls}>
                <option value="false">No — exact grade</option>
                <option value="true">Yes — equivalent</option>
              </select>
            </F>
            {(form.is_equivalent === "true") && (
              <F label="Equivalent note">
                <input value={form.equivalent_note ?? ""} onChange={e => setForm((f: any) => ({ ...f, equivalent_note: e.target.value }))} placeholder="e.g. ASSAB 718 = NAK-80" className={iCls} />
              </F>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <F label="Rate/kg (₹)"><input type="number" value={form.rate_per_kg ?? ""} onChange={e => setForm((f: any) => ({ ...f, rate_per_kg: e.target.value }))} placeholder="0.00" className={iCls} /></F>
            <F label="Rate/piece (₹)"><input type="number" value={form.rate_per_piece ?? ""} onChange={e => setForm((f: any) => ({ ...f, rate_per_piece: e.target.value }))} placeholder="0.00" className={iCls} /></F>
            <F label="Total (₹)"><input type="number" value={form.total_amount ?? ""} onChange={e => setForm((f: any) => ({ ...f, total_amount: e.target.value }))} placeholder="0.00" className={iCls} /></F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Lead time (days)"><input type="number" value={form.lead_time_days ?? ""} onChange={e => setForm((f: any) => ({ ...f, lead_time_days: e.target.value }))} placeholder="7" className={iCls} /></F>
            <F label="Delivery note"><input value={form.delivery_note ?? ""} onChange={e => setForm((f: any) => ({ ...f, delivery_note: e.target.value }))} placeholder="Ex-stock / 7 days" className={iCls} /></F>
          </div>

          <F label="Comparison notes">
            <textarea value={form.comparison_notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, comparison_notes: e.target.value }))} rows={2} className={cn(iCls, "resize-none")} placeholder="Notes for comparison…" />
          </F>

          <div className="flex gap-3">
            <button onClick={() => { setEditRate(null); setForm({}); setErr(""); }}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {save.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Rate"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ══════════════════════════════ PO LIST + UPDATE ══════════════════════════════ */
const POSection = ({ req, project, pos, suppliers, onRefresh }: {
  req: any; project: any; pos: any[]; suppliers: any[]; onRefresh: () => void;
}) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [updatePO, setUpdatePO] = useState<any>(null);
  const [printPO, setPrintPO] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [err, setErr] = useState("");
  const setF = (k: string) => (v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const saveUpdate = useMutation({
    mutationFn: async () => {
      const payload: any = { updated_at: now() };
      // Status
      if (form.status) payload.status = form.status;
      // Quotation
      if (form.quotation_ref) payload.quotation_ref = form.quotation_ref;
      if (form.quotation_date) payload.quotation_date = form.quotation_date;
      // PI
      if (form.pi_number) payload.pi_number = form.pi_number;
      if (form.pi_url) payload.pi_url = form.pi_url;
      if (form.pi_amount) payload.pi_amount = Number(form.pi_amount);
      // Invoice
      if (form.invoice_number) payload.invoice_number = form.invoice_number;
      if (form.invoice_amount) payload.invoice_amount = Number(form.invoice_amount);
      if (form.invoice_url) payload.invoice_url = form.invoice_url;
      // Delivery
      if (form.received_at) payload.received_at = new Date(form.received_at).toISOString();
      if (form.received_qty) payload.received_qty = Number(form.received_qty);
      // Payment
      if (form.payment_status) payload.payment_status = form.payment_status;
      if (form.payment_reference) payload.payment_reference = form.payment_reference;
      if (form.payment_date) payload.payment_date = form.payment_date;
      // Notes
      if (form.notes !== undefined) payload.notes = form.notes;

      const { error } = await supabase.from("apepl_purchase_orders").update(payload).eq("id", updatePO.id);
      if (error) throw error;

      // Sync req status
      const statusMap: Record<string, string> = {
        confirmed: "confirmed", in_transit: "in_transit", received: "received",
      };
      if (form.status && statusMap[form.status]) {
        await supabase.from("apepl_requirements").update({ status: statusMap[form.status], updated_at: now() }).eq("id", req.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apepl-pos", req.id] }); qc.invalidateQueries({ queryKey: ["apepl-requirements"] }); setUpdatePO(null); setErr(""); onRefresh(); },
    onError: (e: any) => setErr(e.message),
  });

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));

  return (
    <div className="space-y-3">
      {pos.map((po: any) => {
        const stCfg = PO_STATUS[po.status] ?? PO_STATUS.draft;
        const sup = supplierMap[po.supplier_id];
        return (
          <div key={po.id} className={cn(CARD, "p-5")}>
            {/* PO header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-sm font-bold text-neutral-800 dark:text-white">{po.po_no}</span>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", stCfg.cls)}>{stCfg.label}</span>
                  {po.payment_status === "paid" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40">
                      <CheckCircle2 className="w-3 h-3" />Paid
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{sup?.name ?? "—"} · Created {fd(po.created_at)}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setPrintPO(po)} title="Print PO"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#EAB308] hover:bg-[#EAB308]/10 transition-colors">
                  <Printer className="w-4 h-4" strokeWidth={1.8} />
                </button>
                <button onClick={() => { setUpdatePO(po); setForm({ ...po, received_at: po.received_at ? format(new Date(po.received_at), "yyyy-MM-dd") : "", payment_date: po.payment_date ?? "" }); setErr(""); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Edit2 className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* PO grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <p className="text-neutral-400 dark:text-neutral-500 mb-0.5">Qty × Rate</p>
                <p className="font-bold text-neutral-800 dark:text-white">{po.quantity} × {inr(po.rate)}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <p className="text-neutral-400 dark:text-neutral-500 mb-0.5">Grand Total</p>
                <p className="font-bold text-[#EAB308]">{inr(po.grand_total)}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <p className="text-neutral-400 dark:text-neutral-500 mb-0.5">Delivery</p>
                <p className="font-bold text-neutral-800 dark:text-white">{fd(po.delivery_date)}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <p className="text-neutral-400 dark:text-neutral-500 mb-0.5">Payment</p>
                <p className="font-bold text-neutral-800 dark:text-white">{po.payment_terms ?? "—"}</p>
              </div>
            </div>

            {/* Quotation + PI + Invoice row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quotation */}
              <div className={cn("rounded-xl p-3 border", po.quotation_ref ? "bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30" : "bg-neutral-50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800")}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Quotation</p>
                {po.quotation_ref
                  ? <><p className="text-xs font-bold text-violet-700 dark:text-violet-300">{po.quotation_ref}</p>{po.quotation_date && <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{fd(po.quotation_date)}</p>}</>
                  : <p className="text-xs text-neutral-400 dark:text-neutral-500">Not recorded</p>
                }
              </div>

              {/* PI */}
              <div className={cn("rounded-xl p-3 border", po.pi_number ? "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" : "bg-neutral-50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800")}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Proforma Invoice</p>
                {po.pi_number
                  ? <>
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{po.pi_number}</p>
                    {po.pi_amount && <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inr(po.pi_amount)}</p>}
                    {po.pi_url && <a href={po.pi_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />View PI</a>}
                  </>
                  : <p className="text-xs text-neutral-400 dark:text-neutral-500">Not received</p>
                }
              </div>

              {/* Invoice */}
              <div className={cn("rounded-xl p-3 border", po.invoice_number ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30" : "bg-neutral-50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800")}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Invoice</p>
                {po.invoice_number
                  ? <>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{po.invoice_number}</p>
                    {po.invoice_amount && <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inr(po.invoice_amount)}</p>}
                    {po.invoice_url && <a href={po.invoice_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />View Invoice</a>}
                  </>
                  : <p className="text-xs text-neutral-400 dark:text-neutral-500">Not received</p>
                }
              </div>
            </div>

            {/* Received / notes */}
            {(po.received_at || po.notes) && (
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex gap-4 flex-wrap text-xs">
                {po.received_at && <p className="text-neutral-500 dark:text-neutral-400"><span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Received:</span> {fd(po.received_at)} · Qty: {po.received_qty ?? "—"}</p>}
                {po.notes && <p className="text-neutral-400 dark:text-neutral-500 italic">{po.notes}</p>}
              </div>
            )}
          </div>
        );
      })}

      {pos.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
          <Receipt className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">No POs raised yet</p>
          <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-1">Select a supplier from Rates tab to create a PO</p>
        </div>
      )}

      {/* Update PO Modal */}
      {updatePO && (
        <Modal title={`Update PO: ${updatePO.po_no}`} onClose={() => { setUpdatePO(null); setErr(""); }} wide>
          {err && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{err}</div>}

          {/* Status progression */}
          <F label="PO Status">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {["draft", "sent", "confirmed", "in_transit", "received", "paid"].map(st => {
                const c = PO_STATUS[st];
                return (
                  <button key={st} onClick={() => setF("status")(st)}
                    className={cn("py-2 rounded-xl border text-[10px] font-bold transition-all capitalize text-center", form.status === st ? cn(c.cls, "ring-2 ring-offset-1 ring-[#EAB308]") : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500")}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </F>

          {/* Quotation */}
          <div className="p-3 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-xl space-y-3">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Quotation Details</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Quotation Reference"><input value={form.quotation_ref ?? ""} onChange={e => setF("quotation_ref")(e.target.value)} placeholder="Quote # / ref no." className={iCls} /></F>
              <F label="Quotation Date"><input type="date" value={form.quotation_date ?? ""} onChange={e => setF("quotation_date")(e.target.value)} className={iCls} /></F>
            </div>
          </div>

          {/* Proforma Invoice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl space-y-3">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Proforma Invoice (PI)</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="PI Number"><input value={form.pi_number ?? ""} onChange={e => setF("pi_number")(e.target.value)} placeholder="PI-XXXX" className={iCls} /></F>
              <F label="PI Amount (₹)"><input type="number" value={form.pi_amount ?? ""} onChange={e => setF("pi_amount")(e.target.value)} placeholder="0.00" className={iCls} /></F>
            </div>
            <F label="PI Document URL"><input value={form.pi_url ?? ""} onChange={e => setF("pi_url")(e.target.value)} placeholder="https://…" className={iCls} /></F>
          </div>

          {/* Invoice */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-3">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Invoice (Proof of Purchase)</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Invoice Number"><input value={form.invoice_number ?? ""} onChange={e => setF("invoice_number")(e.target.value)} placeholder="INV-XXXX" className={iCls} /></F>
              <F label="Invoice Amount (₹)"><input type="number" value={form.invoice_amount ?? ""} onChange={e => setF("invoice_amount")(e.target.value)} placeholder="0.00" className={iCls} /></F>
            </div>
            <F label="Invoice URL"><input value={form.invoice_url ?? ""} onChange={e => setF("invoice_url")(e.target.value)} placeholder="https://…" className={iCls} /></F>
          </div>

          {/* Received */}
          <div className="p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-xl space-y-3">
            <p className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">Material Receipt</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Received Date"><input type="date" value={form.received_at ?? ""} onChange={e => setF("received_at")(e.target.value)} className={iCls} /></F>
              <F label="Received Qty"><input type="number" value={form.received_qty ?? ""} onChange={e => setF("received_qty")(e.target.value)} className={iCls} /></F>
            </div>
          </div>

          {/* Payment */}
          <div className="p-3 bg-[#EAB308]/5 border border-[#EAB308]/20 rounded-xl space-y-3">
            <p className="text-xs font-bold text-[#EAB308] uppercase tracking-wider">Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Payment Status">
                <select value={form.payment_status ?? "pending"} onChange={e => setF("payment_status")(e.target.value)} className={iCls}>
                  {["pending", "partial", "paid"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </F>
              <F label="Payment Date"><input type="date" value={form.payment_date ?? ""} onChange={e => setF("payment_date")(e.target.value)} className={iCls} /></F>
            </div>
            <F label="Payment Reference / UTR">
              <input value={form.payment_reference ?? ""} onChange={e => setF("payment_reference")(e.target.value)} placeholder="UTR / cheque no." className={iCls} />
            </F>
          </div>

          <F label="Notes">
            <textarea value={form.notes ?? ""} onChange={e => setF("notes")(e.target.value)} rows={2} className={cn(iCls, "resize-none")} placeholder="Any delivery or payment notes…" />
          </F>

          <div className="flex gap-3">
            <button onClick={() => { setUpdatePO(null); setErr(""); }}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button onClick={() => saveUpdate.mutate()} disabled={saveUpdate.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saveUpdate.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* Print PO Modal */}
      {printPO && (
        <Modal title={`Print: ${printPO.po_no}`} onClose={() => setPrintPO(null)} wide>
          <POPrint po={printPO} req={req} project={project}
            supplier={suppliers.find(s => s.id === printPO.supplier_id) ?? {}} />
        </Modal>
      )}
    </div>
  );
};

/* ══════════════════════════════ REQUIREMENT DETAIL ══════════════════════════════ */
const RequirementDetail = ({ req: initialReq, project, onBack }: { req: any; project: any; onBack: () => void }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<"receipt" | "rates" | "po">("receipt");
  const [showSI, setShowSI] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const [poForm, setPOForm] = useState<any>({});
  const [poErr, setPOErr] = useState("");

  const { data: liveReq = initialReq } = useQuery({
    queryKey: ["apepl-req-live", initialReq.id],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_requirements").select("*, suppliers:selected_supplier_id(name)").eq("id", initialReq.id).single();
      return data ?? initialReq;
    },
  });
  const req: any = liveReq;

  const { data: rates = [], refetch: refetchRates } = useQuery({
    queryKey: ["apepl-rates", req.id],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_supplier_rates").select("*, suppliers(name)").eq("requirement_id", req.id).order("rate_per_kg");
      return data ?? [];
    },
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["apepl-inquiries", req.id],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_inquiries").select("*, suppliers(name, phone, email)").eq("requirement_id", req.id);
      return data ?? [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-rm"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name, phone, email, contact_person, gst_number")
        .in("supplier_type", ["raw_material", "job_work"]).eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: pos = [], refetch: refetchPOs } = useQuery({
    queryKey: ["apepl-pos", req.id],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_purchase_orders").select("*").eq("requirement_id", req.id).order("created_at");
      return data ?? [];
    },
  });

  const selectedRate = (rates as any[]).find(r => r.is_selected);
  const sentIds = new Set((inquiries as any[]).map((i: any) => i.supplier_id));

  const sendInquiry = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.from("apepl_inquiries").upsert({
        requirement_id: req.id, supplier_id: sid,
        sent_via: "whatsapp", message_text: buildInquiryText(req), sent_by: user?.id,
      }, { onConflict: "requirement_id,supplier_id" });
      if (error) throw error;
      await supabase.from("apepl_requirements").update({ status: "inquiry_sent", updated_at: now() }).eq("id", req.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apepl-inquiries", req.id] }); qc.invalidateQueries({ queryKey: ["apepl-requirements"] }); qc.invalidateQueries({ queryKey: ["apepl-req-live", req.id] }); },
  });

  const createPO = useMutation({
    mutationFn: async () => {
      if (!poForm.supplier_id) throw new Error("Supplier required");
      if (!poForm.rate) throw new Error("Rate required");
      const qty = Number(poForm.quantity ?? req.quantity);
      const rate = Number(poForm.rate);
      const sub = qty * rate;
      const tax = Number(poForm.tax_percent ?? 18);
      const { error } = await supabase.from("apepl_purchase_orders").insert({
        requirement_id: req.id, project_id: project.id,
        supplier_id: poForm.supplier_id,
        supplier_rate_id: poForm.supplier_rate_id || null,
        quantity: qty, unit: req.unit, rate,
        total_amount: sub, tax_percent: tax,
        tax_amount: sub * tax / 100, grand_total: sub + sub * tax / 100,
        payment_terms: poForm.payment_terms || null,
        delivery_date: poForm.delivery_date || null,
        quotation_ref: poForm.quotation_ref || null,
        special_instructions: poForm.special_instructions || null,
        delivery_address: "Plot 197, Sector-8, IMT Manesar, Gurugram, Haryana — 122051",
        status: "draft", created_by: user?.id,
      });
      if (error) throw error;
      await supabase.from("apepl_requirements").update({ status: "po_raised", updated_at: now() }).eq("id", req.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apepl-pos", req.id] }); qc.invalidateQueries({ queryKey: ["apepl-requirements"] }); qc.invalidateQueries({ queryKey: ["apepl-req-live", req.id] }); setShowPO(false); setPOForm({}); setPOErr(""); setTab("po"); },
    onError: (e: any) => setPOErr(e.message),
  });

  return (
    <>
      <div className="space-y-4 pb-8">
        {/* Back bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.8} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{req.req_no}</h2>
              <SBadge status={req.status} />
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              <span className="font-bold text-[#EAB308]">{req.material_grade}</span> · {req.quantity} {req.unit} · {project.project_no}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button onClick={() => setShowSI(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
              <Send className="w-3.5 h-3.5" />Send Inquiry
            </button>
            {selectedRate && (
              <button onClick={() => { setShowPO(true); setPOForm({ supplier_id: selectedRate.supplier_id, supplier_rate_id: selectedRate.id, rate: selectedRate.rate_per_kg ?? selectedRate.rate_per_piece, quantity: req.quantity, tax_percent: "18" }); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors">
                <FileText className="w-3.5 h-3.5" />Create PO
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: "receipt", label: "Receipt & Inquiry", icon: FileText },
            { id: "rates", label: `Rates (${(rates as any[]).length})`, icon: BarChart3 },
            { id: "po", label: `PO & Tracking (${(pos as any[]).length})`, icon: BadgeCheck },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                tab === t.id ? "bg-[#EAB308] border-[#EAB308] text-black" : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/40"
              )}>
              <t.icon className="w-3.5 h-3.5" strokeWidth={1.8} />{t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            {tab === "receipt" && <ReceiptView req={req} />}
            {tab === "rates" && <RateComparison req={req} rates={rates as any[]} suppliers={suppliers as any[]} onRefresh={() => { refetchRates(); qc.invalidateQueries({ queryKey: ["apepl-req-live", req.id] }); }} />}
            {tab === "po" && <POSection req={req} project={project} pos={pos as any[]} suppliers={suppliers as any[]} onRefresh={() => { refetchPOs(); qc.invalidateQueries({ queryKey: ["apepl-req-live", req.id] }); }} />}
          </div>

          {/* Right: specs + inquiries */}
          <div className="space-y-4">
            <SC title="Material Specs" icon={Package}>
              <DR label="Grade" value={<span className="font-bold text-[#EAB308]">{req.material_grade}</span>} />
              <DR label="Description" value={req.material_name} />
              <DR label="Quantity" value={`${req.quantity} ${req.unit}`} />
              {(req.size_length || req.size_width || req.size_height) && (
                <DR label="Size L×W×H" value={`${[req.size_length, req.size_width, req.size_height].filter(Boolean).join(" × ")} mm`} />
              )}
              <DR label="Weight" value={req.weight_kg != null ? `${req.weight_kg} kg` : null} />
              <DR label="HRC" value={req.hrc_required} />
              <DR label="Surface Finish" value={req.surface_finish} />
              <DR label="Heat Treatment" value={req.heat_treatment} />
              {(req.equivalent_grades?.length > 0) && <DR label="Equivalents" value={req.equivalent_grades.join(", ")} />}
              {req.special_notes && (
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Notes</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{req.special_notes}</p>
                </div>
              )}
            </SC>

            <SC title={`Inquiries (${(inquiries as any[]).length})`} icon={Send}>
              {(inquiries as any[]).length > 0 ? (
                <div className="space-y-2">
                  {(inquiries as any[]).map((inq: any) => (
                    <div key={inq.id} className="flex items-center justify-between py-2 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{inq.suppliers?.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">{fd(inq.sent_at)} · {inq.sent_via}</p>
                      </div>
                      <a href={`https://wa.me/${(inq.suppliers?.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(buildInquiryText(req))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-2 flex-shrink-0">Resend</a>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-3">None sent yet</p>}
            </SC>

            {selectedRate && (
              <div className={cn(CARD_Y, "p-4")}>
                <p className="text-black/60 text-xs font-semibold uppercase tracking-wider mb-1">Selected Supplier</p>
                <p className="text-black font-black text-base">{(rates as any[]).find(r => r.is_selected)?.suppliers?.name}</p>
                <p className="text-black/70 text-sm mt-0.5">
                  {selectedRate.rate_per_kg != null ? `₹${selectedRate.rate_per_kg}/kg` : `₹${selectedRate.rate_per_piece}/pc`}
                  {selectedRate.total_amount && ` · Total: ${inr(selectedRate.total_amount)}`}
                </p>
                {selectedRate.lead_time_days && <p className="text-black/60 text-xs mt-1">Lead time: {selectedRate.lead_time_days} days</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Inquiry Modal */}
      {showSI && (
        <Modal title="Send Inquiry" onClose={() => setShowSI(false)}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Select suppliers for <span className="font-bold text-neutral-800 dark:text-white">{req.material_grade}</span>
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(suppliers as any[]).map((s: any) => {
              const sent = sentIds.has(s.id);
              return (
                <div key={s.id} className={cn("flex items-center justify-between p-3 rounded-xl border", sent ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">{s.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{s.phone ?? s.email ?? "No contact"}</p>
                  </div>
                  {sent
                    ? <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0 ml-2"><CheckCircle2 className="w-3.5 h-3.5" />Sent</span>
                    : (
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        <a href={`https://wa.me/${(s.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(buildInquiryText(req))}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => sendInquiry.mutate(s.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">
                          <MessageSquare className="w-3 h-3" />WA
                        </a>
                        <a href={`mailto:${s.email ?? ""}?subject=${encodeURIComponent("Material Inquiry - " + req.req_no)}&body=${encodeURIComponent(buildInquiryText(req))}`}
                          onClick={() => sendInquiry.mutate(s.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
                          <Mail className="w-3 h-3" />Email
                        </a>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setShowSI(false)}
            className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Close</button>
        </Modal>
      )}

      {/* Create PO Modal */}
      {showPO && (
        <Modal title="Create Purchase Order" onClose={() => { setShowPO(false); setPOErr(""); }} wide>
          {poErr && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{poErr}</div>}

          <div className={cn(CARD_Y, "px-4 py-3")}>
            <p className="text-black font-black text-sm">{req.material_grade} — {req.material_name}</p>
            <p className="text-black/60 text-xs">{project.project_no} · {req.req_no}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Supplier" required>
              <select value={poForm.supplier_id ?? ""} onChange={e => setPOForm((f: any) => ({ ...f, supplier_id: e.target.value }))} className={iCls}>
                <option value="">Select…</option>
                {(suppliers as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
            <F label="Quantity">
              <input type="number" value={poForm.quantity ?? req.quantity} onChange={e => setPOForm((f: any) => ({ ...f, quantity: e.target.value }))} className={iCls} />
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Rate (₹)" required>
              <input type="number" value={poForm.rate ?? ""} onChange={e => setPOForm((f: any) => ({ ...f, rate: e.target.value }))} placeholder="per unit" className={iCls} />
            </F>
            <F label="GST %">
              <input type="number" value={poForm.tax_percent ?? "18"} onChange={e => setPOForm((f: any) => ({ ...f, tax_percent: e.target.value }))} className={iCls} />
            </F>
          </div>

          {/* Live total */}
          {poForm.rate && poForm.quantity && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-[#EAB308]/10 rounded-xl border border-[#EAB308]/20">
              {[
                ["Subtotal", inr(Number(poForm.quantity) * Number(poForm.rate))],
                [`GST ${poForm.tax_percent ?? 18}%`, inr(Number(poForm.quantity) * Number(poForm.rate) * (Number(poForm.tax_percent ?? 18) / 100))],
                ["Grand Total", inr(Number(poForm.quantity) * Number(poForm.rate) * (1 + Number(poForm.tax_percent ?? 18) / 100))],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{l}</p>
                  <p className={cn("text-sm font-bold", l === "Grand Total" ? "text-[#EAB308]" : "text-neutral-800 dark:text-white")}>{v}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <F label="Quotation Reference">
              <input value={poForm.quotation_ref ?? ""} onChange={e => setPOForm((f: any) => ({ ...f, quotation_ref: e.target.value }))} placeholder="Quote #" className={iCls} />
            </F>
            <F label="Delivery Date">
              <input type="date" value={poForm.delivery_date ?? ""} onChange={e => setPOForm((f: any) => ({ ...f, delivery_date: e.target.value }))} className={iCls} />
            </F>
          </div>

          <F label="Payment Terms">
            <select value={poForm.payment_terms ?? ""} onChange={e => setPOForm((f: any) => ({ ...f, payment_terms: e.target.value }))} className={iCls}>
              <option value="">Select…</option>
              {["Against Delivery", "Advance 50%", "30 Days", "45 Days", "60 Days"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </F>

          <F label="Special Instructions">
            <textarea value={poForm.special_instructions ?? ""} onChange={e => setPOForm((f: any) => ({ ...f, special_instructions: e.target.value }))} rows={2} className={cn(iCls, "resize-none")} />
          </F>

          <div className="flex gap-3">
            <button onClick={() => { setShowPO(false); setPOErr(""); }}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button onClick={() => createPO.mutate()} disabled={createPO.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {createPO.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create PO"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

/* ══════════════════════════════ PROJECT DETAIL ══════════════════════════════ */
const ProjectDetail = ({ project, onBack }: { project: any; onBack: () => void }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [showNewReq, setShowNewReq] = useState(false);
  const [reqForm, setReqForm] = useState<any>({ unit: "pcs", quantity: "1" });
  const [reqErr, setReqErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const setF = (k: string) => (v: any) => setReqForm((f: any) => ({ ...f, [k]: v }));

  const { data: requirements = [], isLoading, refetch } = useQuery({
    queryKey: ["apepl-requirements", project.id],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_requirements")
        .select("*, suppliers:selected_supplier_id(name)").eq("project_id", project.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createReq = useMutation({
    mutationFn: async () => {
      if (!reqForm.material_name?.trim()) throw new Error("Material name required");
      if (!reqForm.material_grade?.trim()) throw new Error("Grade required");
      const { error } = await supabase.from("apepl_requirements").insert({
        project_id: project.id,
        material_name: reqForm.material_name.trim(),
        material_grade: reqForm.material_grade.trim().toUpperCase(),
        equivalent_grades: reqForm.equivalent_grades ? reqForm.equivalent_grades.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        size_length: reqForm.size_length ? Number(reqForm.size_length) : null,
        size_width: reqForm.size_width ? Number(reqForm.size_width) : null,
        size_height: reqForm.size_height ? Number(reqForm.size_height) : null,
        weight_kg: reqForm.weight_kg ? Number(reqForm.weight_kg) : null,
        quantity: reqForm.quantity ? Number(reqForm.quantity) : 1,
        unit: reqForm.unit ?? "pcs",
        hrc_required: reqForm.hrc_required || null,
        surface_finish: reqForm.surface_finish || null,
        heat_treatment: reqForm.heat_treatment || null,
        special_notes: reqForm.special_notes || null,
        internal_notes: reqForm.internal_notes || null,
        status: "inquiry_pending",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { refetch(); setShowNewReq(false); setReqForm({ unit: "pcs", quantity: "1" }); setReqErr(""); },
    onError: (e: any) => setReqErr(e.message),
  });

  if (selectedReq) return (
    <RequirementDetail req={selectedReq} project={project} onBack={() => { setSelectedReq(null); refetch(); }} />
  );

  const filtered = statusFilter === "all" ? requirements : (requirements as any[]).filter(r => r.status === statusFilter);
  const totalSpend = (requirements as any[]).filter(r => r.selected_rate != null).reduce((s, r: any) => s + Number(r.selected_rate ?? 0), 0);

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.8} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{project.project_no}</h2>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", PROJ_S[project.status]?.cls ?? PROJ_S.active.cls)}>
                {PROJ_S[project.status]?.label ?? "Active"}
              </span>
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">{project.project_name}{project.client_name ? ` · ${project.client_name}` : ""}</p>
          </div>
          <button onClick={() => { setReqForm({ unit: "pcs", quantity: "1" }); setReqErr(""); setShowNewReq(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-all active:scale-[.98]">
            <Plus className="w-4 h-4" />Add Material
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Items", v: (requirements as any[]).length, c: "text-neutral-900 dark:text-white" },
            { label: "Inquiry Sent", v: (requirements as any[]).filter(r => r.status !== "inquiry_pending").length, c: "text-blue-600 dark:text-blue-400" },
            { label: "Rates Received", v: (requirements as any[]).filter(r => ["rates_received", "comparing", "supplier_selected"].includes(r.status)).length, c: "text-violet-600 dark:text-violet-400" },
            { label: "PO Raised", v: (requirements as any[]).filter(r => ["po_raised", "confirmed", "in_transit", "received"].includes(r.status)).length, c: "text-indigo-600 dark:text-indigo-400" },
            { label: "Received", v: (requirements as any[]).filter(r => r.status === "received").length, c: "text-emerald-600 dark:text-emerald-400" },
          ].map(s => (
            <div key={s.label} className={cn(CARD, "px-4 py-3 text-center")}>
              <p className={cn("text-2xl font-black tabular-nums", s.c)}>{s.v}</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
          <button onClick={() => setStatusFilter("all")}
            className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap",
              statusFilter === "all" ? "bg-[#EAB308] border-[#EAB308] text-black" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400")}>
            All ({(requirements as any[]).length})
          </button>
          {Object.entries(S).map(([key, cfg]) => {
            const count = (requirements as any[]).filter(r => r.status === key).length;
            if (!count) return null;
            return (
              <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap",
                  statusFilter === key ? cn(cfg.cls, "ring-2 ring-offset-1 ring-[#EAB308]") : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400")}>
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Requirements list */}
        <div className={cn(CARD, "overflow-hidden")}>
          {isLoading
            ? <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" /></div>
            : filtered.length > 0
              ? (filtered as any[]).map((r: any) => (
                <div key={r.id} onClick={() => setSelectedReq(r)}
                  className="flex items-center gap-4 px-5 py-4 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-[#EAB308]" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{r.req_no}</span>
                      <SBadge status={r.status} />
                    </div>
                    <p className="text-sm font-bold text-neutral-800 dark:text-white">
                      <span className="text-[#EAB308]">{r.material_grade}</span>
                      <span className="font-normal text-neutral-500 dark:text-neutral-400"> — {r.material_name}</span>
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {r.quantity} {r.unit}
                      {(r.size_length || r.size_width) && ` · ${[r.size_length, r.size_width, r.size_height].filter(Boolean).join("×")} mm`}
                      {r.hrc_required && ` · ${r.hrc_required} HRC`}
                      {r.suppliers?.name && ` · Selected: ${r.suppliers.name}`}
                      {r.selected_rate && ` · ${inr(r.selected_rate)}`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 transition-colors flex-shrink-0" strokeWidth={1.8} />
                </div>
              ))
              : (
                <div className="py-16 text-center">
                  <Boxes className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No materials yet</p>
                  <button onClick={() => { setReqForm({ unit: "pcs", quantity: "1" }); setShowNewReq(true); }}
                    className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                    <Plus className="w-4 h-4" />Add First Material
                  </button>
                </div>
              )
          }
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800 flex items-center justify-between">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{filtered.length} materials</p>
              {totalSpend > 0 && <p className="text-sm font-bold text-neutral-800 dark:text-white">Est. Spend: <span className="text-[#EAB308]">{inr(totalSpend)}</span></p>}
            </div>
          )}
        </div>
      </div>

      {/* Add Material Modal */}
      {showNewReq && (
        <Modal title="Add Material Requirement" onClose={() => { setShowNewReq(false); setReqErr(""); }} wide>
          {reqErr && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{reqErr}</div>}

          <div className={cn(CARD_Y, "px-4 py-3")}>
            <p className="text-black font-black text-sm">{project.project_no} — {project.project_name}</p>
            <p className="text-black/60 text-xs">{project.division}{project.client_name ? ` · ${project.client_name}` : ""}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Material Description" required>
              <input value={reqForm.material_name ?? ""} onChange={e => setF("material_name")(e.target.value)} placeholder="e.g. Die Steel Block" className={iCls} />
            </F>
            <F label="Material Grade" required>
              <div><input value={reqForm.material_grade ?? ""} onChange={e => setF("material_grade")(e.target.value)} list="g-list" placeholder="e.g. NAK-80" className={iCls} />
                <datalist id="g-list">{GRADES.map(g => <option key={g} value={g} />)}</datalist></div>
            </F>
          </div>

          <F label="Acceptable Equivalents (comma separated)">
            <input value={reqForm.equivalent_grades ?? ""} onChange={e => setF("equivalent_grades")(e.target.value)} placeholder="e.g. 718, P-20" className={iCls} />
          </F>

          <div className="grid grid-cols-3 gap-3">
            <F label="Length (mm)"><input type="number" value={reqForm.size_length ?? ""} onChange={e => setF("size_length")(e.target.value)} placeholder="L" className={iCls} /></F>
            <F label="Width (mm)"> <input type="number" value={reqForm.size_width ?? ""} onChange={e => setF("size_width")(e.target.value)} placeholder="W" className={iCls} /></F>
            <F label="Height (mm)"><input type="number" value={reqForm.size_height ?? ""} onChange={e => setF("size_height")(e.target.value)} placeholder="H" className={iCls} /></F>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <F label="Weight (kg)"><input type="number" value={reqForm.weight_kg ?? ""} onChange={e => setF("weight_kg")(e.target.value)} placeholder="approx." className={iCls} /></F>
            <F label="Quantity"><input type="number" value={reqForm.quantity ?? "1"} onChange={e => setF("quantity")(e.target.value)} className={iCls} /></F>
            <F label="Unit">
              <select value={reqForm.unit ?? "pcs"} onChange={e => setF("unit")(e.target.value)} className={iCls}>
                {["pcs", "kg", "set", "nos", "block"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="HRC Required"><input value={reqForm.hrc_required ?? ""} onChange={e => setF("hrc_required")(e.target.value)} placeholder="e.g. 28–32 HRC" className={iCls} /></F>
            <F label="Surface Finish"><input value={reqForm.surface_finish ?? ""} onChange={e => setF("surface_finish")(e.target.value)} placeholder="e.g. Milled All Over" className={iCls} /></F>
          </div>

          <F label="Heat Treatment"><input value={reqForm.heat_treatment ?? ""} onChange={e => setF("heat_treatment")(e.target.value)} placeholder="e.g. Pre-hardened, Annealed" className={iCls} /></F>

          <F label="Special Notes (visible in inquiry)">
            <textarea value={reqForm.special_notes ?? ""} onChange={e => setF("special_notes")(e.target.value)} rows={2} className={cn(iCls, "resize-none")} />
          </F>

          <F label="Internal Notes (admin only)">
            <textarea value={reqForm.internal_notes ?? ""} onChange={e => setF("internal_notes")(e.target.value)} rows={2} className={cn(iCls, "resize-none")} />
          </F>

          <div className="flex gap-3">
            <button onClick={() => { setShowNewReq(false); setReqErr(""); }}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button onClick={() => createReq.mutate()} disabled={createReq.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {createReq.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : "Add Material"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

/* ══════════════════════════════ MAIN PAGE ══════════════════════════════ */
export default function APEPLPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [pForm, setPForm] = useState<any>({ division: "Tool Room" });
  const [pErr, setPErr] = useState("");
  const setF = (k: string) => (v: string) => setPForm((f: any) => ({ ...f, [k]: v }));

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["apepl-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_projects").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: reqCounts = {} } = useQuery({
    queryKey: ["apepl-req-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("apepl_requirements").select("project_id, status");
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { c[r.project_id] = (c[r.project_id] ?? 0) + 1; });
      return c;
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!pForm.project_no?.trim()) throw new Error("Project number required");
      if (!pForm.project_name?.trim()) throw new Error("Project name required");
      const { error } = await supabase.from("apepl_projects").insert({
        project_no: pForm.project_no.trim().toUpperCase(),
        project_name: pForm.project_name.trim(),
        client_name: pForm.client_name || null,
        description: pForm.description || null,
        division: pForm.division ?? "Tool Room",
        start_date: pForm.start_date || null,
        expected_date: pForm.expected_date || null,
        notes: pForm.notes || null,
        status: "active", created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apepl-projects"] }); setShowNew(false); setPForm({ division: "Tool Room" }); setPErr(""); },
    onError: (e: any) => setPErr(e.message),
  });

  const doExport = () => {
    exportToCSV(`APEPL_Projects_${format(new Date(), "dd-MM-yyyy")}`,
      ["Project No.", "Name", "Client", "Division", "Status", "Start", "Expected"],
      (projects as any[]).map(p => [p.project_no, p.project_name, p.client_name ?? "", p.division ?? "", p.status, fd(p.start_date), fd(p.expected_date)])
    );
  };

  if (selected) return <ProjectDetail project={selected} onBack={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["apepl-req-counts"] }); }} />;

  const filtered = (projects as any[]).filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.project_no.toLowerCase().includes(q) || p.project_name.toLowerCase().includes(q) || (p.client_name ?? "").toLowerCase().includes(q);
  });

  return (
    <>
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Layers className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">APEPL</h1>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">Accura Project Engineering Procurement Log</span>
            </div>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Project-wise raw material buying & tracking</p>
          </div>
          <div className="flex gap-2">
            <button onClick={doExport} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
              <Download className="w-4 h-4" />Export
            </button>
            <button onClick={() => { setPForm({ division: "Tool Room" }); setPErr(""); setShowNew(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm transition-all">
              <Plus className="w-4 h-4" strokeWidth={2} />New Project
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", v: (projects as any[]).length, c: "text-neutral-900 dark:text-white" },
            { label: "Active", v: (projects as any[]).filter(p => p.status === "active").length, c: "text-emerald-600 dark:text-emerald-400" },
            { label: "Completed", v: (projects as any[]).filter(p => p.status === "completed").length, c: "text-neutral-400 dark:text-neutral-500" },
            { label: "On Hold", v: (projects as any[]).filter(p => p.status === "on_hold").length, c: "text-amber-600 dark:text-amber-400" },
          ].map(s => (
            <div key={s.label} className={cn(CARD, "px-4 py-3 text-center")}>
              <p className={cn("text-2xl font-black tabular-nums", s.c)}>{s.v}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project no., name, client…"
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500"><X className="w-3.5 h-3.5" /></button>}
        </div>

        {/* Project list */}
        <div className={cn(CARD, "overflow-hidden")}>
          {isLoading
            ? <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" /></div>
            : filtered.length > 0
              ? filtered.map((p: any) => {
                const st = PROJ_S[p.status] ?? PROJ_S.active;
                const cnt = (reqCounts as any)[p.id] ?? 0;
                return (
                  <div key={p.id} onClick={() => setSelected(p)}
                    className="flex items-center gap-4 px-5 py-4 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors group">
                    <div className="w-11 h-11 rounded-xl bg-[#EAB308] flex items-center justify-center text-black font-black text-sm flex-shrink-0 shadow-[0_2px_8px_0_rgba(234,179,8,0.3)]">
                      {p.project_no.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-black text-neutral-900 dark:text-white">{p.project_no}</span>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", st.cls)}>{st.label}</span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">{p.project_name}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                        {p.client_name ? `${p.client_name} · ` : ""}{p.division}{p.expected_date ? ` · Due ${fd(p.expected_date)}` : ""}
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{cnt}</span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">items</span>
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{fd(p.created_at)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 transition-colors flex-shrink-0" strokeWidth={1.8} />
                  </div>
                );
              })
              : (
                <div className="py-16 text-center">
                  <Layers className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No projects yet</p>
                  <button onClick={() => { setPForm({ division: "Tool Room" }); setShowNew(true); }}
                    className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                    <Plus className="w-4 h-4" />Create First Project
                  </button>
                </div>
              )
          }
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{filtered.length} of {(projects as any[]).length} projects</p>
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showNew && (
        <Modal title="New Project" onClose={() => { setShowNew(false); setPErr(""); }} wide>
          {pErr && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{pErr}</div>}
          <div className="grid grid-cols-2 gap-3">
            <F label="Project Number" required><input value={pForm.project_no ?? ""} onChange={e => setF("project_no")(e.target.value.toUpperCase())} placeholder="TAKAHAT-J104030" className={iCls} /></F>
            <F label="Project Name" required><input value={pForm.project_name ?? ""} onChange={e => setF("project_name")(e.target.value)} placeholder="Takahat Die Set" className={iCls} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Client Name"><input value={pForm.client_name ?? ""} onChange={e => setF("client_name")(e.target.value)} placeholder="Honda, Suzuki…" className={iCls} /></F>
            <F label="Division">
              <select value={pForm.division ?? "Tool Room"} onChange={e => setF("division")(e.target.value)} className={iCls}>
                <option value="Tool Room">Tool Room</option>
                <option value="Moulding">Moulding</option>
                <option value="Both">Both</option>
              </select>
            </F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Start Date"><input type="date" value={pForm.start_date ?? ""} onChange={e => setF("start_date")(e.target.value)} className={iCls} /></F>
            <F label="Expected Completion"><input type="date" value={pForm.expected_date ?? ""} onChange={e => setF("expected_date")(e.target.value)} className={iCls} /></F>
          </div>
          <F label="Description">
            <textarea value={pForm.description ?? ""} onChange={e => setF("description")(e.target.value)} rows={2} className={cn(iCls, "resize-none")} placeholder="Brief project description…" />
          </F>
          <div className="flex gap-3">
            <button onClick={() => { setShowNew(false); setPErr(""); }}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button onClick={() => createProject.mutate()} disabled={createProject.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {createProject.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Project"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}