import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type DocStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'no_renewal';
type VehicleType = 'car' | 'truck' | 'van' | 'bike' | 'tempo' | 'bus' | 'other';
type VehicleDocType =
  | 'registration_certificate'
  | 'insurance'
  | 'puc'
  | 'fitness_certificate'
  | 'road_tax'
  | 'permit'
  | 'other';

interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  year: number | null;
  vehicle_type: VehicleType;
  color: string | null;
  engine_number: string | null;
  chassis_number: string | null;
  fuel_type: string | null;
  owner_name: string | null;
  department: string | null;
  assigned_driver: string | null;
  seating_capacity: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicle_documents?: VehicleDocument[];
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  doc_type: VehicleDocType;
  doc_type_label: string | null;
  doc_number: string | null;
  issued_by: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  is_renewable: boolean;
  status: DocStatus;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyCertificate {
  id: string;
  cert_name: string;
  cert_number: string | null;
  category: string;
  issued_by: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  is_renewable: boolean;
  status: DocStatus;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RenewalHistory {
  id: string;
  vehicle_doc_id: string | null;
  company_cert_id: string | null;
  old_expiry_date: string | null;
  new_expiry_date: string;
  old_doc_number: string | null;
  new_doc_number: string | null;
  new_file_name: string | null;
  renewal_notes: string | null;
  renewed_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_DOC_LABELS: Record<VehicleDocType, string> = {
  registration_certificate: 'RC / Registration Certificate',
  insurance: 'Insurance',
  puc: 'PUC Certificate',
  fitness_certificate: 'Fitness Certificate',
  road_tax: 'Road Tax',
  permit: 'Permit',
  other: 'Other',
};

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: '🚗 Car',
  truck: '🚛 Truck',
  van: '🚐 Van',
  bike: '🏍️ Bike',
  tempo: '🚜 Tempo',
  bus: '🚌 Bus',
  other: '🚙 Other',
};

const CERT_CATEGORIES = [
  'Tax & Compliance',
  'Factory Act',
  'MSME',
  'Quality Certification',
  'Safety',
  'Labor Compliance',
  'Environment',
  'Import/Export',
  'Other',
];

const STATUS_CONFIG: Record<
  DocStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    border: 'border-red-200',
  },
  renewed: {
    label: 'Renewed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
  },
  no_renewal: {
    label: 'No Renewal',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
};

// ─── Blank form defaults (outside components to avoid stale closure issues) ───
const BLANK_CERT_FORM: Record<string, string> = {
  cert_name: '',
  cert_number: '',
  category: 'Tax & Compliance',
  issued_by: '',
  issue_date: '',
  expiry_date: '',
  is_renewable: 'true',
  notes: '',
};

const BLANK_VEHICLE_FORM: Record<string, string> = {
  vehicle_number: '',
  make: '',
  model: '',
  year: '',
  vehicle_type: 'car',
  color: '',
  engine_number: '',
  chassis_number: '',
  fuel_type: 'Diesel',
  owner_name: '',
  department: '',
  assigned_driver: '',
  seating_capacity: '',
  notes: '',
};

const BLANK_DOC_FORM: Record<string, string> = {
  doc_type: 'insurance',
  doc_type_label: '',
  doc_number: '',
  issued_by: '',
  issue_date: '',
  expiry_date: '',
  is_renewable: 'true',
  notes: '',
};

// ─── Helper functions ─────────────────────────────────────────────────────────
const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : '—';

const fmtSize = (b: number | null) =>
  b
    ? b >= 1048576
      ? `${(b / 1048576).toFixed(1)} MB`
      : `${(b / 1024).toFixed(0)} KB`
    : '';

