import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, X, ChevronRight, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, Play, Clock, BookOpen,
  Lightbulb, Megaphone, HelpCircle, Ticket,
  Plus, Send, AlertTriangle, CheckCircle2, Loader2,
  ArrowLeft, ExternalLink, Rocket, UserCheck, Banknote,
  ShoppingCart, Package, User, Settings, Wrench,
  Star, MessageSquare, Info, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";
const inputCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors";
const labelCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

/* ── Category icon map ── */
const CAT_ICONS: Record<string, React.ElementType> = {
  Rocket: Rocket, UserCheck, Banknote, ShoppingCart,
  Package, User, Settings, Wrench,
  HelpCircle, BookOpen, Star, MessageSquare,
};

const CAT_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  yellow: { bg: "bg-[#EAB308]/10", text: "text-[#EAB308]", border: "border-[#EAB308]/20", activeBg: "bg-[#EAB308]" },
  blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-100 dark:border-blue-900/40", activeBg: "bg-blue-500" },
  violet: { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-900/40", activeBg: "bg-violet-500" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-900/40", activeBg: "bg-orange-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/40", activeBg: "bg-emerald-500" },
  red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", border: "border-red-100 dark:border-red-900/40", activeBg: "bg-red-500" },
  neutral: { bg: "bg-neutral-50 dark:bg-neutral-800", text: "text-neutral-600 dark:text-neutral-400", border: "border-neutral-200 dark:border-neutral-700", activeBg: "bg-neutral-500" },
};

