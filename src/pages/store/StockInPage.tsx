import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp, Download, Edit, Search, ChevronDown, X, Check,
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

/* ─── style tokens ──────────────────────────────────────── */
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
  items: any[]; value: string; onChange: (id: string, item: any) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = items.find((i: any) => i.id === value);

  const filtered = items.filter((i: any) => {
    const q = query.toLowerCase();
    return i.name?.toLowerCase().includes(q) || i.item_code?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q);
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 12px",
          border: `1.5px solid ${open ? "#EAB308" : "#e5e7eb"}`, borderRadius: 8,
          background: "#fafafa", cursor: "pointer", transition: "border-color 0.15s",
        }}
      >
        <Search size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
        {open ? (
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Type item name or code…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "#111827", outline: "none" }} />
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: selected ? "#111827" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected ? `${selected.item_code} — ${selected.name}` : "Search item by name or code…"}
          </span>
        )}
        {value && !open
          ? <X size={14} color="#9ca3af" onClick={e => { e.stopPropagation(); onChange("", null); setQuery(""); setOpen(false); }} style={{ flexShrink: 0 }} />
          : <ChevronDown size={14} color="#9ca3af" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        }
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)", maxHeight: 260, overflowY: "auto",
        }}>
          {filtered.length === 0
            ? <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No items found</div>
            : filtered.map((item: any) => {
              const isSelected = item.id === value;
              return (
                <div key={item.id}
                  onClick={() => { onChange(item.id, item); setOpen(false); setQuery(""); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", cursor: "pointer",
                    background: isSelected ? "#fffbeb" : "transparent",
                    borderBottom: "1px solid #f3f4f6",
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.current_qty === 0 ? "#ef4444" : "#059669" }}>
                      {item.current_qty}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 3 }}>{item.unit}</span>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
};

/* ─── Bulk Upload Modal ─────────────────────────────────── */
const BulkUploadModal = ({ items, onClose, userId }: { items: any[]; onClose: () => void; userId?: string }) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  /* build a name→id map for quick lookup */
  const nameMap: Record<string, string> = {};
  const codeMap: Record<string, string> = {};
  (items as any[]).forEach(i => {
    if (i.name) nameMap[i.name.toLowerCase().trim()] = i.id;
    if (i.item_code) codeMap[i.item_code.toLowerCase().trim()] = i.id;
  });

  const downloadTemplate = () => {
    const rows = [
      "Item Code,Item Name,Quantity,Purpose",
      "CON-001,2101 OKS Spray,50,Procurement receipt",
      "STL-002,SKD61 Steel Block,10,Purchase order #123",
      "TOL-005,End Mill 10mm,25,Regular restock",
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "stock_in_template.csv"; a.click();
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

          const code = String(row["Item Code"] || row["item_code"] || "").trim().toLowerCase();
          const name = String(row["Item Name"] || row["name"] || "").trim().toLowerCase();
          const qty = Number(row["Quantity"] || row["qty"] || 0);
          const purpose = String(row["Purpose"] || row["purpose"] || "Bulk import").trim();

          /* resolve item id */
          const itemId = codeMap[code] || nameMap[name];
          if (!itemId) errs.push(`Row ${i + 2}: Item "${row["Item Code"] || row["Item Name"]}" not found in inventory`);
          if (!qty || qty <= 0) errs.push(`Row ${i + 2}: Quantity must be > 0`);

          const displayName = (items as any[]).find(it => it.id === itemId)?.name || row["Item Name"] || code;
          const displayCode = (items as any[]).find(it => it.id === itemId)?.item_code || row["Item Code"] || code;
          return { itemId, displayName, displayCode, qty, purpose };
        }).filter(r => r.itemId && r.qty > 0);

        setErrors(errs);
        setPreview(parsed);
      } catch { setErrors(["Could not read file. Make sure it is a valid CSV."]); }
    };
    reader.readAsText(file);
  };

  const doUpload = async () => {
    if (!preview.length) return;
    setUploading(true);
    try {
      const inserts = preview.map(r => ({
        item_id: r.itemId, quantity: r.qty,
        movement_type: "in", purpose: r.purpose,
        created_by: userId,
      }));
      const { error } = await supabase.from("stock_movements").insert(inserts);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["stock-in-recent"] });
      qc.invalidateQueries({ queryKey: ["store-items"] });
      qc.invalidateQueries({ queryKey: ["store-items-list"] });
      qc.invalidateQueries({ queryKey: ["store-items-dash"] });
      setDone(true);
    } catch (e: any) { setErrors([e.message]); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 560, background: "#fff", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Modal header */}
        <div style={{ background: "#111827", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileSpreadsheet size={18} color="#EAB308" />
            <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0 }}>Bulk Stock IN via CSV</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 12px" }} strokeWidth={1.5} />
              <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>{preview.length} entries uploaded!</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Stock IN has been recorded successfully.</p>
              <button onClick={onClose} style={{ marginTop: 20, padding: "9px 24px", background: "#EAB308", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step 1 — Download Template</p>
                <p style={{ fontSize: 12, color: "#3b82f6", margin: "0 0 10px" }}>
                  Required columns: <strong>Item Code, Item Name, Quantity</strong>. Optional: Purpose.<br />
                  Items are matched by Item Code first, then Item Name.
                </p>
                <button onClick={downloadTemplate}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#3b82f6", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                  <Download size={13} /> Download CSV Template
                </button>
              </div>

              {/* Step 2 */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#374151", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step 2 — Upload Filled CSV</p>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: "2px dashed #e5e7eb", borderRadius: 12, padding: "28px 20px", textAlign: "center",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#EAB308"; (e.currentTarget as HTMLDivElement).style.background = "#fffbeb"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <FileSpreadsheet size={32} color="#d1d5db" style={{ margin: "0 auto 8px" }} strokeWidth={1.5} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", margin: "0 0 4px" }}>Click to select CSV file</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Item Code / Item Name · Quantity · Purpose (optional)</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={13} /> {errors.length} issue{errors.length > 1 ? "s" : ""} found
                  </p>
                  {errors.slice(0, 5).map((e, i) => <p key={i} style={{ fontSize: 12, color: "#ef4444", margin: "2px 0" }}>{e}</p>)}
                </div>
              )}

              {/* Preview */}
              {preview.length > 0 && errors.length === 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>Preview — {preview.length} rows ready</p>
                  <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                        <tr>
                          {["Code", "Item Name", "Qty", "Purpose"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{r.displayCode}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#111827" }}>{r.displayName}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 700, color: "#059669" }}>+{r.qty}</td>
                            <td style={{ padding: "8px 12px", color: "#6b7280" }}>{r.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ flexShrink: 0, padding: "14px 20px", borderTop: "1.5px solid #f3f4f6", display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, height: 40, border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>Cancel</button>
            <button onClick={doUpload} disabled={!preview.length || uploading || errors.length > 0}
              style={{
                flex: 2, height: 40, border: "none", borderRadius: 9,
                background: preview.length > 0 && errors.length === 0 ? "#EAB308" : "#e5e7eb",
                fontSize: 13, fontWeight: 700,
                color: preview.length > 0 && errors.length === 0 ? "#000" : "#9ca3af",
                cursor: preview.length > 0 && !uploading && errors.length === 0 ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              {uploading ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Uploading…</> : <><Upload size={15} /> Upload {preview.length > 0 ? `${preview.length} Entries` : "Entries"}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const StockInPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = useState("");
  const [selectedItemData, setSelectedItemData] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [purpose, setPurpose] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [showBulk, setShowBulk] = useState(false);

  /* ── queries ── */
  const { data: items = [] } = useQuery({
    queryKey: ["store-items-list"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items")
        .select("id, name, item_code, current_qty, unit, category, min_stock_level")
        .eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: recentMovements = [] } = useQuery({
    queryKey: ["stock-in-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_movements")
        .select("*, store_items(name, item_code, unit)")
        .eq("movement_type", "in")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  /* ── mutations ── */
  const stockIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").insert({
        item_id: selectedItem, quantity: Number(qty), movement_type: "in",
        purpose: purpose || null, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-in-recent"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-list"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-dash"] });
      toast.success("Stock IN recorded");
      setSelectedItem(""); setSelectedItemData(null); setQty(""); setPurpose("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMovement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").update({
        quantity: Number(editData.quantity), purpose: editData.purpose || null,
      }).eq("id", editData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-in-recent"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast.success("Entry updated");
      setEditOpen(false); setEditData(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── exports ── */
  const handleExportCSV = () => {
    const headers = ["Item Code", "Item", "Quantity", "Purpose", "Date"];
    const rows = (recentMovements as any[]).map(m => [
      m.store_items?.item_code, m.store_items?.name, String(m.quantity),
      m.purpose || "", m.created_at ? format(new Date(m.created_at), "dd MMM yyyy hh:mm a") : "",
    ]);
    exportToCSV("stock-in", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Item Code", "Item", "Quantity", "Purpose", "Date"];
    const rows = (recentMovements as any[]).map(m => [
      m.store_items?.item_code, m.store_items?.name, String(m.quantity),
      m.purpose || "—", m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : "",
    ]);
    exportToPDF("stock-in", "Stock IN Report — Accura Precision", headers, rows);
  };

  const canSubmit = selectedItem && qty && Number(qty) > 0 && !stockIn.isPending;

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 40, background: "#f3f4f6", margin: "-20px", padding: "20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "#111827", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={20} color="#10b981" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>Stock IN</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0", fontWeight: 500 }}>Record incoming stock</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowBulk(true)}
            style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 8, background: "#111827", fontSize: 12, fontWeight: 700, color: "#EAB308", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <FileSpreadsheet size={13} /> Bulk Upload
          </button>
          <button onClick={handleExportCSV}
            style={{ height: 36, padding: "0 14px", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportPDF}
            style={{ height: 36, padding: "0 14px", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ══ FORM SECTION — dark frame ══ */}
      <div style={{ background: "#111827", borderRadius: 14, marginBottom: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.13)" }}>
        {/* dark header bar */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>New Receipt</p>
          </div>
          <button onClick={() => setShowBulk(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#EAB308", cursor: "pointer" }}>
            <FileSpreadsheet size={13} /> Bulk Upload
          </button>
        </div>

        {/* white form body */}
        <div style={{ background: "#fff", padding: "22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Item search */}
            <div>
              <label style={lbl}>Select Item *</label>
              <ItemSearchDropdown
                items={items as any[]}
                value={selectedItem}
                onChange={(id, item) => { setSelectedItem(id); setSelectedItemData(item); }}
              />
              {selectedItemData && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    Current Stock: <strong style={{ color: "#059669" }}>{selectedItemData.current_qty} {selectedItemData.unit}</strong>
                  </span>
                  {selectedItemData.category && (
                    <span style={{ fontSize: 12, background: "#f3f4f6", padding: "2px 8px", borderRadius: 5, color: "#374151", fontWeight: 600 }}>{selectedItemData.category}</span>
                  )}
                </div>
              )}
            </div>

            {/* Qty + Purpose */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }} className="stock-in-grid">
              <div>
                <label style={lbl}>Quantity *</label>
                <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={inp} />
              </div>
              <div>
                <label style={lbl}>Purpose / Reason</label>
                <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Procurement receipt, PO #123, Restock…" style={inp} />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => stockIn.mutate()}
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
              <TrendingUp size={16} strokeWidth={2.5} />
              {stockIn.isPending ? "Recording…" : "Record Stock IN"}
            </button>
          </div>
        </div>
      </div>

      {/* ══ LIST SECTION — green header ══ */}
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #e5e7eb" }}>
        {/* green header bar */}
        <div style={{ background: "#059669", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color="#fff" strokeWidth={2.5} />
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>Recent Stock IN</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{(recentMovements as any[]).length} entries</span>
        </div>

        {/* Desktop table */}
        <div className="stock-in-table">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1.5px solid #e5e7eb" }}>
                {["Item", "Code", "Qty", "Purpose", "Date", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentMovements as any[]).map((m: any, idx: number) => (
                <tr key={m.id}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827" }}>{m.store_items?.name || "—"}</td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{m.store_items?.item_code || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontWeight: 800, color: "#059669", fontSize: 15 }}>+{m.quantity}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 3 }}>{m.store_items?.unit}</span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: 13 }}>{m.purpose || "Manual entry"}</td>
                  <td style={{ padding: "14px 16px", color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>
                    {m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => { setEditData({ id: m.id, quantity: m.quantity, purpose: m.purpose || "" }); setEditOpen(true); }}
                      style={{ width: 30, height: 30, border: "1.5px solid #e5e7eb", borderRadius: 7, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}>
                      <Edit size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(recentMovements as any[]).length === 0 && (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <TrendingUp size={32} color="#e5e7eb" style={{ margin: "0 auto 10px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af" }}>No stock IN recorded yet</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="stock-in-cards" style={{ display: "none" }}>
          {(recentMovements as any[]).map((m: any) => (
            <div key={m.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{m.store_items?.name || "—"}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", fontFamily: "monospace" }}>{m.store_items?.item_code}</p>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#059669" }}>+{m.quantity}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {m.purpose && <span style={{ fontSize: 12, color: "#6b7280" }}>{m.purpose}</span>}
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                  {m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}
                </span>
                <button
                  onClick={() => { setEditData({ id: m.id, quantity: m.quantity, purpose: m.purpose || "" }); setEditOpen(true); }}
                  style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}>
                  <Edit size={12} />
                </button>
              </div>
            </div>
          ))}
          {(recentMovements as any[]).length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#9ca3af" }}>No stock IN recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{ maxWidth: 400, borderRadius: 14, border: "1.5px solid #e5e7eb" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Edit Stock IN Entry</DialogTitle>
          </DialogHeader>
          {editData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
              <div><label style={lbl}>Quantity</label><input type="number" value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Purpose</label><input value={editData.purpose} onChange={e => setEditData({ ...editData, purpose: e.target.value })} style={inp} /></div>
              <button onClick={() => updateMovement.mutate()} disabled={updateMovement.isPending}
                style={{ width: "100%", padding: "11px 0", background: "#EAB308", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer" }}>
                {updateMovement.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Upload Modal ── */}
      {showBulk && <BulkUploadModal items={items as any[]} onClose={() => setShowBulk(false)} userId={user?.id} />}

      {/* Responsive */}
      <style>{`
        @media (max-width: 640px) {
          .stock-in-table { display: none; }
          .stock-in-cards { display: block !important; }
          .stock-in-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default StockInPage;




// Lovable code of stockk in 




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
// import { TrendingUp, Download, Edit } from "lucide-react";
// import { format, startOfMonth, endOfMonth } from "date-fns";
// import { exportToCSV, exportToPDF } from "@/lib/export-utils";
// import DateRangeFilter from "@/components/DateRangeFilter";

// const StockInPage = () => {
//   const { user } = useAuth();
//   const queryClient = useQueryClient();
//   const [selectedItem, setSelectedItem] = useState("");
//   const [qty, setQty] = useState("");
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
//     queryKey: ["stock-in-recent", fromDate, toDate],
//     queryFn: async () => {
//       const { data } = await supabase.from("stock_movements").select("*, store_items(name, item_code)").eq("movement_type", "in").gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59`).order("created_at", { ascending: false });
//       return data || [];
//     },
//   });

//   const stockIn = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase.from("stock_movements").insert({ item_id: selectedItem, quantity: Number(qty), movement_type: "in", purpose: purpose || null, created_by: user?.id });
//       if (error) throw error;
//     },
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-in-recent"] }); queryClient.invalidateQueries({ queryKey: ["store-items"] }); queryClient.invalidateQueries({ queryKey: ["store-items-list"] }); toast.success("Stock IN recorded"); setSelectedItem(""); setQty(""); setPurpose(""); },
//     onError: (e: any) => toast.error(e.message),
//   });

//   const updateMovement = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase.from("stock_movements").update({ quantity: Number(editData.quantity), purpose: editData.purpose || null }).eq("id", editData.id);
//       if (error) throw error;
//     },
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-in-recent"] }); queryClient.invalidateQueries({ queryKey: ["store-items"] }); toast.success("Entry updated"); setEditOpen(false); setEditData(null); },
//     onError: (e: any) => toast.error(e.message),
//   });

//   const handleExportCSV = () => {
//     const headers = ["Item Code", "Item", "Quantity", "Purpose", "Date"];
//     const rows = recentMovements.map((m: any) => [(m as any).store_items?.item_code, (m as any).store_items?.name, String(m.quantity), m.purpose || "", m.created_at ? format(new Date(m.created_at), "dd MMM yyyy hh:mm a") : ""]);
//     exportToCSV(`stock-in-${fromDate}-to-${toDate}`, headers, rows);
//   };

//   const handleExportPDF = () => {
//     const headers = ["Item Code", "Item", "Quantity", "Purpose", "Date"];
//     const rows = recentMovements.map((m: any) => [(m as any).store_items?.item_code, (m as any).store_items?.name, String(m.quantity), m.purpose || "—", m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : ""]);
//     exportToPDF(`stock-in-${fromDate}-to-${toDate}`, `Stock IN Report (${fromDate} to ${toDate})`, headers, rows);
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div><h1 className="text-xl sm:text-2xl font-bold text-foreground">Stock IN</h1><p className="text-sm text-muted-foreground">Record incoming stock</p></div>
//         <div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button><Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button></div>
//       </div>

//       <Card><CardContent className="p-4 space-y-3">
//         <div><Label>Select Item</Label><Select value={selectedItem} onValueChange={setSelectedItem}><SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger><SelectContent>{items.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.item_code} — {i.name} (Curr: {i.current_qty} {i.unit})</SelectItem>))}</SelectContent></Select></div>
//         <div className="grid grid-cols-2 gap-3"><div><Label>Quantity</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div><div><Label>Purpose</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Procurement receipt, etc." /></div></div>
//         <Button className="w-full sm:w-auto" onClick={() => stockIn.mutate()} disabled={!selectedItem || !qty || stockIn.isPending}><TrendingUp className="w-4 h-4 mr-2" />Record Stock IN</Button>
//       </CardContent></Card>

//       <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

//       <Card><CardContent className="p-4">
//         <h3 className="text-sm font-semibold text-foreground mb-3">Stock IN Records ({recentMovements.length})</h3>
//         <div className="space-y-2">
//           {recentMovements.map((m: any) => (
//             <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-1">
//               <div><p className="text-sm font-medium text-foreground">{(m as any).store_items?.name}</p><p className="text-xs text-muted-foreground">{(m as any).store_items?.item_code} • {m.purpose || "Manual entry"}</p></div>
//               <div className="flex items-center gap-3 text-xs text-muted-foreground">
//                 <span className="font-medium text-success">+{m.quantity}</span>
//                 <span>{m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}</span>
//                 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditData({ id: m.id, quantity: m.quantity, purpose: m.purpose || "" }); setEditOpen(true); }}><Edit className="w-3 h-3" /></Button>
//               </div>
//             </div>
//           ))}
//           {recentMovements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No stock IN in this period</p>}
//         </div>
//       </CardContent></Card>

//       <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Edit Stock IN Entry</DialogTitle></DialogHeader>{editData && (<div className="space-y-3"><div><Label>Quantity</Label><Input type="number" value={editData.quantity} onChange={(e) => setEditData({ ...editData, quantity: e.target.value })} /></div><div><Label>Purpose</Label><Input value={editData.purpose} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} /></div><Button className="w-full" onClick={() => updateMovement.mutate()} disabled={updateMovement.isPending}>Save Changes</Button></div>)}</DialogContent></Dialog>
//     </div>
//   );
// };

// export default StockInPage;
