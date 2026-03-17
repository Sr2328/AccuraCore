import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import DateRangeFilter from "../../components/ui/DateRangeFilter";

const AdminSecurityView = () => {
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: gatePasses = [] } = useQuery({
    queryKey: ["admin-sec-gp", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("gate_passes").select("*, profiles:employee_id(name, user_id_custom, departments(name))").gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59`).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: canteenLogs = [] } = useQuery({
    queryKey: ["admin-sec-canteen", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("canteen_logs").select("*, profiles:employee_id(name, user_id_custom)").gte("date", fromDate).lte("date", toDate).order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: materialLogs = [] } = useQuery({
    queryKey: ["admin-sec-material", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("job_work").select("*, suppliers(name)").in("current_step", [3, 4]).gte("updated_at", `${fromDate}T00:00:00`).lte("updated_at", `${toDate}T23:59:59`).order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const exportGPCSV = () => {
    const headers = ["Employee", "Type", "Reason", "Out", "Return", "Status", "Created"];
    const rows = gatePasses.map((g: any) => [g.profiles?.name || "", g.pass_type, g.reason || "", g.out_time ? format(new Date(g.out_time), "dd MMM hh:mm a") : "", g.return_time ? format(new Date(g.return_time), "dd MMM hh:mm a") : "", g.status, g.created_at ? format(new Date(g.created_at), "dd MMM yyyy") : ""]);
    exportToCSV(`admin-security-gp-${fromDate}-to-${toDate}`, headers, rows);
  };
  const exportCanteenCSV = () => {
    const headers = ["Employee", "Date", "Meal", "Approved"];
    const rows = canteenLogs.map((c: any) => [c.profiles?.name || "", c.date, c.meal_type, c.employee_approved ? "Yes" : "No"]);
    exportToCSV(`admin-canteen-${fromDate}-to-${toDate}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><Eye className="w-5 h-5 text-muted-foreground" /> Security (View Only)</h1>
        <p className="text-sm text-muted-foreground">Admin read-only view of security operations</p>
      </div>
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Gate Passes</p><p className="text-xl font-bold text-foreground">{gatePasses.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Canteen Logs</p><p className="text-xl font-bold text-foreground">{canteenLogs.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Material Movements</p><p className="text-xl font-bold text-foreground">{materialLogs.length}</p></Card>
      </div>

      <Tabs defaultValue="gatepasses">
        <TabsList><TabsTrigger value="gatepasses">Gate Passes</TabsTrigger><TabsTrigger value="canteen">Canteen</TabsTrigger><TabsTrigger value="material">Material</TabsTrigger></TabsList>

        <TabsContent value="gatepasses" className="space-y-3">
          <Button variant="outline" size="sm" onClick={exportGPCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Type</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Reason</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Out</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Return</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
          </tr></thead><tbody>
              {gatePasses.map((g: any) => (
                <tr key={g.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-3"><p className="font-medium text-foreground">{g.profiles?.name}</p><p className="text-xs text-muted-foreground">{g.profiles?.departments?.name}</p></td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline" className="text-xs">{g.pass_type}</Badge></td>
                  <td className="py-3 px-3 text-muted-foreground max-w-[150px] truncate">{g.reason || "—"}</td>
                  <td className="py-3 px-3 text-center text-foreground">{g.out_time ? format(new Date(g.out_time), "hh:mm a") : "—"}</td>
                  <td className="py-3 px-3 text-center text-foreground">{g.return_time ? format(new Date(g.return_time), "hh:mm a") : "—"}</td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline">{g.status}</Badge></td>
                </tr>
              ))}
              {gatePasses.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No gate passes</td></tr>}
            </tbody></table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="canteen" className="space-y-3">
          <Button variant="outline" size="sm" onClick={exportCanteenCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Date</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Meal</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Approved</th>
          </tr></thead><tbody>
              {canteenLogs.map((c: any) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-3 text-foreground">{c.profiles?.name}</td>
                  <td className="py-3 px-3 text-center text-foreground">{c.date}</td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline" className="text-xs">{c.meal_type}</Badge></td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline" className={c.employee_approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{c.employee_approved ? "Yes" : "No"}</Badge></td>
                </tr>
              ))}
              {canteenLogs.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No canteen logs</td></tr>}
            </tbody></table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="material">
          <Card><CardContent className="p-4"><div className="space-y-2">
            {materialLogs.map((m: any) => (
              <div key={m.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <div><p className="text-sm font-medium text-foreground">{m.material_name}</p><p className="text-xs text-muted-foreground">{m.suppliers?.name} • {m.process_type}</p></div>
                <div className="text-right"><Badge variant="outline" className="text-xs">Step {m.current_step}</Badge><p className="text-xs text-muted-foreground">{m.quantity} {m.unit}</p></div>
              </div>
            ))}
            {materialLogs.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No material movements</p>}
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSecurityView;
