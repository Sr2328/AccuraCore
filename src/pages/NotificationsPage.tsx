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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bell, Plus, Megaphone, AlertCircle, Clock, Info } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  announcement: Megaphone, alert: AlertCircle, reminder: Clock, update: Info,
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "announcement", target_type: "all" });
  const isAdmin = user?.role === "admin" || user?.role === "hr";

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: readIds = [] } = useQuery({
    queryKey: ["notification-reads", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("notification_reads").select("notification_id").eq("user_id", user?.id!);
      return data?.map((r: any) => r.notification_id) || [];
    },
    enabled: !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notification_reads").insert({ notification_id: notificationId, user_id: user?.id! });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-reads"] }),
  });

  const createNotification = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").insert({
        title: form.title, body: form.body || null, type: form.type,
        target_type: form.target_type, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification sent");
      setCreateOpen(false);
      setForm({ title: "", body: "", type: "announcement", target_type: "all" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">{notifications.length - readIds.length} unread</p>
        </div>
        {isAdmin && <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Create</Button>}
      </div>

      <div className="space-y-3">
        {notifications.map((n: any) => {
          const isRead = readIds.includes(n.id);
          const Icon = typeIcons[n.type] || Bell;
          return (
            <Card key={n.id} className={isRead ? "opacity-70" : ""} onClick={() => !isRead && markRead.mutate(n.id)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isRead ? "bg-muted" : "gradient-primary"}`}>
                    <Icon className={`w-4 h-4 ${isRead ? "text-muted-foreground" : "text-primary-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${isRead ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isRead && <span className="w-2 h-2 rounded-full bg-primary" />}
                        <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                      </div>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{n.created_at ? format(new Date(n.created_at), "dd MMM yyyy, hh:mm a") : ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {notifications.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No notifications</p>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Notification</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["announcement", "alert", "reminder", "update"].map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target</Label>
                <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={() => createNotification.mutate()} disabled={!form.title || createNotification.isPending}>Send Notification</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage;
