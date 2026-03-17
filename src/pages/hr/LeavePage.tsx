import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, Search, Calendar } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const LeavePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["hr-leaves"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, profiles:employee_id(name, user_id_custom, departments(name))")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateLeave = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: string; remarks?: string }) => {
      const { error } = await supabase.from("leave_requests").update({
        status, approved_by: user?.id, remarks: remarks || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leaves"] });
      toast.success("Leave request updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = leaves.filter((l: any) => {
    const profile = l.profiles;
    return profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
      profile?.user_id_custom?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Leave Management</h1>
        <p className="text-sm text-muted-foreground">Review and manage leave requests</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((leave: any) => {
            const profile = leave.profiles;
            return (
              <Card key={leave.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                        {profile?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{profile?.name}</p>
                        <p className="text-xs text-muted-foreground">{profile?.user_id_custom} • {profile?.departments?.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px]">{leave.leave_type}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(leave.from_date), "dd MMM")} – {format(new Date(leave.to_date), "dd MMM yyyy")}
                          </span>
                        </div>
                        {leave.reason && <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-12 sm:ml-0">
                      <Badge variant="outline" className={statusColors[leave.status] || ""}>
                        {leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1)}
                      </Badge>
                      {leave.status === "pending" && (
                        <>
                          <Button size="sm" className="h-7 text-xs" onClick={() => updateLeave.mutate({ id: leave.id, status: "approved" })}>
                            <CheckCircle className="w-3 h-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateLeave.mutate({ id: leave.id, status: "rejected" })}>
                            <XCircle className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No leave requests found</p>}
        </div>
      )}
    </div>
  );
};

export default LeavePage;
