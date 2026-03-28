import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Send, Mail, MailOpen, Inbox, X,
  ChevronDown, Check, User, Shield, Crown,
  Users, Building2, Search, Loader2, RefreshCw,
} from "lucide-react";

/* ─── Role config ────────────────────────────────────────── */
const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  admin: { label: "Admin", icon: Crown, color: "#ca8a04", bg: "#fefce8", border: "#fef08a" },
  hr: { label: "HR", icon: Users, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  security: { label: "Security", icon: Shield, color: "#0369a1", bg: "#eff6ff", border: "#bfdbfe" },
  toolroom: { label: "Tool Room Auth", icon: Building2, color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  moulding: { label: "Moulding Auth", icon: Building2, color: "#065f46", bg: "#f0fdf4", border: "#a7f3d0" },
  procurement: { label: "Procurement", icon: Building2, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  employee: { label: "Employee", icon: User, color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
};

/* Allowed recipient roles from Store (you can adjust per sender role) */
const ALLOWED_RECIPIENT_ROLES = ["admin", "hr", "security", "toolroom", "moulding", "procurement"];

/* ─── style tokens ───────────────────────────────────────── */
const lbl: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "#6b7280", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 5,
};
const inp: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 12px",
  border: "1.5px solid #e5e7eb", borderRadius: 8,
  fontSize: 14, color: "#111827", background: "#fafafa",
  outline: "none", boxSizing: "border-box",
};

/* ─── Role badge ─────────────────────────────────────────── */
const RoleBadge = ({ role }: { role: string }) => {
  const cfg = ROLE_CONFIG[role?.toLowerCase()] || ROLE_CONFIG.employee;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap" as const,
    }}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
};

