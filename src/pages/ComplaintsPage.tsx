import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, MessageSquareWarning, CheckCircle, XCircle } from "lucide-react";

const CATEGORIES = ["Work Environment", "Safety", "Equipment", "Management", "Salary", "Suggestion", "Other"];
const statusColors: Record<string, string> = {
  submitted: "bg-info/10 text-info",
  under_review: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const ComplaintsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "Other", is_anonymous: false });
  const isAdmin = user?.role === "admin" || user?.role === "hr";

  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints"],
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("*, profiles:submitted_by(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const submitComplaint = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("complaints").insert({
        subject: form.subject, description: form.description || null,
        category: form.category, is_anonymous: form.is_anonymous, submitted_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint submitted");
      setCreateOpen(false);
      setForm({ subject: "", description: "", category: "Other", is_anonymous: false });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("complaints").update({ status, resolved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Complaints & Suggestions</h1>
          <p className="text-sm text-muted-foreground">{complaints.length} total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />New Complaint</Button>
      </div>

      <div className="space-y-3">
        {complaints.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <MessageSquareWarning className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.subject}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {c.is_anonymous ? "Anonymous" : c.profiles?.name || "Unknown"} • {c.created_at ? format(new Date(c.created_at), "dd MMM yyyy") : ""}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>}
                    {c.resolution_remarks && <p className="text-xs text-muted-foreground italic mt-1">Resolution: {c.resolution_remarks}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                  <Badge variant="outline" className={statusColors[c.status] || ""}>
                    {c.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                  {isAdmin && c.status === "submitted" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: c.id, status: "under_review" })}>Review</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: c.id, status: "resolved" })}>
                        <CheckCircle className="w-3 h-3 mr-1" />Resolve
                      </Button>
                    </>
                  )}
                  {isAdmin && c.status === "under_review" && (
                    <>
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: c.id, status: "resolved" })}>
                        <CheckCircle className="w-3 h-3 mr-1" />Resolve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: c.id, status: "rejected" })}>
                        <XCircle className="w-3 h-3 mr-1" />Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {complaints.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No complaints or suggestions</p>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Complaint / Suggestion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_anonymous} onCheckedChange={(v) => setForm({ ...form, is_anonymous: !!v })} id="anonymous" />
              <Label htmlFor="anonymous" className="text-sm cursor-pointer">Submit anonymously</Label>
            </div>
            <Button className="w-full" onClick={() => submitComplaint.mutate()} disabled={!form.subject || submitComplaint.isPending}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintsPage;
