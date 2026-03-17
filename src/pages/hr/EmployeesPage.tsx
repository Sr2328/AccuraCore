import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, User, Phone, Mail, Building2 } from "lucide-react";
import { format } from "date-fns";

const SHIFTS = ["General", "Morning", "Evening", "Night"];

const EmployeesPage = () => {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["hr-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, departments(name)")
        .order("name");
      return data || [];
    },
  });

  const filtered = employees.filter((e: any) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.user_id_custom?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:hidden gap-3">
            {filtered.map((emp: any) => (
              <Card key={emp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedEmployee(emp); setDetailOpen(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                      {emp.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.user_id_custom}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{emp.designation || "—"}</Badge>
                        <Badge variant={emp.is_active ? "default" : "secondary"} className="text-[10px]">
                          {emp.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Designation</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Shift</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp: any) => (
                      <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => { setSelectedEmployee(emp); setDetailOpen(true); }}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                              {emp.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{emp.user_id_custom}</td>
                        <td className="py-3 px-4 text-foreground">{(emp as any).departments?.name || "—"}</td>
                        <td className="py-3 px-4 text-foreground">{emp.designation || "—"}</td>
                        <td className="py-3 px-4 text-foreground">{emp.shift || "General"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={emp.is_active ? "default" : "secondary"}>
                            {emp.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {selectedEmployee.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedEmployee.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.user_id_custom}</p>
                  <p className="text-xs text-muted-foreground">{selectedEmployee.designation || "—"} • {(selectedEmployee as any).departments?.name || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Email", value: selectedEmployee.email },
                  { label: "Phone", value: selectedEmployee.phone },
                  { label: "Shift", value: selectedEmployee.shift },
                  { label: "Joining Date", value: selectedEmployee.joining_date ? format(new Date(selectedEmployee.joining_date), "dd MMM yyyy") : "—" },
                  { label: "Basic Salary", value: selectedEmployee.basic_salary ? `₹${Number(selectedEmployee.basic_salary).toLocaleString()}` : "—" },
                  { label: "PAN", value: selectedEmployee.pan || "—" },
                  { label: "Aadhaar", value: selectedEmployee.aadhaar || "—" },
                  { label: "UAN", value: selectedEmployee.uan || "—" },
                  { label: "Bank A/C", value: selectedEmployee.bank_account || "—" },
                  { label: "IFSC", value: selectedEmployee.bank_ifsc || "—" },
                  { label: "ESI No", value: selectedEmployee.esi_number || "—" },
                  { label: "Emergency", value: selectedEmployee.emergency_contact || "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-medium text-foreground">{f.value || "—"}</p>
                  </div>
                ))}
              </div>
              {selectedEmployee.address && (
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm text-foreground">{selectedEmployee.address}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
