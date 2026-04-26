import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Building2, Layers2, Plus, Search, RefreshCw, Shield, Eye, EyeOff,
  ToggleLeft, ToggleRight, Trash2, KeyRound, Edit2, X, Copy, Check,
  Layers, CheckSquare, Square, Calendar, FileText, PieChart, LayoutDashboard,
  MapPin, BadgeInfo, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { usersApi, UserRow, CreateUserPayload, organisasiApi, userStatsApi, JABATAN_OPTIONS } from '../../services/api';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────
const AVAILABLE_MODULES = [
  { id: 'pkpt',        label: 'PKPT — Perencanaan Pengawasan Tahunan', icon: Calendar },
  { id: 'pelaksanaan', label: 'Pelaksanaan Audit & Kertas Kerja',       icon: Shield },
  { id: 'pelaporan',   label: 'Pelaporan & Komunikasi Hasil',           icon: FileText },
  { id: 'sintesis',    label: 'Sintesis Hasil Pengawasan',              icon: PieChart },
  { id: 'pemantauan',  label: 'Pemantauan Tindak Lanjut Temuan',        icon: CheckSquare },
  { id: 'ca-cm',       label: 'Dashboard CA-CM',                        icon: LayoutDashboard },
] as const;

const ROLE_OPTIONS = [
  { value: 'admin_spi',          label: 'Admin SPI' },
  { value: 'kepala_spi',         label: 'Kepala SPI' },
  { value: 'pengendali_teknis',  label: 'Pengendali Teknis' },
  { value: 'anggota_tim',        label: 'Anggota Tim' },
  { value: 'auditee',            label: 'Auditee' },
  { value: 'it_admin',           label: 'Admin IT' },
];

const ROLE_COLORS: Record<string, string> = {
  it_admin:           'bg-purple-100 text-purple-700',
  admin_spi:          'bg-blue-100   text-blue-700',
  kepala_spi:         'bg-indigo-100 text-indigo-700',
  pengendali_teknis:  'bg-teal-100   text-teal-700',
  anggota_tim:        'bg-green-100  text-green-700',
  auditee:            'bg-orange-100 text-orange-700',
};

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

