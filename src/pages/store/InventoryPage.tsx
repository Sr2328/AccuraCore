import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Package, Download, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

/* ─── constants ─────────────────────────────────────────── */
const CATEGORIES = ["Steel", "Electrical", "Consumables", "Tools", "Stationery", "General"];

/* ─── helpers ───────────────────────────────────────────── */
const getStockStatus = (qty: number, min: number) => {
  if (qty === 0) return { label: "Out of Stock", dot: "#ef4444", bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
  if (qty < min) return { label: "Critical", dot: "#f97316", bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" };
  if (qty <= min * 1.2) return { label: "Low", dot: "#EAB308", bg: "#fefce8", text: "#ca8a04", border: "#fef08a" };
  return { label: "In Stock", dot: "#10b981", bg: "#f0fdf4", text: "#059669", border: "#a7f3d0" };
};

/* ─── stat pill ─────────────────────────────────────────── */
const Pill = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
  <div
    style={{
      background: accent ? "#EAB308" : "#fff",
      border: accent ? "none" : "1.5px solid #e5e7eb",
      borderRadius: 10,
      padding: "14px 18px",
      display: "flex",
      flexDirection: "column" as const,
      gap: 2,
      minWidth: 100,
    }}
  >
    <span style={{ fontSize: 22, fontWeight: 800, color: accent ? "#000" : "#111827", lineHeight: 1.1 }}>{value}</span>
    <span style={{ fontSize: 11, fontWeight: 600, color: accent ? "#000000aa" : "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{label}</span>
  </div>
);

/* ─── status badge ──────────────────────────────────────── */
const StatusBadge = ({ qty, min }: { qty: number; min: number }) => {
  const s = getStockStatus(qty, min);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap" as const,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const InventoryPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "General", unit: "pcs",
    min_stock_level: "0", rate: "0", rack_location: "", supplier_id: "",
  });

  /* ── queries ── */
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["store-items"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("*, suppliers(name)").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["all-suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name, supplier_type").eq("is_active", true).order("name");
      return data || [];
    },
  });

  /* ── mutation ── */
  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("store_items").insert({
        name: form.name, category: form.category, unit: form.unit,
        min_stock_level: Number(form.min_stock_level), rate: Number(form.rate),
        rack_location: form.rack_location || null,
        supplier_id: form.supplier_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast.success("Item added successfully");
      setAddOpen(false);
      setForm({ name: "", category: "General", unit: "pcs", min_stock_level: "0", rate: "0", rack_location: "", supplier_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── derived ── */
  const getQty = (i: any) => Number(i.current_qty ?? 0);
  const getMin = (i: any) => Number(i.min_stock_level ?? 0);

  const totalItems = items.length;
  const inStock = (items as any[]).filter(i => getQty(i) > 0 && getQty(i) > getMin(i) * 1.2).length;
  const lowStock = (items as any[]).filter(i => getMin(i) > 0 && getQty(i) > 0 && getQty(i) <= getMin(i) * 1.2).length;
  const outOfStock = (items as any[]).filter(i => getQty(i) === 0).length;

  const allCats = ["All", ...Array.from(new Set((items as any[]).map((i: any) => i.category || "General")))];

  const filtered = (items as any[]).filter((i: any) => {
    const matchSearch = i.name?.toLowerCase().includes(search.toLowerCase()) || i.item_code?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || i.category === catFilter;
    return matchSearch && matchCat;
  });

  /* ── exports ── */
  const handleExportCSV = () => {
    const headers = ["Code", "Item", "Category", "Qty", "Unit", "Min Stock", "Rack", "Supplier", "Rate", "Status"];
    const rows = filtered.map((i: any) => {
      const s = getStockStatus(getQty(i), getMin(i));
      return [i.item_code, i.name, i.category, i.current_qty, i.unit, i.min_stock_level, i.rack_location || "", (i as any).suppliers?.name || "", i.rate, s.label];
    });
    exportToCSV("APEPL-INVENTORY", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Code", "Item", "Category", "Qty", "Unit", "Min", "Rack", "Status"];
    const rows = filtered.map((i: any) => {
      const s = getStockStatus(getQty(i), getMin(i));
      return [i.item_code, i.name, i.category, String(i.current_qty), i.unit, String(i.min_stock_level), i.rack_location || "—", s.label];
    });
    exportToPDF("inventory", "Inventory — Accura Precision", headers, rows, "landscape");
  };

  const matSuppliers = (suppliers as any[]).filter(s => s.supplier_type === "material");
  const rmSuppliers = (suppliers as any[]).filter(s => s.supplier_type === "rm");
  const jwSuppliers = (suppliers as any[]).filter(s => s.supplier_type === "job_work");
  const otherSuppliers = (suppliers as any[]).filter(s => !["material", "rm", "job_work"].includes(s.supplier_type));

  /* ════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 32 }}>

      {/* ── Header ── */}
      <div style={{ padding: "20px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>Inventory</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "2px 0 0", fontWeight: 500 }}>{totalItems} items tracked</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => refetch()}
            style={{ width: 36, height: 36, border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleExportCSV}
            style={{ height: 36, padding: "0 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            style={{ height: 36, padding: "0 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={13} /> PDF
          </button>
          <button
            onClick={() => setAddOpen(true)}
            style={{ height: 36, padding: "0 16px", border: "none", borderRadius: 8, background: "#EAB308", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} /> Add Item
          </button>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div style={{ padding: "0", display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill label="Total Items" value={totalItems} accent />
        <Pill label="In Stock" value={inStock} />
        <Pill label="Low Stock" value={lowStock} />
        <Pill label="Out of Stock" value={outOfStock} />
      </div>

      {/* ── Alert banner ── */}
      {outOfStock > 0 && (
        <div style={{
          margin: "0 0 16px",
          display: "flex", alignItems: "center", gap: 10,
          background: "#fef2f2", border: "1.5px solid #fecaca",
          borderRadius: 10, padding: "10px 14px", marginBottom: 16,
        }}>
          <AlertTriangle size={15} color="#dc2626" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>
            {outOfStock} item{outOfStock > 1 ? "s" : ""} out of stock — purchase required
          </span>
        </div>
      )}

      {/* ── Search + category filter ── */}
      <div style={{ padding: "0", display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} color="#9ca3af" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items or code…"
            style={{
              width: "100%", height: 38, paddingLeft: 36, paddingRight: 12,
              border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13,
              color: "#111827", background: "#fff", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                height: 38, padding: "0 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: catFilter === cat ? "none" : "1.5px solid #e5e7eb",
                background: catFilter === cat ? "#111827" : "#fff",
                color: catFilter === cat ? "#fff" : "#6b7280",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #EAB308", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ margin: "0", textAlign: "center", padding: "60px 20px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12 }}>
          <Package size={36} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "#9ca3af", fontWeight: 500 }}>No items found</p>
          <button onClick={() => setAddOpen(true)} style={{ marginTop: 14, padding: "8px 18px", background: "#EAB308", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Add First Item
          </button>
        </div>
      ) : (
        <>
          {/* ── Mobile flat list ── */}
          <div className="mobile-list" style={{ background: "#fff", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
            {/* list header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "8px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Item</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status / Qty</span>
            </div>
            {filtered.map((item: any, idx: number) => {
              const qty = getQty(item);
              const min = getMin(item);
              const pct = min > 0 ? Math.min((qty / min) * 100, 100) : 100;
              const s = getStockStatus(qty, min);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: idx < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                >
                  {/* Left: name + meta + bar */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center", flexWrap: "wrap" }}>
                      {item.item_code && (
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#9ca3af" }}>{item.item_code}</span>
                      )}
                      {item.category && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "1px 6px", borderRadius: 4 }}>{item.category}</span>
                      )}
                      {item.rack_location && (
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>{item.rack_location}</span>
                      )}
                    </div>
                    {/* progress bar */}
                    <div style={{ height: 3, background: "#f0f0f0", borderRadius: 2, overflow: "hidden", marginTop: 7, maxWidth: 140 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: s.dot, borderRadius: 2 }} />
                    </div>
                  </div>

                  {/* Right: badge + qty */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <StatusBadge qty={qty} min={min} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                      {qty} <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 13 }}>{item.unit}</span>
                    </span>
                  </div>
                </div>
              );
            })}
            <div style={{ padding: "8px 16px", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{filtered.length} of {totalItems} items</span>
            </div>
          </div>

          {/* ── Desktop table ── */}
          <div className="desktop-table" style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1.5px solid #e5e7eb" }}>
                  {["Code", "Item Name", "Category", "Supplier", "Qty", "Min", "Rack", "Status"].map(h => (
                    <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any, idx: number) => {
                  const qty = getQty(item);
                  const min = getMin(item);
                  const even = idx % 2 === 0;
                  return (
                    <tr
                      key={item.id}
                      style={{ background: even ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fffbeb")}
                      onMouseLeave={e => (e.currentTarget.style.background = even ? "#fff" : "#fafafa")}
                    >
                      <td style={{ padding: "16px 16px", fontFamily: "monospace", fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>{item.item_code || "—"}</td>
                      <td style={{ padding: "16px 16px", fontWeight: 600, color: "#111827", maxWidth: 200 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                      </td>
                      <td style={{ padding: "16px 16px", color: "#6b7280" }}>
                        <span style={{ background: "#f3f4f6", borderRadius: 5, padding: "3px 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.category || "—"}</span>
                      </td>
                      <td style={{ padding: "16px 16px", color: "#6b7280", fontSize: 15 }}>{(item as any).suppliers?.name || "—"}</td>
                      <td style={{ padding: "16px 16px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                        {qty} <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 13 }}>{item.unit}</span>
                      </td>
                      <td style={{ padding: "16px 16px", color: "#9ca3af", fontSize: 15 }}>{min}</td>
                      <td style={{ padding: "16px 16px", color: "#6b7280", fontSize: 15 }}>{item.rack_location || "—"}</td>
                      <td style={{ padding: "16px 16px" }}><StatusBadge qty={qty} min={min} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
              {filtered.length} of {totalItems} items
            </div>
          </div>
        </>
      )}

      {/* ── Add Item Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ maxWidth: 460, borderRadius: 14, border: "1.5px solid #e5e7eb" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Add New Item</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>

            <div>
              <label style={lbl}>Item Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Steel Block NAK-80" style={inp} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Category</label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger style={inp}><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={inp} />
              </div>
            </div>

            <div>
              <label style={lbl}>Supplier</label>
              <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger style={inp}><SelectValue placeholder="Select supplier…" /></SelectTrigger>
                <SelectContent>
                  {matSuppliers.length > 0 && <><div style={grpLbl}>Material</div>  {matSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</>}
                  {rmSuppliers.length > 0 && <><div style={grpLbl}>RM</div>        {rmSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</>}
                  {jwSuppliers.length > 0 && <><div style={grpLbl}>Job Work</div>  {jwSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</>}
                  {otherSuppliers.length > 0 && <><div style={grpLbl}>Other</div>     {otherSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</>}
                </SelectContent>
              </Select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Min Stock Level</label>
                <Input type="number" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Rate (₹)</label>
                <Input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} style={inp} />
              </div>
            </div>

            <div>
              <label style={lbl}>Rack Location</label>
              <Input value={form.rack_location} onChange={e => setForm({ ...form, rack_location: e.target.value })} placeholder="e.g. R1-S3" style={inp} />
            </div>

            <button
              onClick={() => addItem.mutate()}
              disabled={!form.name || addItem.isPending}
              style={{
                width: "100%", padding: "11px 0", background: "#EAB308", border: "none",
                borderRadius: 9, fontSize: 14, fontWeight: 700, color: "#000",
                cursor: form.name && !addItem.isPending ? "pointer" : "not-allowed",
                opacity: form.name && !addItem.isPending ? 1 : 0.6,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {addItem.isPending ? "Adding…" : <><Plus size={16} strokeWidth={2.5} /> Add Item</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Responsive CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }

        .mobile-list   { display: block; }
        .desktop-table { display: none; }

        @media (min-width: 640px) {
          .mobile-list   { display: none; }
          .desktop-table { display: block; }
        }
      `}</style>
    </div>
  );
};

/* ─── inline style shorthands ───────────────────────────── */
const lbl: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5,
};
const inp: React.CSSProperties = {
  borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13,
  height: 38, background: "#fafafa",
};
const grpLbl: React.CSSProperties = {
  padding: "6px 8px 2px", fontSize: 10, fontWeight: 700,
  color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em",
};

export default InventoryPage;