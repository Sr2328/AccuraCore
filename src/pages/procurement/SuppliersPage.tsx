// import { useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { toast } from "sonner";
// import { Plus, Search, Download } from "lucide-react";
// import { exportToCSV, exportToPDF } from "@/lib/export-utils";

// const CATEGORIES = ["Steel", "Electrical", "Consumables", "Stationery", "Tools", "Custom"];
// const SUPPLIER_TYPES = [
//   { value: "material", label: "Material Supplier" },
//   { value: "rm", label: "RM Supplier" },
//   { value: "job_work", label: "Job Work Supplier" },
// ];

// export default function SuppliersPage() {
//   const queryClient = useQueryClient();
//   const [search, setSearch] = useState("");
//   const [typeFilter, setTypeFilter] = useState("all");
//   const [showCreate, setShowCreate] = useState(false);
//   const [name, setName] = useState("");
//   const [address, setAddress] = useState("");
//   const [gst, setGst] = useState("");
//   const [contact, setContact] = useState("");
//   const [phone, setPhone] = useState("");
//   const [whatsapp, setWhatsapp] = useState("");
//   const [email, setEmail] = useState("");
//   const [category, setCategory] = useState("Steel");
//   const [supplierType, setSupplierType] = useState("material");
//   const [tat, setTat] = useState("5");
//   const [terms, setTerms] = useState("");

//   const { data: suppliers = [] } = useQuery({
//     queryKey: ["suppliers-all"],
//     queryFn: async () => {
//       const { data } = await supabase.from("suppliers").select("*").order("name");
//       return data || [];
//     },
//   });

//   const createSupplier = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase.from("suppliers").insert({
//         name, address: address || null, gst_number: gst || null,
//         contact_person: contact || null, phone: phone || null,
//         whatsapp: whatsapp || null, email: email || null,
//         category, supplier_type: supplierType,
//         tat_days: Number(tat), payment_terms: terms || null,
//       });
//       if (error) throw error;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["suppliers-all"] });
//       toast.success("Supplier added");
//       setShowCreate(false);
//       setName(""); setAddress(""); setGst(""); setContact("");
//       setPhone(""); setWhatsapp(""); setEmail(""); setTerms("");
//     },
//     onError: (err: any) => toast.error(err.message),
//   });

//   const filtered = suppliers.filter((s: any) => {
//     const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase());
//     const matchType = typeFilter === "all" || (s as any).supplier_type === typeFilter;
//     return matchSearch && matchType;
//   });

//   const typeLabel = (t: string) => SUPPLIER_TYPES.find((st) => st.value === t)?.label || t;
//   const typeColor: Record<string, string> = {
//     material: "bg-primary/10 text-primary",
//     rm: "bg-info/10 text-info",
//     job_work: "bg-warning/10 text-warning",
//   };

//   const handleExportCSV = () => {
//     const headers = ["Name", "Type", "Category", "Contact", "Phone", "Email", "GST", "TAT", "Status"];
//     const rows = filtered.map((s: any) => [s.name, typeLabel((s as any).supplier_type || "material"), s.category, s.contact_person || "", s.phone || "", s.email || "", s.gst_number || "", String(s.tat_days), s.is_active ? "Active" : "Inactive"]);
//     exportToCSV("suppliers", headers, rows);
//   };

