import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, UtensilsCrossed, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function CanteenPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: employees = [] } = useQuery({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, user_id_custom, departments(name)").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: ["canteen-today", today],
    queryFn: async () => {
      const { data } = await supabase.from("canteen_logs").select("*").eq("date", today);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const markLunch = useMutation({
    mutationFn: async (empId: string) => {
      const { error } = await supabase.from("canteen_logs").insert({
        employee_id: empId,
        date: today,
        marked_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canteen-today"] });
      toast.success("Lunch marked");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markedIds = new Set(todayLogs.map((l: any) => l.employee_id));

  const filtered = employees.filter(
    (e: any) => e.name?.toLowerCase().includes(search.toLowerCase()) || e.user_id_custom?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Canteen / Lunch</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, dd MMM yyyy")} — {todayLogs.length} lunches marked</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Total Marked</p><p className="text-3xl font-bold text-foreground">{todayLogs.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Approved</p><p className="text-3xl font-bold text-success">{todayLogs.filter((l: any) => l.employee_approved).length}</p></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UtensilsCrossed className="w-4 h-4" /> Mark Lunch</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted border-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((emp: any) => {
              const isMarked = markedIds.has(emp.id);
              return (
                <div key={emp.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                      {emp.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{(emp as any).departments?.name}</p>
                    </div>
                  </div>
                  {isMarked ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Marked
                    </Badge>
                  ) : (
                    <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" onClick={() => markLunch.mutate(emp.id)}>
                      Mark Lunch
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
