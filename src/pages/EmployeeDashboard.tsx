import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import DashboardCard from "@/components/DashboardCard";
import { Clock, CalendarDays, Banknote, ClipboardCheck, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayAtt } = useQuery({
    queryKey: ["emp-today-att", user?.id, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user?.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["emp-approvals", user?.id],
    queryFn: async () => {
      const results: any[] = [];
      // Pending attendance
      const { data: attData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user?.id)
        .eq("employee_approved", false)
        .not("in_time", "is", null)
        .order("date", { ascending: false })
        .limit(10);
      attData?.forEach((a: any) => results.push({ ...a, _type: "attendance", _label: a.out_time ? "Attendance OUT" : "Attendance IN" }));

      // Pending canteen
      const { data: canData } = await supabase
        .from("canteen_logs")
        .select("*")
        .eq("employee_id", user?.id)
        .eq("employee_approved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      canData?.forEach((c: any) => results.push({ ...c, _type: "canteen", _label: "Canteen Lunch" }));

      // Pending gate pass returns
      const { data: gpData } = await supabase
        .from("gate_passes")
        .select("*")
        .eq("employee_id", user?.id)
        .eq("status", "returned")
        .eq("employee_return_approved", false)
        .limit(10);
      gpData?.forEach((g: any) => results.push({ ...g, _type: "gatepass", _label: "Gate Pass Return" }));

      return results;
    },
    enabled: !!user?.id,
  });

  const approveItem = useMutation({
    mutationFn: async (item: any) => {
      if (item._type === "attendance") {
        const { error } = await supabase.from("attendance").update({
          employee_approved: true, approved_at: new Date().toISOString(), is_locked: true, status: "approved",
        }).eq("id", item.id);
        if (error) throw error;
      } else if (item._type === "canteen") {
        const { error } = await supabase.from("canteen_logs").update({
          employee_approved: true, approved_at: new Date().toISOString(),
        }).eq("id", item.id);
        if (error) throw error;
      } else if (item._type === "gatepass") {
        const { error } = await supabase.from("gate_passes").update({
          employee_return_approved: true, status: "closed",
        }).eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["emp-today-att"] });
      toast.success("Approved successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const todayHours = todayAtt?.total_hours ? `${todayAtt.total_hours}h` : todayAtt?.in_time ? "In progress" : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">Employee Portal — {user?.department}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="gradient-primary p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-foreground">{user?.name}</h2>
              <p className="text-sm text-primary-foreground/80">{user?.userId}</p>
              <p className="text-xs text-primary-foreground/60">{user?.department} • Accura Precision Engg.</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Today's Status"
          value={todayHours}
          subtitle={todayAtt?.in_time ? `IN: ${format(new Date(todayAtt.in_time), "hh:mm a")}` : "Not checked in"}
          icon={Clock}
          variant="primary"
        />
        <DashboardCard title="This Month" value="—" subtitle="Attendance days" icon={CalendarDays} />
        <DashboardCard title="Pending Approvals" value={pendingApprovals.length} subtitle="Action needed" icon={ClipboardCheck} variant={pendingApprovals.length > 0 ? "warning" : "success"} />
        <DashboardCard title="Leave Balance" value="—" subtitle="CL/SL/EL" icon={Banknote} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Pending Approvals</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingApprovals.length > 0 ? pendingApprovals.map((item: any) => (
              <motion.div
                key={`${item._type}-${item.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item._label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.date ? format(new Date(item.date), "dd MMM yyyy") : format(new Date(item.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs gradient-primary text-primary-foreground"
                  onClick={() => approveItem.mutate(item)}
                  disabled={approveItem.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
              </motion.div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No pending approvals</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;
