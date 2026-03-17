import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ClipboardList, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [relatedType, setRelatedType] = useState("general");

  const { data: tasks = [] } = useQuery({
    queryKey: ["procurement-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("procurement_tasks")
        .select("*, profiles:assigned_to(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["task-notes", selectedTask?.id],
    queryFn: async () => {
      if (!selectedTask) return [];
      const { data } = await supabase
        .from("task_notes")
        .select("*, profiles:author_id(name)")
        .eq("task_id", selectedTask.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedTask,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("procurement_tasks").insert({
        title, description: description || null,
        priority, due_date: dueDate || null,
        related_type: relatedType,
        created_by: user?.id,
        assigned_to: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-tasks"] });
      toast.success("Task created");
      setShowCreate(false);
      setTitle(""); setDescription(""); setDueDate("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("procurement_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-tasks"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("task_notes").insert({
        task_id: selectedTask.id,
        note: noteText,
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notes"] });
      toast.success("Note added");
      setNoteText("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const priorityColor: Record<string, string> = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-success/10 text-success border-success/20",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    in_progress: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
          <p className="text-sm text-muted-foreground">Procurement daily tasks</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Related To</Label>
                  <Select value={relatedType} onValueChange={setRelatedType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job_work">Job Work</SelectItem>
                      <SelectItem value="rm_buying">RM Buying</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              </div>
              <Button onClick={() => createTask.mutate()} disabled={!title || createTask.isPending} className="w-full gradient-primary text-primary-foreground">
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {tasks.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">{t.title}</p>
                    <Badge variant="outline" className={`text-[10px] ${priorityColor[t.priority]}`}>{t.priority}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.related_type}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Due: {t.due_date ? format(new Date(t.due_date), "dd MMM") : "—"}</span>
                    <span className="text-xs text-muted-foreground">Assigned: {(t as any).profiles?.name || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                    <SelectTrigger className={`h-7 text-xs w-28 ${statusColor[t.status]}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedTask(t)}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">No tasks yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Notes — {selectedTask?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} className="flex-1" />
              <Button onClick={() => addNote.mutate()} disabled={!noteText || addNote.isPending} className="gradient-primary text-primary-foreground self-end">
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notes.map((n: any) => (
                <div key={n.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-foreground">{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(n as any).profiles?.name} • {format(new Date(n.created_at), "dd MMM, hh:mm a")}
                  </p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No notes yet</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
