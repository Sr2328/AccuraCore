import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

const AlertsPage = () => {
  const { data: lowStockItems = [], isLoading } = useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("*, suppliers(name)").eq("is_active", true).order("current_qty");
      return (data || []).filter((i: any) => Number(i.current_qty) <= Number(i.min_stock_level));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Stock Alerts</h1>
        <p className="text-sm text-muted-foreground">{lowStockItems.length} items need attention</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : lowStockItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">All Good!</h2>
            <p className="text-sm text-muted-foreground mt-1">All items are above minimum stock levels.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lowStockItems.map((item: any) => {
            const isOut = Number(item.current_qty) === 0;
            return (
              <Card key={item.id} className={isOut ? "border-destructive/30" : "border-warning/30"}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isOut ? "bg-destructive/10" : "bg-warning/10"}`}>
                        <AlertTriangle className={`w-4 h-4 ${isOut ? "text-destructive" : "text-warning"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.item_code} • {item.category}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Current: <strong className={isOut ? "text-destructive" : "text-warning"}>{item.current_qty} {item.unit}</strong></span>
                          <span>Min: {item.min_stock_level} {item.unit}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={isOut ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>
                      {isOut ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