//   const handleExportPDF = () => {
//     const headers = ["Name", "Type", "Category", "Contact", "Phone", "GST", "TAT"];
//     const rows = filtered.map((s: any) => [s.name, typeLabel((s as any).supplier_type || "material"), s.category, s.contact_person || "—", s.phone || "—", s.gst_number || "—", `${s.tat_days}d`]);
//     exportToPDF("suppliers", "Suppliers Report — Accura Precision", headers, rows, "landscape");
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div>
//           <h1 className="text-xl sm:text-2xl font-bold text-foreground">Suppliers</h1>
//           <p className="text-sm text-muted-foreground">Manage supplier database</p>
//         </div>
//         <div className="flex gap-2 flex-wrap">
//           <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
//           <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" />PDF</Button>
//           <Dialog open={showCreate} onOpenChange={setShowCreate}>
//             <DialogTrigger asChild>
//               <Button><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
//               <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
//               <div className="space-y-4 pt-2">
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
//                   <div className="space-y-1.5">
//                     <Label>Supplier Type *</Label>
//                     <Select value={supplierType} onValueChange={setSupplierType}>
//                       <SelectTrigger><SelectValue /></SelectTrigger>
//                       <SelectContent>
//                         {SUPPLIER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-1.5">
//                     <Label>Category</Label>
//                     <Select value={category} onValueChange={setCategory}>
//                       <SelectTrigger><SelectValue /></SelectTrigger>
//                       <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
//                     </Select>
//                   </div>
//                   <div className="space-y-1.5"><Label>Nature of Supply</Label><Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. Credit 30 days" /></div>
//                 </div>
//                 <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-1.5"><Label>GST Number</Label><Input value={gst} onChange={(e) => setGst(e.target.value)} /></div>
//                   <div className="space-y-1.5"><Label>Contact Person</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
//                 </div>
//                 <div className="grid grid-cols-3 gap-3">
//                   <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
//                   <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
//                   <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
//                 </div>
//                 <div className="space-y-1.5"><Label>TAT (days)</Label><Input type="number" value={tat} onChange={(e) => setTat(e.target.value)} /></div>
//                 <Button onClick={() => createSupplier.mutate()} disabled={!name || createSupplier.isPending} className="w-full">
//                   {createSupplier.isPending ? "Adding..." : "Add Supplier"}
//                 </Button>
//               </div>
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       <div className="flex flex-col sm:flex-row gap-3">
//         <div className="relative flex-1">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//           <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
//         </div>
//         <Select value={typeFilter} onValueChange={setTypeFilter}>
//           <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">All Types</SelectItem>
//             {SUPPLIER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
//           </SelectContent>
//         </Select>
//       </div>

//       {/* Mobile cards */}
//       <div className="grid grid-cols-1 sm:hidden gap-3">
//         {filtered.map((s: any) => (
//           <Card key={s.id}>
//             <CardContent className="p-4">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <p className="text-sm font-semibold text-foreground">{s.name}</p>
//                   <p className="text-xs text-muted-foreground">{s.contact_person} • {s.phone}</p>
//                 </div>
//                 <div className="flex flex-col items-end gap-1">
//                   <Badge variant="outline" className={typeColor[(s as any).supplier_type] || ""}>{typeLabel((s as any).supplier_type || "material")}</Badge>
//                   <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
//                 </div>
//               </div>
//               <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
//                 <span>TAT: {s.tat_days}d</span>
//                 <span>GST: {s.gst_number || "—"}</span>
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {/* Desktop table */}
//       <Card className="hidden sm:block">
//         <CardContent className="p-0">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="border-b border-border bg-muted/30">
//                   <th className="text-left py-3 px-3 font-medium text-muted-foreground">Supplier</th>
//                   <th className="text-center py-3 px-3 font-medium text-muted-foreground">Type</th>
//                   <th className="text-center py-3 px-3 font-medium text-muted-foreground">Category</th>
//                   <th className="text-left py-3 px-3 font-medium text-muted-foreground">Contact</th>
//                   <th className="text-center py-3 px-3 font-medium text-muted-foreground">TAT</th>
//                   <th className="text-left py-3 px-3 font-medium text-muted-foreground">GST</th>
//                   <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.map((s: any) => (
//                   <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50">
//                     <td className="py-3 px-3">
//                       <p className="font-medium text-foreground">{s.name}</p>
//                       <p className="text-xs text-muted-foreground">{s.address}</p>
//                     </td>
//                     <td className="py-3 px-3 text-center">
//                       <Badge variant="outline" className={`text-xs ${typeColor[(s as any).supplier_type] || ""}`}>{typeLabel((s as any).supplier_type || "material")}</Badge>
//                     </td>
//                     <td className="py-3 px-3 text-center"><Badge variant="outline" className="text-xs">{s.category}</Badge></td>
//                     <td className="py-3 px-3">
//                       <p className="text-foreground text-xs">{s.contact_person}</p>
//                       <p className="text-muted-foreground text-xs">{s.phone}</p>
//                     </td>
//                     <td className="py-3 px-3 text-center text-foreground">{s.tat_days}d</td>
//                     <td className="py-3 px-3 text-muted-foreground text-xs">{s.gst_number || "—"}</td>
//                     <td className="py-3 px-3 text-center">
//                       <Badge variant="outline" className={s.is_active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
//                         {s.is_active ? "Active" : "Inactive"}
//                       </Badge>
//                     </td>
//                   </tr>
//                 ))}
//                 {filtered.length === 0 && (
//                   <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No suppliers found</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }






