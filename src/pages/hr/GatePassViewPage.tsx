import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  created: "bg-muted text-foreground",
  approved: "bg-info/10 text-info",
  exited: "bg-warning/10 text-warning",
  returned: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

const HRGatePassViewPage = () => {
  const { data: passes = [] } = useQuery({
    queryKey: ["hr-gatepasses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gate_passes")
        .select("*, profiles:employee_id(name, user_id_custom, departments(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gate Pass Records</h1>
        <p className="text-sm text-muted-foreground">{passes.length} records</p>
      </div>

      <div className="space-y-3">
        {passes.map((gp: any) => (
          <Card key={gp.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{gp.profiles?.name}</p>
                  <p className="text-xs text-muted-foreground">{gp.profiles?.departments?.name} • {gp.pass_type?.toUpperCase()}</p>
                  {gp.reason && <p className="text-xs text-muted-foreground mt-1">{gp.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {gp.out_time && <span className="text-xs text-muted-foreground">Out: {format(new Date(gp.out_time), "hh:mm a")}</span>}
                  {gp.return_time && <span className="text-xs text-muted-foreground">In: {format(new Date(gp.return_time), "hh:mm a")}</span>}
                  <Badge variant="outline" className={statusColors[gp.status] || ""}>{gp.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {passes.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No gate pass records</p>}
      </div>
    </div>
  );
};

export default HRGatePassViewPage;
