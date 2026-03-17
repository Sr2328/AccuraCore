import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import DateRangeFilter from "../../components/ui/DateRangeFilter";

const HRAttendancePage = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["hr-attendance", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, profiles:employee_id(name, user_id_custom, departments(name))")
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });
      return data || [];
    },
  });

  const filtered = records.filter((r: any) =>
    r.profiles?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.profiles?.user_id_custom?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ["Date", "Employee", "ID", "Department", "IN Time", "OUT Time", "Hours", "Status"];
    const rows = filtered.map((r: any) => [
      r.date, r.profiles?.name || "", r.profiles?.user_id_custom || "", r.profiles?.departments?.name || "",
      r.in_time ? format(new Date(r.in_time), "hh:mm a") : "", r.out_time ? format(new Date(r.out_time), "hh:mm a") : "",
      String(r.total_hours || ""), r.employee_approved ? "Approved" : "Pending",
    ]);
    exportToCSV(`attendance-${fromDate}-to-${toDate}`, headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Date", "Employee", "Dept", "IN", "OUT", "Hours", "Status"];
    const rows = filtered.map((r: any) => [
      r.date, r.profiles?.name || "", r.profiles?.departments?.name || "—",
      r.in_time ? format(new Date(r.in_time), "hh:mm a") : "—", r.out_time ? format(new Date(r.out_time), "hh:mm a") : "—",
      String(r.total_hours || "—"), r.employee_approved ? "Approved" : "Pending",
    ]);
    exportToPDF(`attendance-${fromDate}-to-${toDate}`, `Attendance Report (${fromDate} to ${toDate})`, headers, rows, "landscape");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Attendance Records</h1>
          <p className="text-sm text-muted-foreground">View and manage attendance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
        </div>
      </div>

      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:hidden gap-3">
            {filtered.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.profiles?.departments?.name} • {r.date}</p>
                    </div>
                    <Badge variant="outline" className={r.employee_approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                      {r.employee_approved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>IN: {r.in_time ? format(new Date(r.in_time), "hh:mm a") : "—"}</span>
                    <span>OUT: {r.out_time ? format(new Date(r.out_time), "hh:mm a") : "—"}</span>
                    <span>Hours: {r.total_hours || "—"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">IN Time</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">OUT Time</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Hours</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-4 text-foreground">{r.date}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-foreground">{r.profiles?.name}</p>
                          <p className="text-xs text-muted-foreground">{r.profiles?.user_id_custom}</p>
                        </td>
                        <td className="py-3 px-4 text-foreground">{r.profiles?.departments?.name || "—"}</td>
                        <td className="py-3 px-4 text-center text-foreground">{r.in_time ? format(new Date(r.in_time), "hh:mm a") : "—"}</td>
                        <td className="py-3 px-4 text-center text-foreground">{r.out_time ? format(new Date(r.out_time), "hh:mm a") : "—"}</td>
                        <td className="py-3 px-4 text-center text-foreground">{r.total_hours || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={r.employee_approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                            {r.employee_approved ? "Approved" : "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No attendance records found</p>}
        </>
      )}
    </div>
  );
};

export default HRAttendancePage;
