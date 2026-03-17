import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Factory, Phone, MapPin } from "lucide-react";

const IDCardPage = () => {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["id-card-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, departments(name)")
        .eq("id", user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Employee ID Card</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; font-family: system-ui, sans-serif; }
        .card { width: 340px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.15); background: white; }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; text-align: center; color: white; }
        .header h2 { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { font-size: 10px; opacity: 0.7; margin-top: 2px; }
        .avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #e94560, #0f3460); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: white; margin: -40px auto 0; border: 4px solid white; position: relative; z-index: 1; }
        .body { padding: 48px 24px 24px; text-align: center; }
        .name { font-size: 20px; font-weight: 700; color: #1a1a2e; }
        .designation { font-size: 12px; color: #666; margin-top: 4px; }
        .id-badge { display: inline-block; background: #1a1a2e; color: white; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; letter-spacing: 1px; }
        .details { margin-top: 20px; text-align: left; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 12px; }
        .detail-label { color: #888; }
        .detail-value { color: #333; font-weight: 500; }
        .footer { background: #f8f8f8; padding: 12px 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; }
        @media print { body { background: white; } .card { box-shadow: none; } }
      </style></head><body>
      <div class="card">
        <div class="header">
          <h2>ACCURA PRECISION ENGG.</h2>
          <p>Employee Identity Card</p>
        </div>
        <div class="avatar">${profile?.name?.charAt(0) || "?"}</div>
        <div class="body">
          <div class="name">${profile?.name || ""}</div>
          <div class="designation">${profile?.designation || "Employee"}</div>
          <div class="id-badge">${profile?.user_id_custom || ""}</div>
          <div class="details">
            <div class="detail-row"><span class="detail-label">Department</span><span class="detail-value">${(profile as any)?.departments?.name || "—"}</span></div>
            <div class="detail-row"><span class="detail-label">Shift</span><span class="detail-value">${profile?.shift || "General"}</span></div>
            <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${profile?.phone || "—"}</span></div>
            <div class="detail-row"><span class="detail-label">Joining Date</span><span class="detail-value">${profile?.joining_date || "—"}</span></div>
            <div class="detail-row"><span class="detail-label">Emergency</span><span class="detail-value">${profile?.emergency_contact || "—"}</span></div>
          </div>
        </div>
        <div class="footer">This card is the property of Accura Precision Engg. If found, please return to the office.</div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Employee ID Card</h1>
          <p className="text-sm text-muted-foreground">Your official identification</p>
        </div>
        <Button onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="w-4 h-4 mr-2" />Print ID Card
        </Button>
      </div>

      <div className="flex justify-center" ref={printRef}>
        <Card className="w-full max-w-sm overflow-hidden">
          {/* Header */}
          <div className="gradient-primary p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Factory className="w-5 h-5 text-primary-foreground" />
              <h2 className="text-base font-bold text-primary-foreground tracking-wide">ACCURA PRECISION ENGG.</h2>
            </div>
            <p className="text-[10px] text-primary-foreground/60 uppercase tracking-widest">Employee Identity Card</p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-8 relative z-10">
            <div className="w-16 h-16 rounded-full bg-card border-4 border-card gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {profile.name?.charAt(0)}
            </div>
          </div>

          <CardContent className="pt-3 pb-5 text-center">
            <h3 className="text-lg font-bold text-foreground">{profile.name}</h3>
            <p className="text-xs text-muted-foreground">{profile.designation || "Employee"}</p>
            <Badge className="mt-2 tracking-widest text-xs">{profile.user_id_custom}</Badge>

            <div className="mt-5 space-y-2.5 text-left">
              {[
                ["Department", (profile as any)?.departments?.name || "—"],
                ["Shift", profile.shift || "General"],
                ["Phone", profile.phone || "—"],
                ["Joining Date", profile.joining_date || "—"],
                ["Emergency Contact", profile.emergency_contact || "—"],
                ["Blood Group", "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[10px] text-muted-foreground">
              This card is the property of Accura Precision Engg. If found, please return to the office.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IDCardPage;
