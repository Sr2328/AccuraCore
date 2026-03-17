import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ClipboardList, Download } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

export default function GatePassPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [empId, setEmpId] = useState("");
  const [passType, setPassType] = useState("return");
  const [reason, setReason] = useState("");

  const { data: passes = [] } = useQuery({
    queryKey: ["gate-passes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gate_passes")
        .select("*, profiles!gate_passes_employee_id_fkey(name, user_id_custom, departments(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, user_id_custom").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const createPass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gate_passes").insert({
        employee_id: empId,
        pass_type: passType,
        reason,
        created_by: user?.id,
        status: "created",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
      toast.success("Gate pass created");
      setShowCreate(false);
      setEmpId("");
      setReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("gate_passes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
      toast.success("Gate pass updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColor: Record<string, string> = {
    created: "bg-info/10 text-info border-info/20",
    approved: "bg-success/10 text-success border-success/20",
    exited: "bg-warning/10 text-warning border-warning/20",
    returned: "bg-success/10 text-success border-success/20",
    closed: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning border-warning/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const handleExportCSV = () => {
    const headers = ["Employee", "Type", "Reason", "Out Time", "Return Time", "Status"];
    const rows = passes.map((p: any) => [
      p.profiles?.name || "", p.pass_type === "return" ? "Return" : "Non-Return", p.reason || "",
      p.out_time ? format(new Date(p.out_time), "dd MMM hh:mm a") : "", p.return_time ? format(new Date(p.return_time), "dd MMM hh:mm a") : "", p.status,
    ]);
    exportToCSV("gate-passes", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Employee", "Type", "Reason", "Out", "Return", "Status"];
    const rows = passes.map((p: any) => [
      p.profiles?.name || "", p.pass_type === "return" ? "Return" : "Non-Return", p.reason || "—",
      p.out_time ? format(new Date(p.out_time), "hh:mm a") : "—", p.return_time ? format(new Date(p.return_time), "hh:mm a") : "—", p.status,
    ]);
    exportToPDF("gate-passes", "Gate Pass Report — Accura Precision", headers, rows, "landscape");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gate Pass</h1>
          <p className="text-sm text-muted-foreground">Create and manage gate passes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> New Gate Pass</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Gate Pass</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <Select value={empId} onValueChange={setEmpId}>
                    <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.name} ({e.user_id_custom})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pass Type</Label>
                  <Select value={passType} onValueChange={setPassType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">Return Type</SelectItem>
                      <SelectItem value="non_return">Non-Return Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for gate pass..." />
                </div>
                <Button onClick={() => createPass.mutate()} disabled={!empId || createPass.isPending} className="w-full gradient-primary text-primary-foreground">
                  {createPass.isPending ? "Creating..." : "Create Gate Pass"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Gate Passes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Employee</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Reason</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Out Time</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Return</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <p className="font-medium text-foreground">{p.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.profiles?.departments?.name}</p>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className="text-xs">{p.pass_type === "return" ? "Return" : "Non-Return"}</Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">{p.reason || "—"}</td>
                    <td className="py-3 px-2 text-center text-foreground">{p.out_time ? format(new Date(p.out_time), "hh:mm a") : "—"}</td>
                    <td className="py-3 px-2 text-center text-foreground">{p.return_time ? format(new Date(p.return_time), "hh:mm a") : "—"}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className={statusColor[p.status] || ""}>{p.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {p.status === "approved" && !p.out_time && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: p.id, updates: { out_time: new Date().toISOString(), status: "exited" } })}>
                          Mark Exit
                        </Button>
                      )}
                      {p.status === "exited" && p.pass_type === "return" && !p.return_time && (
                        <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" onClick={() => updateStatus.mutate({ id: p.id, updates: { return_time: new Date().toISOString(), status: "returned" } })}>
                          Mark Return
                        </Button>
                      )}
                      {(p.status === "created") && (
                        <span className="text-xs text-muted-foreground">Awaiting approval</span>
                      )}
                    </td>
                  </tr>
                ))}
                {passes.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No gate passes yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




// Lovable code of gatepass 



// import { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "@/lib/auth-context";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { toast } from "sonner";
// import { Plus, ClipboardList, Download } from "lucide-react";
// import { format, startOfMonth, endOfMonth } from "date-fns";
// import { exportToCSV, exportToPDF } from "@/lib/export-utils";
// import DateRangeFilter from "@/components/DateRangeFilter";

// export default function GatePassPage() {
//   const { user } = useAuth();
//   const queryClient = useQueryClient();
//   const [showCreate, setShowCreate] = useState(false);
//   const [empId, setEmpId] = useState("");
//   const [passType, setPassType] = useState("return");
//   const [reason, setReason] = useState("");
//   const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
//   const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

//   const { data: passes = [] } = useQuery({
//     queryKey: ["gate-passes", fromDate, toDate],
//     queryFn: async () => {
//       const { data } = await supabase
//         .from("gate_passes")
//         .select("*, profiles!gate_passes_employee_id_fkey(name, user_id_custom, departments(name))")
//         .gte("created_at", `${fromDate}T00:00:00`)
//         .lte("created_at", `${toDate}T23:59:59`)
//         .order("created_at", { ascending: false });
//       return data || [];
//     },
//   });

//   const { data: employees = [] } = useQuery({
//     queryKey: ["active-employees"],
//     queryFn: async () => {
//       const { data } = await supabase.from("profiles").select("id, name, user_id_custom").eq("is_active", true).order("name");
//       return data || [];
//     },
//   });

//   const createPass = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase.from("gate_passes").insert({ employee_id: empId, pass_type: passType, reason, created_by: user?.id, status: "created" });
//       if (error) throw error;
//     },
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gate-passes"] }); toast.success("Gate pass created"); setShowCreate(false); setEmpId(""); setReason(""); },
//     onError: (err: any) => toast.error(err.message),
//   });

//   const updateStatus = useMutation({
//     mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
//       const { error } = await supabase.from("gate_passes").update(updates).eq("id", id);
//       if (error) throw error;
//     },
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gate-passes"] }); toast.success("Gate pass updated"); },
//     onError: (err: any) => toast.error(err.message),
//   });

//   const statusColor: Record<string, string> = {
//     created: "bg-info/10 text-info border-info/20", approved: "bg-success/10 text-success border-success/20",
//     exited: "bg-warning/10 text-warning border-warning/20", returned: "bg-success/10 text-success border-success/20",
//     closed: "bg-muted text-muted-foreground", pending: "bg-warning/10 text-warning border-warning/20",
//     rejected: "bg-destructive/10 text-destructive border-destructive/20",
//   };

//   const handleExportCSV = () => {
//     const headers = ["Employee", "Type", "Reason", "Out Time", "Return Time", "Status", "Created"];
//     const rows = passes.map((p: any) => [
//       p.profiles?.name || "", p.pass_type === "return" ? "Return" : "Non-Return", p.reason || "",
//       p.out_time ? format(new Date(p.out_time), "dd MMM hh:mm a") : "", p.return_time ? format(new Date(p.return_time), "dd MMM hh:mm a") : "",
//       p.status, p.created_at ? format(new Date(p.created_at), "dd MMM yyyy") : "",
//     ]);
//     exportToCSV(`gate-passes-${fromDate}-to-${toDate}`, headers, rows);
//   };

//   const handleExportPDF = () => {
//     const headers = ["Employee", "Type", "Reason", "Out", "Return", "Status"];
//     const rows = passes.map((p: any) => [
//       p.profiles?.name || "", p.pass_type === "return" ? "Return" : "Non-Return", p.reason || "—",
//       p.out_time ? format(new Date(p.out_time), "hh:mm a") : "—", p.return_time ? format(new Date(p.return_time), "hh:mm a") : "—", p.status,
//     ]);
//     exportToPDF(`gate-passes-${fromDate}-to-${toDate}`, `Gate Pass Report (${fromDate} to ${toDate})`, headers, rows, "landscape");
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div>
//           <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gate Pass</h1>
//           <p className="text-sm text-muted-foreground">Create and manage gate passes</p>
//         </div>
//         <div className="flex gap-2 flex-wrap">
//           <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
//           <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
//           <Dialog open={showCreate} onOpenChange={setShowCreate}>
//             <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> New Gate Pass</Button></DialogTrigger>
//             <DialogContent>
//               <DialogHeader><DialogTitle>Create Gate Pass</DialogTitle></DialogHeader>
//               <div className="space-y-4 pt-2">
//                 <div className="space-y-1.5"><Label>Employee</Label><Select value={empId} onValueChange={setEmpId}><SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger><SelectContent>{employees.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.user_id_custom})</SelectItem>))}</SelectContent></Select></div>
//                 <div className="space-y-1.5"><Label>Pass Type</Label><Select value={passType} onValueChange={setPassType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="return">Return Type</SelectItem><SelectItem value="non_return">Non-Return Type</SelectItem></SelectContent></Select></div>
//                 <div className="space-y-1.5"><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for gate pass..." /></div>
//                 <Button onClick={() => createPass.mutate()} disabled={!empId || createPass.isPending} className="w-full gradient-primary text-primary-foreground">{createPass.isPending ? "Creating..." : "Create Gate Pass"}</Button>
//               </div>
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

//       <Card>
//         <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Gate Passes ({passes.length})</CardTitle></CardHeader>
//         <CardContent>
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead><tr className="border-b border-border">
//                 <th className="text-left py-3 px-2 font-medium text-muted-foreground">Employee</th>
//                 <th className="text-center py-3 px-2 font-medium text-muted-foreground">Type</th>
//                 <th className="text-left py-3 px-2 font-medium text-muted-foreground">Reason</th>
//                 <th className="text-center py-3 px-2 font-medium text-muted-foreground">Out Time</th>
//                 <th className="text-center py-3 px-2 font-medium text-muted-foreground">Return</th>
//                 <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
//                 <th className="text-center py-3 px-2 font-medium text-muted-foreground">Action</th>
//               </tr></thead>
//               <tbody>
//                 {passes.map((p: any) => (
//                   <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
//                     <td className="py-3 px-2"><p className="font-medium text-foreground">{p.profiles?.name}</p><p className="text-xs text-muted-foreground">{p.profiles?.departments?.name}</p></td>
//                     <td className="py-3 px-2 text-center"><Badge variant="outline" className="text-xs">{p.pass_type === "return" ? "Return" : "Non-Return"}</Badge></td>
//                     <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">{p.reason || "—"}</td>
//                     <td className="py-3 px-2 text-center text-foreground">{p.out_time ? format(new Date(p.out_time), "hh:mm a") : "—"}</td>
//                     <td className="py-3 px-2 text-center text-foreground">{p.return_time ? format(new Date(p.return_time), "hh:mm a") : "—"}</td>
//                     <td className="py-3 px-2 text-center"><Badge variant="outline" className={statusColor[p.status] || ""}>{p.status}</Badge></td>
//                     <td className="py-3 px-2 text-center">
//                       {p.status === "approved" && !p.out_time && (<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: p.id, updates: { out_time: new Date().toISOString(), status: "exited" } })}>Mark Exit</Button>)}
//                       {p.status === "exited" && p.pass_type === "return" && !p.return_time && (<Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" onClick={() => updateStatus.mutate({ id: p.id, updates: { return_time: new Date().toISOString(), status: "returned" } })}>Mark Return</Button>)}
//                       {p.status === "created" && <span className="text-xs text-muted-foreground">Awaiting approval</span>}
//                     </td>
//                   </tr>
//                 ))}
//                 {passes.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No gate passes</td></tr>}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