/* ─── Recipient selector dropdown ───────────────────────── */
const RecipientSelector = ({
  profiles, value, onChange,
}: {
  profiles: any[]; value: string; onChange: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const allowed = profiles.filter((p: any) =>
    ALLOWED_RECIPIENT_ROLES.includes((p.role || "employee").toLowerCase())
  );

  const filtered = allowed.filter((p: any) => {
    const q = query.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.user_id_custom?.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q);
  });

  /* group by role */
  const grouped: Record<string, any[]> = {};
  filtered.forEach((p: any) => {
    const r = (p.role || "employee").toLowerCase();
    if (!grouped[r]) grouped[r] = [];
    grouped[r].push(p);
  });

  const selected = profiles.find((p: any) => p.id === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => { setOpen(!open); }}
        style={{
          display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 12px",
          border: `1.5px solid ${open ? "#EAB308" : "#e5e7eb"}`, borderRadius: 8,
          background: "#fafafa", cursor: "pointer", transition: "border-color 0.15s",
        }}
      >
        {selected ? (
          <>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: ROLE_CONFIG[(selected.role || "employee").toLowerCase()]?.bg || "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <User size={12} color={ROLE_CONFIG[(selected.role || "employee").toLowerCase()]?.color || "#374151"} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{selected.name}</span>
              <RoleBadge role={selected.role || "employee"} />
            </div>
            <X size={14} color="#9ca3af" onClick={e => { e.stopPropagation(); onChange(""); }} />
          </>
        ) : (
          <>
            <User size={14} color="#9ca3af" />
            <span style={{ flex: 1, fontSize: 14, color: "#9ca3af" }}>Select recipient…</span>
            <ChevronDown size={14} color="#9ca3af" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.12)", maxHeight: 320, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} color="#9ca3af" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or role…"
                style={{ ...inp, height: 34, paddingLeft: 30, fontSize: 13 }}
                autoFocus
              />
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {Object.keys(grouped).length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No recipients found</div>
            ) : (
              Object.entries(grouped).map(([role, people]) => {
                const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
                const Icon = cfg.icon;
                return (
                  <div key={role}>
                    {/* role group header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px 4px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                      <Icon size={11} color={cfg.color} strokeWidth={2.5} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{cfg.label}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 2 }}>({people.length})</span>
                    </div>
                    {people.map((p: any) => (
                      <div key={p.id}
                        onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                          cursor: "pointer", borderBottom: "1px solid #f9fafb",
                          background: value === p.id ? "#fffbeb" : "transparent",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => { if (value !== p.id) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = value === p.id ? "#fffbeb" : "transparent"; }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color }}>
                            {p.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, fontFamily: "monospace" }}>{p.user_id_custom}</p>
                        </div>
                        {value === p.id && <Check size={14} color="#EAB308" strokeWidth={2.5} />}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Message thread view ────────────────────────────────── */
const MessageThread = ({
  message, onClose, currentUserId, profiles,
}: {
  message: any; onClose: () => void; currentUserId: string; profiles: any[];
}) => {
  const senderProfile = (() => {
    const p = message.from_profile ?? null;
    if (p) return Array.isArray(p) ? p[0] : p;
    return profiles.find((x: any) => x.id === message.from_user_id) || {};
  })();
  const isOwn = message.from_user_id === currentUserId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Meta */}
      <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>{message.subject}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>From</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{senderProfile?.name || "Unknown"}</span>
                {senderProfile?.role && <RoleBadge role={senderProfile.role} />}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>
            {message.created_at ? format(new Date(message.created_at), "dd MMM yyyy, hh:mm a") : ""}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "16px", minHeight: 80 }}>
        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
          {message.body || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No message body</span>}
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const MessagesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewMsg, setViewMsg] = useState<any>(null);
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  /* ── queries ── */
  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-msg"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, user_id_custom, role")
        .order("name");
      if (error) console.error("profiles error:", error);
      return data || [];
    },
  });

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["messages", tab, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("messages")
        .select(`
          id, subject, body, is_read, created_at,
          from_user_id, to_user_id,
          from_profile:profiles!messages_from_user_id_fkey(id, name, user_id_custom, role),
          to_profile:profiles!messages_to_user_id_fkey(id, name, user_id_custom, role)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (tab === "inbox") query = (query as any).eq("to_user_id", user?.id!);
      else query = (query as any).eq("from_user_id", user?.id!);
      const { data, error } = await query;
      if (error) {
        console.error("messages error:", error);
        // fallback: try without join if FK name wrong
        let q2 = supabase
          .from("messages")
          .select("id, subject, body, is_read, created_at, from_user_id, to_user_id")
          .order("created_at", { ascending: false })
          .limit(50);
        if (tab === "inbox") q2 = (q2 as any).eq("to_user_id", user?.id!);
        else q2 = (q2 as any).eq("from_user_id", user?.id!);
        const { data: d2 } = await q2;
        return d2 || [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const unreadCount = (messages as any[]).filter(m => !m.is_read && tab === "inbox").length;

  /* ── mutations ── */
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!toUserId) throw new Error("Please select a recipient");
      if (!subject.trim()) throw new Error("Subject is required");
      const { error } = await supabase.from("messages").insert({
        from_user_id: user?.id!, to_user_id: toUserId,
        subject: subject.trim(), body: body.trim() || null,
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message sent successfully");
      setComposeOpen(false);
      setToUserId(""); setSubject(""); setBody("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });

  const openMessage = (m: any) => {
    setViewMsg(m);
    if (tab === "inbox" && !m.is_read) markRead.mutate(m.id);
  };

  /* Safe profile accessors — handle both joined and fallback (no-join) responses */
  const getSender = (m: any): any => {
    const p = m.from_profile ?? m["from_profile"] ?? null;
    if (p) return Array.isArray(p) ? p[0] : p;
    // fallback: look up from profiles list
    return (profiles as any[]).find(x => x.id === m.from_user_id) || {};
  };
  const getRecipient = (m: any): any => {
    const p = m.to_profile ?? m["to_profile"] ?? null;
    if (p) return Array.isArray(p) ? p[0] : p;
    return (profiles as any[]).find(x => x.id === m.to_user_id) || {};
  };

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 40, background: "#f3f4f6", margin: "-20px", padding: "20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "#111827", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mail size={20} color="#EAB308" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>Messages</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0", fontWeight: 500 }}>Inter-department communication</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => refetch()}
            style={{ width: 36, height: 36, border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setComposeOpen(true)}
            style={{ height: 36, padding: "0 16px", background: "#EAB308", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} strokeWidth={2.5} /> Compose
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, background: "#e5e7eb", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 16 }}>
        {(["inbox", "sent"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s",
              background: tab === t ? "#111827" : "transparent",
              color: tab === t ? "#fff" : "#6b7280",
            }}>
            {t === "inbox" ? <Inbox size={14} /> : <Send size={14} />}
            {t === "inbox" ? "Inbox" : "Sent"}
            {t === "inbox" && unreadCount > 0 && (
              <span style={{ background: "#EAB308", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 20 }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Message list ── */}
      <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {/* list header */}
        <div style={{ background: "#111827", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {tab === "inbox" ? <Inbox size={15} color="#EAB308" /> : <Send size={15} color="#EAB308" />}
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {tab === "inbox" ? "Inbox" : "Sent Messages"}
            </p>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            {(messages as any[]).length} message{(messages as any[]).length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}>
            <Loader2 size={28} color="#EAB308" style={{ animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (messages as any[]).length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            {tab === "inbox"
              ? <Inbox size={36} color="#e5e7eb" style={{ margin: "0 auto 12px" }} strokeWidth={1.5} />
              : <Send size={36} color="#e5e7eb" style={{ margin: "0 auto 12px" }} strokeWidth={1.5} />
            }
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>
              {tab === "inbox" ? "No messages yet" : "No sent messages"}
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              {tab === "inbox" ? "Messages sent to you will appear here" : "Messages you send will appear here"}
            </p>
            {tab === "inbox" && (
              <button onClick={() => setComposeOpen(true)}
                style={{ marginTop: 16, padding: "8px 20px", background: "#EAB308", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Send First Message
              </button>
            )}
          </div>
        ) : (
          <div>
            {(messages as any[]).map((m: any, idx: number) => {
              const isUnread = !m.is_read && tab === "inbox";
              const sender = getSender(m);
              const recipient = getRecipient(m);
              const person = tab === "inbox" ? sender : recipient;
              const personRole = person?.role || "employee";
              const cfg = ROLE_CONFIG[personRole.toLowerCase()] || ROLE_CONFIG.employee;

              return (
                <div key={m.id}
                  onClick={() => openMessage(m)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                    borderBottom: idx < (messages as any[]).length - 1 ? "1px solid #f3f4f6" : "none",
                    background: isUnread ? "#fffbeb" : idx % 2 === 0 ? "#fff" : "#fafafa",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isUnread ? "#fef3c7" : "#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background = isUnread ? "#fffbeb" : idx % 2 === 0 ? "#fff" : "#fafafa")}
                >
                  {/* avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, border: `1.5px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>
                      {(person?.name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <p style={{ fontSize: 14, fontWeight: isUnread ? 800 : 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.subject}
                      </p>
                      {isUnread && (
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EAB308", flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                        {tab === "inbox" ? "From:" : "To:"} <strong style={{ color: "#374151" }}>{person?.name || "Unknown"}</strong>
                      </span>
                      {person?.role && <RoleBadge role={person.role} />}
                    </div>
                    {m.body && (
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.body}
                      </p>
                    )}
                  </div>

                  {/* right: date + icon */}
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>
                      {m.created_at ? format(new Date(m.created_at), "dd MMM") : ""}
                    </p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
                      {m.created_at ? format(new Date(m.created_at), "hh:mm a") : ""}
                    </p>
                    {isUnread
                      ? <Mail size={14} color="#EAB308" style={{ marginTop: 4 }} />
                      : <MailOpen size={14} color="#d1d5db" style={{ marginTop: 4 }} />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Compose Dialog ── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent style={{ maxWidth: 500, borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 0, overflow: "hidden" }}>
          {/* dark header */}
          <div style={{ background: "#111827", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Mail size={16} color="#EAB308" />
              <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0 }}>New Message</p>
            </div>
            <button onClick={() => setComposeOpen(false)}
              style={{ width: 28, height: 28, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}>
              <X size={13} />
            </button>
          </div>

          {/* form */}
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={lbl}>To — Select Recipient *</label>
              <RecipientSelector profiles={profiles as any[]} value={toUserId} onChange={setToUserId} />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 5 }}>
                Available: Admin · HR · Security · Tool Room · Moulding · Procurement
              </p>
            </div>

            <div>
              <label style={lbl}>Subject *</label>
              <input
                value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Message subject…" style={inp}
              />
            </div>

            <div>
              <label style={lbl}>Message</label>
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Type your message here…"
                rows={5}
                style={{ ...inp, height: "auto", padding: "10px 12px", resize: "vertical" as const, lineHeight: 1.6 }}
              />
            </div>

            <button
              onClick={() => sendMessage.mutate()}
              disabled={!toUserId || !subject.trim() || sendMessage.isPending}
              style={{
                width: "100%", height: 42, border: "none", borderRadius: 9,
                background: toUserId && subject.trim() ? "#EAB308" : "#e5e7eb",
                fontSize: 14, fontWeight: 700,
                color: toUserId && subject.trim() ? "#000" : "#9ca3af",
                cursor: toUserId && subject.trim() && !sendMessage.isPending ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
              }}
            >
              {sendMessage.isPending
                ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Sending…</>
                : <><Send size={15} strokeWidth={2.5} /> Send Message</>
              }
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Message thread dialog ── */}
      <Dialog open={!!viewMsg} onOpenChange={() => setViewMsg(null)}>
        <DialogContent style={{ maxWidth: 520, borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#111827", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MailOpen size={16} color="#EAB308" />
              <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {viewMsg?.subject}
              </p>
            </div>
            <button onClick={() => setViewMsg(null)}
              style={{ width: 28, height: 28, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ padding: 20 }}>
            {viewMsg && (
              <MessageThread
                message={viewMsg}
                onClose={() => setViewMsg(null)}
                currentUserId={user?.id || ""}
                profiles={profiles as any[]}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesPage;