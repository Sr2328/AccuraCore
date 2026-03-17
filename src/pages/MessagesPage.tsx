import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, MessageSquare, Send, Mail, MailOpen } from "lucide-react";

const MessagesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [form, setForm] = useState({ to_email: "", subject: "", body: "" });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-msg"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, email, user_id_custom").order("name");
      return data || [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", tab, user?.id],
    queryFn: async () => {
      let query = supabase.from("messages").select("*, profiles:from_user_id(name, user_id_custom)").order("created_at", { ascending: false }).limit(50);
      if (tab === "inbox") {
        query = query.eq("to_user_id", user?.id!);
      } else {
        query = query.eq("from_user_id", user?.id!);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const recipient = profiles.find((p: any) => p.email === form.to_email || p.user_id_custom === form.to_email);
      if (!recipient) throw new Error("Recipient not found");
      const { error } = await supabase.from("messages").insert({
        from_user_id: user?.id!, to_user_id: recipient.id,
        subject: form.subject, body: form.body || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message sent");
      setComposeOpen(false);
      setForm({ to_email: "", subject: "", body: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("messages").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Inter-department messaging</p>
        </div>
        <Button onClick={() => setComposeOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Compose</Button>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "inbox" ? "default" : "outline"} size="sm" onClick={() => setTab("inbox")}>Inbox</Button>
        <Button variant={tab === "sent" ? "default" : "outline"} size="sm" onClick={() => setTab("sent")}>Sent</Button>
      </div>

      <div className="space-y-2">
        {messages.map((m: any) => (
          <Card key={m.id} className={!m.is_read && tab === "inbox" ? "border-primary/30" : ""} onClick={() => tab === "inbox" && !m.is_read && markRead.mutate(m.id)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!m.is_read && tab === "inbox" ? "gradient-primary" : "bg-muted"}`}>
                  {!m.is_read && tab === "inbox" ? <Mail className="w-4 h-4 text-primary-foreground" /> : <MailOpen className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {tab === "inbox" ? `From: ${m.profiles?.name || "Unknown"}` : `To: ${m.to_user_id?.substring(0, 8)}...`}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{m.created_at ? format(new Date(m.created_at), "dd MMM, hh:mm a") : ""}</span>
                  </div>
                  {m.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.body}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No messages</p>}
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Compose Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>To (Employee ID or Email)</Label>
              <Input value={form.to_email} onChange={(e) => setForm({ ...form, to_email: e.target.value })} placeholder="e.g. AccuraRamesh001 or email" />
            </div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} /></div>
            <Button className="w-full" onClick={() => sendMessage.mutate()} disabled={!form.to_email || !form.subject || sendMessage.isPending}>
              <Send className="w-4 h-4 mr-2" />Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesPage;
