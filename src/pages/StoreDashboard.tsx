import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format, subDays, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, getDay, addMonths, subMonths, isSameMonth,
} from "date-fns";
import {
  Package, AlertTriangle, TrendingDown, TrendingUp,
  Plus, Download, Upload, X, Loader2, CheckCircle2,
  Bell, RefreshCw, BarChart3, FileSpreadsheet, ShoppingCart,
  ChevronRight, Eye, ChevronLeft, Search, Building2,
  Phone, Mail, MapPin, Tag, User,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/* ══════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";

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

/* ══════════════════════════════════════════════
   BULK UPLOAD MODAL
══════════════════════════════════════════════ */
const BulkUploadModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const downloadTemplate = () => {
    const rows = [
      "Name,Category,Quantity,Unit,Min Stock Level,Location",
      "Steel Block NAK-80,Steel,10,pcs,5,Rack A-1",
      "Cutting Oil 5L,Consumables,20,litre,8,Store Room",
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "store_items_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setErrors(["File empty."]); return; }
        const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
        const errs: string[] = [];
        const parsed = lines.slice(1).map((line, i) => {
          const vals = line.split(",").map(v => v.replace(/"/g, "").trim());
          const row: any = {}; headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
          const name = String(row["Name"] || row["name"] || "").trim();
          if (!name) errs.push(`Row ${i + 2}: Name required`);
          return {
            name, category: String(row["Category"] || "").trim(),
            unit: String(row["Unit"] || "pcs").trim(),
            current_qty: Number(row["Quantity"] || 0),
            min_stock_level: Number(row["Min Stock Level"] || 0),
            rack_location: String(row["Location"] || "").trim(),
            is_active: true,
          };
        }).filter(r => r.name);
        setErrors(errs); setPreview(parsed);
      } catch { setErrors(["Could not read file."]); }
    };
    reader.readAsText(file);
  };

  const doUpload = async () => {
    if (!preview.length) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("store_items").insert(preview);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["store-items-dash"] });
      setDone(true);
    } catch (e: any) { setErrors([e.message]); }
    finally { setUploading(false); }
  };

  return (
    <Modal title="Bulk Upload Items" onClose={onClose} wide
      footer={!done && (
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
          <button onClick={doUpload} disabled={!preview.length || uploading || errors.length > 0}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload {preview.length} Items</>}
          </button>
        </div>
      )}>
      {done ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-base font-bold text-neutral-800">{preview.length} items uploaded!</p>
          <button onClick={onClose} className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] text-black text-sm font-semibold px-4 py-2 rounded-xl">Done</button>
        </div>
      ) : (
        <>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm font-bold text-blue-700 mb-1">Step 1 — Download Template</p>
            <p className="text-xs text-blue-600 mb-3">Required: <strong>Name, Category, Quantity, Unit</strong>. Optional: Min Stock Level, Location.</p>
            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold">
              <Download className="w-3.5 h-3.5" />Download Template
            </button>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-700 mb-2">Step 2 — Upload CSV</p>
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 text-center cursor-pointer hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 transition-all">
              <FileSpreadsheet className="w-10 h-10 text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-neutral-500">Click to select .csv file</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{errors.length} issue{errors.length > 1 ? "s" : ""}</p>
              {errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}
          {preview.length > 0 && errors.length === 0 && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-2">Preview — {preview.length} rows</p>
              <div className="overflow-x-auto rounded-xl border border-neutral-100 max-h-48 overflow-y-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr>{["Name", "Category", "Unit", "Qty", "Min", "Location"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-400 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-neutral-50">
                        <td className="px-3 py-2 font-medium text-neutral-800">{r.name}</td>
                        <td className="px-3 py-2 text-neutral-500">{r.category || "—"}</td>
                        <td className="px-3 py-2 text-neutral-500">{r.unit}</td>
                        <td className="px-3 py-2 font-semibold">{r.current_qty}</td>
                        <td className="px-3 py-2 text-neutral-500">{r.min_stock_level}</td>
                        <td className="px-3 py-2 text-neutral-400">{r.rack_location || "—"}</td>
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
   MINI CALENDAR
══════════════════════════════════════════════ */
const MiniCalendar = ({
  selected, onSelect, hasIn, hasOut,
}: {
  selected: Date; onSelect: (d: Date) => void;
  hasIn: Set<string>; hasOut: Set<string>;
}) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const startPad = getDay(startOfMonth(viewMonth)); // 0=Sun
  const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 text-neutral-400 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-neutral-800 dark:text-white">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 text-neutral-400 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-neutral-400 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const isSel = isSameDay(day, selected);
          const isT = isToday(day);
          const hasI = hasIn.has(key);
          const hasO = hasOut.has(key);
          return (
            <button
              key={key}
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-sm font-semibold transition-all",
                isSel ? "bg-[#EAB308] text-black shadow-md" :
                  isT ? "bg-neutral-100 dark:bg-neutral-800 text-[#EAB308] font-black" :
                    "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              {day.getDate()}
              {/* dots */}
              {(hasI || hasO) && !isSel && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {hasI && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                  {hasO && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-neutral-400 font-medium">Stock IN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-neutral-400 font-medium">Stock OUT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
          <span className="text-[10px] text-neutral-400 font-medium">Selected</span>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   SUPPLIER DETAIL MODAL
══════════════════════════════════════════════ */
const SupplierDetailModal = ({ supplier, onClose }: { supplier: any; onClose: () => void }) => (
  <Modal title="Supplier Details" onClose={onClose}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div className="w-12 h-12 bg-[#EAB308] rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-black" strokeWidth={2} />
        </div>
        <div>
          <p className="text-base font-black text-neutral-900 dark:text-white">{supplier.name}</p>
          {supplier.supplier_type && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#EAB308]/15 text-[#ca8a04] uppercase tracking-wider">{supplier.supplier_type}</span>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { icon: User, label: "Contact Person", value: supplier.contact_person },
          { icon: Phone, label: "Phone", value: supplier.phone },
          { icon: Mail, label: "Email", value: supplier.email },
          { icon: MapPin, label: "Address", value: supplier.address },
          // { icon: Tag, label: "GSTIN", value: supplier.gstin },
        ].filter(f => f.value).map(field => (
          <div key={field.label} className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div className="w-8 h-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <field.icon className="w-4 h-4 text-neutral-400" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{field.label}</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">{field.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Items supplied */}
      {supplier._items?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Items Supplied ({supplier._items.length})</p>
          <div className="flex flex-wrap gap-2">
            {supplier._items.map((item: any) => (
              <span key={item.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Package className="w-3 h-3" />{item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {supplier.notes && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Notes</p>
          <p className="text-sm text-amber-600 dark:text-amber-400">{supplier.notes}</p>
        </div>
      )}
    </div>
  </Modal>
);

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
const StoreDashboard = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showBulk, setShowBulk] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [movTab, setMovTab] = useState<"in" | "out">("in");
  const [itemQuery, setItemQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const selDateStr = format(calDate, "yyyy-MM-dd");

  /* ── close item search dropdown on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) setShowItemDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ══════ QUERIES ══════ */
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["store-items-dash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_items")
        .select(`
          id, item_code, name, category, unit,
          current_qty, min_stock_level, rack_location,
          rate, is_active, supplier_id,
          suppliers!store_items_supplier_id_fkey (
            id, name, contact_person, phone, email,
            address,  supplier_type, notes
          )
        `)
        .eq("is_active", true)
        .order("name");
      if (error) console.error("store_items query error:", error);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: stockInToday = [] } = useQuery({
    queryKey: ["store-in-today", today],
    queryFn: async () => {
      const tomorrow = format(new Date(new Date(today).getTime() + 86400000), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, quantity")
        .eq("movement_type", "in")
        .gte("created_at", `${today}T00:00:00+05:30`)
        .lt("created_at", `${tomorrow}T00:00:00+05:30`);
      if (error) console.error("stockInToday error:", error);
      return data || [];
    },
  });

  const { data: stockOutToday = [] } = useQuery({
    queryKey: ["store-out-today", today],
    queryFn: async () => {
      const tomorrow = format(new Date(new Date(today).getTime() + 86400000), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, quantity")
        .eq("movement_type", "out")
        .gte("created_at", `${today}T00:00:00+05:30`)
        .lt("created_at", `${tomorrow}T00:00:00+05:30`);
      if (error) console.error("stockOutToday error:", error);
      return data || [];
    },
  });

  const { data: recentStockIn = [] } = useQuery({
    queryKey: ["store-recent-in"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, quantity, purpose, created_at, store_items!stock_movements_item_id_fkey(name, unit)")
        .eq("movement_type", "in")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) console.error("recentStockIn error:", error);
      return data || [];
    },
  });

  const { data: recentStockOut = [] } = useQuery({
    queryKey: ["store-recent-out"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, quantity, person_name, department, purpose, created_at, store_items!stock_movements_item_id_fkey(name, unit)")
        .eq("movement_type", "out")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) console.error("recentStockOut error:", error);
      return data || [];
    },
  });

  /* Calendar: all movement dates (last 90 days) */
  const { data: calMovements = [] } = useQuery({
    queryKey: ["cal-movements"],
    queryFn: async () => {
      const from = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("stock_movements")
        .select("created_at, movement_type")
        .gte("created_at", `${from}T00:00:00+05:30`);
      if (error) console.error("calMovements error:", error);
      return data || [];
    },
  });

  /* Selected date movements */
  const { data: dateMovements = [], isLoading: dateLoading } = useQuery({
    queryKey: ["date-movements", selDateStr],
    queryFn: async () => {
      const nextDay = format(new Date(new Date(selDateStr).getTime() + 86400000), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id, quantity, movement_type, person_name,
          department, purpose, created_at,
          store_items!stock_movements_item_id_fkey(name, item_code, unit)
        `)
        .gte("created_at", `${selDateStr}T00:00:00+05:30`)
        .lt("created_at", `${nextDay}T00:00:00+05:30`)
        .order("created_at", { ascending: false });
      if (error) console.error("dateMovements error:", error);
      return data || [];
    },
  });

  /* All suppliers (for finder) */
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ["all-suppliers-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  /* Real 7-day movement aggregation */
  const { data: weekMovements = [] } = useQuery({
    queryKey: ["week-movements"],
    queryFn: async () => {
      const from = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("stock_movements")
        .select("created_at, movement_type, quantity")
        .gte("created_at", `${from}T00:00:00+05:30`)
        .order("created_at");
      if (error) console.error("weekMovements error:", error);
      return data || [];
    },
    refetchInterval: 120000,
  });

  /* ══════ DERIVED ══════ */
  const getQty = (i: any) => Number(i.current_qty ?? 0);
  const getMin = (i: any) => Number(i.min_stock_level ?? 0);

  const totalItems = (items as any[]).length;
  const outOfStock = (items as any[]).filter(i => getQty(i) === 0).length;
  const critical = (items as any[]).filter(i => getQty(i) > 0 && getMin(i) > 0 && getQty(i) < getMin(i)).length;
  const lowStock = (items as any[]).filter(i => getMin(i) > 0 && getQty(i) >= getMin(i) && getQty(i) <= getMin(i) * 1.2).length;
  const inStock = totalItems - outOfStock - critical - lowStock;
  const txInToday = (stockInToday as any[]).reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  const txOutToday = (stockOutToday as any[]).reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  const alertItems = (items as any[]).filter(i => getMin(i) > 0 && getQty(i) <= getMin(i) * 1.2).sort((a, b) => getQty(a) - getQty(b));
  const needsPurchase = (items as any[]).filter(i => getQty(i) === 0 || (getMin(i) > 0 && getQty(i) < getMin(i)));

  /* Calendar dot sets */
  const hasIn = new Set((calMovements as any[]).filter(m => m.movement_type === "in").map(m => format(new Date(m.created_at), "yyyy-MM-dd")));
  const hasOut = new Set((calMovements as any[]).filter(m => m.movement_type === "out").map(m => format(new Date(m.created_at), "yyyy-MM-dd")));

  /* Date movements by tab */
  const dateIn = (dateMovements as any[]).filter(m => m.movement_type === "in");
  const dateOut = (dateMovements as any[]).filter(m => m.movement_type === "out");
  const shownMov = movTab === "in" ? dateIn : dateOut;

  /* Charts */
  const pieData = [
    { name: "In Stock", value: inStock, fill: "#10b981" },
    { name: "Low", value: lowStock, fill: "#EAB308" },
    { name: "Critical", value: critical, fill: "#f97316" },
    { name: "Out of Stock", value: outOfStock, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  const catMap: Record<string, number> = {};
  (items as any[]).forEach(i => { const k = i.category || "Other"; catMap[k] = (catMap[k] ?? 0) + 1; });
  const catBarData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);

  /* Real 7-day chart data — aggregate by date */
  const movementData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const dayRows = (weekMovements as any[]).filter(m => format(new Date(m.created_at), "yyyy-MM-dd") === key);
    const inQty = dayRows.filter(m => m.movement_type === "in").reduce((s, m) => s + Number(m.quantity ?? 0), 0);
    const outQty = dayRows.filter(m => m.movement_type === "out").reduce((s, m) => s + Number(m.quantity ?? 0), 0);
    return { date: format(d, "dd MMM"), in: inQty, out: outQty };
  });

  /* ── Supplier finder ── */
  const filteredItemSearch = (items as any[]).filter((i: any) => {
    const q = itemQuery.toLowerCase();
    return q.length >= 1 && (i.name?.toLowerCase().includes(q) || i.item_code?.toLowerCase().includes(q));
  }).slice(0, 10);

  const toggleItem = (item: any) => {
    setSelectedItems(prev =>
      prev.find(p => p.id === item.id) ? prev.filter(p => p.id !== item.id) : [...prev, item]
    );
    setShowItemDrop(false);
    setItemQuery("");
  };

  /* Safe accessor for store_items from stock_movements join (FK hint changes key name) */
  const getSI = (r: any) => r.store_items ?? r["store_items!stock_movements_item_id_fkey"] ?? {};
  const supplierMap = new Map<string, any>();
  selectedItems.forEach(item => {
    // Supabase returns joined row as object (not array) for many-to-one
    const sup = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
    if (sup && sup.id) {
      if (!supplierMap.has(sup.id)) supplierMap.set(sup.id, { ...sup, _items: [] });
      supplierMap.get(sup.id)._items.push(item);
    }
  });
  const foundSuppliers = Array.from(supplierMap.values());

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
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
              className="ml-auto text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
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
              label: "Need Action", value: outOfStock + critical,
              color: (outOfStock + critical) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
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

        {/* ── Status pills ── */}
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
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-neutral-400" strokeWidth={1.8} />
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
            ) : <div className="h-48 flex items-center justify-center"><p className="text-sm text-neutral-400">No items yet</p></div>}
          </div>

          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-neutral-400" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Items by Category</p>
            </div>
            {catBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-100" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EAB308" radius={[4, 4, 0, 0]} name="Items" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center"><p className="text-sm text-neutral-400">No data yet</p></div>}
          </div>

          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-neutral-400" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">7-Day Movement</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={movementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.2} /><stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-100" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip /><Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="in" stroke="#10b981" fill="url(#gradIn)" strokeWidth={2} name="Stock IN" />
                <Area type="monotone" dataKey="out" stroke="#EAB308" fill="url(#gradOut)" strokeWidth={2} name="Stock OUT" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            NEW: CALENDAR + DAILY MOVEMENTS ROW
        ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Calendar — 40% (2 of 5 cols) */}
          <div className={cn(CARD, "p-5 lg:col-span-2")}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-7 h-7 rounded-lg bg-[#EAB308] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-black">{new Date().getDate()}</span>
              </div>
              <p className="text-sm font-bold text-neutral-800 dark:text-white">Movement Calendar</p>
            </div>
            <MiniCalendar selected={calDate} onSelect={setCalDate} hasIn={hasIn} hasOut={hasOut} />
          </div>

          {/* Daily Movements — 60% (3 of 5 cols) */}
          <div className={cn(CARD, "overflow-hidden lg:col-span-3 flex flex-col")}>
            {/* Card header */}
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-neutral-800 dark:text-white">
                    {isToday(calDate) ? "Today's Movements" : format(calDate, "dd MMMM yyyy")}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {dateIn.length} IN · {dateOut.length} OUT
                  </p>
                </div>
                {!isToday(calDate) && (
                  <button onClick={() => setCalDate(new Date())}
                    className="text-xs font-bold text-[#EAB308] hover:underline">Today</button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setMovTab("in")}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    movTab === "in"
                      ? "bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Stock IN
                  {dateIn.length > 0 && (
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-black", movTab === "in" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-500")}>
                      {dateIn.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMovTab("out")}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    movTab === "out"
                      ? "bg-white dark:bg-neutral-900 text-blue-600 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
                  )}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  Stock OUT
                  {dateOut.length > 0 && (
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-black", movTab === "out" ? "bg-blue-100 text-blue-700" : "bg-neutral-200 text-neutral-500")}>
                      {dateOut.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
              {dateLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-6 h-6 text-[#EAB308] animate-spin" />
                </div>
              ) : shownMov.length === 0 ? (
                <div className="py-12 text-center px-5">
                  {movTab === "in"
                    ? <TrendingUp className="w-8 h-8 text-neutral-200 dark:text-neutral-700 mx-auto mb-2" strokeWidth={1.5} />
                    : <TrendingDown className="w-8 h-8 text-neutral-200 dark:text-neutral-700 mx-auto mb-2" strokeWidth={1.5} />
                  }
                  <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                    No Stock {movTab === "in" ? "IN" : "OUT"} on {format(calDate, "dd MMM yyyy")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                  {shownMov.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        movTab === "in"
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40"
                          : "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40"
                      )}>
                        {movTab === "in"
                          ? <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                          : <TrendingDown className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">
                          {getSI(m)?.name ?? "—"}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {getSI(m)?.item_code}
                          {m.person_name && ` · ${m.person_name}`}
                          {m.department && ` · ${m.department}`}
                          {m.purpose && ` · ${m.purpose}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-sm font-black tabular-nums", movTab === "in" ? "text-emerald-600" : "text-blue-600")}>
                          {movTab === "in" ? "+" : "−"}{m.quantity} {getSI(m)?.unit}
                        </p>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {m.created_at ? format(new Date(m.created_at), "hh:mm a") : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            NEW: FIND SUPPLIER BY ITEM
        ═══════════════════════════════════════════ */}
        <div className={cn(CARD, "overflow-hidden")}>
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-800 dark:text-white">Find Supplier by Item</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Search items to discover their suppliers</p>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* LEFT: item search */}
              <div>
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Search & Select Items</p>

                {/* Search input */}
                <div ref={itemSearchRef} className="relative mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      value={itemQuery}
                      onChange={e => { setItemQuery(e.target.value); setShowItemDrop(true); }}
                      onFocus={() => itemQuery.length >= 1 && setShowItemDrop(true)}
                      placeholder="Type item name or code…"
                      className="w-full h-10 pl-9 pr-4 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#EAB308]/60 transition-colors"
                    />
                  </div>

                  {/* Dropdown */}
                  {showItemDrop && filteredItemSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto">
                      {filteredItemSearch.map((item: any) => {
                        const alreadySelected = selectedItems.find(s => s.id === item.id);
                        return (
                          <button key={item.id} onClick={() => toggleItem(item)}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-50 dark:border-neutral-800/60 last:border-0",
                              alreadySelected && "bg-[#EAB308]/5"
                            )}>
                            <div>
                              <p className="text-sm font-semibold text-neutral-800 dark:text-white">{item.name}</p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{item.item_code} · {item.category}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {(() => {
                                const sup = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
                                return sup?.name ? <span className="text-xs text-neutral-400 dark:text-neutral-500">{sup.name}</span> : null;
                              })()}
                              {alreadySelected
                                ? <span className="w-5 h-5 rounded-full bg-[#EAB308] flex items-center justify-center text-[10px] font-black text-black">✓</span>
                                : <span className="w-5 h-5 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
                              }
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected items chips */}
                {selectedItems.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected</p>
                      <button onClick={() => setSelectedItems([])} className="text-xs text-neutral-400 hover:text-red-500 font-medium transition-colors">Clear all</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedItems.map(item => (
                        <span key={item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAB308]/10 border border-[#EAB308]/30 text-xs font-semibold text-neutral-800 dark:text-white">
                          <Package className="w-3 h-3 text-[#EAB308]" />
                          {item.name}
                          <button onClick={() => toggleItem(item)} className="text-neutral-400 hover:text-red-500 ml-0.5 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                    <Search className="w-7 h-7 text-neutral-300 dark:text-neutral-600 mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Search and select items above</p>
                    <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-0.5">Suppliers will appear on the right</p>
                  </div>
                )}
              </div>

              {/* RIGHT: supplier results */}
              <div>
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                  {selectedItems.length > 0 ? `${foundSuppliers.length} Supplier${foundSuppliers.length !== 1 ? "s" : ""} Found` : "Suppliers"}
                </p>

                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                    <Building2 className="w-7 h-7 text-neutral-300 dark:text-neutral-600 mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Select items to find suppliers</p>
                  </div>
                ) : foundSuppliers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-xl">
                    <Building2 className="w-7 h-7 text-neutral-300 dark:text-neutral-600 mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No suppliers linked to selected items</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Link suppliers from the Inventory page</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {foundSuppliers.map(sup => (
                      <button key={sup.id} onClick={() => setSelectedSupplier(sup)}
                        className="w-full text-left p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5 dark:hover:bg-[#EAB308]/5 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-[#EAB308] flex items-center justify-center flex-shrink-0 transition-colors">
                            <Building2 className="w-4 h-4 text-neutral-500 group-hover:text-black transition-colors" strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-800 dark:text-white truncate">{sup.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {sup.supplier_type && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 uppercase tracking-wider">{sup.supplier_type}</span>
                              )}
                              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                {sup._items.length} item{sup._items.length > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {sup.phone && <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 justify-end"><Phone className="w-3 h-3" />{sup.phone}</p>}
                            <p className="text-xs text-[#EAB308] font-semibold mt-1 group-hover:underline">View Details →</p>
                          </div>
                        </div>

                        {/* Items chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5 pl-12">
                          {sup._items.map((item: any) => (
                            <span key={item.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Needs Purchase ── */}
        {needsPurchase.length > 0 && (
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-red-500" strokeWidth={1.8} />
                <p className="text-sm font-bold text-neutral-800 dark:text-white">Needs Purchase</p>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 font-bold px-2 py-0.5 rounded-lg">{needsPurchase.length}</span>
              </div>
              <button onClick={() => navigate("/store/alerts")} className="text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50/50 dark:bg-neutral-800/20 border-b border-neutral-50 dark:border-neutral-800/60">
                    {["Item", "Category", "Current Qty", "Min Required", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {needsPurchase.map((item: any) => {
                    const st = getStatus(getQty(item), getMin(item));
                    const qty = getQty(item); const min = getMin(item);
                    return (
                      <tr key={item.id} className="border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-neutral-800 dark:text-white text-sm">{item.name}</p>
                          {item.rack_location && <p className="text-[10px] text-neutral-400 mt-0.5">{item.rack_location}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">{item.category || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-lg font-black tabular-nums", qty === 0 ? "text-red-500" : "text-orange-500")}>{qty}</span>
                          <span className="text-xs text-neutral-400 ml-1">{item.unit || ""}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 font-medium">{min} {item.unit || ""}</td>
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
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 font-bold px-2 py-0.5 rounded-lg">{alertItems.length}</span>
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
                        <span className="text-xs text-neutral-400 font-mono flex-shrink-0">{item.item_code}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden max-w-[120px]">
                          <div className={cn("h-full rounded-full", st.dot)} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-neutral-400">
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
                <p className="text-xs text-neutral-400 text-center">{alertItems.length - 10} more items need attention</p>
              </div>
            )}
          </div>
        )}

        {/* ── Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Recent Stock IN</p>
            </div>
            {(recentStockIn as any[]).length > 0 ? (
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                {(recentStockIn as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{getSI(r)?.name ?? "—"}</p>
                      <p className="text-xs text-neutral-400">{r.purpose ?? "Manual"} · {r.created_at ? format(new Date(r.created_at), "dd MMM, hh:mm a") : "—"}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">+{r.quantity} {getSI(r)?.unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <TrendingUp className="w-7 h-7 text-neutral-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-neutral-400">No recent stock IN</p>
              </div>
            )}
          </div>

          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <TrendingDown className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Recent Stock OUT</p>
            </div>
            {(recentStockOut as any[]).length > 0 ? (
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                {(recentStockOut as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{getSI(r)?.name ?? "—"}</p>
                      <p className="text-xs text-neutral-400">{r.person_name ?? "—"} · {r.created_at ? format(new Date(r.created_at), "dd MMM, hh:mm a") : "—"}</p>
                    </div>
                    <p className="text-sm font-bold text-blue-600">−{r.quantity} {getSI(r)?.unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <TrendingDown className="w-7 h-7 text-neutral-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-neutral-400">No recent stock OUT</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Full Inventory Table ── */}
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-neutral-400" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Inventory Status</p>
              <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-semibold px-2 py-0.5 rounded-lg">{totalItems} items</span>
            </div>
            <button onClick={() => setShowBulk(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-bold text-xs transition-colors">
              <Upload className="w-3.5 h-3.5" />Bulk Upload
            </button>
          </div>
          {isLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" /></div>
          ) : (items as any[]).length > 0 ? (
            <>
              <div className="hidden sm:grid grid-cols-[80px_1fr_100px_80px_80px_80px_110px] gap-3 px-5 py-2.5 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
                {["Code", "Item", "Category", "Qty", "Min", "Unit", "Status"].map(h => (
                  <span key={h} className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {(items as any[]).map((item: any) => {
                const st = getStatus(getQty(item), getMin(item));
                const pct = getMin(item) > 0 ? Math.min(Math.round((getQty(item) / getMin(item)) * 100), 100) : 100;
                return (
                  <div key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-[80px_1fr_100px_80px_80px_80px_110px] gap-1 sm:gap-3 items-center px-5 py-3.5 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <p className="text-xs font-mono text-neutral-400 truncate">{item.item_code}</p>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{item.name}</p>
                      <div className="h-1 mt-0.5 max-w-[80px] bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", st.dot)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="hidden sm:block text-xs text-neutral-400 truncate">{item.category || "—"}</p>
                    <p className="hidden sm:block text-sm font-bold text-neutral-800 dark:text-white tabular-nums">{getQty(item)}</p>
                    <p className="hidden sm:block text-sm text-neutral-400 tabular-nums">{getMin(item)}</p>
                    <p className="hidden sm:block text-xs text-neutral-400">{item.unit}</p>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold", st.cls)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{st.label}
                    </span>
                  </div>
                );
              })}
              <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
                <p className="text-xs text-neutral-400">{totalItems} items total · auto-refreshes every 60s</p>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <Package className="w-10 h-10 text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-neutral-500">No items in inventory</p>
              <button onClick={() => setShowBulk(true)} className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] text-black text-sm font-semibold px-4 py-2 rounded-xl">
                <Upload className="w-4 h-4" />Upload Items from Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}
      {selectedSupplier && <SupplierDetailModal supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} />}
    </>
  );
};

export default StoreDashboard;