//  WITHOUT EXPORT FUNCTIONALITY 



import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  Plus, Search, X, ChevronRight, ArrowLeft, Phone, Mail,
  MapPin, User, Edit2, AlertTriangle, Loader2, Building2,
  Package, Wrench, ShoppingCart, Star, FileText, Check,
  Hash, Globe, CreditCard, Truck, Tag, MoreVertical,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   SQL to run first in Supabase (if not done):
   
   ALTER TABLE public.suppliers
     ADD COLUMN IF NOT EXISTS supplier_type text DEFAULT 'job_work'
       CHECK (supplier_type IN ('job_work','raw_material','consumable')),
     ADD COLUMN IF NOT EXISTS process_types text[] DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS material_categories text[] DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS gst_number text,
     ADD COLUMN IF NOT EXISTS pan_number text,
     ADD COLUMN IF NOT EXISTS bank_name text,
     ADD COLUMN IF NOT EXISTS bank_account text,
     ADD COLUMN IF NOT EXISTS bank_ifsc text,
     ADD COLUMN IF NOT EXISTS address text,
     ADD COLUMN IF NOT EXISTS city text,
     ADD COLUMN IF NOT EXISTS state text,
     ADD COLUMN IF NOT EXISTS rating integer DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
     ADD COLUMN IF NOT EXISTS payment_terms text,
     ADD COLUMN IF NOT EXISTS notes text,
     ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
type SupplierType = "job_work" | "raw_material" | "consumable";

type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  supplier_type: SupplierType;
  process_types: string[] | null;       // job_work only
  material_categories: string[] | null; // raw_material / consumable
  gst_number: string | null;
  pan_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const JW_PROCESSES = [
  "Polishing", "Hardening", "CG (Surface Grinding)", "Laser Welding",
  "CMM (Coordinate Measuring)", "Vacuum Heat Treatment", "EDM (Wire Cut)",
  "EDM (Die Sinking)", "CNC Milling", "CNC Turning", "Heat Treatment",
  "Chrome Plating", "Nitriding", "Black Oxide", "Other",
];

const RM_CATEGORIES = [
  "Steel (Tool Steel)", "Steel (Mild Steel)", "Steel (Stainless Steel)",
  "Aluminium", "Copper", "Brass", "Beryllium Copper",
  "Hot Work Steel", "Cold Work Steel", "Pre-hardened Steel",
  "Other Metals",
];

const CONSUMABLE_CATEGORIES = [
  "Cutting Tools", "Abrasives & Grinding Wheels", "Lubricants & Coolants",
  "Safety Equipment", "PPE (Gloves, Masks, Goggles)", "Cleaning Supplies",
  "Stationery & Office", "Electrical Components", "Fasteners & Hardware",
  "Hydraulic & Pneumatic", "Packaging Materials", "Other Consumables",
];

const PAYMENT_TERMS = ["Immediate", "7 Days", "15 Days", "30 Days", "45 Days", "60 Days", "Against Delivery"];

