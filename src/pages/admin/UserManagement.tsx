import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, getRoleLabel } from "@/lib/auth-context";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export-utils";
import {
  Search, Plus, Edit2, Trash2, KeyRound, Users, Mail, Phone,
  Building2, Briefcase, Clock, Shield, Eye, UserCheck, UserX,
  Download, X, Loader2, ChevronDown, Crown, User, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════ */
const CARD = "bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_0_rgba(0,0,0,0.3)]";
const inputCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors";
const labelCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

/* ══════════════════════════════════════════════
   ROLE CONSTANTS
══════════════════════════════════════════════ */
const ROLES: UserRole[] = [
  "admin", "hr", "security", "procurement", "employee",
  "toolroom_high", "moulding_high", "ref_person", "store",
  "accountant", "cad_cam", "tool_room_head",
];

/* Role → category mapping */
const HIGHER_AUTHORITY_ROLES = new Set(["admin", "hr", "toolroom_high", "moulding_high", "tool_room_head", "ref_person"]);
const DEPARTMENT_ROLES = new Set(["procurement", "security", "store", "accountant", "cad_cam"]);
const EMPLOYEE_ROLES = new Set(["employee"]);

type CategoryKey = "all" | "employee" | "higher_authority" | "department";

const CATEGORIES: { key: CategoryKey; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { key: "all", label: "All Users", icon: Users, color: "text-neutral-700 dark:text-neutral-200", bg: "bg-neutral-100 dark:bg-neutral-800", border: "border-neutral-200 dark:border-neutral-700" },
  { key: "employee", label: "Employee", icon: User, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-900/40" },
  { key: "higher_authority", label: "Higher Authority", icon: Crown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-900/40" },
  { key: "department", label: "Department Staff", icon: Layers, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-100 dark:border-violet-900/40" },
];

const ROLE_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  admin: { label: "Admin", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40", dot: "bg-red-500" },
  hr: { label: "HR", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40", dot: "bg-blue-500" },
  security: { label: "Security", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40", dot: "bg-orange-500" },
  procurement: { label: "Procurement", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40", dot: "bg-emerald-500" },
  employee: { label: "Employee", cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700", dot: "bg-neutral-400" },
  toolroom_high: { label: "Tool Room HA", cls: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40", dot: "bg-violet-500" },
  moulding_high: { label: "Moulding HA", cls: "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/40", dot: "bg-pink-500" },
  ref_person: { label: "Ref Person", cls: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/40", dot: "bg-cyan-500" },
  store: { label: "Store", cls: "bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20", dot: "bg-[#EAB308]" },
  accountant: { label: "Accountant", cls: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40", dot: "bg-indigo-500" },
  cad_cam: { label: "CAD/CAM", cls: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40", dot: "bg-teal-500" },
  tool_room_head: { label: "Tool Room Head", cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40", dot: "bg-purple-500" },
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-red-500", "bg-indigo-500",
];

const avatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const generateUserId = (name: string) =>
  `Accura${name.split(" ")[0] || "User"}001`;

const inr = (n?: number | null) =>
  n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const getRoleCategory = (role: string): CategoryKey => {
  if (HIGHER_AUTHORITY_ROLES.has(role)) return "higher_authority";
  if (DEPARTMENT_ROLES.has(role)) return "department";
  return "employee";
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const RoleBadge = ({ role }: { role: string }) => {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.employee;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-semibold",
      cfg.cls
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
};

/* ══════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════ */
const Modal = ({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode;
  footer?: React.ReactNode; wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={cn(
      "relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-2xl max-h-[92vh] flex flex-col",
      wide ? "sm:max-w-2xl" : "sm:max-w-lg"
    )}>
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

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = "text", readOnly, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; readOnly?: boolean; disabled?: boolean;
}) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    disabled={disabled}
    className={cn(inputCls, (readOnly || disabled) && "opacity-50 cursor-not-allowed")}
  />
);

const SelectInput = ({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

/* ══════════════════════════════════════════════
   EDGE FUNCTION CALLER
══════════════════════════════════════════════ */
async function callEdge(payload: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function UserManagement() {
  const qc = useQueryClient();

  /* View state */
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatus] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all"); // sub-role filter within category
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");

  /* Form state */
  const emptyForm = () => ({
    name: "", email: "", password: "", role: "employee" as UserRole,
    dept_id: "", designation: "", shift: "General", phone: "", custom_id: "",
  });
  const [form, setForm] = useState(emptyForm());
  const setF = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  /* ── Queries ── */
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      // profiles.id === auth.users.id === user_roles.user_id
      // No direct FK between profiles and user_roles, so fetch separately
      const [{ data: profileData, error: profileError }, { data: rolesData, error: rolesError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, user_id_custom, name, email, phone, designation, shift, department_id, joining_date, basic_salary, address, gender, blood_group, is_active, created_at, departments!profiles_department_id_fkey(id, name)"
            )
            .order("name", { ascending: true }),
          supabase.from("user_roles").select("user_id, role"),
        ]);

      if (profileError) throw profileError;
      if (rolesError) throw rolesError;

      // Build lookup: user_id -> role
      const roleMap: Record<string, string> = {};
      (rolesData ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      return (profileData ?? []).map((p: any) => ({
        ...p,
        _role: roleMap[p.id] ?? "employee",
        _active: p.is_active !== false,
        _dept: (p.departments as any)?.name ?? "",
      }));
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data || [];
    },
  });

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim() || !form.email.trim() || !form.password.trim())
        throw new Error("Name, email and password are required");
      return callEdge({
        action: "create_user",
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        user_id_custom: form.custom_id || generateUserId(form.name),
        role: form.role,
        department_id: form.dept_id || null,
        designation: form.designation || null,
        shift: form.shift,
        phone: form.phone || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User created successfully");
      setForm(emptyForm());
      setShowCreate(false);
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editUser) throw new Error("No user selected");
      return callEdge({
        action: "update_user",
        user_id: editUser.id,
        name: form.name.trim(),
        role: form.role,
        department_id: form.dept_id || null,
        designation: form.designation || null,
        shift: form.shift,
        phone: form.phone || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User updated");
      setEditUser(null);
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => callEdge({ action: "delete_user", user_id: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPwMutation = useMutation({
    mutationFn: () => callEdge({ action: "reset_password", user_id: resetUser?.id, new_password: newPw }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetUser(null);
      setNewPw("");
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !p._active })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* Open edit */
  const openEdit = (p: any) => {
    setEditUser(p);
    setForm({
      name: p.name ?? "",
      email: p.email ?? "",
      password: "",
      role: p._role,
      dept_id: p.department_id ?? "",
      designation: p.designation ?? "",
      shift: p.shift ?? "General",
      phone: p.phone ?? "",
      custom_id: p.user_id_custom ?? "",
    });
    setError("");
  };

  /* ── Filter logic ── */
  const filtered = (profiles as any[]).filter(p => {
    // Category filter
    if (category !== "all" && getRoleCategory(p._role) !== category) return false;
    // Sub-role filter
    if (roleFilter !== "all" && p._role !== roleFilter) return false;
    // Department filter
    if (deptFilter !== "all" && p.department_id !== deptFilter) return false;
    // Status filter
    if (statusFilter === "active" && !p._active) return false;
    if (statusFilter === "inactive" && p._active) return false;
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.user_id_custom ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.designation ?? "").toLowerCase().includes(q) ||
        (p._dept ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* Stats */
  const totalActive = (profiles as any[]).filter(p => p._active).length;
  const totalInactive = (profiles as any[]).filter(p => !p._active).length;

  /* Category counts */
  const categoryCounts: Record<CategoryKey, number> = {
    all: (profiles as any[]).length,
    employee: (profiles as any[]).filter(p => getRoleCategory(p._role) === "employee").length,
    higher_authority: (profiles as any[]).filter(p => getRoleCategory(p._role) === "higher_authority").length,
    department: (profiles as any[]).filter(p => getRoleCategory(p._role) === "department").length,
  };

  /* Roles to show as sub-filters within current category */
  const subRoles = ROLES.filter(r => {
    if (category === "all") return true;
    if (category === "employee") return EMPLOYEE_ROLES.has(r);
    if (category === "higher_authority") return HIGHER_AUTHORITY_ROLES.has(r);
    if (category === "department") return DEPARTMENT_ROLES.has(r);
    return false;
  }).filter(r => (profiles as any[]).some(p => p._role === r));

  /* Export */
  const doExport = () => {
    const headers = ["Name", "User ID", "Email", "Phone", "Role", "Department", "Designation", "Shift", "Status", "Joining Date", "Basic Salary"];
    const rows = filtered.map(p => [
      p.name ?? "",
      p.user_id_custom ?? "",
      p.email ?? "",
      p.phone ?? "",
      getRoleLabel(p._role),
      p._dept,
      p.designation ?? "",
      p.shift ?? "",
      p._active ? "Active" : "Inactive",
      p.joining_date ? format(new Date(p.joining_date), "dd MMM yyyy") : "",
      p.basic_salary != null ? String(p.basic_salary) : "",
    ]);
    exportToCSV(`Accura_Users_${format(new Date(), "dd-MM-yyyy")}`, headers, rows);
    toast.success(`Exported ${rows.length} users`);
  };

  /* Shared form fields */
  const CommonFields = ({ isCreate = false }) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" required>
          <TextInput value={form.name}
            onChange={v => { setF("name")(v); if (isCreate && !form.custom_id) setF("custom_id")(generateUserId(v)); }}
            placeholder="Ramesh Gupta" />
        </Field>
        <Field label="Email" required={isCreate}>
          <TextInput
            value={form.email}
            onChange={setF("email")}
            type="email"
            placeholder="ramesh@accura.in"
            readOnly={!isCreate}
            disabled={!isCreate}
          />
        </Field>
      </div>

      {isCreate && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="User ID">
            <TextInput value={form.custom_id} onChange={setF("custom_id")} placeholder="AccuraRamesh001" />
          </Field>
          <Field label="Password" required>
            <TextInput value={form.password} onChange={setF("password")} type="password" placeholder="Min 6 chars" />
          </Field>
        </div>
      )}

      {/* Role selector with category grouping */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <select value={form.role} onChange={e => setF("role")(e.target.value)} className={inputCls}>
            <optgroup label="── Employee">
              <option value="employee">Employee</option>
            </optgroup>
            <optgroup label="── Higher Authority">
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="toolroom_high">Tool Room HA</option>
              <option value="moulding_high">Moulding HA</option>
              <option value="tool_room_head">Tool Room Head</option>
              <option value="ref_person">Ref Person</option>
            </optgroup>
            <optgroup label="── Department Staff">
              <option value="procurement">Procurement</option>
              <option value="security">Security</option>
              <option value="store">Store</option>
              <option value="accountant">Accountant</option>
              <option value="cad_cam">CAD/CAM</option>
            </optgroup>
          </select>
        </Field>
        <Field label="Department">
          <SelectInput value={form.dept_id} onChange={setF("dept_id")}
            options={[{ value: "", label: "Select department…" }, ...(departments as any[]).map(d => ({ value: d.id, label: d.name }))]} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Designation">
          <TextInput value={form.designation} onChange={setF("designation")} placeholder="Operator" />
        </Field>
        <Field label="Shift">
          <SelectInput value={form.shift} onChange={setF("shift")} options={[
            { value: "General", label: "General (9–6)" },
            { value: "Morning", label: "Morning (6–2)" },
            { value: "Evening", label: "Evening (2–10)" },
            { value: "Night", label: "Night (10–6)" },
          ]} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.phone} onChange={setF("phone")} placeholder="+91..." />
        </Field>
      </div>
    </>
  );

  return (
    <>
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">User Management</h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              {(profiles as any[]).length} users · {totalActive} active · {totalInactive} inactive
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={doExport}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308] transition-colors">
              <Download className="w-4 h-4" />Export
            </button>
            <button onClick={() => { setForm(emptyForm()); setError(""); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm transition-all">
              <Plus className="w-4 h-4" strokeWidth={2} />Create User
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: (profiles as any[]).length, color: "text-neutral-900 dark:text-white", icon: Users, bg: "bg-neutral-50 dark:bg-neutral-800", border: "border-neutral-100 dark:border-neutral-700" },
            { label: "Active", value: totalActive, color: "text-emerald-600 dark:text-emerald-400", icon: UserCheck, bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-900/40" },
            { label: "Inactive", value: totalInactive, color: "text-red-500 dark:text-red-400", icon: UserX, bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-900/40" },
            { label: "Admins", value: (profiles as any[]).filter(p => p._role === "admin").length, color: "text-red-600 dark:text-red-400", icon: Shield, bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-900/40" },
          ].map(s => (
            <div key={s.label} className={cn(CARD, "p-4 flex items-center gap-3")}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", s.bg, s.border)}>
                <s.icon className={cn("w-5 h-5", s.color)} strokeWidth={1.8} />
              </div>
              <div>
                <p className={cn("text-2xl font-black tabular-nums leading-tight", s.color)}>{s.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══ CATEGORY TABS ══ */}
        <div className={cn(CARD, "p-1.5 flex gap-1.5 overflow-x-auto")}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setRoleFilter("all"); }}
                className={cn(
                  "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  active
                    ? cn(cat.bg, cat.color, cat.border, "border shadow-sm")
                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                )}>
                <Icon className="w-4 h-4" strokeWidth={1.8} />
                {cat.label}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-xs font-bold tabular-nums",
                  active ? "bg-white/60 dark:bg-black/20" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                )}>
                  {categoryCounts[cat.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Sub-role pills (only when > 1 role in category) ── */}
        {subRoles.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setRoleFilter("all")}
              className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                roleFilter === "all"
                  ? "bg-[#EAB308] border-[#EAB308] text-black"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/40"
              )}>
              All Roles
            </button>
            {subRoles.map(r => {
              const cfg = ROLE_CFG[r] ?? ROLE_CFG.employee;
              const count = (profiles as any[]).filter(p => p._role === r).length;
              return (
                <button key={r} onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}
                  className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                    roleFilter === r
                      ? cn(cfg.cls, "ring-2 ring-offset-1 ring-[#EAB308]")
                      : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
                  )}>
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* ── Search bar + status + dept filter ── */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, user ID, email, designation…"
              className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department dropdown */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600 pointer-events-none" strokeWidth={1.8} />
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-[#EAB308]/60 transition-colors appearance-none cursor-pointer min-w-[160px]">
              <option value="all">All Departments</option>
              {(departments as any[]).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 pointer-events-none" />
          </div>

          {/* Status toggle */}
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
            ].map(t => (
              <button key={t.id} onClick={() => setStatus(t.id)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  statusFilter === t.id
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── User table ── */}
        <div className={cn(CARD, "overflow-hidden")}>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[2.2fr_1fr_1.2fr_1fr_1fr_1.1fr_120px] gap-3 px-5 py-3 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
            {["User", "User ID", "Department", "Designation", "Shift", "Role", "Actions"].map(h => (
              <span key={h} className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" />
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-3">Loading users…</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((p: any) => (
              <div key={p.id}
                className="flex md:grid md:grid-cols-[2.2fr_1fr_1.2fr_1fr_1fr_1.1fr_120px] items-center gap-3 px-5 py-4 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
                onClick={() => setViewUser(p)}>

                {/* User info */}
                <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0", avatarColor(p.name ?? ""))}>
                    {(p.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{p.name ?? "—"}</p>
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", p._active ? "bg-emerald-500" : "bg-red-400")} />
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{p.email ?? "—"}</p>
                  </div>
                </div>

                {/* User ID */}
                <div className="hidden md:block">
                  <code className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-lg font-mono">
                    {p.user_id_custom ?? "—"}
                  </code>
                </div>

                {/* Department */}
                <div className="hidden md:flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{p._dept || "—"}</span>
                </div>

                {/* Designation */}
                <div className="hidden md:flex items-center gap-1.5 min-w-0">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{p.designation ?? "—"}</span>
                </div>

                {/* Shift */}
                <div className="hidden md:flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">{p.shift ?? "—"}</span>
                </div>

                {/* Role */}
                <div className="hidden md:block">
                  <RoleBadge role={p._role} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto md:ml-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setViewUser(p)} title="View"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#EAB308] hover:bg-[#EAB308]/10 transition-colors">
                    <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                  <button onClick={() => openEdit(p)} title="Edit"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                  <button onClick={() => { setResetUser(p); setError(""); }} title="Reset Password"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                    <KeyRound className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                  <button onClick={() => toggleActive.mutate(p)} title={p._active ? "Deactivate" : "Activate"}
                    className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      p._active
                        ? "text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : "text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    )}>
                    {p._active ? <UserX className="w-3.5 h-3.5" strokeWidth={1.8} /> : <UserCheck className="w-3.5 h-3.5" strokeWidth={1.8} />}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete ${p.name}? This cannot be undone.`)) deleteMutation.mutate(p.id); }}
                    title="Delete"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No users found</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800 flex items-center justify-between">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{filtered.length} of {(profiles as any[]).length} users</p>
              <button onClick={doExport}
                className="flex items-center gap-1 text-xs text-[#EAB308] font-semibold hover:underline">
                <Download className="w-3 h-3" />Export filtered
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ CREATE MODAL ══ */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => { setShowCreate(false); setError(""); }} wide
          footer={
            <div className="flex gap-3">
              <button onClick={() => { setShowCreate(false); setError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create User"}
              </button>
            </div>
          }>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}
          <CommonFields isCreate />
        </Modal>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editUser && (
        <Modal title={`Edit: ${editUser.name}`} onClose={() => { setEditUser(null); setError(""); }} wide
          footer={
            <div className="flex gap-3">
              <button onClick={() => { setEditUser(null); setError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {updateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Changes"}
              </button>
            </div>
          }>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}
          {/* Current role preview */}
          <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Current role:</span>
            <RoleBadge role={editUser._role} />
            {form.role !== editUser._role && (
              <>
                <span className="text-xs text-neutral-400">→</span>
                <RoleBadge role={form.role} />
                <span className="text-xs text-amber-500 font-medium ml-auto">Role will change</span>
              </>
            )}
          </div>
          <CommonFields isCreate={false} />
        </Modal>
      )}

      {/* ══ VIEW MODAL ══ */}
      {viewUser && (() => {
        const active = viewUser._active;
        return (
          <Modal title="User Details" onClose={() => setViewUser(null)}>
            <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0", avatarColor(viewUser.name ?? ""))}>
                {(viewUser.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{viewUser.name}</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">{viewUser.designation ?? "No designation"}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <RoleBadge role={viewUser._role} />
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold",
                    active
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
                      : "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/40"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500" : "bg-red-400")} />
                    {active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Mail, label: "Email", value: viewUser.email },
                { icon: Phone, label: "Phone", value: viewUser.phone },
                { icon: Users, label: "User ID", value: viewUser.user_id_custom, mono: true },
                { icon: Building2, label: "Department", value: viewUser._dept || null },
                { icon: Clock, label: "Shift", value: viewUser.shift },
                { icon: Briefcase, label: "Joining Date", value: viewUser.joining_date ? format(new Date(viewUser.joining_date), "dd MMM yyyy") : null },
                { icon: Shield, label: "Gender", value: viewUser.gender },
                { icon: Users, label: "Blood Group", value: viewUser.blood_group },
              ].map(({ icon: Icon, label, value, mono }: any) => (
                <div key={label} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 mb-1">
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                  </div>
                  <p className={cn("text-sm font-semibold text-neutral-800 dark:text-white truncate", mono && "font-mono text-xs")}>
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>

            {viewUser.basic_salary && (
              <div className="flex items-center justify-between p-3 bg-[#EAB308]/10 border border-[#EAB308]/20 rounded-xl">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Basic Salary</span>
                <span className="text-sm font-bold text-[#EAB308]">{inr(viewUser.basic_salary)}</span>
              </div>
            )}

            {viewUser.address && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Address</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{viewUser.address}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setViewUser(null); openEdit(viewUser); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />Edit
              </button>
              <button onClick={() => { setViewUser(null); setResetUser(viewUser); setError(""); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <KeyRound className="w-3.5 h-3.5" />Reset Password
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* ══ RESET PASSWORD MODAL ══ */}
      {resetUser && (
        <Modal title={`Reset Password: ${resetUser.name}`}
          onClose={() => { setResetUser(null); setNewPw(""); setError(""); }}
          footer={
            <div className="flex gap-3">
              <button onClick={() => { setResetUser(null); setNewPw(""); setError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => resetPwMutation.mutate()} disabled={resetPwMutation.isPending || newPw.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {resetPwMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Resetting…</> : "Reset Password"}
              </button>
            </div>
          }>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{resetUser.name}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">{resetUser.email}</p>
          </div>
          <div>
            <label className={labelCls}>New Password<span className="text-red-500 ml-0.5">*</span></label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Minimum 6 characters" className={inputCls} />
          </div>
        </Modal>
      )}
    </>
  );
}