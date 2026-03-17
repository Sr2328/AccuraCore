import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Package, Truck } from "lucide-react";
import { format } from "date-fns";

export default function MaterialPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: jobWorks = [] } = useQuery({
    queryKey: ["security-material"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_work")
        .select("*, suppliers(name)")
        .in("current_step", [3, 4, 5, 6])
        .order("updated_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 15000,
  });

  const updateJobWork = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("job_work").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-material"] });
      toast.success("Material status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = jobWorks.filter(
    (j: any) =>
      j.doc_no?.toLowerCase().includes(search.toLowerCase()) ||
      j.material_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stepLabel: Record<number, string> = {
    3: "Handed to Security",
    4: "Dispatched",
    5: "In Process",
    6: "Material Returned",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Material Handling</h1>
        <p className="text-sm text-muted-foreground">Track challan dispatch and material returns</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Active Materials</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by challan, material, or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted border-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Challan</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Material</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Step</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j: any) => (
                  <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2 font-mono text-xs text-foreground">{j.doc_no || "—"}</td>
                    <td className="py-3 px-2 text-foreground">{j.material_name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{j.suppliers?.name || "—"}</td>
                    <td className="py-3 px-2 text-center text-foreground">{j.quantity} {j.unit}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className="text-xs">{stepLabel[j.current_step] || `Step ${j.current_step}`}</Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {j.current_step === 3 && (
                        <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" onClick={() =>
                          updateJobWork.mutate({ id: j.id, updates: { current_step: 4, status: "material_dispatched", dispatch_date: new Date().toISOString() } })
                        }>
                          <Truck className="w-3 h-3 mr-1" /> Mark Collected
                        </Button>
                      )}
                      {j.current_step === 5 && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() =>
                          updateJobWork.mutate({ id: j.id, updates: { current_step: 6, status: "material_returned", return_date: new Date().toISOString(), received_qty: j.quantity, balance_qty: 0 } })
                        }>
                          Mark Returned
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No pending materials</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
