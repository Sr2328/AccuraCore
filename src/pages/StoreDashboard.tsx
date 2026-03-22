import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import {
  Package, AlertTriangle, TrendingDown, TrendingUp,
  Plus, Download, Upload, X, Loader2, CheckCircle2,
  Bell, RefreshCw, BarChart3, FileSpreadsheet, ShoppingCart,
  ChevronRight, Boxes, Eye
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
// xlsx removed — using CSV template download instead

/* ══════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";
const CARD_Y = "bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)]";
const iCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#EAB308]/60 transition-colors";

const PIE_COLORS = ["#10b981", "#EAB308", "#f97316", "#ef4444"];
const BAR_COLORS = ["#EAB308", "#3b82f6"];

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const getStatus = (qty: number, min: number) => {
  if (qty === 0) return { label: "Out of Stock", dot: "bg-red-500", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40", priority: 4 };
  if (qty < min) return { label: "Critical", dot: "bg-orange-500", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40", priority: 3 };
  if (qty <= min * 1.2) return { label: "Low", dot: "bg-amber-500", cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40", priority: 2 };
  return { label: "In Stock", dot: "bg-emerald-500", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40", priority: 1 };
};

/* ══════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════ */
const Modal = ({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={cn("relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl max-h-[92vh] flex flex-col", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      {footer && <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">{footer}</div>}
    </div>
  </div>
);

const F = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div><label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{children}</div>
);

/* ══════════════════════════════════════════════
   BULK EXCEL UPLOAD MODAL
══════════════════════════════════════════════ */
const BulkUploadModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const downloadTemplate = () => {
    // Download CSV template instead of xlsx
    const rows = [
      "Name,Category,Quantity,Unit,Min Stock Level,Location",
      "Steel Block NAK-80,Steel,10,pcs,5,Rack A-1",
      "Cutting Oil 5L,Consumables,20,litre,8,Store Room",
      "End Mill 10mm,Tools,25,pcs,5,Cabinet C",
      "A4 Paper Ream,Stationery,20,pcs,5,Office",
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "store_items_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setErrors(["File is empty or has no data rows."]); return; }
        const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
        const errs: string[] = [];
        const parsed = lines.slice(1).map((line, i) => {
          const vals = line.split(",").map(v => v.replace(/"/g, "").trim());
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
          const name = String(row["Name"] || row["name"] || "").trim();
          const category = String(row["Category"] || row["category"] || "").trim();
          const unit = String(row["Unit"] || row["unit"] || "pcs").trim();
          const qty = Number(row["Quantity"] || row["Qty"] || 0);
          const min = Number(row["Min Stock Level"] || row["Min"] || 0);
          const location = String(row["Location"] || row["location"] || "").trim();
          if (!name) errs.push(`Row ${i + 2}: Name is required`);
          return { name, category, unit, quantity: qty, min_stock_level: min, is_active: true };
        }).filter(r => r.name);
        setErrors(errs);
        setPreview(parsed);
      } catch (err) {
        setErrors(["Could not read file. Make sure it is a valid CSV file."]);
      }
    };
    reader.readAsText(file);
  };

  const doUpload = async () => {
    if (!preview.length) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("store_items").upsert(
        preview,
        { onConflict: "name", ignoreDuplicates: false }
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["store-items-dash"] });
      qc.invalidateQueries({ queryKey: ["store-items-all"] });
      setDone(true);
    } catch (e: any) {
      setErrors([e.message]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Bulk Upload Items via Excel" onClose={onClose} wide
      footer={!done && (
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
          <button onClick={doUpload} disabled={!preview.length || uploading || errors.length > 0}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload {preview.length} Items</>}
          </button>
        </div>
      )}>

      {done ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-base font-bold text-neutral-800 dark:text-white">{preview.length} items uploaded!</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">Inventory has been updated successfully.</p>
          <button onClick={onClose} className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">Done</button>
        </div>
      ) : (
        <>
          {/* Step 1: Download template */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-1">Step 1 — Download Template</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Required columns: <strong>Name, Category, Quantity, Unit</strong>. Optional: Min Stock Level, Location. Items with same name will be updated.</p>
            <button onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
              <Download className="w-3.5 h-3.5" />Download Excel Template
            </button>
          </div>

          {/* Step 2: Upload */}
          <div>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">Step 2 — Upload Filled Excel</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center cursor-pointer hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 transition-all">
              <FileSpreadsheet className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Click to select .csv file</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Required: Name, Category, Quantity, Unit · Optional: Min Stock Level, Location</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{errors.length} issue{errors.length > 1 ? "s" : ""} found</p>
              {errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>)}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && errors.length === 0 && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Preview — {preview.length} rows ready</p>
              <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800 max-h-56 overflow-y-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                    <tr>
                      {["Name", "Category", "Unit", "Qty", "Min", "Location"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-neutral-50 dark:border-neutral-800/60">
                        <td className="px-3 py-2 font-medium text-neutral-800 dark:text-white">{r.name}</td>
                        <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{r.category || "—"}</td>
                        <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{r.unit}</td>
                        <td className="px-3 py-2 font-semibold text-neutral-800 dark:text-white">{r.quantity}</td>
                        <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{r.min_stock_level}</td>
                        <td className="px-3 py-2 text-neutral-400 dark:text-neutral-500">{r.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
const StoreDashboard = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showBulk, setShowBulk] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  /* ── Queries ── */
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["store-items-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("*").eq("is_active", true).order("name");
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: stockInToday = [] } = useQuery({
    queryKey: ["store-in-today", today],
    queryFn: async () => {
      const { data } = await supabase.from("stock_in").select("id, quantity, item_id").gte("created_at", `${today}T00:00:00`);
      return data || [];
    },
  });

  const { data: stockOutToday = [] } = useQuery({
    queryKey: ["store-out-today", today],
    queryFn: async () => {
      const { data } = await supabase.from("stock_out").select("id, quantity, item_id").gte("created_at", `${today}T00:00:00`);
      return data || [];
    },
  });

  const { data: recentStockIn = [] } = useQuery({
    queryKey: ["store-recent-in"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_in")
        .select("*, store_items(name, unit)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: recentStockOut = [] } = useQuery({
    queryKey: ["store-recent-out"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_out")
        .select("*, store_items(name, unit)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  /* ── Derived stats ── */
  const getQty = (i: any) => Number(i.current_quantity ?? i.current_qty ?? i.quantity ?? 0);
  const getMin = (i: any) => Number(i.min_stock_level ?? i.minimum_quantity ?? 0);
  const totalItems = (items as any[]).length;
  const outOfStock = (items as any[]).filter(i => getQty(i) === 0).length;
  const critical = (items as any[]).filter(i => getQty(i) > 0 && getMin(i) > 0 && getQty(i) < getMin(i)).length;
  const lowStock = (items as any[]).filter(i => getMin(i) > 0 && getQty(i) >= getMin(i) && getQty(i) <= getMin(i) * 1.2).length;
  const inStock = totalItems - outOfStock - critical - lowStock;
  const txInToday = (stockInToday as any[]).reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  const txOutToday = (stockOutToday as any[]).reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  const alertItems = (items as any[]).filter(i => getMin(i) > 0 && getQty(i) <= getMin(i) * 1.2).sort((a, b) => getQty(a) - getQty(b));
  const needsPurchase = (items as any[]).filter(i => getQty(i) === 0 || (getMin(i) > 0 && getQty(i) < getMin(i)));

  /* ── Chart data ── */
  const pieData = [
    { name: "In Stock", value: inStock, fill: "#10b981" },
    { name: "Low", value: lowStock, fill: "#EAB308" },
    { name: "Critical", value: critical, fill: "#f97316" },
    { name: "Out of Stock", value: outOfStock, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  /* Category breakdown bar chart */
  const catMap: Record<string, number> = {};
  (items as any[]).forEach(i => { const k = i.category || "Other"; catMap[k] = (catMap[k] ?? 0) + 1; });
  const catBarData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);

  /* Last 7 days mock movement (replace with real aggregation query if needed) */
  const movementData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { date: format(d, "dd MMM"), in: Math.floor(Math.random() * 30), out: Math.floor(Math.random() * 20) };
  });

  return (
    <>
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Store Dashboard</h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">Inventory management & stock control</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button onClick={() => qc.invalidateQueries({ queryKey: ["store-items-dash"] })}
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-[#EAB308] hover:border-[#EAB308]/50 transition-colors">
              <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <button onClick={() => setShowBulk(true)}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
              <FileSpreadsheet className="w-4 h-4" />Bulk Upload
            </button>
            <button onClick={() => navigate("/store/stockin")}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
              <TrendingUp className="w-4 h-4" />Stock IN
            </button>
            <button onClick={() => navigate("/store/inventory")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm transition-all">
              <Plus className="w-4 h-4" strokeWidth={2} />Add Item
            </button>
          </div>
        </div>

        {/* ── Alert banner ── */}
        {(outOfStock + critical) > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3">
            <Bell className="w-4 h-4 text-red-500 flex-shrink-0" strokeWidth={1.8} />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {outOfStock > 0 && `${outOfStock} item${outOfStock > 1 ? "s" : ""} out of stock`}
              {outOfStock > 0 && critical > 0 && " · "}
              {critical > 0 && `${critical} critical`}
              {" — action required"}
            </p>
            <button onClick={() => document.getElementById("alert-section")?.scrollIntoView({ behavior: "smooth" })}
              className="ml-auto text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
              View <Eye className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Items", value: totalItems, color: "text-neutral-900 dark:text-white", bg: "bg-neutral-50 dark:bg-neutral-800", border: "border-neutral-100 dark:border-neutral-700", icon: Package },
            { label: "Stock IN Today", value: txInToday || "—", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-900/40", icon: TrendingUp },
            { label: "Stock OUT Today", value: txOutToday || "—", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-900/40", icon: TrendingDown },
            {
              label: "Need Action", value: outOfStock + critical, color: (outOfStock + critical) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
              bg: (outOfStock + critical) > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20",
              border: (outOfStock + critical) > 0 ? "border-red-100 dark:border-red-900/40" : "border-emerald-100 dark:border-emerald-900/40",
              icon: AlertTriangle
            },
          ].map(s => (
            <div key={s.label} className={cn(CARD, "p-4 flex items-center gap-3")}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", s.bg, s.border)}>
                <s.icon className={cn("w-5 h-5", s.color)} strokeWidth={1.8} />
              </div>
              <div>
                <p className={cn("text-2xl font-black tabular-nums leading-tight", s.color)}>{s.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Status summary pills ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "In Stock", value: inStock, cls: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
            { label: "Low Stock", value: lowStock, cls: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40", text: "text-amber-600 dark:text-amber-400" },
            { label: "Critical", value: critical, cls: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/40", text: "text-orange-600 dark:text-orange-400" },
            { label: "Out of Stock", value: outOfStock, cls: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40", text: "text-red-600 dark:text-red-400" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-2xl border p-3 text-center", s.cls)}>
              <p className={cn("text-xl font-black tabular-nums", s.text)}>{s.value}</p>
              <p className={cn("text-xs font-medium mt-0.5", s.text)}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Pie: stock status distribution */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Stock Status</p>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} items`]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No items yet</p>
              </div>
            )}
          </div>

          {/* Bar: items by category */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Items by Category</p>
            </div>
            {catBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-100 dark:stroke-neutral-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EAB308" radius={[4, 4, 0, 0]} name="Items" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No data yet</p>
              </div>
            )}
          </div>

          {/* Area: 7-day movement trend */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">7-Day Movement</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={movementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-100 dark:stroke-neutral-800" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="in" stroke="#10b981" fill="url(#gradIn)" strokeWidth={2} name="Stock IN" />
                <Area type="monotone" dataKey="out" stroke="#EAB308" fill="url(#gradOut)" strokeWidth={2} name="Stock OUT" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Needs Purchase ── */}
        {needsPurchase.length > 0 && (
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-red-500" strokeWidth={1.8} />
                <p className="text-sm font-bold text-neutral-800 dark:text-white">Needs Purchase</p>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-lg">{needsPurchase.length}</span>
              </div>
              <button onClick={() => navigate("/store/alerts")}
                className="text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50/50 dark:bg-neutral-800/20 border-b border-neutral-50 dark:border-neutral-800/60">
                    {["Item", "Category", "Current Qty", "Min Required", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {needsPurchase.map((item: any) => {
                    const st = getStatus(getQty(item), getMin(item));
                    const qty = getQty(item);
                    const min = getMin(item);
                    return (
                      <tr key={item.id} className="border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-neutral-800 dark:text-white text-sm">{item.name}</p>
                          {item.location && <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{item.location}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">{item.category || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-lg font-black tabular-nums", qty === 0 ? "text-red-500" : "text-orange-500")}>{qty}</span>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-1">{item.unit || ""}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 font-medium">{min} {item.unit || ""}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold", st.cls)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Alerts Section ── */}
        {alertItems.length > 0 && (
          <div id="alert-section" className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" strokeWidth={1.8} />
                <p className="text-sm font-bold text-neutral-800 dark:text-white">Items Needing Attention</p>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-lg">{alertItems.length}</span>
              </div>
            </div>
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
              {alertItems.slice(0, 10).map((item: any) => {
                const st = getStatus(getQty(item), getMin(item));
                const pct = getMin(item) > 0 ? Math.min(Math.round((getQty(item) / getMin(item)) * 100), 100) : 100;
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", st.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{item.name}</p>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono flex-shrink-0">{item.item_code}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden max-w-[120px]">
                          <div className={cn("h-full rounded-full", st.dot)} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          <span className="font-bold text-neutral-800 dark:text-white">{getQty(item)}</span> / {getMin(item)} {item.unit} min
                        </p>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold flex-shrink-0", st.cls)}>{st.label}</span>
                  </div>
                );
              })}
            </div>
            {alertItems.length > 10 && (
              <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">{alertItems.length - 10} more items need attention</p>
              </div>
            )}
          </div>
        )}

        {/* ── Recent Activity + Full Inventory ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Stock IN */}
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Recent Stock IN</p>
            </div>
            {(recentStockIn as any[]).length > 0 ? (
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                {(recentStockIn as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{r.store_items?.name ?? "—"}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{r.supplier_name ?? "Manual"} · {r.created_at ? format(new Date(r.created_at), "dd MMM, hh:mm a") : "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{r.quantity} {r.store_items?.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <TrendingUp className="w-7 h-7 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No recent stock IN</p>
              </div>
            )}
          </div>

          {/* Recent Stock OUT */}
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <TrendingDown className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Recent Stock OUT</p>
            </div>
            {(recentStockOut as any[]).length > 0 ? (
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                {(recentStockOut as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{r.store_items?.name ?? "—"}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{r.issued_to ?? "—"} · {r.created_at ? format(new Date(r.created_at), "dd MMM, hh:mm a") : "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">−{r.quantity} {r.store_items?.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <TrendingDown className="w-7 h-7 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No recent stock OUT</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Full Inventory Table ── */}
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Inventory Status</p>
              <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold px-2 py-0.5 rounded-lg">{totalItems} items</span>
            </div>
            <button onClick={() => setShowBulk(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-bold text-xs transition-colors">
              <Upload className="w-3.5 h-3.5" />Bulk Upload
            </button>
          </div>

          {isLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" /></div>
          ) : (items as any[]).length > 0 ? (
            <>
              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[80px_1fr_100px_80px_80px_80px_110px] gap-3 px-5 py-2.5 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
                {["Code", "Item", "Category", "Qty", "Min", "Unit", "Status"].map(h => (
                  <span key={h} className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {(items as any[]).map((item: any) => {
                const st = getStatus(getQty(item), getMin(item));
                const pct = getMin(item) > 0 ? Math.min(Math.round((getQty(item) / getMin(item)) * 100), 100) : 100;
                return (
                  <div key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-[80px_1fr_100px_80px_80px_80px_110px] gap-1 sm:gap-3 items-center px-5 py-3.5 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <p className="text-xs font-mono text-neutral-400 dark:text-neutral-500 truncate">{item.item_code}</p>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1 flex-1 max-w-[80px] bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", st.dot)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="hidden sm:block text-xs text-neutral-400 dark:text-neutral-500 truncate">{item.category || "—"}</p>
                    <p className="hidden sm:block text-sm font-bold text-neutral-800 dark:text-white tabular-nums">{getQty(item)}</p>
                    <p className="hidden sm:block text-sm text-neutral-400 dark:text-neutral-500 tabular-nums">{getMin(item)}</p>
                    <p className="hidden sm:block text-xs text-neutral-400 dark:text-neutral-500">{item.unit}</p>
                    <div>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold", st.cls)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{totalItems} items total · auto-refreshes every 60s</p>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <Package className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No items in inventory</p>
              <button onClick={() => setShowBulk(true)}
                className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Upload className="w-4 h-4" />Upload Items from Excel
              </button>
            </div>
          )}
        </div>

      </div>

      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}
    </>
  );
};

export default StoreDashboard;  
