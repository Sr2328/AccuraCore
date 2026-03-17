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
import DateRangeFilter from "../../components/ui//DateRangeFilter";

const AdminHRView = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-hr-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, departments(name)").order("name");
      return data || [];
    },
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["admin-hr-leaves", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*, profiles:employee_id(name, user_id_custom)").gte("from_date", fromDate).lte("from_date", toDate).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: gatePasses = [] } = useQuery({
    queryKey: ["admin-hr-gatepasses", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("gate_passes").select("*, profiles:employee_id(name, user_id_custom, departments(name))").gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59`).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filteredEmps = employees.filter((e: any) => e.name?.toLowerCase().includes(search.toLowerCase()) || e.user_id_custom?.toLowerCase().includes(search.toLowerCase()));

  const exportEmpCSV = () => {
    const headers = ["Name", "ID", "Email", "Phone", "Department", "Designation", "Shift", "Basic Salary", "Active", "Joined"];
    const rows = filteredEmps.map((e: any) => [e.name, e.user_id_custom, e.email || "", e.phone || "", e.departments?.name || "", e.designation || "", e.shift || "", String(e.basic_salary || 0), e.is_active ? "Yes" : "No", e.joining_date || ""]);
    exportToCSV("admin-employees", headers, rows);
  };
  const exportLeaveCSV = () => {
    const headers = ["Employee", "ID", "Leave Type", "From", "To", "Reason", "Status"];
    const rows = leaveRequests.map((l: any) => [l.profiles?.name || "", l.profiles?.user_id_custom || "", l.leave_type, l.from_date, l.to_date, l.reason || "", l.status]);
    exportToCSV(`admin-leaves-${fromDate}-to-${toDate}`, headers, rows);
  };
  const exportGPCSV = () => {
    const headers = ["Employee", "Type", "Reason", "Out", "Return", "Status"];
    const rows = gatePasses.map((g: any) => [g.profiles?.name || "", g.pass_type, g.reason || "", g.out_time ? format(new Date(g.out_time), "dd MMM hh:mm a") : "", g.return_time ? format(new Date(g.return_time), "dd MMM hh:mm a") : "", g.status]);
    exportToCSV(`admin-gatepasses-${fromDate}-to-${toDate}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><Eye className="w-5 h-5 text-muted-foreground" /> HR & Payroll (View Only)</h1>
        <p className="text-sm text-muted-foreground">Admin read-only view of HR data</p>
      </div>
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

      <Tabs defaultValue="employees">
        <TabsList><TabsTrigger value="employees">Employees ({filteredEmps.length})</TabsTrigger><TabsTrigger value="leaves">Leave ({leaveRequests.length})</TabsTrigger><TabsTrigger value="gatepasses">Gate Pass ({gatePasses.length})</TabsTrigger></TabsList>

        <TabsContent value="employees" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
            <Button variant="outline" size="sm" onClick={exportEmpCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          </div>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Department</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Designation</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Shift</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
          </tr></thead><tbody>
              {filteredEmps.map((e: any) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-3"><p className="font-medium text-foreground">{e.name}</p><p className="text-xs text-muted-foreground">{e.user_id_custom} • {e.email}</p></td>
                  <td className="py-3 px-3 text-foreground">{e.departments?.name || "—"}</td>
                  <td className="py-3 px-3 text-muted-foreground">{e.designation || "—"}</td>
                  <td className="py-3 px-3 text-center text-foreground">{e.shift}</td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline" className={e.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>{e.is_active ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))}
            </tbody></table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-3">
          <Button variant="outline" size="sm" onClick={exportLeaveCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Type</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">From</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">To</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Reason</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
          </tr></thead><tbody>
              {leaveRequests.map((l: any) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-3 text-foreground">{l.profiles?.name}</td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline" className="text-xs">{l.leave_type}</Badge></td>
                  <td className="py-3 px-3 text-center text-foreground">{l.from_date}</td>
                  <td className="py-3 px-3 text-center text-foreground">{l.to_date}</td>
                  <td className="py-3 px-3 text-muted-foreground max-w-[200px] truncate">{l.reason || "—"}</td>
                  <td className="py-3 px-3 text-center"><Badge variant="outline" className={l.status === "approved" ? "bg-success/10 text-success" : l.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>{l.status}</Badge></td>
                </tr>
              ))}
              {leaveRequests.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No leave requests</td></tr>}
            </tbody></table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="gatepasses" className="space-y-3">
          <Button variant="outline" size="sm" onClick={exportGPCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <div className="space-y-2">
            {gatePasses.map((gp: any) => (
              <Card key={gp.id}><CardContent className="p-4"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div><p className="text-sm font-semibold text-foreground">{gp.profiles?.name}</p><p className="text-xs text-muted-foreground">{gp.profiles?.departments?.name} • {gp.pass_type}</p>{gp.reason && <p className="text-xs text-muted-foreground mt-1">{gp.reason}</p>}</div>
                <div className="flex items-center gap-2">{gp.out_time && <span className="text-xs text-muted-foreground">Out: {format(new Date(gp.out_time), "hh:mm a")}</span>}{gp.return_time && <span className="text-xs text-muted-foreground">In: {format(new Date(gp.return_time), "hh:mm a")}</span>}<Badge variant="outline">{gp.status}</Badge></div>
              </div></CardContent></Card>
            ))}
            {gatePasses.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No gate passes</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHRView;
