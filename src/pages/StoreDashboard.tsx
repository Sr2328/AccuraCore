import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardCard from "@/components/DashboardCard";
import { Package, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const getStatus = (qty: number, min: number) => {
  if (qty === 0) return { label: "Out of Stock", className: "bg-foreground/10 text-foreground" };
  if (qty < min) return { label: "Critical", className: "bg-destructive/10 text-destructive" };
  if (qty === min) return { label: "Low", className: "bg-warning/10 text-warning" };
  return { label: "In Stock", className: "bg-success/10 text-success" };
};

const StoreDashboard = () => {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: items = [] } = useQuery({
    queryKey: ["store-items-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("store_items").select("*").eq("is_active", true).order("current_qty").limit(20);
      return data || [];
    },
  });

  const totalItems = items.length;
  const lowStock = items.filter((i: any) => Number(i.current_qty) <= Number(i.min_stock_level)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Store Dashboard</h1>
        <p className="text-sm text-muted-foreground">Inventory management & stock control</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DashboardCard title="Total Items" value={totalItems} subtitle="In inventory" icon={Package} variant="primary" />
        <DashboardCard title="Low Stock" value={lowStock} subtitle="Below minimum" icon={AlertTriangle} variant={lowStock > 0 ? "warning" : "success"} />
        <DashboardCard title="Stock IN" value="—" subtitle="Today" icon={TrendingUp} variant="success" />
        <DashboardCard title="Stock OUT" value="—" subtitle="Today" icon={TrendingDown} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Inventory Status</CardTitle></CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:hidden gap-2">
            {items.slice(0, 10).map((item: any) => {
              const st = getStatus(Number(item.current_qty), Number(item.min_stock_level));
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.item_code} • {item.current_qty} {item.unit}</p>
                  </div>
                  <Badge variant="outline" className={st.className}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Code</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Item</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Min</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((item: any) => {
                  const st = getStatus(Number(item.current_qty), Number(item.min_stock_level));
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2 font-medium text-foreground">{item.item_code}</td>
                      <td className="py-3 px-2 text-foreground">{item.name}</td>
                      <td className="py-3 px-2 text-center text-foreground">{item.current_qty} {item.unit}</td>
                      <td className="py-3 px-2 text-center text-muted-foreground">{item.min_stock_level} {item.unit}</td>
                      <td className="py-3 px-2 text-center"><Badge variant="outline" className={st.className}>{st.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreDashboard;
