import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Calculator, Download } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

function calcPayroll(basic: number, canteenDays: number, canteenRate: number) {
  const hra = Math.round(basic * 0.4);
  const da = Math.round(basic * 0.1);
  const conveyance = 1600;
  const medical = 1250;
  const special = Math.round(basic * 0.15);
  const gross = basic + hra + da + conveyance + medical + special;

  const pfEmp = Math.round(basic * 0.12);
  const pfEmployer = Math.round(basic * 0.12);
  const esiEmp = Math.round(gross * 0.0075);
  const esiEmployer = Math.round(gross * 0.0325);
  const pt = gross > 15000 ? 200 : gross > 10000 ? 150 : 0; // Haryana PT
  const canteen = canteenDays * canteenRate;
  const totalDeductions = pfEmp + esiEmp + pt + canteen;
  const net = gross - totalDeductions;

  return { basic, hra, da, conveyance, medical, special, gross, pfEmp, pfEmployer, esiEmp, esiEmployer, pt, canteen, totalDeductions, net };
}

const PayrollPage = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: employees = [] } = useQuery({
    queryKey: ["payroll-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, departments(name)").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: canteenRate = 50 } = useQuery({
    queryKey: ["canteen-rate"],
    queryFn: async () => {
      const { data } = await supabase.from("canteen_settings").select("lunch_rate_per_day").order("effective_from", { ascending: false }).limit(1).maybeSingle();
      return data?.lunch_rate_per_day || 50;
    },
  });

  const { data: canteenCounts = {} } = useQuery({
    queryKey: ["canteen-counts", currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from("canteen_logs").select("employee_id").eq("employee_approved", true).gte("date", `${currentMonth}-01`).lte("date", `${currentMonth}-31`);
      const counts: Record<string, number> = {};
      data?.forEach((c: any) => { counts[c.employee_id] = (counts[c.employee_id] || 0) + 1; });
      return counts;
    },
  });

  const filtered = employees.filter((e: any) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) || e.user_id_custom?.toLowerCase().includes(search.toLowerCase())
  );

  const getPayroll = (emp: any) => {
    const basicSalary = Number(emp.basic_salary) || 0;
    const days = (canteenCounts as Record<string, number>)[emp.id] || 0;
    return calcPayroll(basicSalary, days, Number(canteenRate));
  };

  const handleExportCSV = () => {
    const headers = ["Employee", "ID", "Basic", "HRA", "DA", "Gross", "PF", "ESI", "PT", "Canteen", "Net Pay"];
    const rows = filtered.map((emp: any) => {
      const p = getPayroll(emp);
      return [emp.name, emp.user_id_custom, String(p.basic), String(p.hra), String(p.da), String(p.gross), String(p.pfEmp), String(p.esiEmp), String(p.pt), String(p.canteen), String(p.net)];
    });
    exportToCSV(`payroll-${currentMonth}`, headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Employee", "ID", "Basic", "Gross", "PF", "ESI", "Canteen", "Net Pay"];
    const rows = filtered.map((emp: any) => {
      const p = getPayroll(emp);
      return [emp.name, emp.user_id_custom, `₹${p.basic}`, `₹${p.gross}`, `₹${p.pfEmp}`, `₹${p.esiEmp}`, `₹${p.canteen}`, `₹${p.net}`];
    });
    exportToPDF(`payroll-${currentMonth}`, `Payroll Report — ${format(new Date(), "MMMM yyyy")}`, headers, rows, "landscape");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM yyyy")} — Indian Payroll Calculation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 sm:hidden gap-3">
        {filtered.map((emp: any) => {
          const p = getPayroll(emp);
          return (
            <Card key={emp.id} className="cursor-pointer" onClick={() => { setSelected({ emp, payroll: p }); setDetailOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.user_id_custom}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{p.net.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Net Pay</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">Gross: ₹{p.gross.toLocaleString()}</Badge>
                  <Badge variant="outline" className="text-[10px]">Ded: ₹{p.totalDeductions.toLocaleString()}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Basic</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Gross</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">PF</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">ESI</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Canteen</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp: any) => {
                  const p = getPayroll(emp);
                  return (
                    <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => { setSelected({ emp, payroll: p }); setDetailOpen(true); }}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.user_id_custom}</p>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">₹{p.basic.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">₹{p.gross.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">₹{p.pfEmp.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">₹{p.esiEmp.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">₹{p.canteen.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">₹{p.net.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calculator className="w-4 h-4" /> Salary Breakdown</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{selected.emp.name?.charAt(0)}</div>
                <div>
                  <p className="font-semibold text-foreground">{selected.emp.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.emp.user_id_custom} • {format(new Date(), "MMMM yyyy")}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Earnings</h4>
                <div className="space-y-1">
                  {[
                    ["Basic", selected.payroll.basic], ["HRA", selected.payroll.hra], ["DA", selected.payroll.da],
                    ["Conveyance", selected.payroll.conveyance], ["Medical", selected.payroll.medical], ["Special Allow.", selected.payroll.special],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="text-foreground">₹{Number(v).toLocaleString()}</span></div>
                  ))}
                  <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>Gross Salary</span><span>₹{selected.payroll.gross.toLocaleString()}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Deductions</h4>
                <div className="space-y-1">
                  {[
                    ["PF (Employee 12%)", selected.payroll.pfEmp],
                    ["ESI (Employee 0.75%)", selected.payroll.esiEmp],
                    ["Professional Tax", selected.payroll.pt],
                    ["Canteen", selected.payroll.canteen],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="text-destructive">-₹{Number(v).toLocaleString()}</span></div>
                  ))}
                  <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>Total Deductions</span><span className="text-destructive">-₹{selected.payroll.totalDeductions.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold p-3 rounded-lg bg-muted">
                <span>Net Pay</span>
                <span className="text-primary">₹{selected.payroll.net.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Employer PF: ₹{selected.payroll.pfEmployer.toLocaleString()} | Employer ESI: ₹{selected.payroll.esiEmployer.toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollPage;
