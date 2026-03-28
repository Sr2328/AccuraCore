import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TrendingDown, Download, Edit, Search, ChevronDown, X, Check } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

/* ─── constants ─────────────────────────────────────────── */
const DEPARTMENTS = ["VMC", "Tool Room", "Moulding", "Accounts", "Hardening", "Security", "Maintenance", "CMM", "Other"];

/* ─── inline style tokens ───────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 12px",
  border: "1.5px solid #e5e7eb", borderRadius: 8,
  fontSize: 14, color: "#111827", background: "#fafafa",
  outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "#6b7280", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 5,
};

/* ─── Searchable Item Dropdown ──────────────────────────── */
const ItemSearchDropdown = ({
  items, value, onChange,
}: {
  items: any[];
  value: string;
  onChange: (id: string, item: any) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = items.find((i: any) => i.id === value);

  const filtered = items.filter((i: any) => {
    const q = query.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.item_code?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q)
    );
  });

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item: any) => {
    onChange(item.id, item);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 40, padding: "0 12px",
          border: `1.5px solid ${open ? "#EAB308" : "#e5e7eb"}`,
          borderRadius: 8, background: "#fafafa", cursor: "pointer",
          transition: "border-color 0.15s",
        }}
      >
        <Search size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type item name or code…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "#111827", outline: "none" }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: selected ? "#111827" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected ? `${selected.item_code} — ${selected.name}` : "Search item by name or code…"}
          </span>
        )}
        {value && !open
          ? <X size={14} color="#9ca3af" onClick={handleClear} style={{ flexShrink: 0 }} />
          : <ChevronDown size={14} color="#9ca3af" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        }
      </div>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)", maxHeight: 260, overflowY: "auto",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No items found</div>
          ) : filtered.map((item: any) => {
            const isSelected = item.id === value;
            const isLow = item.current_qty <= (item.min_stock_level ?? 0);
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", cursor: "pointer",
                  background: isSelected ? "#fffbeb" : "transparent",
                  borderBottom: "1px solid #f3f4f6",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? "#fffbeb" : "transparent"; }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.name}</span>
                    {isSelected && <Check size={13} color="#EAB308" strokeWidth={2.5} />}
                  </div>
                  <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>{item.item_code}</span>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: item.current_qty === 0 ? "#ef4444" : isLow ? "#f97316" : "#059669",
                  }}>
                    {item.current_qty}
                  </span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 3 }}>{item.unit}</span>
                  {item.current_qty === 0 && (
                    <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>OUT OF STOCK</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Department Selector ───────────────────────────────── */
const DeptSelector = ({
  value, otherValue,
  onChange, onOtherChange,
}: {
  value: string; otherValue: string;
  onChange: (v: string) => void; onOtherChange: (v: string) => void;
}) => (
  <div>
    <label style={lbl}>Department</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: value === "Other" ? 8 : 0 }}>
      {DEPARTMENTS.map(dept => {
        const active = value === dept;
        return (
          <button
            key={dept}
            type="button"
            onClick={() => { onChange(dept); if (dept !== "Other") onOtherChange(""); }}
            style={{
              padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.12s",
              border: active ? "none" : "1.5px solid #e5e7eb",
              background: active ? (dept === "Other" ? "#111827" : "#EAB308") : "#fff",
              color: active ? (dept === "Other" ? "#fff" : "#000") : "#6b7280",
            }}
          >
            {dept}
          </button>
        );
      })}
    </div>
    {value === "Other" && (
      <input
        value={otherValue}
        onChange={e => onOtherChange(e.target.value)}
        placeholder="Specify department or team…"
        style={{ ...inp, marginTop: 4 }}
        autoFocus
      />
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const StockOutPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = useState("");
  const [selectedItemData, setSelectedItemData] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [personName, setPersonName] = useState("");
  const [dept, setDept] = useState("");
  const [otherDept, setOtherDept] = useState("");
  const [purpose, setPurpose] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  /* ── queries ── */
  const { data: items = [] } = useQuery({
    queryKey: ["store-items-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_items")
        .select("id, name, item_code, current_qty, unit, min_stock_level, category")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: recentMovements = [] } = useQuery({
    queryKey: ["stock-out-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("*, store_items(name, item_code, unit)")
        .eq("movement_type", "out")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  /* ── mutation ── */
  const effectiveDept = dept === "Other" ? (otherDept.trim() || "Other") : dept;

  const stockOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").insert({
        item_id: selectedItem, quantity: Number(qty), movement_type: "out",
        person_name: personName || null, department: effectiveDept || null,
        purpose: purpose || null, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-out-recent"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-list"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-dash"] });
      toast.success("Stock OUT recorded");
      setSelectedItem(""); setSelectedItemData(null);
      setQty(""); setPersonName(""); setDept(""); setOtherDept(""); setPurpose("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMovement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").update({
        quantity: Number(editData.quantity),
        person_name: editData.person_name || null,
        department: editData.department || null,
        purpose: editData.purpose || null,
      }).eq("id", editData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-out-recent"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast.success("Entry updated");
      setEditOpen(false); setEditData(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── exports ── */
  const handleExportCSV = () => {
    const headers = ["Item Code", "Item", "Quantity", "Person", "Department", "Purpose", "Date"];
    const rows = (recentMovements as any[]).map(m => [
      m.store_items?.item_code, m.store_items?.name, String(m.quantity),
      m.person_name || "", m.department || "", m.purpose || "",
      m.created_at ? format(new Date(m.created_at), "dd MMM yyyy hh:mm a") : "",
    ]);
    exportToCSV("stock-out", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Code", "Item", "Qty", "Person", "Dept", "Purpose", "Date"];
    const rows = (recentMovements as any[]).map(m => [
      m.store_items?.item_code, m.store_items?.name, String(m.quantity),
      m.person_name || "—", m.department || "—", m.purpose || "—",
      m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : "",
    ]);
    exportToPDF("stock-out", "Stock OUT Report — Accura Precision", headers, rows, "landscape");
  };

  const canSubmit = selectedItem && qty && Number(qty) > 0 && !stockOut.isPending;

  /* ─── render ────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 40, background: "#f3f4f6", margin: "-20px", padding: "20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .so-form-input:focus { border-color: #EAB308 !important; background: #fff !important; }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "#111827", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingDown size={20} color="#EAB308" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>Stock OUT</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0", fontWeight: 500 }}>Issue stock to departments</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExportCSV} style={{ height: 36, padding: "0 14px", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportPDF} style={{ height: 36, padding: "0 14px", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ══ FORM SECTION ══ */}
      <div style={{ background: "#111827", borderRadius: 14, marginBottom: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.13)" }}>
        {/* dark header bar */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EAB308", display: "inline-block" }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>New Issue</p>
        </div>

        {/* white form body */}
        <div style={{ background: "#fff", margin: "0", padding: "22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Item search */}
            <div>
              <label style={lbl}>Select Item *</label>
              <ItemSearchDropdown
                items={items as any[]}
                value={selectedItem}
                onChange={(id, item) => { setSelectedItem(id); setSelectedItemData(item); }}
              />
              {/* Selected item info strip */}
              {selectedItemData && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", background: "#f9fafb",
                  border: "1px solid #e5e7eb", borderRadius: 8,
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    Available: <strong style={{ color: selectedItemData.current_qty === 0 ? "#ef4444" : "#059669" }}>
                      {selectedItemData.current_qty} {selectedItemData.unit}
                    </strong>
                  </span>
                  {selectedItemData.category && (
                    <span style={{ fontSize: 12, background: "#f3f4f6", padding: "2px 8px", borderRadius: 5, color: "#374151", fontWeight: 600 }}>
                      {selectedItemData.category}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Qty + Person row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Quantity *</label>
                <input
                  type="number" min="1"
                  value={qty} onChange={e => setQty(e.target.value)}
                  placeholder="0"
                  style={{
                    ...inp,
                    borderColor: qty && selectedItemData && Number(qty) > selectedItemData.current_qty ? "#ef4444" : "#e5e7eb",
                  }}
                />
                {qty && selectedItemData && Number(qty) > selectedItemData.current_qty && (
                  <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>
                    ⚠ Exceeds available stock ({selectedItemData.current_qty})
                  </p>
                )}
              </div>
              <div>
                <label style={lbl}>Person Name</label>
                <input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Who is taking it?" style={inp} />
              </div>
            </div>

            {/* Department pills */}
            <DeptSelector
              value={dept} otherValue={otherDept}
              onChange={setDept} onOtherChange={setOtherDept}
            />

            {/* Purpose */}
            <div>
              <label style={lbl}>Purpose</label>
              <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Maintenance, Production, Repair…" style={inp} />
            </div>

            {/* Submit */}
            <button
              onClick={() => stockOut.mutate()}
              disabled={!canSubmit}
              style={{
                alignSelf: "flex-start", height: 40, padding: "0 24px",
                background: canSubmit ? "#EAB308" : "#e5e7eb",
                border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 700,
                color: canSubmit ? "#000" : "#9ca3af",
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8,
                transition: "background 0.15s",
              }}
            >
              <TrendingDown size={16} strokeWidth={2.5} />
              {stockOut.isPending ? "Recording…" : "Record Stock OUT"}
            </button>
          </div>
        </div>{/* end white form body */}
      </div>{/* end dark form card */}

      {/* ══ LIST SECTION ══ */}
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #e5e7eb" }}>
        {/* section header — yellow accent bar */}
        <div style={{ background: "#EAB308", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingDown size={16} color="#000" strokeWidth={2.5} />
            <p style={{ fontSize: 13, fontWeight: 800, color: "#000", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Recent Stock OUT
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#000000aa" }}>{(recentMovements as any[]).length} entries</span>
        </div>

        {/* Desktop table */}
        <div className="stock-out-table">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1.5px solid #e5e7eb" }}>
                {["Item", "Code", "Qty", "Person", "Department", "Purpose", "Date", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentMovements as any[]).map((m: any, idx: number) => (
                <tr
                  key={m.id}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fffbeb")}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827" }}>{m.store_items?.name || "—"}</td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{m.store_items?.item_code || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontWeight: 800, color: "#ef4444", fontSize: 15 }}>−{m.quantity}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 3 }}>{m.store_items?.unit}</span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#374151" }}>{m.person_name || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {m.department ? (
                      <span style={{ background: "#f3f4f6", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600, color: "#374151" }}>{m.department}</span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: 13 }}>{m.purpose || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>
                    {m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => { setEditData({ id: m.id, quantity: m.quantity, person_name: m.person_name || "", department: m.department || "", purpose: m.purpose || "" }); setEditOpen(true); }}
                      style={{ width: 30, height: 30, border: "1.5px solid #e5e7eb", borderRadius: 7, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}
                    >
                      <Edit size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(recentMovements as any[]).length === 0 && (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <TrendingDown size={32} color="#e5e7eb" style={{ margin: "0 auto 10px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af" }}>No stock OUT recorded yet</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="stock-out-cards" style={{ display: "none" }}>
          {(recentMovements as any[]).map((m: any) => (
            <div key={m.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{m.store_items?.name || "—"}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", fontFamily: "monospace" }}>{m.store_items?.item_code}</p>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>−{m.quantity}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {m.department && <span style={{ background: "#f3f4f6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#374151" }}>{m.department}</span>}
                {m.person_name && <span style={{ fontSize: 12, color: "#6b7280" }}>{m.person_name}</span>}
                {m.purpose && <span style={{ fontSize: 12, color: "#9ca3af" }}>{m.purpose}</span>}
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                  {m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}
                </span>
                <button
                  onClick={() => { setEditData({ id: m.id, quantity: m.quantity, person_name: m.person_name || "", department: m.department || "", purpose: m.purpose || "" }); setEditOpen(true); }}
                  style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}
                >
                  <Edit size={12} />
                </button>
              </div>
            </div>
          ))}
          {(recentMovements as any[]).length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#9ca3af" }}>No stock OUT recorded yet</p>
            </div>
          )}
        </div>
      </div>{/* end list section */}

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{ maxWidth: 420, borderRadius: 14, border: "1.5px solid #e5e7eb" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Edit Stock OUT Entry</DialogTitle>
          </DialogHeader>
          {editData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
              <div>
                <label style={lbl}>Quantity</label>
                <input type="number" value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Person Name</label>
                <input value={editData.person_name} onChange={e => setEditData({ ...editData, person_name: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Department</label>
                <input value={editData.department} onChange={e => setEditData({ ...editData, department: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Purpose</label>
                <input value={editData.purpose} onChange={e => setEditData({ ...editData, purpose: e.target.value })} style={inp} />
              </div>
              <button
                onClick={() => updateMovement.mutate()}
                disabled={updateMovement.isPending}
                style={{ width: "100%", padding: "11px 0", background: "#EAB308", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer" }}
              >
                {updateMovement.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .stock-out-table { display: none; }
          .stock-out-cards { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default StockOutPage;











// Lovable code of stock out



// import { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "@/lib/auth-context";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { toast } from "sonner";
// import { TrendingDown, Download, Edit } from "lucide-react";
// import { format, startOfMonth, endOfMonth } from "date-fns";
// import { exportToCSV, exportToPDF } from "@/lib/export-utils";
// import DateRangeFilter from "@/components/DateRangeFilter";

// const StockOutPage = () => {
//   const { user } = useAuth();
//   const queryClient = useQueryClient();
//   const [selectedItem, setSelectedItem] = useState("");
//   const [qty, setQty] = useState("");
//   const [personName, setPersonName] = useState("");
//   const [department, setDepartment] = useState("");
//   const [purpose, setPurpose] = useState("");
//   const [editOpen, setEditOpen] = useState(false);
//   const [editData, setEditData] = useState<any>(null);
//   const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
//   const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

//   const { data: items = [] } = useQuery({
//     queryKey: ["store-items-list"],
//     queryFn: async () => {
//       const { data } = await supabase.from("store_items").select("id, name, item_code, current_qty, unit").eq("is_active", true).order("name");
//       return data || [];
//     },
//   });

//   const { data: recentMovements = [] } = useQuery({
//     queryKey: ["stock-out-recent", fromDate, toDate],
//     queryFn: async () => {
//       const { data } = await supabase.from("stock_movements").select("*, store_items(name, item_code)").eq("movement_type", "out").gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59`).order("created_at", { ascending: false });
//       return data || [];
//     },
//   });

//   const stockOut = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase.from("stock_movements").insert({ item_id: selectedItem, quantity: Number(qty), movement_type: "out", person_name: personName || null, department: department || null, purpose: purpose || null, created_by: user?.id });
//       if (error) throw error;
//     },
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-out-recent"] }); queryClient.invalidateQueries({ queryKey: ["store-items"] }); queryClient.invalidateQueries({ queryKey: ["store-items-list"] }); toast.success("Stock OUT recorded"); setSelectedItem(""); setQty(""); setPersonName(""); setDepartment(""); setPurpose(""); },
//     onError: (e: any) => toast.error(e.message),
//   });

//   const updateMovement = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase.from("stock_movements").update({ quantity: Number(editData.quantity), person_name: editData.person_name || null, department: editData.department || null, purpose: editData.purpose || null }).eq("id", editData.id);
//       if (error) throw error;
//     },
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-out-recent"] }); queryClient.invalidateQueries({ queryKey: ["store-items"] }); toast.success("Entry updated"); setEditOpen(false); setEditData(null); },
//     onError: (e: any) => toast.error(e.message),
//   });

//   const handleExportCSV = () => {
//     const headers = ["Item Code", "Item", "Quantity", "Person", "Department", "Purpose", "Date"];
//     const rows = recentMovements.map((m: any) => [(m as any).store_items?.item_code, (m as any).store_items?.name, String(m.quantity), m.person_name || "", m.department || "", m.purpose || "", m.created_at ? format(new Date(m.created_at), "dd MMM yyyy hh:mm a") : ""]);
//     exportToCSV(`stock-out-${fromDate}-to-${toDate}`, headers, rows);
//   };

//   const handleExportPDF = () => {
//     const headers = ["Code", "Item", "Qty", "Person", "Dept", "Purpose", "Date"];
//     const rows = recentMovements.map((m: any) => [(m as any).store_items?.item_code, (m as any).store_items?.name, String(m.quantity), m.person_name || "—", m.department || "—", m.purpose || "—", m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : ""]);
//     exportToPDF(`stock-out-${fromDate}-to-${toDate}`, `Stock OUT Report (${fromDate} to ${toDate})`, headers, rows, "landscape");
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div><h1 className="text-xl sm:text-2xl font-bold text-foreground">Stock OUT</h1><p className="text-sm text-muted-foreground">Issue stock to departments</p></div>
//         <div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button><Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button></div>
//       </div>

//       <Card><CardContent className="p-4 space-y-3">
//         <div><Label>Select Item</Label><Select value={selectedItem} onValueChange={setSelectedItem}><SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger><SelectContent>{items.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.item_code} — {i.name} (Avail: {i.current_qty} {i.unit})</SelectItem>))}</SelectContent></Select></div>
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><Label>Quantity</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div><div><Label>Person Name</Label><Input value={personName} onChange={(e) => setPersonName(e.target.value)} /></div><div><Label>Department</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div></div>
//         <div><Label>Purpose</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Maintenance, Production, etc." /></div>
//         <Button className="w-full sm:w-auto" onClick={() => stockOut.mutate()} disabled={!selectedItem || !qty || stockOut.isPending}><TrendingDown className="w-4 h-4 mr-2" />Record Stock OUT</Button>
//       </CardContent></Card>

//       <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

//       <Card><CardContent className="p-4">
//         <h3 className="text-sm font-semibold text-foreground mb-3">Stock OUT Records ({recentMovements.length})</h3>
//         <div className="space-y-2">
//           {recentMovements.map((m: any) => (
//             <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-1">
//               <div><p className="text-sm font-medium text-foreground">{(m as any).store_items?.name}</p><p className="text-xs text-muted-foreground">{m.person_name} • {m.department} • {m.purpose || "—"}</p></div>
//               <div className="flex items-center gap-3 text-xs text-muted-foreground">
//                 <span className="font-medium text-destructive">-{m.quantity}</span>
//                 <span>{m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}</span>
//                 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditData({ id: m.id, quantity: m.quantity, person_name: m.person_name || "", department: m.department || "", purpose: m.purpose || "" }); setEditOpen(true); }}><Edit className="w-3 h-3" /></Button>
//               </div>
//             </div>
//           ))}
//           {recentMovements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No stock OUT in this period</p>}
//         </div>
//       </CardContent></Card>

//       <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Edit Stock OUT Entry</DialogTitle></DialogHeader>{editData && (<div className="space-y-3"><div><Label>Quantity</Label><Input type="number" value={editData.quantity} onChange={(e) => setEditData({ ...editData, quantity: e.target.value })} /></div><div><Label>Person Name</Label><Input value={editData.person_name} onChange={(e) => setEditData({ ...editData, person_name: e.target.value })} /></div><div><Label>Department</Label><Input value={editData.department} onChange={(e) => setEditData({ ...editData, department: e.target.value })} /></div><div><Label>Purpose</Label><Input value={editData.purpose} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} /></div><Button className="w-full" onClick={() => updateMovement.mutate()} disabled={updateMovement.isPending}>Save Changes</Button></div>)}</DialogContent></Dialog>
//     </div>
//   );
// };

// export default StockOutPage;

