import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardCard from "@/components/DashboardCard";
import { Users, Banknote, CalendarDays, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const HRDashboard = () => {
  const { data: totalEmployees = 0 } = useQuery({
    queryKey: ["hr-total-employees"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count || 0;
    },
  });

  const { data: pendingLeaves = 0 } = useQuery({
    queryKey: ["hr-pending-leaves"],
    queryFn: async () => {
      const { count } = await supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments"],
    queryFn: async () => {
      const { data: deps } = await supabase.from("departments").select("id, name");
      const { data: profiles } = await supabase.from("profiles").select("department_id").eq("is_active", true);
      return (deps || []).map((d: any) => ({
        dept: d.name,
        count: (profiles || []).filter((p: any) => p.department_id === d.id).length,
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">HR Dashboard</h1>
        <p className="text-sm text-muted-foreground">Employee management, payroll & compliance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DashboardCard title="Total Employees" value={totalEmployees} subtitle="Active workforce" icon={Users} variant="primary" />
        <DashboardCard title="Payroll Status" value="Pending" subtitle="Current month" icon={Banknote} variant="warning" />
        <DashboardCard title="Leave Requests" value={pendingLeaves} subtitle="Pending approval" icon={CalendarDays} />
        <DashboardCard title="Pending Docs" value="—" subtitle="Aadhaar, PAN uploads" icon={FileText} variant="destructive" />
      </div>
      {departments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Department Strength</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {departments.map((d: any) => (
                <div key={d.dept} className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-foreground">{d.count}</p>
                  <p className="text-xs text-muted-foreground">{d.dept}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HRDashboard;