// ── Shared: Org Dropdowns (With Auto-Fill Logic) ──────────────
function OrgFormSection({
  direktoratId, divisiId, departemenId, role,
  onChange,
}: {
  direktoratId: string; divisiId: string; departemenId: string; role?: string;
  onChange: (field: 'direktorat_id' | 'divisi_id' | 'departemen_id', val: string) => void;
}) {
  const isSPI = ['admin_spi', 'kepala_spi', 'pengendali_teknis', 'anggota_tim'].includes(role ?? '');

  const { data: direktoratList } = useQuery({
    queryKey: ['direktorat-list'],
    queryFn: () => organisasiApi.getDirektorats().then((r) => r.data.data ?? []),
    staleTime: 300_000,
  });
  
  const { data: divisiList } = useQuery({
    queryKey: ['divisi-list', direktoratId],
    queryFn: () => organisasiApi.getDivisis(direktoratId || undefined).then((r) => r.data.data ?? []),
    enabled: !!direktoratId,
    staleTime: 300_000,
  });
  
  const { data: departemenList } = useQuery({
    queryKey: ['departemen-list', divisiId],
    queryFn: () => organisasiApi.getDepartemens(divisiId || undefined).then((r) => r.data.data ?? []),
    enabled: !!divisiId && !isSPI,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (isSPI && direktoratList) {
      const dirUtama = direktoratList.find((d) => d.nama.toLowerCase().includes('utama'));
      if (dirUtama && direktoratId !== dirUtama.id) onChange('direktorat_id', dirUtama.id);
    }
  }, [isSPI, direktoratList, direktoratId]);

  useEffect(() => {
    if (isSPI && divisiList && direktoratId) {
      const divSPI = divisiList.find((d) => d.nama.toLowerCase().includes('pengawas internal'));
      if (divSPI && divisiId !== divSPI.id) onChange('divisi_id', divSPI.id);
    }
  }, [isSPI, divisiList, divisiId, direktoratId]);

  useEffect(() => {
    if (isSPI && departemenId !== '') onChange('departemen_id', '');
  }, [isSPI, departemenId]);

  const baseCls = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors";
  const getCls = (disabled: boolean) => `${baseCls} ${disabled ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
        Posisi Organisasi
        {isSPI && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full normal-case tracking-normal">Otomatis diisi sistem</span>}
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600">Direktorat</label>
        <select value={direktoratId} disabled={isSPI} onChange={(e) => { onChange('direktorat_id', e.target.value); onChange('divisi_id', ''); onChange('departemen_id', ''); }} className={getCls(isSPI)}>
          <option value="">— Pilih Direktorat —</option>
          {(direktoratList ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600">Divisi</label>
        <select value={divisiId} disabled={isSPI || !direktoratId} onChange={(e) => { onChange('divisi_id', e.target.value); onChange('departemen_id', ''); }} className={getCls(isSPI || !direktoratId)}>
          <option value="">— Pilih Divisi —</option>
          {(divisiList ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600">Departemen</label>
        <select value={departemenId} disabled={isSPI || !divisiId} onChange={(e) => onChange('departemen_id', e.target.value)} className={getCls(isSPI || !divisiId)}>
          <option value="">— Kosongkan Departemen —</option>
          {(departemenList ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
        {isSPI && <p className="text-[10px] text-amber-600 mt-1 font-medium">Role SPI tidak memiliki departemen (dikosongkan otomatis).</p>}
      </div>
    </div>
  );
}

// ── Modal: Detail User ────────────────────────────────────────
function UserDetailModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const initials = user.nama_lengkap.split(' ').slice(0, 2).map((n) => n[0]).join('');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center font-bold text-lg text-primary-700 ring-4 ring-white shadow-sm">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{user.nama_lengkap}</h2>
              <div className="mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BadgeInfo className="w-4 h-4" /> Identitas Pengguna
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">NIK (Kredensial Login)</p>
                <code className="text-sm font-bold text-slate-700">{user.nik}</code>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {user.is_active ? 'Aktif' : 'Non-aktif'}
                </span>
              </div>
              <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Notifikasi
                </p>
                <p className="text-sm font-medium text-slate-800 break-all">{user.email}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 col-span-2">
                <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Jabatan Struktural</p>
                <p className="text-sm font-medium text-slate-700">{user.jabatan || '-'}</p>
              </div>
            </div>
          </section>

          {/* Posisi Organisasi */}
          {(user.direktorat_nama || user.divisi_nama || user.departemen_nama) && (
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Posisi Organisasi
              </p>
              <div className="ml-2 pl-4 border-l-2 border-slate-100 space-y-4">
                {user.direktorat_nama && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-white" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">Direktorat</p>
                    <p className="text-sm font-semibold text-slate-800">{user.direktorat_nama}</p>
                  </div>
                )}
                {user.divisi_nama && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-teal-500 rounded-full ring-4 ring-white" />
                    <p className="text-[10px] font-bold text-teal-600 uppercase mb-0.5">Divisi</p>
                    <p className="text-sm font-semibold text-slate-800">{user.divisi_nama}</p>
                  </div>
                )}
                {user.departemen_nama && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-purple-500 rounded-full ring-4 ring-white" />
                    <p className="text-[10px] font-bold text-purple-600 uppercase mb-0.5">Departemen</p>
                    <p className="text-sm font-semibold text-slate-800">{user.departemen_nama}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Modul Akses */}
          {(user.module_access && user.module_access.length > 0) && (
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Akses Modul ({user.module_access.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {user.module_access.map((m: string) => {
                  const modInfo: any = AVAILABLE_MODULES.find((mod) => mod.id === m);
                  const Icon: any = modInfo?.icon || Layers;
                  const label: string = modInfo ? modInfo.label.split('—')[0].trim() : m.toUpperCase();
                  return (
                    <span key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 shadow-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-violet-500" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Dibuat: <span className="font-medium text-slate-600">
              {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </p>
          <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-all shadow-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Buat User Baru ─────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateUserPayload & { direktorat_id: string; divisi_id: string; departemen_id: string }>({
    nik: '', nama_lengkap: '', email: '', role: 'anggota_tim', jabatan: '',
    direktorat_id: '', divisi_id: '', departemen_id: '',
  });
  const [result, setResult] = useState<{ default_password: string; hint: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => usersApi.create({
      ...form,
      direktorat_id: form.direktorat_id || null,
      divisi_id:     form.divisi_id     || null,
      departemen_id: form.departemen_id || null,
    }),
    onSuccess: (res) => {
      setResult(res.data.data!);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('User berhasil dibuat!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal membuat user.';
      toast.error(msg);
    },
  });

  function handleCopy() {
    if (result) { navigator.clipboard.writeText(result.default_password); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">User Berhasil Dibuat!</h2>
            <p className="text-sm text-slate-500">Kredensial login <strong>{form.nama_lengkap}</strong> adalah NIK: <strong>{form.nik}</strong>.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-400 mb-1">Password Default</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-lg font-bold text-primary-700 tracking-wider">{result.default_password}</code>
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{result.hint}</p>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mb-4 text-center">
            Catatan: Sampaikan ke user jika suatu saat lupa password, arahkan untuk menghubungi Admin SPI via WhatsApp.
          </p>
          <button onClick={onClose} className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors">
            Selesai
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Tambah User Baru</h2>
              <p className="text-xs text-slate-400">Password digenerate otomatis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Nama Lengkap <span className="text-red-500">*</span></label>
              <input type="text" value={form.nama_lengkap} onChange={(e) => setForm((f) => ({ ...f, nama_lengkap: e.target.value }))} placeholder="Budi Santoso" className={inp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inp}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">NIK (Kredensial Login) <span className="text-red-500">*</span></label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.nik}
                onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="6 digit angka"
                className={`${inp} ${form.nik.length > 0 && form.nik.length !== 6 ? '!border-red-400 focus:!ring-red-500/20 focus:!border-red-500' : ''}`}
              />
              {form.nik.length > 0 && form.nik.length !== 6 && (
                <p className="mt-1 text-xs font-medium text-red-600">NIK harus tepat 6 digit angka (saat ini: {form.nik.length}).</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Email Notifikasi <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="budi@satria.app" className={inp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Jabatan Struktural</label>
              <select value={form.jabatan ?? ''} onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))} className={inp}>
                <option value="">— Pilih Jabatan —</option>
                {JABATAN_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <OrgFormSection
              direktoratId={form.direktorat_id}
              divisiId={form.divisi_id}
              departemenId={form.departemen_id}
              role={form.role}
              onChange={(field, val) => setForm((f) => ({ ...f, [field]: val }))}
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Batal</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || form.nik.length !== 6 || !form.nama_lengkap || !form.email} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Menyimpan...' : 'Buat User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Edit User ──────────────────────────────────────────
function EditUserModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nik:           user.nik,
    nama_lengkap:  user.nama_lengkap,
    email:         user.email,
    jabatan:       user.jabatan ?? '',
    role:          user.role,
    direktorat_id: user.direktorat_id ?? '',
    divisi_id:     user.divisi_id ?? '',
    departemen_id: user.departemen_id ?? '',
  });

  const nikValid = /^[0-9]{6}$/.test(form.nik);
  const nikChanged = form.nik !== user.nik;

  const mutation = useMutation({
    mutationFn: () => usersApi.update(user.id, {
      ...form,
      jabatan:       form.jabatan       !== '' ? form.jabatan : undefined,
      direktorat_id: form.direktorat_id !== '' ? form.direktorat_id : null,
      divisi_id:     form.divisi_id     !== '' ? form.divisi_id : null,
      departemen_id: form.departemen_id !== '' ? form.departemen_id : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Data user diperbarui!');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal memperbarui data user.';
      toast.error(msg);
    },
  });

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Edit User</h2>
              <p className="text-xs text-slate-400">NIK saat ini: {user.nik}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                NIK (Kredensial Login) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.nik}
                onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                className={`${inp} ${!nikValid ? '!border-red-400 focus:!ring-red-500/20 focus:!border-red-500' : ''}`}
              />
              {!nikValid && (
                <p className="mt-1 text-[11px] font-medium text-red-600">NIK harus tepat 6 digit angka.</p>
              )}
              {nikValid && nikChanged && (
                <p className="mt-1 text-[11px] font-medium text-amber-600">
                  NIK berubah. User harus login ulang dengan NIK baru.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inp}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Nama Lengkap</label>
              <input type="text" value={form.nama_lengkap} onChange={(e) => setForm((f) => ({ ...f, nama_lengkap: e.target.value }))} className={inp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Email Notifikasi</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Jabatan Struktural</label>
              <select value={form.jabatan} onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))} className={inp}>
                <option value="">— Pilih Jabatan —</option>
                {JABATAN_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <OrgFormSection
              direktoratId={form.direktorat_id}
              divisiId={form.divisi_id}
              departemenId={form.departemen_id}
              role={form.role}
              onChange={(field, val) => setForm((f) => ({ ...f, [field]: val }))}
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Batal</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !nikValid} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Reset Password ─────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'default' | 'custom'>('default');
  const [customPw, setCustomPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetDefault = useMutation({
    mutationFn: () => usersApi.resetPassword(user.id),
    onSuccess: (res) => { setResult(res.data.data!.default_password); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Password direset!'); },
    onError: () => toast.error('Gagal reset password.'),
  });
  const setCustom = useMutation({
    mutationFn: () => usersApi.setPassword(user.id, customPw),
    onSuccess: () => { setResult(customPw); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Password diubah!'); },
    onError: () => toast.error('Gagal mengubah password.'),
  });

  function handleCopy() {
    if (result) { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-7 h-7 text-green-600" /></div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Password Diperbarui</h2>
          <p className="text-sm text-slate-500 mb-5">Sampaikan ke <strong>{user.nama_lengkap}</strong>:</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-2">
            <code className="text-lg font-bold text-primary-700">{result}</code>
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Selesai</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center"><KeyRound className="w-5 h-5 text-amber-600" /></div>
            <div><h2 className="font-bold text-slate-800">Kelola Password</h2><p className="text-xs text-slate-400">{user.nama_lengkap}</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['default', 'custom'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-colors ${mode === m ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {m === 'default' ? 'Reset ke Default' : 'Set Password Baru'}
              </button>
            ))}
          </div>
          
          {mode === 'default' ? (
            <div className="py-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-600 mb-4 px-2">
                Anda yakin ingin mereset password untuk <strong>{user.nama_lengkap}</strong>? <br />
                Password akan dikembalikan ke format awal sistem.
              </p>
              <div className="inline-flex flex-col items-center px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Preview Password Default</p>
                <code className="text-base font-bold text-slate-700 tracking-wide">
                  {user.nik.slice(-3)}_{user.nama_lengkap.split(/\s+/).pop()?.toLowerCase()}
                </code>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Password Baru (min. 6 karakter)</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={customPw} onChange={(e) => setCustomPw(e.target.value)} placeholder="Masukkan password baru..." className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Batal</button>
          <button
            onClick={() => mode === 'default' ? resetDefault.mutate() : setCustom.mutate()}
            disabled={resetDefault.isPending || setCustom.isPending || (mode === 'custom' && customPw.length < 6)}
            className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {(resetDefault.isPending || setCustom.isPending) ? 'Memproses...' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Module Access ──────────────────────────────────────
function ModuleAccessModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(user.module_access || []);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateModuleAccess(user.id, selected),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Akses modul diperbarui!'); onClose(); },
    onError: () => toast.error('Gagal memperbarui akses modul.'),
  });

  const toggleModule = (id: string) => setSelected((p) => p.includes(id) ? p.filter((m) => m !== id) : [...p, id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center"><Layers className="w-5 h-5 text-violet-600" /></div>
            <div><h2 className="font-bold text-slate-800">Kelola Akses Modul</h2><p className="text-xs text-slate-400">{user.nama_lengkap}</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-2">
          {AVAILABLE_MODULES.map((mod) => {
            const isSelected = selected.includes(mod.id);
            const Icon = mod.icon;
            return (
              <button key={mod.id} onClick={() => toggleModule(mod.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}><Icon className="w-4 h-4" /></div>
                <span className="flex-1 text-sm font-medium">{mod.label}</span>
                {isSelected ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-slate-300" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Batal</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function UserManagementPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage]           = useState(1);
  const LIMIT = 10;

  const [detailTarget, setDetailTarget]           = useState<UserRow | null>(null);
  const [showCreate, setShowCreate]               = useState(false);
  const [resetTarget, setResetTarget]             = useState<UserRow | null>(null);
  const [editTarget, setEditTarget]               = useState<UserRow | null>(null);
  const [moduleAccessTarget, setModuleAccessTarget] = useState<UserRow | null>(null);

  const { data: userRes, isLoading, refetch } = useQuery({
    queryKey: ['users', search, roleFilter, activeFilter, page],
    queryFn: async () => {
      const res = await usersApi.getAll({ search: search || undefined, role: roleFilter || undefined, is_active: activeFilter || undefined, page, limit: LIMIT });
      return res.data as unknown as { data: UserRow[], meta: { total: number, page: number, limit: number, totalPages: number } };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userStatsApi.get().then((r) => r.data.data),
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['user-stats'] }); toast.success('Status diperbarui.'); },
    onError: () => toast.error('Gagal mengubah status user.'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['user-stats'] }); toast.success('User dihapus.'); },
    onError: () => toast.error('Gagal menghapus user.'),
  });

  function confirmDelete(user: UserRow) {
    if (window.confirm(`Hapus user "${user.nama_lengkap}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteUser.mutate(user.id);
    }
  }

  const users = userRes?.data ?? [];
  const total = userRes?.meta?.total ?? stats?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);

  const activeDivisiCount = new Set(users.map(u => u.divisi_id).filter(Boolean)).size;
  const activeDeptCount = new Set(users.map(u => u.departemen_id).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen User</h1>
            <p className="text-sm text-slate-500">Kelola akun, role, dan hak akses pengguna SATRIA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> Tambah User
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-slate-800" />
            <p className="text-xs text-slate-400">Total User</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-green-600" />
            <p className="text-xs text-slate-400">User Aktif</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats?.aktif ?? 0}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-slate-400">User Non-Aktif</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{stats?.non_aktif ?? 0}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <p className="text-xs text-slate-400">Total Divisi</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{activeDivisiCount}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers2 className="w-3.5 h-3.5 text-purple-600" />
            <p className="text-xs text-slate-400">Total Departemen</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{activeDeptCount}</p>
        </div>
      </div>

      {/* Filters - Dirubah menjadi vertikal */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Pencarian</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Cari nama, NIK, atau email..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:w-48">
          <label className="text-xs font-semibold text-slate-600">Filter Role</label>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Semua Role</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:w-48">
          <label className="text-xs font-semibold text-slate-600">Status User</label>
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Non-aktif</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        
        {/* Header Table & Informasi Pagination */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50">
          <h3 className="font-semibold text-slate-700 text-sm">
            Daftar Pengguna <span className="text-slate-400 font-normal">— {LIMIT} per halaman</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
            {total > 0 ? `${Math.min((page - 1) * LIMIT + 1, total)}–${Math.min(page * LIMIT, total)} dari ${total} user` : 'Belum ada data'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {/* min-w-[900px] dihapus agar pas dengan layar tanpa scroll horizontal jika memungkinkan */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">NIK</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Divisi</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Departemen</th>
                <th className="text-center px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={8} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Tidak ada user ditemukan</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{user.nama_lengkap}</p>
                    </td>
                    <td className="px-3 py-3">
                      <code className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{user.nik}</code>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[11px] line-clamp-1 break-all">{user.email || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight">{user.divisi_nama || '-'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight">{user.departemen_nama || '-'}</p>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center whitespace-nowrap gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDetailTarget(user)} title="Lihat Detail" className="p-1 text-slate-400 hover:text-blue-600 rounded"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setEditTarget(user)} title="Edit User" className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setModuleAccessTarget(user)} title="Akses Modul" className="p-1 text-slate-400 hover:text-violet-600 rounded"><Layers className="w-4 h-4" /></button>
                          <button onClick={() => setResetTarget(user)} title="Reset Password" className="p-1 text-slate-400 hover:text-amber-600 rounded"><KeyRound className="w-4 h-4" /></button>
                          <button onClick={() => toggleActive.mutate(user.id)} title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'} className="p-1 text-slate-400 hover:text-orange-600 rounded">
                            {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => confirmDelete(user)} title="Hapus User" className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Navigasi Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 bg-white">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Halaman {page} dari {pages}</span>
            <div className="flex gap-1.5">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage((p) => p - 1)} 
                className="flex items-center justify-center px-2 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const pg = pages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                if (pg > pages) return null;
                return (
                  <button 
                    key={pg} 
                    onClick={() => setPage(pg)} 
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${page === pg ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button 
                disabled={page >= pages} 
                onClick={() => setPage((p) => p + 1)} 
                className="flex items-center justify-center px-2 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Keamanan Password */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 mb-0.5">Informasi Login</p>
          <p className="text-xs text-blue-600">
            Username ditiadakan. <strong>Semua user kini login menggunakan NIK</strong> (Nomor Induk Karyawan) milik masing-masing.<br />
            Pola password default saat dibuat/direset: <code className="bg-blue-100 px-1 rounded">3 digit terakhir NIK + '_' + nama belakang lowercase</code>.
          </p>
        </div>
      </div>

      {/* Modals */}
      {detailTarget      && <UserDetailModal   user={detailTarget}      onClose={() => setDetailTarget(null)} />}
      {showCreate        && <CreateUserModal   onClose={() => setShowCreate(false)} />}
      {resetTarget       && <ResetPasswordModal user={resetTarget}      onClose={() => setResetTarget(null)} />}
      {editTarget        && <EditUserModal     user={editTarget}        onClose={() => setEditTarget(null)} />}
      {moduleAccessTarget && <ModuleAccessModal user={moduleAccessTarget} onClose={() => setModuleAccessTarget(null)} />}
    </div>
  );
}