const TAB_CONFIG: Record<SupplierType, {
  label: string; shortLabel: string; icon: React.ElementType;
  color: string; bg: string; border: string;
  activeBg: string; activeBorder: string; activeText: string;
  description: string;
}> = {
  job_work: {
    label: "Job Work Suppliers", shortLabel: "Job Work",
    icon: Wrench,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-100 dark:border-violet-900/40",
    activeBg: "bg-violet-50 dark:bg-violet-900/20",
    activeBorder: "border-violet-300 dark:border-violet-600",
    activeText: "text-violet-700 dark:text-violet-300",
    description: "Suppliers who perform machining & process work",
  },
  raw_material: {
    label: "Raw Material Suppliers", shortLabel: "Raw Material",
    icon: Package,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-900/40",
    activeBg: "bg-blue-50 dark:bg-blue-900/20",
    activeBorder: "border-blue-300 dark:border-blue-600",
    activeText: "text-blue-700 dark:text-blue-300",
    description: "Steel, copper, aluminium and other base materials",
  },
  consumable: {
    label: "Consumables & Others", shortLabel: "Consumables",
    icon: ShoppingCart,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    activeBg: "bg-emerald-50 dark:bg-emerald-900/20",
    activeBorder: "border-emerald-300 dark:border-emerald-600",
    activeText: "text-emerald-700 dark:text-emerald-300",
    description: "Tools, safety items, stationery and consumable goods",
  },
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const fd = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy") : "—";
const ago = (d?: string | null) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "";

const inputCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors";
const labelCls = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

/* ══════════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════════ */
const Field = ({ label, type = "text", value, onChange, placeholder, options, required }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; options?: string[]; required?: boolean;
}) => (
  <div>
    <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {type === "textarea" ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        placeholder={placeholder} className={cn(inputCls, "resize-none")} />
    ) : type === "select" && options ? (
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} className={inputCls} />
    )}
  </div>
);

/* Multi-select checkbox grid */
const MultiSelect = ({ label, options, selected, onChange, color }: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; color: string;
}) => {
  const toggle = (o: string) =>
    selected.includes(o)
      ? onChange(selected.filter(s => s !== o))
      : onChange([...selected, o]);

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map(o => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
              selected.includes(o)
                ? cn("border-transparent text-white", color)
                : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
            )}>
            {selected.includes(o) && <span className="mr-1">✓</span>}
            {o}
          </button>
        ))}
      </div>
    </div>
  );
};

/* Star rating */
const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div>
    <label className={labelCls}>Supplier Rating</label>
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            n <= value ? "text-[#EAB308]" : "text-neutral-200 dark:text-neutral-700 hover:text-neutral-400")}>
          <Star className="w-5 h-5" fill={n <= value ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      ))}
      <span className="text-xs text-neutral-400 dark:text-neutral-500 self-center ml-2">{value}/5</span>
    </div>
  </div>
);

/* Section divider */
const Divider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</span>
    <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
  </div>
);

/* Modal wrapper */
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
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 dark:text-neutral-500">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      {footer && <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">{footer}</div>}
    </div>
  </div>
);

/* DR = detail row */
const DR = ({ label, value, icon: Icon }: {
  label: string; value?: React.ReactNode; icon?: React.ElementType;
}) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />}
      <span className="text-sm text-neutral-400 dark:text-neutral-500 whitespace-nowrap">{label}</span>
    </div>
    <span className="text-sm font-medium text-neutral-800 dark:text-white text-right">{value ?? "—"}</span>
  </div>
);

/* SC = section card */
const SC = ({ title, icon: Icon, children }: {
  title: string; icon?: React.ElementType; children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />}
      <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</span>
    </div>
    <div className="px-4 py-3">{children}</div>
  </div>
);

/* Tag pill */
const TagPill = ({ label, color }: { label: string; color: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium", color)}>
    {label}
  </span>
);

/* Stars display */
const Stars = ({ rating }: { rating: number | null }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} className={cn("w-3.5 h-3.5",
        n <= (rating ?? 0) ? "text-[#EAB308]" : "text-neutral-200 dark:text-neutral-700"
      )} fill={n <= (rating ?? 0) ? "currentColor" : "none"} strokeWidth={1.5} />
    ))}
  </div>
);

/* ══════════════════════════════════════════════
   SUPPLIER FORM (Add / Edit)
══════════════════════════════════════════════ */
type FormData = {
  name: string; contact_person: string; phone: string; email: string;
  process_types: string[]; material_categories: string[];
  gst_number: string; pan_number: string;
  bank_name: string; bank_account: string; bank_ifsc: string;
  address: string; city: string; state: string;
  rating: number; payment_terms: string; notes: string;
};

const defaultForm = (): FormData => ({
  name: "", contact_person: "", phone: "", email: "",
  process_types: [], material_categories: [],
  gst_number: "", pan_number: "",
  bank_name: "", bank_account: "", bank_ifsc: "",
  address: "", city: "", state: "",
  rating: 3, payment_terms: "30 Days", notes: "",
});

