import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Calendar } from "lucide-react";

const LEAVE_TYPES = ["CL", "SL", "EL", "ML"];
const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const EmployeeLeavePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ leave_type: "CL", from_date: "", to_date: "", reason: "" });

  const { data: leaves = [] } = useQuery({
    queryKey: ["emp-leaves", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*").eq("employee_id", user?.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const applyLeave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: user?.id, leave_type: form.leave_type,
        from_date: form.from_date, to_date: form.to_date, reason: form.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp-leaves"] });
      toast.success("Leave applied");
      setApplyOpen(false);
      setForm({ leave_type: "CL", from_date: "", to_date: "", reason: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Leave Requests</h1>
          <p className="text-sm text-muted-foreground">Apply for and track your leaves</p>
        </div>
        <Button onClick={() => setApplyOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Apply Leave</Button>
      </div>

      <div className="space-y-3">
        {leaves.map((l: any) => (
          <Card key={l.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{l.leave_type}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(l.from_date), "dd MMM")} – {format(new Date(l.to_date), "dd MMM yyyy")}
                    </span>
                  </div>
                  {l.reason && <p className="text-xs text-muted-foreground mt-1">{l.reason}</p>}
                  {l.remarks && <p className="text-xs text-muted-foreground italic mt-1">Remarks: {l.remarks}</p>}
                </div>
                <Badge variant="outline" className={statusColors[l.status] || ""}>
                  {l.status?.charAt(0).toUpperCase() + l.status?.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {leaves.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No leave requests</p>}
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From</Label><Input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} /></div>
              <div><Label>To</Label><Input type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} /></div>
            </div>
            <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} /></div>
            <Button className="w-full" onClick={() => applyLeave.mutate()} disabled={!form.from_date || !form.to_date || applyLeave.isPending}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLeavePage;
