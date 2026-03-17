import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));

  const { data: records = [] } = useQuery({
    queryKey: ["emp-attendance-history", user?.id, month],
    queryFn: async () => {
      const start = `${month}-01`;
      const end = `${month}-31`;
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user?.id)
        .gte("date", start).lte("date", end)
        .order("date", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const totalDays = records.length;
  const totalHours = records.reduce((s: number, r: any) => s + (Number(r.total_hours) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Attendance History</h1>
          <p className="text-sm text-muted-foreground">{totalDays} days • {totalHours.toFixed(1)} total hours</p>
        </div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-44" />
      </div>

      <div className="space-y-2">
        {records.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{format(new Date(r.date), "EEEE, dd MMM yyyy")}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>IN: {r.in_time ? format(new Date(r.in_time), "hh:mm a") : "—"}</span>
                    <span>OUT: {r.out_time ? format(new Date(r.out_time), "hh:mm a") : "—"}</span>
                    <span>Hours: {r.total_hours || "—"}</span>
                  </div>
                </div>
                <Badge variant="outline" className={r.employee_approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                  {r.employee_approved ? "Approved" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No records for this month</p>}
      </div>
    </div>
  );
};

export default AttendanceHistory;
