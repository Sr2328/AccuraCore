import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

function calcPayroll(basic: number, canteenDays: number, canteenRate: number) {
  const hra = Math.round(basic * 0.4);
  const da = Math.round(basic * 0.1);
  const conveyance = 1600;
  const medical = 1250;
  const special = Math.round(basic * 0.15);
  const gross = basic + hra + da + conveyance + medical + special;
  const pfEmp = Math.round(basic * 0.12);
  const esiEmp = Math.round(gross * 0.0075);
  const pt = gross > 15000 ? 200 : gross > 10000 ? 150 : 0;
  const canteen = canteenDays * canteenRate;
  const totalDeductions = pfEmp + esiEmp + pt + canteen;
  const net = gross - totalDeductions;
  return { basic, hra, da, conveyance, medical, special, gross, pfEmp, esiEmp, pt, canteen, totalDeductions, net };
}

const PayslipsPage = () => {
  const { user } = useAuth();
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: profile } = useQuery({
    queryKey: ["emp-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user?.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: canteenRate = 50 } = useQuery({
    queryKey: ["canteen-rate"],
    queryFn: async () => {
      const { data } = await supabase.from("canteen_settings").select("lunch_rate_per_day").order("effective_from", { ascending: false }).limit(1).maybeSingle();
      return data?.lunch_rate_per_day || 50;
    },
  });

  const { data: canteenDays = 0 } = useQuery({
    queryKey: ["emp-canteen-days", user?.id, currentMonth],
    queryFn: async () => {
      const { count } = await supabase.from("canteen_logs").select("*", { count: "exact", head: true })
        .eq("employee_id", user?.id).eq("employee_approved", true)
        .gte("date", `${currentMonth}-01`).lte("date", `${currentMonth}-31`);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const basicSalary = Number(profile?.basic_salary) || 0;
  const p = calcPayroll(basicSalary, canteenDays, Number(canteenRate));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payslip</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM yyyy")}</p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">{user?.name?.charAt(0)}</div>
            <div>
              <p className="font-bold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.userId} • {user?.department}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2 text-sm">Earnings</h4>
              <div className="space-y-1.5 text-sm">
                {[["Basic", p.basic], ["HRA", p.hra], ["DA", p.da], ["Conveyance", p.conveyance], ["Medical", p.medical], ["Special Allow.", p.special]].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="text-foreground">₹{Number(v).toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1.5"><span>Gross</span><span>₹{p.gross.toLocaleString()}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2 text-sm">Deductions</h4>
              <div className="space-y-1.5 text-sm">
                {[["PF (12%)", p.pfEmp], ["ESI (0.75%)", p.esiEmp], ["Prof. Tax", p.pt], [`Canteen (${canteenDays} days)`, p.canteen]].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="text-destructive">-₹{Number(v).toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1.5"><span>Total Ded.</span><span className="text-destructive">-₹{p.totalDeductions.toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-lg font-bold p-4 rounded-lg bg-muted mt-4">
            <span>Net Pay</span>
            <span className="text-primary">₹{p.net.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipsPage;