const SupplierFormModal = ({
  supplierType, supplier, onClose,
}: {
  supplierType: SupplierType; supplier?: Supplier; onClose: (refresh?: boolean) => void;
}) => {
  const qc = useQueryClient();
  const cfg = TAB_CONFIG[supplierType];
  const isEdit = !!supplier;

  const [form, setForm] = useState<FormData>(() => ({
    name: supplier?.name ?? "",
    contact_person: supplier?.contact_person ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    process_types: supplier?.process_types ?? [],
    material_categories: supplier?.material_categories ?? [],
    gst_number: supplier?.gst_number ?? "",
    pan_number: supplier?.pan_number ?? "",
    bank_name: supplier?.bank_name ?? "",
    bank_account: supplier?.bank_account ?? "",
    bank_ifsc: supplier?.bank_ifsc ?? "",
    address: supplier?.address ?? "",
    city: supplier?.city ?? "",
    state: supplier?.state ?? "",
    rating: supplier?.rating ?? 3,
    payment_terms: supplier?.payment_terms ?? "30 Days",
    notes: supplier?.notes ?? "",
  }));
  const [error, setError] = useState("");

  const set = (k: keyof FormData) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Supplier name is required");
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        supplier_type: supplierType,
        process_types: supplierType === "job_work" ? form.process_types : null,
        material_categories: supplierType !== "job_work" ? form.material_categories : null,
        gst_number: form.gst_number || null,
        pan_number: form.pan_number || null,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        bank_ifsc: form.bank_ifsc || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        rating: form.rating,
        payment_terms: form.payment_terms || null,
        notes: form.notes || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("suppliers").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", supplier!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers", supplierType] });
      onClose(true);
    },
    onError: (e: any) => setError(e.message ?? "Failed to save"),
  });

  const multiOptions = supplierType === "job_work"
    ? JW_PROCESSES
    : supplierType === "raw_material"
      ? RM_CATEGORIES
      : CONSUMABLE_CATEGORIES;

  const multiLabel = supplierType === "job_work" ? "Work Processes Offered" : "Material / Product Categories";
  const multiColor = supplierType === "job_work"
    ? "bg-violet-600" : supplierType === "raw_material"
      ? "bg-blue-600" : "bg-emerald-600";

  return (
    <Modal
      title={isEdit ? `Edit Supplier` : `Add ${cfg.label.replace(" Suppliers", "")} Supplier`}
      onClose={() => onClose()}
      wide
      footer={
        <div className="flex gap-3">
          <button onClick={() => onClose()} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? "Saving…" : "Adding…"}</>
              : isEdit ? "Save Changes" : `Add Supplier`}
          </button>
        </div>
      }>

      {/* Type indicator */}
      <div className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl border", cfg.bg, cfg.border)}>
        <cfg.icon className={cn("w-4 h-4", cfg.color)} strokeWidth={1.8} />
        <div>
          <p className={cn("text-xs font-bold", cfg.color)}>{cfg.label}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{cfg.description}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Basic info */}
      <Divider label="Basic Information" />
      <Field label="Supplier / Company Name" value={form.name} onChange={set("name")} placeholder="e.g. Bagri Steel Corporation" required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact Person" value={form.contact_person} onChange={set("contact_person")} placeholder="Name" />
        <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 9XXXXXXXXX" />
      </div>
      <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="email@company.com" />

      {/* Type-specific: processes or categories */}
      <Divider label={supplierType === "job_work" ? "Work Capabilities" : "Product Categories"} />
      <MultiSelect
        label={multiLabel}
        options={multiOptions}
        selected={supplierType === "job_work" ? form.process_types : form.material_categories}
        onChange={supplierType === "job_work" ? set("process_types") : set("material_categories")}
        color={multiColor}
      />

      {/* Address */}
      <Divider label="Address" />
      <Field label="Street Address" type="textarea" value={form.address} onChange={set("address")} placeholder="Plot / Street / Area" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={form.city} onChange={set("city")} placeholder="City" />
        <Field label="State" value={form.state} onChange={set("state")} placeholder="State" />
      </div>

      {/* Financial */}
      <Divider label="Financial & Compliance" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="GST Number" value={form.gst_number} onChange={set("gst_number")} placeholder="22AAAAA0000A1Z5" />
        <Field label="PAN Number" value={form.pan_number} onChange={set("pan_number")} placeholder="AAAPL1234C" />
      </div>
      <Field label="Payment Terms" type="select" value={form.payment_terms} onChange={set("payment_terms")} options={PAYMENT_TERMS} />

      {/* Bank */}
      <Divider label="Bank Details" />
      <Field label="Bank Name" value={form.bank_name} onChange={set("bank_name")} placeholder="e.g. HDFC Bank" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account Number" value={form.bank_account} onChange={set("bank_account")} placeholder="Account number" />
        <Field label="IFSC Code" value={form.bank_ifsc} onChange={set("bank_ifsc")} placeholder="HDFC0001234" />
      </div>

      {/* Rating + Notes */}
      <Divider label="Rating & Notes" />
      <StarRating value={form.rating} onChange={set("rating")} />
      <Field label="Internal Notes" type="textarea" value={form.notes} onChange={set("notes")} placeholder="Any internal notes about this supplier…" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   SUPPLIER DETAIL VIEW
