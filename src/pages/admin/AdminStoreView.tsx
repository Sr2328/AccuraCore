import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import DateRangeFilter from "../../components/ui/DateRangeFilter";

const getStockStatus = (qty: number, min: number) => {
  if (qty === 0) return { label: "Out of Stock", className: "bg-foreground/10 text-foreground" };
  if (qty < min) return { label: "Critical", className: "bg-destructive/10 text-destructive" };
  if (qty === min) return { label: "Low", className: "bg-warning/10 text-warning" };
  return { label: "In Stock", className: "bg-success/10 text-success" };
};

const AdminStoreView = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: items = [] } = useQuery({
    queryKey: ["admin-store-items"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("*, suppliers(name)").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: stockIn = [] } = useQuery({
    queryKey: ["admin-stock-in", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("stock_movements").select("*, store_items(name, item_code)").eq("movement_type", "in").gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59`).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: stockOut = [] } = useQuery({
    queryKey: ["admin-stock-out", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("stock_movements").select("*, store_items(name, item_code)").eq("movement_type", "out").gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59`).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filteredItems = items.filter((i: any) => i.name?.toLowerCase().includes(search.toLowerCase()) || i.item_code?.toLowerCase().includes(search.toLowerCase()));
  const lowStockItems = items.filter((i: any) => Number(i.current_qty) <= Number(i.min_stock_level));

  const exportItemsCSV = () => {
    const headers = ["Code", "Item", "Category", "Qty", "Unit", "Min", "Supplier", "Status"];
    const rows = filteredItems.map((i: any) => { const s = getStockStatus(Number(i.current_qty), Number(i.min_stock_level)); return [i.item_code, i.name, i.category, String(i.current_qty), i.unit, String(i.min_stock_level), i.suppliers?.name || "", s.label]; });
    exportToCSV("admin-inventory", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><Eye className="w-5 h-5 text-muted-foreground" /> Store (View Only)</h1>
        <p className="text-sm text-muted-foreground">Admin read-only view of store operations</p>
      </div>
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Items</p><p className="text-xl font-bold text-foreground">{items.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-xl font-bold text-destructive">{lowStockItems.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Stock IN (period)</p><p className="text-xl font-bold text-success">{stockIn.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Stock OUT (period)</p><p className="text-xl font-bold text-warning">{stockOut.length}</p></Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList><TabsTrigger value="inventory">Inventory</TabsTrigger><TabsTrigger value="stockin">Stock IN ({stockIn.length})</TabsTrigger><TabsTrigger value="stockout">Stock OUT ({stockOut.length})</TabsTrigger></TabsList>

        <TabsContent value="inventory" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
            <Button variant="outline" size="sm" onClick={exportItemsCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          </div>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Code</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Item</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Category</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Qty</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Min</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
          </tr></thead><tbody>
              {filteredItems.map((i: any) => {
                const s = getStockStatus(Number(i.current_qty), Number(i.min_stock_level)); return (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-3 font-medium text-foreground">{i.item_code}</td>
                    <td className="py-3 px-3 text-foreground">{i.name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{i.category}</td>
                    <td className="py-3 px-3 text-center text-foreground">{i.current_qty} {i.unit}</td>
                    <td className="py-3 px-3 text-center text-muted-foreground">{i.min_stock_level}</td>
                    <td className="py-3 px-3 text-center"><Badge variant="outline" className={s.className}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody></table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="stockin">
          <Card><CardContent className="p-4"><div className="space-y-2">
            {stockIn.map((m: any) => (
              <div key={m.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <div><p className="text-sm font-medium text-foreground">{m.store_items?.name}</p><p className="text-xs text-muted-foreground">{m.store_items?.item_code} • {m.purpose || "—"}</p></div>
                <div className="text-right"><span className="text-sm font-medium text-success">+{m.quantity}</span><p className="text-xs text-muted-foreground">{m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}</p></div>
              </div>
            ))}
            {stockIn.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No stock IN in this period</p>}
          </div></CardContent></Card>
        </TabsContent>

        <TabsContent value="stockout">
          <Card><CardContent className="p-4"><div className="space-y-2">
            {stockOut.map((m: any) => (
              <div key={m.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <div><p className="text-sm font-medium text-foreground">{m.store_items?.name}</p><p className="text-xs text-muted-foreground">{m.person_name} • {m.department} • {m.purpose || "—"}</p></div>
                <div className="text-right"><span className="text-sm font-medium text-destructive">-{m.quantity}</span><p className="text-xs text-muted-foreground">{m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}</p></div>
              </div>
            ))}
            {stockOut.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No stock OUT in this period</p>}
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminStoreView;
