import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TrendingDown, Download, Edit } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

const StockOutPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState("");
  const [personName, setPersonName] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["store-items-list"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("id, name, item_code, current_qty, unit").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: recentMovements = [] } = useQuery({
    queryKey: ["stock-out-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_movements").select("*, store_items(name, item_code)").eq("movement_type", "out").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const stockOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").insert({
        item_id: selectedItem, quantity: Number(qty), movement_type: "out",
        person_name: personName || null, department: department || null,
        purpose: purpose || null, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-out-recent"] });
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-list"] });
      toast.success("Stock OUT recorded");
      setSelectedItem(""); setQty(""); setPersonName(""); setDepartment(""); setPurpose("");
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
      setEditOpen(false);
      setEditData(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleExportCSV = () => {
    const headers = ["Item Code", "Item", "Quantity", "Person", "Department", "Purpose", "Date"];
    const rows = recentMovements.map((m: any) => [
      (m as any).store_items?.item_code, (m as any).store_items?.name, String(m.quantity),
      m.person_name || "", m.department || "", m.purpose || "",
      m.created_at ? format(new Date(m.created_at), "dd MMM yyyy hh:mm a") : "",
    ]);
    exportToCSV("stock-out", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Code", "Item", "Qty", "Person", "Dept", "Purpose", "Date"];
    const rows = recentMovements.map((m: any) => [
      (m as any).store_items?.item_code, (m as any).store_items?.name, String(m.quantity),
      m.person_name || "—", m.department || "—", m.purpose || "—",
      m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : "",
    ]);
    exportToPDF("stock-out", "Stock OUT Report — Accura Precision", headers, rows, "landscape");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Stock OUT</h1>
          <p className="text-sm text-muted-foreground">Issue stock to departments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>Select Item</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger>
              <SelectContent>
                {items.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.item_code} — {i.name} (Avail: {i.current_qty} {i.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Quantity</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div><Label>Person Name</Label><Input value={personName} onChange={(e) => setPersonName(e.target.value)} /></div>
            <div><Label>Department</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
          </div>
          <div><Label>Purpose</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Maintenance, Production, etc." /></div>
          <Button className="w-full sm:w-auto" onClick={() => stockOut.mutate()} disabled={!selectedItem || !qty || stockOut.isPending}>
            <TrendingDown className="w-4 h-4 mr-2" />Record Stock OUT
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Stock OUT</h3>
          <div className="space-y-2">
            {recentMovements.map((m: any) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-1">
                <div>
                  <p className="text-sm font-medium text-foreground">{(m as any).store_items?.name}</p>
                  <p className="text-xs text-muted-foreground">{m.person_name} • {m.department} • {m.purpose || "—"}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-destructive">-{m.quantity}</span>
                  <span>{m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditData({ id: m.id, quantity: m.quantity, person_name: m.person_name || "", department: m.department || "", purpose: m.purpose || "" }); setEditOpen(true); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {recentMovements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent stock OUT</p>}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Stock OUT Entry</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-3">
              <div><Label>Quantity</Label><Input type="number" value={editData.quantity} onChange={(e) => setEditData({ ...editData, quantity: e.target.value })} /></div>
              <div><Label>Person Name</Label><Input value={editData.person_name} onChange={(e) => setEditData({ ...editData, person_name: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={editData.department} onChange={(e) => setEditData({ ...editData, department: e.target.value })} /></div>
              <div><Label>Purpose</Label><Input value={editData.purpose} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} /></div>
              <Button className="w-full" onClick={() => updateMovement.mutate()} disabled={updateMovement.isPending}>Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