══════════════════════════════════════════════ */
const SupplierDetail = ({
  supplier, onBack, onEdit,
}: {
  supplier: Supplier; onBack: () => void; onEdit: () => void;
}) => {
  const qc = useQueryClient();
  const cfg = TAB_CONFIG[supplier.supplier_type];

  const toggleActive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("suppliers")
        .update({ is_active: !supplier.is_active, updated_at: new Date().toISOString() })
        .eq("id", supplier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers", supplier.supplier_type] });
      onBack();
    },
  });

  /* Fetch job counts from job_work or rm_buying */
  const { data: jobCount = 0 } = useQuery({
    queryKey: ["supplier-jobs", supplier.id],
    queryFn: async () => {
      if (supplier.supplier_type === "job_work") {
        const { count } = await supabase.from("job_work").select("*", { count: "exact", head: true }).eq("supplier_id", supplier.id);
        return count ?? 0;
      } else {
        const { count } = await supabase.from("rm_buying").select("*", { count: "exact", head: true }).eq("supplier_id", supplier.id);
        return count ?? 0;
      }
    },
  });

  const tags = supplier.supplier_type === "job_work"
    ? supplier.process_types ?? []
    : supplier.material_categories ?? [];

  const tagColor = supplier.supplier_type === "job_work"
    ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-900/40"
    : supplier.supplier_type === "raw_material"
      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40"
      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40";

  return (
    <div className="space-y-4 pb-8">
      {/* Back bar */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">{supplier.name}</h2>
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold", cfg.bg, cfg.border, cfg.color)}>
              <cfg.icon className="w-3 h-3 mr-1" strokeWidth={2} />{cfg.shortLabel}
            </span>
            {!supplier.is_active && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/40">
                Inactive
              </span>
            )}
          </div>
          {supplier.city && <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">{[supplier.city, supplier.state].filter(Boolean).join(", ")}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />Edit
          </button>
          <button onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
              supplier.is_active
                ? "border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                : "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
            )}>
            {toggleActive.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : supplier.is_active ? <XCircle className="w-3.5 h-3.5" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
            {supplier.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{jobCount}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            {supplier.supplier_type === "job_work" ? "Job Work Orders" : "Purchase Orders"}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-4 py-3 text-center">
          <Stars rating={supplier.rating} />
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Rating</p>
        </div>
        <div className={cn("rounded-2xl px-4 py-3 text-center border", cfg.bg, cfg.border)}>
          <p className={cn("text-2xl font-bold", cfg.color)}>{tags.length}</p>
          <p className={cn("text-xs mt-0.5", cfg.color, "opacity-70")}>
            {supplier.supplier_type === "job_work" ? "Processes" : "Categories"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* LEFT */}
        <div className="lg:col-span-3 space-y-4">

          {/* Tags — processes or categories */}
          {tags.length > 0 && (
            <SC title={supplier.supplier_type === "job_work" ? "Work Processes" : "Material / Product Categories"}
              icon={supplier.supplier_type === "job_work" ? Wrench : Tag}>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => <TagPill key={t} label={t} color={tagColor} />)}
              </div>
            </SC>
          )}

          {/* Contact */}
          <SC title="Contact Information" icon={Phone}>
            <DR label="Contact Person" value={supplier.contact_person} icon={User} />
            <DR label="Phone" value={supplier.phone ? <a href={`tel:${supplier.phone}`} className="text-[#EAB308] hover:underline">{supplier.phone}</a> : null} icon={Phone} />
            <DR label="Email" value={supplier.email ? <a href={`mailto:${supplier.email}`} className="text-[#EAB308] hover:underline">{supplier.email}</a> : null} icon={Mail} />
            {(supplier.address || supplier.city) && (
              <DR label="Address" icon={MapPin}
                value={[supplier.address, supplier.city, supplier.state].filter(Boolean).join(", ")} />
            )}
          </SC>

          {/* Notes */}
          {supplier.notes && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Internal Notes</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-4">
          <SC title="Financial Details" icon={CreditCard}>
            <DR label="GST Number" value={supplier.gst_number} icon={Hash} />
            <DR label="PAN Number" value={supplier.pan_number} icon={Hash} />
            <DR label="Payment Terms" value={supplier.payment_terms} icon={CreditCard} />
          </SC>

          <SC title="Bank Details" icon={Building2}>
            <DR label="Bank" value={supplier.bank_name} icon={Building2} />
            <DR label="Account No." value={supplier.bank_account} icon={Hash} />
            <DR label="IFSC Code" value={supplier.bank_ifsc} icon={Hash} />
          </SC>

          <SC title="Record Info" icon={FileText}>
            <DR label="Added" value={fd(supplier.created_at)} />
            <DR label="Last Updated" value={ago(supplier.updated_at)} />
            <DR label="Status" value={
              <span className={cn("text-xs font-semibold", supplier.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                {supplier.is_active ? "● Active" : "● Inactive"}
              </span>
            } />
          </SC>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   SUPPLIER CARD (list item)
══════════════════════════════════════════════ */
const SupplierCard = ({ supplier, onClick }: { supplier: Supplier; onClick: () => void }) => {
  const cfg = TAB_CONFIG[supplier.supplier_type];
  const tags = (supplier.supplier_type === "job_work" ? supplier.process_types : supplier.material_categories) ?? [];
  const tagColor = supplier.supplier_type === "job_work"
    ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40"
    : supplier.supplier_type === "raw_material"
      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40"
      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40";

  return (
    <div onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0 group">

      {/* Avatar */}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold border", cfg.bg, cfg.border, cfg.color)}>
        {supplier.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{supplier.name}</p>
          {!supplier.is_active && (
            <span className="flex-shrink-0 text-[10px] font-bold text-red-400 border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
              Inactive
            </span>
          )}
        </div>
        {supplier.contact_person && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {supplier.contact_person}{supplier.city ? ` · ${supplier.city}` : ""}
          </p>
        )}
        {/* Tags preview */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {tags.slice(0, 3).map(t => (
              <span key={t} className={cn("inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium", tagColor)}>
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 self-center">+{tags.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Rating + arrow */}
      <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
        <Stars rating={supplier.rating} />
        {supplier.payment_terms && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{supplier.payment_terms}</p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" strokeWidth={1.8} />
    </div>
  );
};

/* ══════════════════════════════════════════════
   TAB PANEL (one type's list)
══════════════════════════════════════════════ */
const TabPanel = ({
  supplierType,
  onSelect,
}: {
  supplierType: SupplierType;
  onSelect: (s: Supplier) => void;
}) => {
  const cfg = TAB_CONFIG[supplierType];
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", supplierType],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .eq("supplier_type", supplierType)
        .order("name");
      return (data ?? []) as Supplier[];
    },
  });

  const filtered = suppliers.filter(s => {
    if (!showInactive && !s.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contact_person ?? "").toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        (s.process_types ?? []).some(p => p.toLowerCase().includes(q)) ||
        (s.material_categories ?? []).some(c => c.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = suppliers.filter(s => s.is_active).length;
  const inactiveCount = suppliers.filter(s => !s.is_active).length;

  return (
    <>
      {/* Stat strip */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", cfg.bg, cfg.border)}>
          <cfg.icon className={cn("w-4 h-4", cfg.color)} strokeWidth={1.8} />
          <span className={cn("text-sm font-semibold", cfg.color)}>{activeCount} Active</span>
        </div>
        {inactiveCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
            <span className="text-sm text-neutral-400 dark:text-neutral-500">{inactiveCount} Inactive</span>
          </div>
        )}
        <p className="text-sm text-neutral-400 dark:text-neutral-500 flex-1">{cfg.description}</p>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1.8} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={supplierType === "job_work"
              ? "Search name, process, city…"
              : "Search name, material, city…"}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:border-[#EAB308]/60 transition-colors" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded accent-[#EAB308]" />
          <span className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">Show inactive</span>
        </label>
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
        {/* Column header */}
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 border-b border-neutral-50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/20">
          <span className="flex-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Supplier
          </span>
          <span className="w-48 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            {supplierType === "job_work" ? "Processes" : "Categories"}
          </span>
          <span className="w-24 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Rating</span>
          <span className="w-4" />
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-7 h-7 text-[#EAB308] animate-spin mx-auto" />
            <p className="text-sm text-neutral-400 mt-3">Loading suppliers…</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map(s => <SupplierCard key={s.id} supplier={s} onClick={() => onSelect(s)} />)
        ) : (
          <div className="py-16 text-center">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border", cfg.bg, cfg.border)}>
              <cfg.icon className={cn("w-6 h-6", cfg.color)} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {search ? "No suppliers found" : `No ${cfg.shortLabel} suppliers yet`}
            </p>
            <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-1">
              {search ? "Try a different search" : "Add your first supplier to get started"}
            </p>
            {!search && (
              <button onClick={() => setShowAdd(true)}
                className="mt-4 inline-flex items-center gap-1.5 bg-[#EAB308] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Plus className="w-4 h-4" />Add Supplier
              </button>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-50 dark:border-neutral-800">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{filtered.length} of {suppliers.length} suppliers</p>
          </div>
        )}
      </div>

      {showAdd && (
        <SupplierFormModal supplierType={supplierType} onClose={refresh => {
          setShowAdd(false);
        }} />
      )}
    </>
  );
};

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function SuppliersPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<SupplierType>("job_work");
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  /* Total counts per type for tab badges */
  const { data: counts = {} } = useQuery({
    queryKey: ["supplier-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("supplier_type, is_active");
      const c: Record<string, number> = {};
      (data ?? []).forEach((s: any) => {
        if (s.is_active) c[s.supplier_type] = (c[s.supplier_type] ?? 0) + 1;
      });
      return c;
    },
  });

  if (selected) {
    return (
      <>
        <SupplierDetail
          supplier={selected}
          onBack={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
        />
        {editing && (
          <SupplierFormModal
            supplierType={editing.supplier_type}
            supplier={editing}
            onClose={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["suppliers", editing.supplier_type] });
              qc.invalidateQueries({ queryKey: ["supplier-counts"] });
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Suppliers</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
            {(Object.values(counts) as number[]).reduce((a, b) => a + b, 0)} active suppliers across all categories
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="self-start sm:self-auto inline-flex items-center gap-2 bg-[#EAB308] hover:bg-yellow-500 active:scale-[.98] text-black font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
          <Plus className="w-4 h-4" strokeWidth={2} />Add Supplier
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.entries(TAB_CONFIG) as [SupplierType, typeof TAB_CONFIG[SupplierType]][]).map(([type, cfg]) => (
          <button key={type} onClick={() => setActiveTab(type)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
              activeTab === type
                ? cn(cfg.activeBg, cfg.activeBorder, cfg.activeText)
                : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-200 dark:hover:border-neutral-700"
            )}>
            <cfg.icon className="w-4 h-4" strokeWidth={1.8} />
            {cfg.shortLabel}
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-lg font-bold",
              activeTab === type
                ? cn(cfg.bg, cfg.color)
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
            )}>
              {counts[type] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Active panel */}
      <TabPanel
        key={activeTab}
        supplierType={activeTab}
        onSelect={setSelected}
      />

      {/* Add modal — type defaults to active tab */}
      {showAdd && (
        <SupplierFormModal
          supplierType={activeTab}
          onClose={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ["suppliers", activeTab] });
            qc.invalidateQueries({ queryKey: ["supplier-counts"] });
          }}
        />
      )}
    </div>
  );
}