const daysUntilExpiry = (d: string | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

// FIX #4 — calcClientStatus is now actually used in insert payloads
function calcClientStatus(expiry: string | null, isRenewable: boolean): DocStatus {
  if (!isRenewable) return 'no_renewal';
  if (!expiry) return 'active';
  const days = daysUntilExpiry(expiry)!;
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'active';
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((r) =>
    headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DocStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── FileUploadZone ───────────────────────────────────────────────────────────
function FileUploadZone({
  onFile,
  current,
}: {
  onFile: (f: File) => void;
  current?: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onClick={() => ref.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${dragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
        }`}
    >
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div className="flex flex-col items-center gap-2">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        {current ? (
          <p className="text-sm text-slate-600">
            Current:{' '}
            <span className="font-medium text-indigo-600">{current}</span> — click
            to replace
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">
              Drop file here or click to browse
            </p>
            <p className="text-xs text-slate-400">PDF, JPG, PNG, DOC — max 50 MB</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} bg-white rounded-2xl shadow-2xl border border-slate-100`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────
const LabeledInput = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all bg-white';
const selectCls = `${inputCls} cursor-pointer`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DocumentManagement() {
  const [tab, setTab] = useState<'overview' | 'company' | 'vehicles'>('overview');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companyCerts, setCompanyCerts] = useState<CompanyCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addCertOpen, setAddCertOpen] = useState(false);
  const [addVehicleDocOpen, setAddVehicleDocOpen] = useState<string | null>(null);
  const [detailDoc, setDetailDoc] = useState<{
    type: 'cert' | 'vdoc';
    item: CompanyCertificate | VehicleDocument;
  } | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [renewTarget, setRenewTarget] = useState<{
    type: 'cert' | 'vdoc';
    item: CompanyCertificate | VehicleDocument;
  } | null>(null);
  const [editCert, setEditCert] = useState<CompanyCertificate | null>(null);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [editVehicleDoc, setEditVehicleDoc] = useState<VehicleDocument | null>(null);

  // Filters
  const [certFilter, setCertFilter] = useState<DocStatus | 'all'>('all');
  const [certSearch, setCertSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, vehicle_documents(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) console.error('fetchVehicles error:', error.message);
    if (data) setVehicles(data as unknown as Vehicle[]);
  }, []);

  const fetchCerts = useCallback(async () => {
    const { data, error } = await supabase
      .from('company_certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('fetchCerts error:', error.message);
    if (data) setCompanyCerts(data as unknown as CompanyCertificate[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchVehicles(), fetchCerts()]).then(() => setLoading(false));

    // FIX #9 — wrap callbacks so extra payload arg is not passed to async fetch fns
    const ch1 = supabase
      .channel('company_certificates_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_certificates' },
        () => fetchCerts()
      )
      .subscribe();

    const ch2 = supabase
      .channel('vehicles_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => fetchVehicles()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_documents' },
        () => fetchVehicles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchVehicles, fetchCerts]);

  // ── File upload helper ──────────────────────────────────────────────────────
  const uploadFile = async (
    file: File,
    folder: string
  ): Promise<{ path: string; name: string; size: number } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) {
      alert('File upload failed: ' + error.message);
      return null;
    }
    return { path, name: file.name, size: file.size };
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const allDocs = [
    ...companyCerts,
    ...vehicles.flatMap((v) => v.vehicle_documents || []),
  ];
  const stats = {
    total: allDocs.length,
    active: allDocs.filter((d) => d.status === 'active' || d.status === 'renewed').length,
    expiring: allDocs.filter((d) => d.status === 'expiring_soon').length,
    expired: allDocs.filter((d) => d.status === 'expired').length,
    noRenewal: allDocs.filter((d) => d.status === 'no_renewal').length,
  };

  const expiringSoon = [
    ...companyCerts
      .filter((c) => c.status === 'expiring_soon' || c.status === 'expired')
      .map((c) => ({
        id: c.id,
        name: c.cert_name,
        expiry: c.expiry_date,
        type: 'Company Cert',
        status: c.status as DocStatus,
      })),
    ...vehicles.flatMap((v) =>
      (v.vehicle_documents || [])
        .filter((d) => d.status === 'expiring_soon' || d.status === 'expired')
        .map((d) => ({
          id: d.id,
          name: `${v.vehicle_number} — ${VEHICLE_DOC_LABELS[d.doc_type]}`,
          expiry: d.expiry_date,
          type: 'Vehicle Doc',
          status: d.status as DocStatus,
        }))
    ),
  ].sort((a, b) => (a.expiry ?? '').localeCompare(b.expiry ?? ''));

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportCerts = () =>
    exportToCSV(
      companyCerts.map((c) => ({
        Name: c.cert_name,
        Number: c.cert_number ?? '',
        Category: c.category,
        'Issued By': c.issued_by ?? '',
        'Issue Date': fmt(c.issue_date),
        'Expiry Date': fmt(c.expiry_date),
        Renewable: c.is_renewable ? 'Yes' : 'No',
        Status: STATUS_CONFIG[c.status].label,
        Notes: c.notes ?? '',
      })),
      'company_certificates'
    );

  const exportVehicles = () =>
    exportToCSV(
      vehicles.flatMap((v) =>
        (v.vehicle_documents || []).map((d) => ({
          'Vehicle No': v.vehicle_number,
          Make: v.make,
          Model: v.model,
          'Doc Type': VEHICLE_DOC_LABELS[d.doc_type],
          'Doc Number': d.doc_number ?? '',
          'Issued By': d.issued_by ?? '',
          'Issue Date': fmt(d.issue_date),
          'Expiry Date': fmt(d.expiry_date),
          Renewable: d.is_renewable ? 'Yes' : 'No',
          Status: STATUS_CONFIG[d.status].label,
        }))
      ),
      'vehicle_documents'
    );

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading documents…</p>
        </div>
      </div>
    );

  // ── Filtered certs ──────────────────────────────────────────────────────────
  const filteredCerts = companyCerts.filter((c) => {
    const matchStatus = certFilter === 'all' || c.status === certFilter;
    const q = certSearch.toLowerCase();
    const matchSearch =
      !q ||
      c.cert_name.toLowerCase().includes(q) ||
      (c.cert_number ?? '').toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredVehicles = vehicles.filter((v) => {
    const q = vehicleSearch.toLowerCase();
    return (
      !q ||
      v.vehicle_number.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-sm shadow-indigo-200 flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 leading-none">
                  Document Management
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">Procurement / Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCerts}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Certs
              </button>
              <button
                onClick={exportVehicles}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Vehicles
              </button>
              <button
                onClick={() =>
                  tab === 'vehicles' ? setAddVehicleOpen(true) : setAddCertOpen(true)
                }
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add {tab === 'vehicles' ? 'Vehicle' : 'Certificate'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 pb-0 -mb-px">
            {(['overview', 'company', 'vehicles'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all capitalize
                  ${tab === t
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t === 'overview'
                  ? '📊 Overview'
                  : t === 'company'
                    ? '🏢 Company Certs'
                    : '🚗 Vehicle Docs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Total Docs',
                  value: stats.total,
                  color: 'text-slate-700',
                  bg: 'bg-white',
                  border: 'border-slate-200',
                },
                {
                  label: 'Active',
                  value: stats.active,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                  border: 'border-emerald-200',
                },
                {
                  label: 'Expiring Soon',
                  value: stats.expiring,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  border: 'border-amber-200',
                },
                {
                  label: 'Expired',
                  value: stats.expired,
                  color: 'text-red-600',
                  bg: 'bg-red-50',
                  border: 'border-red-200',
                },
                {
                  label: 'No Renewal',
                  value: stats.noRenewal,
                  color: 'text-slate-500',
                  bg: 'bg-slate-50',
                  border: 'border-slate-200',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-2xl border ${s.bg} ${s.border} p-4 flex flex-col gap-1`}
                >
                  <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
                  <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {expiringSoon.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <h2 className="font-bold text-slate-800 text-sm">Attention Required</h2>
                  <span className="ml-auto text-xs text-slate-400">
                    {expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {expiringSoon.map((doc) => {
                    const days = daysUntilExpiry(doc.expiry);
                    return (
                      <div
                        key={doc.id}
                        className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {doc.type} · Expiry: {fmt(doc.expiry)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {days !== null && (
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-lg
                              ${days < 0
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                                }`}
                            >
                              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                            </span>
                          )}
                          <StatusBadge status={doc.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-4">
                  Company Certificates by Category
                </h3>
                <div className="space-y-2">
                  {Object.entries(
                    companyCerts.reduce(
                      (acc, c) => {
                        acc[c.category] = (acc[c.category] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    )
                  ).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{cat}</span>
                      <span className="text-sm font-bold text-indigo-600">{count}</span>
                    </div>
                  ))}
                  {companyCerts.length === 0 && (
                    <p className="text-sm text-slate-400">No certificates added yet</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-4">
                  Vehicles & Document Status
                </h3>
                <div className="space-y-2">
                  {vehicles.map((v) => {
                    const docs = v.vehicle_documents || [];
                    const hasExpired = docs.some((d) => d.status === 'expired');
                    const hasExpiring = docs.some((d) => d.status === 'expiring_soon');
                    return (
                      <div key={v.id} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 font-medium">
                          {v.vehicle_number}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{docs.length} docs</span>
                          {hasExpired ? (
                            <StatusBadge status="expired" />
                          ) : hasExpiring ? (
                            <StatusBadge status="expiring_soon" />
                          ) : (
                            <StatusBadge status="active" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {vehicles.length === 0 && (
                    <p className="text-sm text-slate-400">No vehicles added yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ COMPANY CERTS TAB ════════════════════ */}
        {tab === 'company' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'all',
                    'active',
                    'expiring_soon',
                    'expired',
                    'renewed',
                    'no_renewal',
                  ] as const
                ).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCertFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${certFilter === s
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                    {s !== 'all' && (
                      <span className="ml-1 opacity-70">
                        ({companyCerts.filter((c) => c.status === s).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                  placeholder="Search certificates…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>
            </div>

            {/* Group by category */}
            {Object.entries(
              filteredCerts.reduce(
                (acc, c) => {
                  if (!acc[c.category]) acc[c.category] = [];
                  acc[c.category].push(c);
                  return acc;
                },
                {} as Record<string, CompanyCertificate[]>
              )
            ).map(([category, certs]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {certs.map((cert) => (
                    <CertCard
                      key={cert.id}
                      cert={cert}
                      onView={() => setDetailDoc({ type: 'cert', item: cert })}
                      onEdit={() => setEditCert(cert)}
                      onRenew={() =>
                        cert.is_renewable && setRenewTarget({ type: 'cert', item: cert })
                      }
                      onDelete={async () => {
                        if (!confirm(`Delete "${cert.cert_name}"?`)) return;
                        // FIX #5 — handle delete errors
                        const { error } = await supabase
                          .from('company_certificates')
                          .delete()
                          .eq('id', cert.id);
                        if (error) {
                          alert('Delete failed: ' + error.message);
                          return;
                        }
                        fetchCerts();
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredCerts.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📄</p>
                <p className="font-medium">No certificates found</p>
                <p className="text-sm mt-1">
                  Try adjusting filters or add a new certificate
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ VEHICLE DOCS TAB ════════════════════ */}
        {tab === 'vehicles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Search vehicles…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredVehicles.map((vehicle) => (
                <VehicleSection
                  key={vehicle.id}
                  vehicle={vehicle}
                  onViewVehicle={() => setDetailVehicle(vehicle)}
                  onEditVehicle={() => setEditVehicle(vehicle)}
                  onDeleteVehicle={async () => {
                    if (!confirm(`Deactivate vehicle ${vehicle.vehicle_number}?`)) return;
                    // FIX #5 — handle update errors
                    const { error } = await supabase
                      .from('vehicles')
                      .update({ is_active: false })
                      .eq('id', vehicle.id);
                    if (error) {
                      alert('Failed to deactivate vehicle: ' + error.message);
                      return;
                    }
                    fetchVehicles();
                  }}
                  onAddDoc={() => setAddVehicleDocOpen(vehicle.id)}
                  onViewDoc={(doc) => setDetailDoc({ type: 'vdoc', item: doc })}
                  onEditDoc={(doc) => setEditVehicleDoc(doc)}
                  onRenewDoc={(doc) =>
                    doc.is_renewable && setRenewTarget({ type: 'vdoc', item: doc })
                  }
                  onDeleteDoc={async (doc) => {
                    if (!confirm('Delete this document?')) return;
                    // FIX #5 — handle delete errors
                    const { error } = await supabase
                      .from('vehicle_documents')
                      .delete()
                      .eq('id', doc.id);
                    if (error) {
                      alert('Delete failed: ' + error.message);
                      return;
                    }
                    fetchVehicles();
                  }}
                />
              ))}
              {filteredVehicles.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-4xl mb-3">🚗</p>
                  <p className="font-medium">No vehicles found</p>
                  <p className="text-sm mt-1">Add a vehicle to get started</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════ MODALS ════ */}
      <AddCertModal
        open={addCertOpen}
        onClose={() => setAddCertOpen(false)}
        onSave={async (data, file) => {
          let filePath = null,
            fileName = null,
            fileSize = null;
          if (file) {
            const up = await uploadFile(file, 'company-certs');
            if (!up) return;
            filePath = up.path;
            fileName = up.name;
            fileSize = up.size;
          }
          const { error } = await supabase
            .from('company_certificates')
            .insert({ ...data, file_path: filePath, file_name: fileName, file_size: fileSize });
          if (error) { alert('Failed to save certificate: ' + error.message); return; }
          setAddCertOpen(false);
          fetchCerts();
        }}
      />

      <AddCertModal
        open={!!editCert}
        onClose={() => setEditCert(null)}
        editData={editCert}
        onSave={async (data, file) => {
          let updates: Record<string, unknown> = { ...data };
          if (file) {
            const up = await uploadFile(file, 'company-certs');
            if (!up) return;
            updates = { ...updates, file_path: up.path, file_name: up.name, file_size: up.size };
          }
          const { error } = await supabase
            .from('company_certificates')
            .update(updates)
            .eq('id', editCert!.id);
          if (error) { alert('Failed to update certificate: ' + error.message); return; }
          setEditCert(null);
          fetchCerts();
        }}
      />

      <AddVehicleModal
        open={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        onSave={async (data) => {
          const { error } = await supabase.from('vehicles').insert(data);
          if (error) { alert('Failed to add vehicle: ' + error.message); return; }
          setAddVehicleOpen(false);
          fetchVehicles();
        }}
      />

      <AddVehicleModal
        open={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        editData={editVehicle}
        onSave={async (data) => {
          const { error } = await supabase
            .from('vehicles')
            .update(data)
            .eq('id', editVehicle!.id);
          if (error) { alert('Failed to update vehicle: ' + error.message); return; }
          setEditVehicle(null);
          fetchVehicles();
        }}
      />

      {addVehicleDocOpen && (
        <AddVehicleDocModal
          open
          vehicleId={addVehicleDocOpen}
          onClose={() => setAddVehicleDocOpen(null)}
          onSave={async (data, file) => {
            let filePath = null,
              fileName = null,
              fileSize = null;
            if (file) {
              const up = await uploadFile(file, `vehicle-docs/${addVehicleDocOpen}`);
              if (!up) return;
              filePath = up.path;
              fileName = up.name;
              fileSize = up.size;
            }
            const { error } = await supabase.from('vehicle_documents').insert({
              ...data,
              vehicle_id: addVehicleDocOpen,
              file_path: filePath,
              file_name: fileName,
              file_size: fileSize,
            });
            if (error) { alert('Failed to add document: ' + error.message); return; }
            setAddVehicleDocOpen(null);
            fetchVehicles();
          }}
        />
      )}

      {editVehicleDoc && (
        <AddVehicleDocModal
          open
          vehicleId={editVehicleDoc.vehicle_id}
          editData={editVehicleDoc}
          onClose={() => setEditVehicleDoc(null)}
          onSave={async (data, file) => {
            let updates: Record<string, unknown> = { ...data };
            if (file) {
              const up = await uploadFile(
                file,
                `vehicle-docs/${editVehicleDoc.vehicle_id}`
              );
              if (!up) return;
              updates = {
                ...updates,
                file_path: up.path,
                file_name: up.name,
                file_size: up.size,
              };
            }
            const { error } = await supabase
              .from('vehicle_documents')
              .update(updates)
              .eq('id', editVehicleDoc.id);
            if (error) { alert('Failed to update document: ' + error.message); return; }
            setEditVehicleDoc(null);
            fetchVehicles();
          }}
        />
      )}

      {renewTarget && (
        <RenewModal
          target={renewTarget}
          onClose={() => setRenewTarget(null)}
          onRenew={async (newExpiry, newNumber, file, notes) => {
            let filePath = null,
              fileName = null,
              fileSize = null;
            if (file) {
              const folder =
                renewTarget.type === 'cert' ? 'company-certs' : 'vehicle-docs';
              const up = await uploadFile(file, folder);
              if (up) {
                filePath = up.path;
                fileName = up.name;
                fileSize = up.size;
              }
            }
            if (renewTarget.type === 'cert') {
              const { error } = await supabase.rpc('renew_company_certificate', {
                p_cert_id: renewTarget.item.id,
                p_new_expiry: newExpiry,
                p_new_cert_number: newNumber || null,
                p_new_file_path: filePath,
                p_new_file_name: fileName,
                p_notes: notes || null,
              });
              if (error) { alert('Renewal failed: ' + error.message); return; }
            } else {
              const { error } = await supabase.rpc('renew_vehicle_document', {
                p_doc_id: renewTarget.item.id,
                p_new_expiry: newExpiry,
                p_new_doc_number: newNumber || null,
                p_new_file_path: filePath,
                p_new_file_name: fileName,
                p_notes: notes || null,
              });
              if (error) { alert('Renewal failed: ' + error.message); return; }
            }
            setRenewTarget(null);
            fetchCerts();
            fetchVehicles();
          }}
        />
      )}

      {detailDoc && (
        <DocDetailModal
          item={detailDoc.item}
          type={detailDoc.type}
          onClose={() => setDetailDoc(null)}
          onRenew={() => {
            if (
              (detailDoc.item as CompanyCertificate | VehicleDocument).is_renewable
            ) {
              setRenewTarget(detailDoc);
              setDetailDoc(null);
            }
          }}
        />
      )}

      {detailVehicle && (
        <VehicleDetailModal
          vehicle={detailVehicle}
          onClose={() => setDetailVehicle(null)}
        />
      )}
    </div>
  );
}

// ─── CertCard ─────────────────────────────────────────────────────────────────
function CertCard({
  cert,
  onView,
  onEdit,
  onRenew,
  onDelete,
}: {
  cert: CompanyCertificate;
  onView: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const days = daysUntilExpiry(cert.expiry_date);
  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all
      ${cert.status === 'expired'
          ? 'border-red-200'
          : cert.status === 'expiring_soon'
            ? 'border-amber-200'
            : 'border-slate-200'
        }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">
              {cert.cert_name}
            </h3>
            {cert.cert_number && (
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{cert.cert_number}</p>
            )}
          </div>
          <StatusBadge status={cert.status} />
        </div>

        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
            Issued by:{' '}
            <span className="text-slate-700 font-medium">{cert.issued_by || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
            Issue date:{' '}
            <span className="text-slate-700 font-medium">{fmt(cert.issue_date)}</span>
          </div>
          {cert.is_renewable && (
            <div
              className={`flex items-center gap-1.5 ${cert.status === 'expired'
                ? 'text-red-600'
                : cert.status === 'expiring_soon'
                  ? 'text-amber-600'
                  : ''
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cert.status === 'expired'
                  ? 'bg-red-400'
                  : cert.status === 'expiring_soon'
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
                  }`}
              />
              Expiry:{' '}
              <span className="font-medium">
                {fmt(cert.expiry_date)}
                {days !== null &&
                  cert.status !== 'active' &&
                  cert.status !== 'renewed' &&
                  ` (${days < 0 ? `${Math.abs(days)}d ago` : `${days}d`})`}
              </span>
            </div>
          )}
          {!cert.is_renewable && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Permanent — No renewal needed
            </div>
          )}
        </div>

        {cert.file_name && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <span className="text-base">📎</span>
            <span className="text-xs text-slate-600 truncate flex-1">{cert.file_name}</span>
            {cert.file_size && (
              <span className="text-xs text-slate-400 flex-shrink-0">
                {fmtSize(cert.file_size)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-4 flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        {cert.is_renewable && (
          <button
            onClick={onRenew}
            className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Renew"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── VehicleSection ───────────────────────────────────────────────────────────
function VehicleSection({
  vehicle,
  onViewVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onAddDoc,
  onViewDoc,
  onEditDoc,
  onRenewDoc,
  onDeleteDoc,
}: {
  vehicle: Vehicle;
  onViewVehicle: () => void;
  onEditVehicle: () => void;
  onDeleteVehicle: () => void;
  onAddDoc: () => void;
  onViewDoc: (d: VehicleDocument) => void;
  onEditDoc: (d: VehicleDocument) => void;
  onRenewDoc: (d: VehicleDocument) => void;
  onDeleteDoc: (d: VehicleDocument) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const docs = vehicle.vehicle_documents || [];
  const hasIssue = docs.some(
    (d) => d.status === 'expired' || d.status === 'expiring_soon'
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Vehicle header */}
      <div
        className={`flex items-center gap-4 px-5 py-4 cursor-pointer select-none transition-colors hover:bg-slate-50
        ${hasIssue ? 'bg-amber-50/40' : ''}`}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl flex-shrink-0">
          {VEHICLE_TYPE_LABELS[vehicle.vehicle_type].split(' ')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-base">
              {vehicle.vehicle_number}
            </span>
            <span className="text-sm text-slate-500">
              {vehicle.make} {vehicle.model}
            </span>
            {vehicle.year && (
              <span className="text-xs text-slate-400">({vehicle.year})</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
            {vehicle.fuel_type && <span>{vehicle.fuel_type}</span>}
            {vehicle.department && <span>· {vehicle.department}</span>}
            {vehicle.assigned_driver && <span>· Driver: {vehicle.assigned_driver}</span>}
            <span className="text-indigo-500 font-medium">
              · {docs.length} doc{docs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasIssue && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
              ⚠ Action Needed
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewVehicle();
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditVehicle();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddDoc();
            }}
            className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Add document"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteVehicle();
            }}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Deactivate vehicle"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''
              }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Documents */}
      {expanded && (
        <div className="border-t border-slate-100">
          {docs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm">No documents added yet</p>
              <button
                onClick={onAddDoc}
                className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
              >
                + Add first document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
              {docs.map((doc) => (
                <VehicleDocCard
                  key={doc.id}
                  doc={doc}
                  onView={() => onViewDoc(doc)}
                  onEdit={() => onEditDoc(doc)}
                  onRenew={() => onRenewDoc(doc)}
                  onDelete={() => onDeleteDoc(doc)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VehicleDocCard ───────────────────────────────────────────────────────────
function VehicleDocCard({
  doc,
  onView,
  onEdit,
  onRenew,
  onDelete,
}: {
  doc: VehicleDocument;
  onView: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const days = daysUntilExpiry(doc.expiry_date);
  const s = STATUS_CONFIG[doc.status];
  return (
    <div className={`rounded-xl border ${s.border} bg-white p-3.5 hover:shadow-sm transition-all`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-slate-700 leading-tight">
          {doc.doc_type === 'other'
            ? doc.doc_type_label || 'Other'
            : VEHICLE_DOC_LABELS[doc.doc_type]}
        </p>
        <StatusBadge status={doc.status} />
      </div>
      {doc.doc_number && (
        <p className="text-xs text-slate-400 font-mono mb-2 truncate">{doc.doc_number}</p>
      )}
      <div className="space-y-1 text-xs text-slate-500 mb-3">
        {doc.expiry_date && (
          <p
            className={
              doc.status === 'expired'
                ? 'text-red-600 font-medium'
                : doc.status === 'expiring_soon'
                  ? 'text-amber-600 font-medium'
                  : ''
            }
          >
            Exp: {fmt(doc.expiry_date)}
            {days !== null &&
              (doc.status === 'expiring_soon' || doc.status === 'expired') && (
                <span className="ml-1">
                  ({days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`})
                </span>
              )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onView}
          className="flex-1 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          View
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        {doc.is_renewable && (
          <button
            onClick={onRenew}
            className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── AddCertModal ─────────────────────────────────────────────────────────────
function AddCertModal({
  open,
  onClose,
  editData,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editData?: CompanyCertificate | null;
  onSave: (data: Record<string, unknown>, file?: File) => Promise<void>;
}) {
  const [f, setF] = useState<Record<string, string>>({ ...BLANK_CERT_FORM });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setF({
        cert_name: editData.cert_name,
        cert_number: editData.cert_number ?? '',
        category: editData.category,
        issued_by: editData.issued_by ?? '',
        issue_date: editData.issue_date ?? '',
        expiry_date: editData.expiry_date ?? '',
        is_renewable: String(editData.is_renewable),
        notes: editData.notes ?? '',
      });
    } else {
      setF({ ...BLANK_CERT_FORM });
      setFile(null);
    }
  }, [editData, open]);

  const isRenewable = f.is_renewable === 'true';

  const submit = async () => {
    if (!f.cert_name) return alert('Certificate name is required');
    setSaving(true);
    const expiryDate = isRenewable && f.expiry_date ? f.expiry_date : null;
    // FIX #1 — include status in insert payload
    await onSave(
      {
        cert_name: f.cert_name,
        cert_number: f.cert_number || null,
        category: f.category,
        issued_by: f.issued_by || null,
        issue_date: f.issue_date || null,
        expiry_date: expiryDate,
        is_renewable: isRenewable,
        notes: f.notes || null,
        status: calcClientStatus(expiryDate, isRenewable),
      },
      file ?? undefined
    );
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? 'Edit Certificate' : 'Add Company Certificate'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <LabeledInput label="Certificate Name" required>
            <input
              className={inputCls}
              value={f.cert_name}
              onChange={(e) => setF((x) => ({ ...x, cert_name: e.target.value }))}
              placeholder="e.g. Factory License"
            />
          </LabeledInput>
        </div>
        <LabeledInput label="Certificate / Registration Number">
          <input
            className={inputCls}
            value={f.cert_number}
            onChange={(e) => setF((x) => ({ ...x, cert_number: e.target.value }))}
            placeholder="e.g. HR/FAC/2024/1234"
          />
        </LabeledInput>
        <LabeledInput label="Category" required>
          <select
            className={selectCls}
            value={f.category}
            onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))}
          >
            {CERT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </LabeledInput>
        <LabeledInput label="Issued By">
          <input
            className={inputCls}
            value={f.issued_by}
            onChange={(e) => setF((x) => ({ ...x, issued_by: e.target.value }))}
            placeholder="Issuing authority"
          />
        </LabeledInput>
        <LabeledInput label="Renewable">
          <select
            className={selectCls}
            value={f.is_renewable}
            onChange={(e) => setF((x) => ({ ...x, is_renewable: e.target.value }))}
          >
            <option value="true">Yes — Has expiry date</option>
            <option value="false">No — Permanent</option>
          </select>
        </LabeledInput>
        <LabeledInput label="Issue Date">
          <input
            type="date"
            className={inputCls}
            value={f.issue_date}
            onChange={(e) => setF((x) => ({ ...x, issue_date: e.target.value }))}
          />
        </LabeledInput>
        {isRenewable && (
          <LabeledInput label="Expiry Date">
            <input
              type="date"
              className={inputCls}
              value={f.expiry_date}
              onChange={(e) => setF((x) => ({ ...x, expiry_date: e.target.value }))}
            />
          </LabeledInput>
        )}
        <div className="sm:col-span-2">
          <LabeledInput label="Notes">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={f.notes}
              onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))}
              placeholder="Additional notes…"
            />
          </LabeledInput>
        </div>
        <div className="sm:col-span-2">
          <LabeledInput label="Upload Document">
            <FileUploadZone
              onFile={setFile}
              current={file?.name || editData?.file_name}
            />
          </LabeledInput>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {editData ? 'Save Changes' : 'Add Certificate'}
        </button>
      </div>
    </Modal>
  );
}

// ─── AddVehicleModal ──────────────────────────────────────────────────────────
function AddVehicleModal({
  open,
  onClose,
  editData,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editData?: Vehicle | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [f, setF] = useState<Record<string, string>>({ ...BLANK_VEHICLE_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setF({
        vehicle_number: editData.vehicle_number,
        make: editData.make,
        model: editData.model,
        year: editData.year ? String(editData.year) : '',
        vehicle_type: editData.vehicle_type,
        color: editData.color ?? '',
        engine_number: editData.engine_number ?? '',
        chassis_number: editData.chassis_number ?? '',
        fuel_type: editData.fuel_type ?? 'Diesel',
        owner_name: editData.owner_name ?? '',
        department: editData.department ?? '',
        assigned_driver: editData.assigned_driver ?? '',
        seating_capacity: editData.seating_capacity
          ? String(editData.seating_capacity)
          : '',
        notes: editData.notes ?? '',
      });
    } else {
      setF({ ...BLANK_VEHICLE_FORM });
    }
  }, [editData, open]);

  const set =
    (k: string) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) =>
        setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async () => {
    if (!f.vehicle_number || !f.make || !f.model)
      return alert('Vehicle number, make and model are required');
    setSaving(true);
    await onSave({
      ...f,
      year: f.year ? Number(f.year) : null,
      seating_capacity: f.seating_capacity ? Number(f.seating_capacity) : null,
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? 'Edit Vehicle' : 'Add Vehicle'}
      width="max-w-3xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <LabeledInput label="Vehicle Number" required>
          <input
            className={inputCls}
            value={f.vehicle_number}
            onChange={set('vehicle_number')}
            placeholder="HR26AB1234"
            style={{ textTransform: 'uppercase' }}
          />
        </LabeledInput>
        <LabeledInput label="Make" required>
          <input
            className={inputCls}
            value={f.make}
            onChange={set('make')}
            placeholder="Tata, Maruti…"
          />
        </LabeledInput>
        <LabeledInput label="Model" required>
          <input
            className={inputCls}
            value={f.model}
            onChange={set('model')}
            placeholder="Ace, Swift…"
          />
        </LabeledInput>
        <LabeledInput label="Year">
          <input
            type="number"
            className={inputCls}
            value={f.year}
            onChange={set('year')}
            placeholder="2021"
            min="1990"
            max="2030"
          />
        </LabeledInput>
        <LabeledInput label="Vehicle Type" required>
          <select className={selectCls} value={f.vehicle_type} onChange={set('vehicle_type')}>
            {(Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][]).map(
              ([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              )
            )}
          </select>
        </LabeledInput>
        <LabeledInput label="Fuel Type">
          <select className={selectCls} value={f.fuel_type} onChange={set('fuel_type')}>
            {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </LabeledInput>
        <LabeledInput label="Color">
          <input
            className={inputCls}
            value={f.color}
            onChange={set('color')}
            placeholder="White"
          />
        </LabeledInput>
        <LabeledInput label="Engine Number">
          <input
            className={inputCls}
            value={f.engine_number}
            onChange={set('engine_number')}
            placeholder="Engine no."
          />
        </LabeledInput>
        <LabeledInput label="Chassis Number">
          <input
            className={inputCls}
            value={f.chassis_number}
            onChange={set('chassis_number')}
            placeholder="Chassis no."
          />
        </LabeledInput>
        <LabeledInput label="Owner Name">
          <input
            className={inputCls}
            value={f.owner_name}
            onChange={set('owner_name')}
            placeholder="Accura Precision Engg."
          />
        </LabeledInput>
        <LabeledInput label="Department">
          <input
            className={inputCls}
            value={f.department}
            onChange={set('department')}
            placeholder="Logistics"
          />
        </LabeledInput>
        <LabeledInput label="Assigned Driver">
          <input
            className={inputCls}
            value={f.assigned_driver}
            onChange={set('assigned_driver')}
            placeholder="Driver name"
          />
        </LabeledInput>
        <LabeledInput label="Seating Capacity">
          <input
            type="number"
            className={inputCls}
            value={f.seating_capacity}
            onChange={set('seating_capacity')}
            placeholder="5"
          />
        </LabeledInput>
        <div className="sm:col-span-2">
          <LabeledInput label="Notes">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={f.notes}
              onChange={set('notes')}
              placeholder="Additional notes…"
            />
          </LabeledInput>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {editData ? 'Save Changes' : 'Add Vehicle'}
        </button>
      </div>
    </Modal>
  );
}

// ─── AddVehicleDocModal ───────────────────────────────────────────────────────
function AddVehicleDocModal({
  open,
  vehicleId,
  editData,
  onClose,
  onSave,
}: {
  open: boolean;
  vehicleId: string;
  editData?: VehicleDocument | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, file?: File) => Promise<void>;
}) {
  const [f, setF] = useState<Record<string, string>>({ ...BLANK_DOC_FORM });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (k: string) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) =>
        setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    if (editData) {
      setF({
        doc_type: editData.doc_type,
        doc_type_label: editData.doc_type_label ?? '',
        doc_number: editData.doc_number ?? '',
        issued_by: editData.issued_by ?? '',
        issue_date: editData.issue_date ?? '',
        expiry_date: editData.expiry_date ?? '',
        is_renewable: String(editData.is_renewable),
        notes: editData.notes ?? '',
      });
    } else {
      setF({ ...BLANK_DOC_FORM });
      setFile(null);
    }
  }, [editData, open]);

  const isRenewable = f.is_renewable === 'true';

  const submit = async () => {
    if (!f.doc_type) return;
    setSaving(true);
    const expiryDate = isRenewable && f.expiry_date ? f.expiry_date : null;
    // FIX #1 — include status in insert payload
    await onSave(
      {
        doc_type: f.doc_type,
        doc_type_label: f.doc_type === 'other' ? f.doc_type_label || null : null,
        doc_number: f.doc_number || null,
        issued_by: f.issued_by || null,
        issue_date: f.issue_date || null,
        expiry_date: expiryDate,
        is_renewable: isRenewable,
        notes: f.notes || null,
        status: calcClientStatus(expiryDate, isRenewable),
      },
      file ?? undefined
    );
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? 'Edit Vehicle Document' : 'Add Vehicle Document'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledInput label="Document Type" required>
          <select className={selectCls} value={f.doc_type} onChange={set('doc_type')}>
            {(Object.entries(VEHICLE_DOC_LABELS) as [VehicleDocType, string][]).map(
              ([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              )
            )}
          </select>
        </LabeledInput>
        {f.doc_type === 'other' && (
          <LabeledInput label="Custom Document Name" required>
            <input
              className={inputCls}
              value={f.doc_type_label}
              onChange={set('doc_type_label')}
              placeholder="Document name"
            />
          </LabeledInput>
        )}
        <LabeledInput label="Document Number">
          <input
            className={inputCls}
            value={f.doc_number}
            onChange={set('doc_number')}
            placeholder="e.g. Policy / Cert number"
          />
        </LabeledInput>
        <LabeledInput label="Issued By">
          <input
            className={inputCls}
            value={f.issued_by}
            onChange={set('issued_by')}
            placeholder="Issuing authority"
          />
        </LabeledInput>
        <LabeledInput label="Renewable">
          <select
            className={selectCls}
            value={f.is_renewable}
            onChange={set('is_renewable')}
          >
            <option value="true">Yes — Has expiry date</option>
            <option value="false">No — Permanent</option>
          </select>
        </LabeledInput>
        <LabeledInput label="Issue Date">
          <input
            type="date"
            className={inputCls}
            value={f.issue_date}
            onChange={set('issue_date')}
          />
        </LabeledInput>
        {isRenewable && (
          <LabeledInput label="Expiry Date">
            <input
              type="date"
              className={inputCls}
              value={f.expiry_date}
              onChange={set('expiry_date')}
            />
          </LabeledInput>
        )}
        <div className="sm:col-span-2">
          <LabeledInput label="Notes">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={f.notes}
              onChange={set('notes')}
            />
          </LabeledInput>
        </div>
        <div className="sm:col-span-2">
          <LabeledInput label="Upload Document">
            <FileUploadZone
              onFile={setFile}
              current={file?.name || editData?.file_name}
            />
          </LabeledInput>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {editData ? 'Save Changes' : 'Add Document'}
        </button>
      </div>
    </Modal>
  );
}

// ─── RenewModal ───────────────────────────────────────────────────────────────
function RenewModal({
  target,
  onClose,
  onRenew,
}: {
  target: { type: 'cert' | 'vdoc'; item: CompanyCertificate | VehicleDocument };
  onClose: () => void;
  onRenew: (
    newExpiry: string,
    newNumber: string,
    file: File | null,
    notes: string
  ) => Promise<void>;
}) {
  const [newExpiry, setNewExpiry] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // FIX #2 — reset state when target changes
  useEffect(() => {
    setNewExpiry('');
    setNewNumber('');
    setNotes('');
    setFile(null);
  }, [target.item.id]);

  const item = target.item;
  const name =
    'cert_name' in item
      ? item.cert_name
      : VEHICLE_DOC_LABELS[(item as VehicleDocument).doc_type];
  const currentNumber =
    'cert_number' in item ? item.cert_number : (item as VehicleDocument).doc_number;

  const submit = async () => {
    if (!newExpiry) return alert('New expiry date is required');
    setSaving(true);
    await onRenew(newExpiry, newNumber, file, notes);
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Renew Document" width="max-w-lg">
      <div className="mb-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-sm font-bold text-indigo-800">{name}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-indigo-600">
          {item.expiry_date && <span>Current expiry: {fmt(item.expiry_date)}</span>}
          <StatusBadge status={item.status} />
        </div>
      </div>
      <div className="space-y-4">
        <LabeledInput label="New Expiry Date" required>
          <input
            type="date"
            className={inputCls}
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
        </LabeledInput>
        <LabeledInput
          label={`New ${currentNumber ? 'Document/Certificate' : ''} Number`}
        >
          <input
            className={inputCls}
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder={
              currentNumber ? `Current: ${currentNumber}` : 'New reference number'
            }
          />
        </LabeledInput>
        <LabeledInput label="Upload New Document">
          <FileUploadZone onFile={setFile} current={file?.name} />
        </LabeledInput>
        <LabeledInput label="Renewal Notes">
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Renewed via offline application, tracking ID: …"
          />
        </LabeledInput>
      </div>
      <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
        <div className="flex-1 text-xs text-slate-400">
          Status will auto-update to <strong>Active</strong> after renewal
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          ✓ Confirm Renewal
        </button>
      </div>
    </Modal>
  );
}

// ─── DocDetailModal ───────────────────────────────────────────────────────────
function DocDetailModal({
  item,
  type,
  onClose,
  onRenew,
}: {
  item: CompanyCertificate | VehicleDocument;
  type: 'cert' | 'vdoc';
  onClose: () => void;
  onRenew: () => void;
}) {
  const [history, setHistory] = useState<RenewalHistory[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // FIX #3 — complete dependency array
  useEffect(() => {
    const col = type === 'cert' ? 'company_cert_id' : 'vehicle_doc_id';
    supabase
      .from('document_renewal_history')
      .select('*')
      .eq(col, item.id)
      .order('renewed_at', { ascending: false })
      .then(({ data }) => setHistory((data as RenewalHistory[]) || []));

    if (item.file_path) {
      supabase.storage
        .from('documents')
        .createSignedUrl(item.file_path, 3600)
        .then(({ data }) => setFileUrl(data?.signedUrl || null));
    } else {
      setFileUrl(null);
    }
  }, [item.id, type, item.file_path]);

  const isCert = type === 'cert';
  const cert = item as CompanyCertificate;
  const vdoc = item as VehicleDocument;
  const name = isCert ? cert.cert_name : VEHICLE_DOC_LABELS[vdoc.doc_type];

  return (
    <Modal open onClose={onClose} title="Document Details" width="max-w-2xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800">{name}</h3>
            {isCert && cert.cert_number && (
              <p className="text-sm text-slate-400 font-mono mt-0.5">{cert.cert_number}</p>
            )}
            {!isCert && vdoc.doc_number && (
              <p className="text-sm text-slate-400 font-mono mt-0.5">{vdoc.doc_number}</p>
            )}
          </div>
          <StatusBadge status={item.status} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4">
          {isCert && (
            <>
              <div>
                <p className="text-xs text-slate-400">Category</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  {cert.category}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Issued By</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  {cert.issued_by || '—'}
                </p>
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-slate-400">Issue Date</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {fmt(item.issue_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Expiry Date</p>
            <p
              className={`text-sm font-semibold mt-0.5 ${item.status === 'expired'
                ? 'text-red-600'
                : item.status === 'expiring_soon'
                  ? 'text-amber-600'
                  : 'text-slate-700'
                }`}
            >
              {item.expiry_date ? fmt(item.expiry_date) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Renewable</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {item.is_renewable ? 'Yes' : 'No — Permanent'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Added On</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {fmt(item.created_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Last Updated</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {fmt(item.updated_at)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            {item.notes}
          </div>
        )}

        {/* File */}
        {item.file_name && (
          <div className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {item.file_name}
              </p>
              {item.file_size && (
                <p className="text-xs text-slate-400">{fmtSize(item.file_size)}</p>
              )}
            </div>
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0"
              >
                View / Download
              </a>
            )}
          </div>
        )}

        {/* Renewal history */}
        {history.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
              Renewal History
            </h4>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs"
                >
                  <span className="text-emerald-600 font-bold mt-0.5">↻</span>
                  <div>
                    <span className="font-semibold text-emerald-700">
                      {fmt(h.renewed_at)}
                    </span>
                    <span className="text-slate-500 ml-2">
                      {h.old_expiry_date && <>{fmt(h.old_expiry_date)} → </>}
                      {fmt(h.new_expiry_date)}
                    </span>
                    {h.renewal_notes && (
                      <p className="text-slate-500 mt-0.5">{h.renewal_notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Close
          </button>
          {item.is_renewable && (
            <button
              onClick={onRenew}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Renew Document
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── VehicleDetailModal ───────────────────────────────────────────────────────
function VehicleDetailModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  const rows: [string, string | number | null][] = [
    ['Vehicle Number', vehicle.vehicle_number],
    [
      'Make & Model',
      `${vehicle.make} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}`,
    ],
    ['Type', VEHICLE_TYPE_LABELS[vehicle.vehicle_type]],
    ['Color', vehicle.color],
    ['Fuel Type', vehicle.fuel_type],
    ['Engine Number', vehicle.engine_number],
    ['Chassis Number', vehicle.chassis_number],
    ['Owner', vehicle.owner_name],
    ['Department', vehicle.department],
    ['Driver', vehicle.assigned_driver],
    ['Seating Capacity', vehicle.seating_capacity],
  ];
  return (
    <Modal open onClose={onClose} title="Vehicle Details" width="max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, val]) =>
          val ? (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{val}</p>
            </div>
          ) : null
        )}
      </div>
      {vehicle.notes && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
          {vehicle.notes}
        </div>
      )}
      <div className="flex justify-end mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}