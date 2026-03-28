import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ShoppingCart, Package, RefreshCw, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AlertsPage = () => {
  const navigate = useNavigate();

  const { data: allAlerts = [], isLoading, refetch } = useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_items")
        .select("*, suppliers(name)")
        .eq("is_active", true)
        .order("current_qty");
      return (data || []).filter((i: any) => Number(i.current_qty) <= Number(i.min_stock_level) * 1.2);
    },
    refetchInterval: 60000,
  });

  const outOfStock = allAlerts.filter((i: any) => Number(i.current_qty) === 0);
  const critical = allAlerts.filter((i: any) => Number(i.current_qty) > 0 && Number(i.current_qty) < Number(i.min_stock_level));
  const low = allAlerts.filter((i: any) => Number(i.current_qty) >= Number(i.min_stock_level) && Number(i.current_qty) <= Number(i.min_stock_level) * 1.2);

  const getStatus = (item: any) => {
    const qty = Number(item.current_qty);
    const min = Number(item.min_stock_level);
    if (qty === 0) return { label: "Out of Stock", dot: "#ef4444", bg: "#fef2f2", text: "#dc2626", border: "#fecaca", barColor: "#ef4444" };
    if (qty < min) return { label: "Critical", dot: "#f97316", bg: "#fff7ed", text: "#ea580c", border: "#fed7aa", barColor: "#f97316" };
    return { label: "Low Stock", dot: "#EAB308", bg: "#fefce8", text: "#ca8a04", border: "#fef08a", barColor: "#EAB308" };
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 40, background: "#f3f4f6", margin: "-20px", padding: "20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "#111827", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={20} color="#ef4444" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>Stock Alerts</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0", fontWeight: 500 }}>
              {allAlerts.length} item{allAlerts.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          style={{ width: 36, height: 36, border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Stat pills ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "Out of Stock", value: outOfStock.length, bg: "#fef2f2", border: "#fecaca", text: "#dc2626", dot: "#ef4444" },
          { label: "Critical", value: critical.length, bg: "#fff7ed", border: "#fed7aa", text: "#ea580c", dot: "#f97316" },
          { label: "Low Stock", value: low.length, bg: "#fefce8", border: "#fef08a", text: "#ca8a04", dot: "#EAB308" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 10, padding: "14px 18px", minWidth: 110 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: s.text, lineHeight: 1 }}>{s.value}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.text, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #EAB308", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── All clear ── */}
      {!isLoading && allAlerts.length === 0 && (
        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "60px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 64, height: 64, background: "#f0fdf4", border: "2px solid #a7f3d0", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <ShoppingCart size={28} color="#059669" strokeWidth={1.8} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>All Good!</p>
          <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>All items are above minimum stock levels.</p>
        </div>
      )}

      {/* ── Alert groups ── */}
      {!isLoading && allAlerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Out of Stock */}
          {outOfStock.length > 0 && (
            <Section
              title="Out of Stock"
              count={outOfStock.length}
              headerBg="#ef4444"
              items={outOfStock}
              getStatus={getStatus}
              navigate={navigate}
            />
          )}

          {/* Critical */}
          {critical.length > 0 && (
            <Section
              title="Critical — Below Minimum"
              count={critical.length}
              headerBg="#f97316"
              items={critical}
              getStatus={getStatus}
              navigate={navigate}
            />
          )}

          {/* Low */}
          {low.length > 0 && (
            <Section
              title="Low Stock — Near Minimum"
              count={low.length}
              headerBg="#EAB308"
              items={low}
              getStatus={getStatus}
              navigate={navigate}
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ── Section component ───────────────────────────────────── */
const Section = ({ title, count, headerBg, items, getStatus, navigate }: {
  title: string; count: number; headerBg: string;
  items: any[]; getStatus: (i: any) => any; navigate: any;
}) => (
  <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #e5e7eb" }}>
    {/* coloured header */}
    <div style={{ background: headerBg, padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={15} color={headerBg === "#EAB308" ? "#000" : "#fff"} strokeWidth={2.5} />
        <p style={{ fontSize: 13, fontWeight: 800, color: headerBg === "#EAB308" ? "#000" : "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: headerBg === "#EAB308" ? "#000000aa" : "rgba(255,255,255,0.75)" }}>{count} item{count !== 1 ? "s" : ""}</span>
    </div>

    {/* Desktop table */}
    <div className="alerts-table">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1.5px solid #e5e7eb" }}>
            {["Item", "Code", "Category", "Supplier", "Current Qty", "Min Required", "Status", ""].map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const s = getStatus(item);
            const qty = Number(item.current_qty);
            const min = Number(item.min_stock_level);
            const pct = min > 0 ? Math.min(Math.round((qty / min) * 100), 100) : 0;
            return (
              <tr key={item.id}
                style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = s.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")}
              >
                <td style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{item.name}</p>
                  {item.rack_location && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>📦 {item.rack_location}</p>}
                </td>
                <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{item.item_code || "—"}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: "#f3f4f6", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: "#374151" }}>{item.category || "—"}</span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>{item.suppliers?.name || "—"}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 48, height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: s.barColor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: s.text }}>{qty}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{item.unit}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{min} {item.unit}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: s.bg, color: s.text, border: `1px solid ${s.border}`,
                    borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                    {s.label}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <button
                    onClick={() => navigate("/store/stockin")}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 12px", background: "#111827", border: "none",
                      borderRadius: 7, fontSize: 12, fontWeight: 700, color: "#EAB308",
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    <TrendingUp size={12} strokeWidth={2.5} /> Restock
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Mobile cards */}
    <div className="alerts-cards" style={{ display: "none" }}>
      {items.map((item: any) => {
        const s = getStatus(item);
        const qty = Number(item.current_qty);
        const min = Number(item.min_stock_level);
        const pct = min > 0 ? Math.min(Math.round((qty / min) * 100), 100) : 0;
        return (
          <div key={item.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, fontFamily: "monospace" }}>{item.item_code} · {item.category}</p>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 10 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />{s.label}
              </span>
            </div>

            {/* progress bar */}
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: s.barColor, borderRadius: 3 }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  Current: <strong style={{ color: s.text }}>{qty}</strong> {item.unit}
                </span>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Min: {min} {item.unit}</span>
              </div>
              <button
                onClick={() => navigate("/store/stockin")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "#111827", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, color: "#EAB308", cursor: "pointer" }}
              >
                <TrendingUp size={11} /> Restock
              </button>
            </div>
          </div>
        );
      })}
    </div>

    <style>{`
      @media (max-width: 640px) {
        .alerts-table { display: none; }
        .alerts-cards { display: block !important; }
      }
    `}</style>
  </div>
);

export default AlertsPage;