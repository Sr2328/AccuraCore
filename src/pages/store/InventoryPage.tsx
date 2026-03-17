import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Package, Download } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

const CATEGORIES = ["Steel", "Electrical", "Consumables", "Tools", "Stationery", "General"];

const getStockStatus = (qty: number, min: number) => {
  if (qty === 0) return { label: "Out of Stock", className: "bg-foreground/10 text-foreground" };
  if (qty < min) return { label: "Critical", className: "bg-destructive/10 text-destructive" };
  if (qty === min) return { label: "Low", className: "bg-warning/10 text-warning" };
  return { label: "In Stock", className: "bg-success/10 text-success" };
};

const InventoryPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "General", unit: "pcs", min_stock_level: "0", rate: "0", rack_location: "", supplier_id: "" });

  const { data: items = [], isLoading } = useQuery({
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
      toast.success("Item added");
      setAddOpen(false);
      setForm({ name: "", category: "General", unit: "pcs", min_stock_level: "0", rate: "0", rack_location: "", supplier_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = items.filter((i: any) =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ["Code", "Item", "Category", "Qty", "Unit", "Min Stock", "Rack", "Supplier", "Rate", "Status"];
    const rows = filtered.map((i: any) => {
      const s = getStockStatus(Number(i.current_qty), Number(i.min_stock_level));
      return [i.item_code, i.name, i.category, i.current_qty, i.unit, i.min_stock_level, i.rack_location || "", (i as any).suppliers?.name || "", i.rate, s.label];
    });
    exportToCSV("inventory", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Code", "Item", "Category", "Qty", "Unit", "Min", "Rack", "Status"];
    const rows = filtered.map((i: any) => {
      const s = getStockStatus(Number(i.current_qty), Number(i.min_stock_level));
      return [i.item_code, i.name, i.category, String(i.current_qty), i.unit, String(i.min_stock_level), i.rack_location || "—", s.label];
    });
    exportToPDF("inventory", "Inventory Report — Accura Precision", headers, rows, "landscape");
  };

  // Group suppliers by type for display
  const materialSuppliers = suppliers.filter((s: any) => s.supplier_type === "material");
  const rmSuppliers = suppliers.filter((s: any) => s.supplier_type === "rm");
  const jobWorkSuppliers = suppliers.filter((s: any) => s.supplier_type === "job_work");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} items</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
          <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:hidden gap-3">
            {filtered.map((item: any) => {
              const status = getStockStatus(Number(item.current_qty), Number(item.min_stock_level));
              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.item_code} • {item.category}</p>
                        {(item as any).suppliers?.name && <p className="text-xs text-muted-foreground">Supplier: {(item as any).suppliers.name}</p>}
                      </div>
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Qty: {item.current_qty} {item.unit}</span>
                      <span>Min: {item.min_stock_level}</span>
                      {item.rack_location && <span>Rack: {item.rack_location}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Code</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Item</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Qty</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Min</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rack</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: any) => {
                      const status = getStockStatus(Number(item.current_qty), Number(item.min_stock_level));
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="py-3 px-4 font-medium text-foreground">{item.item_code}</td>
                          <td className="py-3 px-4 text-foreground">{item.name}</td>
                          <td className="py-3 px-4 text-foreground">{item.category}</td>
                          <td className="py-3 px-4 text-muted-foreground">{(item as any).suppliers?.name || "—"}</td>
                          <td className="py-3 px-4 text-center text-foreground">{item.current_qty} {item.unit}</td>
                          <td className="py-3 px-4 text-center text-muted-foreground">{item.min_stock_level}</td>
                          <td className="py-3 px-4 text-foreground">{item.rack_location || "—"}</td>
                          <td className="py-3 px-4 text-center"><Badge variant="outline" className={status.className}>{status.label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {materialSuppliers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Material Suppliers</div>
                      {materialSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </>
                  )}
                  {rmSuppliers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">RM Suppliers</div>
                      {rmSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </>
                  )}
                  {jobWorkSuppliers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Job Work Suppliers</div>
                      {jobWorkSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </>
                  )}
                  {suppliers.filter((s: any) => !["material", "rm", "job_work"].includes(s.supplier_type)).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Other</div>
                      {suppliers.filter((s: any) => !["material", "rm", "job_work"].includes(s.supplier_type)).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Stock Level</Label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} /></div>
              <div><Label>Rate (₹)</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
            </div>
            <div><Label>Rack Location</Label><Input value={form.rack_location} onChange={(e) => setForm({ ...form, rack_location: e.target.value })} placeholder="e.g. R1-S3" /></div>
            <Button className="w-full" onClick={() => addItem.mutate()} disabled={!form.name || addItem.isPending}>Add Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