/* Article type config */
const ARTICLE_TYPE: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
  faq: { icon: HelpCircle, label: "FAQ", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" },
  guide: { icon: BookOpen, label: "Guide", cls: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40" },
  announcement: { icon: Megaphone, label: "Announcement", cls: "bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20" },
  tip: { icon: Lightbulb, label: "Tip", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" },
};

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700" },
  medium: { label: "Medium", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" },
  high: { label: "High", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40" },
  critical: { label: "Critical", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40" },
};

const TICKET_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  open: { label: "Open", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40", dot: "bg-amber-500" },
  resolved: { label: "Resolved", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40", dot: "bg-emerald-500" },
  closed: { label: "Closed", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700", dot: "bg-neutral-400" },
};

const fmtAgo = (d?: string | null) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "";
const fmtFmt = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy, hh:mm a") : "—";
const fmtDur = (secs?: number | null) => {
  if (!secs) return null;
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s > 0 ? s + "s" : ""}`.trim() : `${s}s`;
};

/* ══════════════════════════════════════════════
   MODAL WRAPPER
══════════════════════════════════════════════ */
const Modal = ({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode;
  footer?: React.ReactNode; wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={cn("relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl max-h-[92vh] flex flex-col", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      {footer && <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">{footer}</div>}
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   ARTICLE DETAIL
══════════════════════════════════════════════ */
const ArticleDetail = ({ article, onBack }: { article: any; onBack: () => void }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [voted, setVoted] = useState<boolean | null>(null);
  const typeCfg = ARTICLE_TYPE[article.type] ?? ARTICLE_TYPE.faq;
  const Icon = typeCfg.icon;

  // Increment view count on mount
  useMutation({
    mutationFn: async () => {
      await supabase.from("help_articles")
        .update({ view_count: (article.view_count ?? 0) + 1 })
        .eq("id", article.id);
    },
  }).mutate();

  const vote = useMutation({
    mutationFn: async (helpful: boolean) => {
      await supabase.from("help_article_votes").upsert({
        article_id: article.id, user_id: user?.id, is_helpful: helpful,
      }, { onConflict: "article_id,user_id" });
      // Update counts
      if (helpful) {
        await supabase.from("help_articles").update({ helpful_yes: (article.helpful_yes ?? 0) + 1 }).eq("id", article.id);
      } else {
        await supabase.from("help_articles").update({ helpful_no: (article.helpful_no ?? 0) + 1 }).eq("id", article.id);
      }
    },
    onSuccess: (_, helpful) => {
      setVoted(helpful);
      qc.invalidateQueries({ queryKey: ["help-articles"] });
    },
  });

  return (
    <div className="space-y-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Help
      </button>

      <div className={cn(CARD, "p-6")}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", typeCfg.cls)}>
            <Icon className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", typeCfg.cls)}>
                {typeCfg.label}
              </span>
              {article.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20">
                  <Star className="w-3 h-3" fill="currentColor" />Pinned
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{article.title}</h1>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              {article.help_categories?.name} · Updated {fmtAgo(article.updated_at)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap border-t border-neutral-100 dark:border-neutral-800 pt-4">
          {article.content}
        </div>

        {/* Helpful? */}
        {voted === null ? (
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Was this helpful?</p>
            <button onClick={() => vote.mutate(true)} disabled={vote.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" />Yes
            </button>
            <button onClick={() => vote.mutate(false)} disabled={vote.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-red-300 hover:text-red-500 transition-colors">
              <ThumbsDown className="w-3.5 h-3.5" />No
            </button>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800",
            voted ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500 dark:text-neutral-400")}>
            {voted ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
            <p className="text-sm font-medium">{voted ? "Thanks for the feedback!" : "We'll work to improve this."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   VIDEO CARD
══════════════════════════════════════════════ */
const VideoCard = ({ video }: { video: any }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={cn(CARD, "overflow-hidden cursor-pointer group")} onClick={() => setOpen(true)}>
        {/* Thumbnail */}
        <div className="relative h-36 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-10 h-10 text-neutral-300 dark:text-neutral-600" strokeWidth={1.5} />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-[#EAB308] flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-black ml-0.5" strokeWidth={2} fill="currentColor" />
            </div>
          </div>
          {/* Duration */}
          {video.duration_secs && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
              {fmtDur(video.duration_secs)}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-semibold text-neutral-800 dark:text-white line-clamp-2 leading-snug">{video.title}</p>
          {video.description && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 line-clamp-2">{video.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{video.help_categories?.name}</span>
            {video.duration_secs && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                <Clock className="w-3 h-3" />{fmtDur(video.duration_secs)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Video modal */}
      {open && (
        <Modal title={video.title} onClose={() => setOpen(false)} wide>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            <iframe src={video.video_url} title={video.title} className="w-full h-full"
              allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          </div>
          {video.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{video.description}</p>
          )}
        </Modal>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════
   FAQ ITEM (accordion)
══════════════════════════════════════════════ */
const FAQItem = ({ article, onView }: { article: any; onView: () => void }) => {
  const [open, setOpen] = useState(false);
  const typeCfg = ARTICLE_TYPE[article.type] ?? ARTICLE_TYPE.faq;
  const Icon = typeCfg.icon;

  return (
    <div className={cn("border-b border-neutral-100 dark:border-neutral-800 last:border-0")}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border", typeCfg.cls)}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {article.is_pinned && <Star className="w-3 h-3 text-[#EAB308]" fill="currentColor" />}
            <p className="text-sm font-semibold text-neutral-800 dark:text-white">{article.title}</p>
          </div>
          {!open && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">{article.content.substring(0, 80)}…</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onView(); }}
            className="hidden group-hover:flex items-center gap-1 text-xs text-[#EAB308] font-semibold hover:underline">
            Full <ExternalLink className="w-3 h-3" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0">
          <div className="ml-10 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{article.content}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Updated {fmtAgo(article.updated_at)} · {article.helpful_yes ?? 0} found helpful
              </p>
              <button onClick={onView} className="text-xs text-[#EAB308] font-semibold hover:underline flex items-center gap-1">
                Read full <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   RAISE TICKET MODAL
══════════════════════════════════════════════ */
const RaiseTicketModal = ({ categories, onClose }: { categories: any[]; onClose: (created?: boolean) => void }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ category_id: "", subject: "", description: "", priority: "medium" });
  const [error, setError] = useState("");
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.subject.trim() || !form.description.trim()) throw new Error("Subject and description are required");
      const { error } = await supabase.from("support_tickets").insert({
        raised_by: user?.id,
        category_id: form.category_id || null,
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority as any,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => onClose(true),
    onError: (e: any) => setError(e.message),
  });

  return (
    <Modal title="Raise a Support Ticket" onClose={() => onClose()}
      footer={
        <div className="flex gap-3">
          <button onClick={() => onClose()} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Send className="w-4 h-4" />Submit Ticket</>}
          </button>
        </div>
      }>
      {error && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5"><AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}

      <div>
        <label className={labelCls}>Category</label>
        <select value={form.category_id} onChange={e => set("category_id")(e.target.value)} className={inputCls}>
          <option value="">Select category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Subject<span className="text-red-500 ml-0.5">*</span></label>
        <input value={form.subject} onChange={e => set("subject")(e.target.value)} className={inputCls} placeholder="Brief description of your issue" />
      </div>

      <div>
        <label className={labelCls}>Priority</label>
        <div className="grid grid-cols-4 gap-2">
          {(["low", "medium", "high", "critical"] as const).map(p => {
            const cfg = PRIORITY_CFG[p];
            return (
              <button key={p} onClick={() => set("priority")(p)}
                className={cn("py-2 rounded-xl border text-xs font-semibold capitalize transition-all",
                  form.priority === p ? cn(cfg.cls, "ring-2 ring-offset-1 ring-[#EAB308]") : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300")}>
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelCls}>Description<span className="text-red-500 ml-0.5">*</span></label>
        <textarea value={form.description} onChange={e => set("description")(e.target.value)} rows={5}
          className={cn(inputCls, "resize-none")}
          placeholder="Describe your issue in detail — what you were doing, what happened, any error messages…" />
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   TICKET DETAIL
══════════════════════════════════════════════ */
const TicketDetail = ({ ticket, onBack }: { ticket: any; onBack: () => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: replies = [] } = useQuery({
    queryKey: ["ticket-replies", ticket.id],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_replies")
        .select("*, profiles:replied_by(name)").eq("ticket_id", ticket.id)
        .eq("is_internal", false).order("created_at");
      return data ?? [];
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) throw new Error("Message required");
      const { error } = await supabase.from("support_ticket_replies").insert({
        ticket_id: ticket.id, replied_by: user?.id, message: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["ticket-replies", ticket.id] }); },
  });

  const st = TICKET_STATUS[ticket.status] ?? TICKET_STATUS.open;
  const pri = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.medium;

  return (
    <div className="space-y-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Tickets
      </button>

      <div className={cn(CARD, "p-5")}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{ticket.ticket_no}</span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold", st.cls)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{st.label}
              </span>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", pri.cls)}>
                {pri.label}
              </span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">{ticket.subject}</h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Raised {fmtFmt(ticket.created_at)}</p>
          </div>
        </div>
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800 mb-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Resolution */}
        {ticket.status === "resolved" && ticket.resolution && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Resolution · {fmtAgo(ticket.resolved_at)}</p>
            </div>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{ticket.resolution}</p>
          </div>
        )}

        {/* Replies */}
        {(replies as any[]).length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Replies</p>
            {(replies as any[]).map((r: any) => {
              const isMe = r.replied_by === user?.id;
              return (
                <div key={r.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                  <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                    {(r.profiles?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className={cn("flex-1 min-w-0", isMe && "items-end flex flex-col")}>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1">
                      {r.profiles?.name ?? "Support"} · {fmtAgo(r.created_at)}
                    </p>
                    <div className={cn("p-3 rounded-xl text-sm leading-relaxed max-w-[85%]",
                      isMe
                        ? "bg-[#EAB308]/10 border border-[#EAB308]/20 text-neutral-800 dark:text-white"
                        : "bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                    )}>
                      {r.message}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply box */}
        {ticket.status !== "closed" && (
          <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
              placeholder="Add a reply…"
              className={cn(inputCls, "resize-none flex-1")} />
            <button onClick={() => sendReply.mutate()} disabled={sendReply.isPending || !reply.trim()}
              className="w-10 h-10 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors self-end">
              {sendReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN HELP PAGE
══════════════════════════════════════════════ */
export default function HelpPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setTab] = useState<"home" | "faq" | "videos" | "tickets">("home");
  const [selectedCat, setCat] = useState<string | null>(null);
  const [selectedArticle, setArticle] = useState<any>(null);
  const [selectedTicket, setTicket] = useState<any>(null);
  const [showNewTicket, setNewTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  /* ── Queries ── */
  const { data: categories = [] } = useQuery({
    queryKey: ["help-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("help_categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const { data } = await supabase.from("help_articles")
        .select("*, help_categories(name, slug, color)")
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["help-videos"],
    queryFn: async () => {
      const { data } = await supabase.from("help_videos")
        .select("*, help_categories(name, slug)")
        .eq("is_published", true)
        .order("sort_order").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets")
        .select("*, help_categories(name)")
        .eq("raised_by", user?.id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  /* ── Filtered articles ── */
  const filtered = useMemo(() => {
    let list = articles as any[];
    if (selectedCat) list = list.filter(a => a.help_categories?.slug === selectedCat || a.category_id === selectedCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.help_categories?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [articles, selectedCat, search]);

  const filteredVideos = useMemo(() => {
    let list = videos as any[];
    if (selectedCat) list = list.filter(v => v.help_categories?.slug === selectedCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        (v.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [videos, selectedCat, search]);

  const pinned = (articles as any[]).filter(a => a.is_pinned);
  const openCount = (tickets as any[]).filter(t => t.status !== "closed" && t.status !== "resolved").length;

  /* ── Sub-views ── */
  if (selectedArticle) return <ArticleDetail article={selectedArticle} onBack={() => setArticle(null)} />;
  if (selectedTicket) return <TicketDetail ticket={selectedTicket} onBack={() => setTicket(null)} />;

  const TABS = [
    { id: "home", label: "Help Home", icon: HelpCircle },
    { id: "faq", label: `Articles (${(articles as any[]).length})`, icon: BookOpen },
    { id: "videos", label: `Videos (${(videos as any[]).length})`, icon: Play },
    { id: "tickets", label: `My Tickets${openCount > 0 ? ` (${openCount})` : ""}`, icon: Ticket },
  ] as const;

  return (
    <>
      <div className="space-y-5 pb-10">

        {/* ── Hero ── */}
        <div className="bg-[#EAB308] rounded-2xl px-6 py-8 relative overflow-hidden shadow-[0_4px_20px_0_rgba(234,179,8,0.35)]">
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-5 h-5 text-black/60" strokeWidth={1.8} />
              <p className="text-black/60 text-sm font-medium">Accura ERP</p>
            </div>
            <h1 className="text-2xl font-black text-black mb-1">Help & Support</h1>
            <p className="text-black/60 text-sm mb-5">Find answers, watch tutorials or raise a ticket</p>
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" strokeWidth={1.8} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); if (e.target.value) setTab("faq"); }}
                placeholder="Search articles, guides, FAQs…"
                className="w-full pl-10 pr-10 py-3 bg-black/10 border border-black/10 rounded-xl text-sm text-black placeholder:text-black/40 focus:outline-none focus:border-black/30 transition-colors font-medium"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-black/5 rounded-full" />
          <div className="absolute right-16 -bottom-10 w-28 h-28 bg-black/4 rounded-full" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
                activeTab === t.id
                  ? "bg-[#EAB308] border-[#EAB308] text-black shadow-[0_2px_8px_0_rgba(234,179,8,0.3)]"
                  : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/40"
              )}>
              <t.icon className="w-4 h-4" strokeWidth={1.8} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════ HOME TAB ════════════ */}
        {activeTab === "home" && (
          <div className="space-y-5">
            {/* Category grid */}
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3">Browse by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(categories as any[]).map((cat: any) => {
                  const colorCfg = CAT_COLORS[cat.color ?? "neutral"];
                  const Icon = CAT_ICONS[cat.icon ?? "HelpCircle"] ?? HelpCircle;
                  const count = (articles as any[]).filter(a => a.category_id === cat.id).length;
                  const isActive = selectedCat === cat.slug;
                  return (
                    <button key={cat.id}
                      onClick={() => { setCat(isActive ? null : cat.slug); setTab("faq"); }}
                      className={cn(
                        CARD,
                        "p-4 flex flex-col items-start gap-2.5 text-left w-full hover:-translate-y-0.5 transition-all active:scale-[.98]",
                        isActive && "ring-2 ring-[#EAB308]"
                      )}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", colorCfg.bg, colorCfg.border)}>
                        <Icon className={cn("w-5 h-5", colorCfg.text)} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">{cat.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{count} article{count !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pinned articles */}
            {pinned.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#EAB308]" fill="currentColor" />
                  Pinned Articles
                </h2>
                <div className={cn(CARD, "overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800")}>
                  {pinned.map(a => (
                    <FAQItem key={a.id} article={a} onView={() => setArticle(a)} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => setTab("faq")}
                className={cn(CARD, "p-5 text-left flex items-center gap-4 hover:-translate-y-0.5 transition-all active:scale-[.98]")}>
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">All Articles</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{(articles as any[]).length} articles</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 ml-auto" />
              </button>

              <button onClick={() => setTab("videos")}
                className={cn(CARD, "p-5 text-left flex items-center gap-4 hover:-translate-y-0.5 transition-all active:scale-[.98]")}>
                <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center border border-violet-100 dark:border-violet-900/40 flex-shrink-0">
                  <Play className="w-5 h-5 text-violet-600 dark:text-violet-400" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">Video Tutorials</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{(videos as any[]).length} videos</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 ml-auto" />
              </button>

              <button onClick={() => setNewTicket(true)}
                className="bg-[#EAB308] rounded-2xl shadow-[0_4px_20px_0_rgba(234,179,8,0.35)] p-5 text-left flex items-center gap-4 hover:shadow-[0_6px_28px_0_rgba(234,179,8,0.45)] transition-all active:scale-[.98]">
                <div className="w-11 h-11 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5 text-black/65" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-black">Raise a Ticket</p>
                  <p className="text-xs text-black/55">Get help from Admin</p>
                </div>
                <ChevronRight className="w-4 h-4 text-black/40 ml-auto" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════ FAQ TAB ════════════ */}
        {activeTab === "faq" && (
          <div className="space-y-4">
            {/* Category filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
              <button onClick={() => setCat(null)}
                className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap",
                  !selectedCat ? "bg-[#EAB308] border-[#EAB308] text-black" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/40")}>
                All ({(articles as any[]).length})
              </button>
              {(categories as any[]).map(cat => {
                const count = (articles as any[]).filter(a => a.category_id === cat.id).length;
                if (count === 0) return null;
                return (
                  <button key={cat.id} onClick={() => setCat(selectedCat === cat.slug ? null : cat.slug)}
                    className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap",
                      selectedCat === cat.slug ? "bg-[#EAB308] border-[#EAB308] text-black" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/40")}>
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Results count */}
            {search && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "<span className="text-neutral-700 dark:text-neutral-200 font-medium">{search}</span>"
              </p>
            )}

            {/* Article list */}
            {filtered.length > 0 ? (
              <div className={cn(CARD, "overflow-hidden")}>
                {filtered.map((a: any) => (
                  <FAQItem key={a.id} article={a} onView={() => setArticle(a)} />
                ))}
              </div>
            ) : (
              <div className={cn(CARD, "py-16 text-center")}>
                <Search className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No articles found</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Try a different search or raise a support ticket</p>
                <button onClick={() => setNewTicket(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <Ticket className="w-4 h-4" />Raise a Ticket
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════ VIDEOS TAB ════════════ */}
        {activeTab === "videos" && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
              <button onClick={() => setCat(null)}
                className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap",
                  !selectedCat ? "bg-[#EAB308] border-[#EAB308] text-black" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400")}>
                All ({(videos as any[]).length})
              </button>
              {(categories as any[]).map(cat => {
                const count = (videos as any[]).filter(v => v.category_id === cat.id).length;
                if (count === 0) return null;
                return (
                  <button key={cat.id} onClick={() => setCat(selectedCat === cat.slug ? null : cat.slug)}
                    className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap",
                      selectedCat === cat.slug ? "bg-[#EAB308] border-[#EAB308] text-black" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400")}>
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((v: any) => <VideoCard key={v.id} video={v} />)}
              </div>
            ) : (
              <div className={cn(CARD, "py-16 text-center")}>
                <Play className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No tutorial videos yet</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Videos will appear here once Admin adds them</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════ TICKETS TAB ════════════ */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">My Support Tickets</h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{(tickets as any[]).length} tickets raised</p>
              </div>
              <button onClick={() => setNewTicket(true)}
                className="inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
                <Plus className="w-4 h-4" />New Ticket
              </button>
            </div>

            {ticketCreated && (
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Ticket submitted! We'll respond soon.</p>
                <button onClick={() => setTicketCreated(false)} className="ml-auto text-emerald-500 hover:text-emerald-700 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            )}

            {(tickets as any[]).length > 0 ? (
              <div className={cn(CARD, "overflow-hidden")}>
                {(tickets as any[]).map((t: any) => {
                  const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
                  const pri = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.medium;
                  return (
                    <div key={t.id} onClick={() => setTicket(t)}
                      className="flex items-center gap-4 px-5 py-4 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{t.ticket_no}</span>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold", st.cls)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{st.label}
                          </span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold", pri.cls)}>{pri.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{t.subject}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                          {t.help_categories?.name ?? "General"} · {fmtAgo(t.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={cn(CARD, "py-16 text-center")}>
                <Ticket className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No tickets raised yet</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Couldn't find an answer? Let us know</p>
                <button onClick={() => setNewTicket(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <Plus className="w-4 h-4" />Raise First Ticket
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── New Ticket Modal ── */}
      {showNewTicket && (
        <RaiseTicketModal
          categories={categories as any[]}
          onClose={created => {
            setShowNewTicket(false);
            if (created) {
              setTicketCreated(true);
              setTab("tickets");
              qc.invalidateQueries({ queryKey: ["my-tickets"] });
            }
          }}
        />
      )}
    </>
  );
}