import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Building2, Layers2, Plus, Search, RefreshCw, Shield, Eye, EyeOff,
  ToggleLeft, ToggleRight, Trash2, KeyRound, Edit2, X, Copy, Check,
  Layers, CheckSquare, Square, Calendar, FileText, PieChart, LayoutDashboard,
  MapPin, BadgeInfo, Mail, Phone,
} from 'lucide-react';
import { usersApi, UserRow, CreateUserPayload, organisasiApi, userStatsApi, JABATAN_OPTIONS } from '../../services/api';
import { ROLE_LABELS } from '../../types';
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
  { value: 'it_admin',           label: 'IT Administrator' },
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

// ── Shared: Org Dropdowns ─────────────────────────────────────
function OrgFormSection({
  direktoratId, divisiId, departemenId,
  onChange,
}: {
  direktoratId: string; divisiId: string; departemenId: string;
  onChange: (field: 'direktorat_id' | 'divisi_id' | 'departemen_id', val: string) => void;
}) {
  const { data: direktoratList } = useQuery({
    queryKey: ['direktorat-list'],
    queryFn: () => organisasiApi.getDirektorats().then((r) => r.data.data ?? []),
    staleTime: 300_000,
  });
  const { data: divisiList } = useQuery({
    queryKey: ['divisi-list', direktoratId],
    queryFn: () => organisasiApi.getDivisis(direktoratId || undefined).then((r) => r.data.data ?? []),
    enabled: true,
    staleTime: 300_000,
  });
  const { data: departemenList } = useQuery({
    queryKey: ['departemen-list', divisiId],
    queryFn: () => organisasiApi.getDepartemens(divisiId || undefined).then((r) => r.data.data ?? []),
    enabled: true,
    staleTime: 300_000,
  });

  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Posisi Organisasi</p>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Direktorat</label>
        <select value={direktoratId} onChange={(e) => { onChange('direktorat_id', e.target.value); onChange('divisi_id', ''); onChange('departemen_id', ''); }} className={cls}>
          <option value="">— Pilih Direktorat —</option>
          {(direktoratList ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Divisi</label>
        <select value={divisiId} onChange={(e) => { onChange('divisi_id', e.target.value); onChange('departemen_id', ''); }} className={cls}>
          <option value="">— Pilih Divisi —</option>
          {(divisiList ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Departemen</label>
        <select value={departemenId} onChange={(e) => onChange('departemen_id', e.target.value)} className={cls}>
          <option value="">— Pilih Departemen —</option>
          {(departemenList ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Modal: Detail User ────────────────────────────────────────
function UserDetailModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const initials = user.nama_lengkap.split(' ').slice(0, 2).map((n) => n[0]).join('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
              {initials}
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{user.nama_lengkap}</h2>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identitas */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BadgeInfo className="w-3.5 h-3.5" /> Identitas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">NIK</p>
                <code className="text-sm font-bold text-slate-700">{user.nik}</code>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">Status</p>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                  {user.is_active ? 'Aktif' : 'Non-aktif'}
                </span>
              </div>
              <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email Login</p>
                <p className="text-sm text-slate-700">{user.email}</p>
              </div>
              {user.kontak_email && (
                <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Email Kontak</p>
                  <p className="text-sm text-slate-700">{user.kontak_email}</p>
                </div>
              )}
              {user.jabatan && (
                <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">Jabatan</p>
                  <p className="text-sm font-medium text-slate-700">{user.jabatan}</p>
                </div>
              )}
            </div>
          </section>

          {/* Organisasi */}
          {(user.direktorat_nama || user.divisi_nama || user.departemen_nama) && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Posisi Organisasi
              </p>
              <div className="space-y-2">
                {user.direktorat_nama && (
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 border-l-4 border-blue-400">
                    <div>
                      <p className="text-[10px] font-semibold text-blue-600 uppercase">Direktorat</p>
                      <p className="text-sm font-semibold text-slate-800">{user.direktorat_nama}</p>
                    </div>
                  </div>
                )}
                {user.divisi_nama && (
                  <div className="flex items-center gap-3 bg-teal-50 rounded-xl px-4 py-3 border-l-4 border-teal-400">
                    <div>
                      <p className="text-[10px] font-semibold text-teal-600 uppercase">Divisi</p>
                      <p className="text-sm font-semibold text-slate-800">{user.divisi_nama}</p>
                    </div>
                  </div>
                )}
                {user.departemen_nama && (
                  <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3 border-l-4 border-purple-400">
                    <div>
                      <p className="text-[10px] font-semibold text-purple-600 uppercase">Departemen</p>
                      <p className="text-sm font-semibold text-slate-800">{user.departemen_nama}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Modul Akses */}
          {(user.module_access ?? []).length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Akses Modul ({user.module_access.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {user.module_access.map((m) => (
                  <span key={m} className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                    {AVAILABLE_MODULES.find((mod) => mod.id === m)?.label.split('—')[0].trim() ?? m.toUpperCase()}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Meta */}
          <p className="text-xs text-slate-400 text-right">
            Dibuat: {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="p-6 pt-0">
          <button onClick={onClose} className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
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
    nik: '', nama_lengkap: '', email: '', role: 'anggota_tim', jabatan: '', kontak_email: '',
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
            <p className="text-sm text-slate-500">Password default untuk <strong>{form.nama_lengkap}</strong> — simpan dan sampaikan ke user, hanya ditampilkan sekali.</p>
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
            <p className="text-xs text-amber-700"><strong>Penting:</strong> Anjurkan user segera mengganti password setelah login pertama.</p>
          </div>
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
        {/* Header */}
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
          {/* Identitas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">NIK <span className="text-red-500">*</span></label>
              <input type="text" value={form.nik} onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value }))} placeholder="000000001" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inp}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
            <input type="text" value={form.nama_lengkap} onChange={(e) => setForm((f) => ({ ...f, nama_lengkap: e.target.value }))} placeholder="Contoh: Budi Santoso" className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Login <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="budi@satria.app" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Kontak</label>
              <input type="email" value={form.kontak_email ?? ''} onChange={(e) => setForm((f) => ({ ...f, kontak_email: e.target.value }))} placeholder="Email alternatif" className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Jabatan Struktural</label>
            <select value={form.jabatan ?? ''} onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))} className={inp}>
              <option value="">— Pilih Jabatan —</option>
              {JABATAN_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          {/* Organisasi */}
          <div className="border-t border-slate-100 pt-4">
            <OrgFormSection
              direktoratId={form.direktorat_id}
              divisiId={form.divisi_id}
              departemenId={form.departemen_id}
              onChange={(field, val) => setForm((f) => ({ ...f, [field]: val }))}
            />
          </div>

          {/* Password preview */}
          {form.nik && form.nama_lengkap && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">Preview Password Default:</p>
              <code className="text-sm font-bold text-blue-800">
                {form.nik.trim().slice(-3)}_{form.nama_lengkap.trim().split(/\s+/).pop()?.toLowerCase()}
              </code>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Batal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.nik || !form.nama_lengkap || !form.email || !form.role}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
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
    nama_lengkap:  user.nama_lengkap,
    email:         user.email,
    kontak_email:  user.kontak_email ?? '',
    jabatan:       user.jabatan ?? '',
    role:          user.role,
    direktorat_id: user.direktorat_id ?? '',
    divisi_id:     user.divisi_id ?? '',
    departemen_id: user.departemen_id ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => usersApi.update(user.id, {
      ...form,
      direktorat_id: form.direktorat_id || null,
      divisi_id:     form.divisi_id     || null,
      departemen_id: form.departemen_id || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Data user diperbarui!');
      onClose();
    },
    onError: () => toast.error('Gagal memperbarui data user.'),
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
              <p className="text-xs text-slate-400">NIK: {user.nik}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
              <input type="text" value={form.nama_lengkap} onChange={(e) => setForm((f) => ({ ...f, nama_lengkap: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inp}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Login</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Kontak</label>
              <input type="email" value={form.kontak_email} onChange={(e) => setForm((f) => ({ ...f, kontak_email: e.target.value }))} placeholder="(opsional)" className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Jabatan Struktural</label>
            <select value={form.jabatan} onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))} className={inp}>
              <option value="">— Pilih Jabatan —</option>
              {JABATAN_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <OrgFormSection
              direktoratId={form.direktorat_id}
              divisiId={form.divisi_id}
              departemenId={form.departemen_id}
              onChange={(field, val) => setForm((f) => ({ ...f, [field]: val }))}
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Batal</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
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
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800 mb-1">Password Default:</p>
              <code className="text-base font-bold text-blue-700">{user.nik.slice(-3)}_{user.nama_lengkap.split(/\s+/).pop()?.toLowerCase()}</code>
              <p className="text-xs text-blue-500 mt-2">Pola: 3 digit terakhir NIK + '_' + nama belakang lowercase</p>
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
            className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
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
        <div className="p-6">
          <div className="flex gap-3 mb-4">
            <button onClick={() => setSelected(AVAILABLE_MODULES.map((m) => m.id))} className="text-xs text-primary-600 font-medium hover:underline">Pilih Semua</button>
            <span className="text-slate-300">|</span>
            <button onClick={() => setSelected([])} className="text-xs text-slate-500 font-medium hover:underline">Hapus Semua</button>
          </div>
          <div className="space-y-2">
            {AVAILABLE_MODULES.map((mod) => {
              const isSelected = selected.includes(mod.id);
              const Icon = mod.icon;
              return (
                <button key={mod.id} onClick={() => toggleModule(mod.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}><Icon className="w-4 h-4" /></div>
                  <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{mod.label}</span>
                  {isSelected ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500"><strong>{selected.length}</strong> dari {AVAILABLE_MODULES.length} modul dipilih</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Batal</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
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

  const [detailTarget, setDetailTarget]           = useState<UserRow | null>(null);
  const [showCreate, setShowCreate]               = useState(false);
  const [resetTarget, setResetTarget]             = useState<UserRow | null>(null);
  const [editTarget, setEditTarget]               = useState<UserRow | null>(null);
  const [moduleAccessTarget, setModuleAccessTarget] = useState<UserRow | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', search, roleFilter, activeFilter, page],
    queryFn: () => usersApi.getAll({ search: search || undefined, role: roleFilter || undefined, is_active: activeFilter || undefined, page, limit: 15 }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userStatsApi.get().then((r) => r.data.data),
  });

  const { data: divisiCount } = useQuery({
    queryKey: ['divisi-count'],
    queryFn: () => organisasiApi.getDivisis().then((r) => r.data.data?.length ?? 0),
    staleTime: 300_000,
  });

  const { data: deptCount } = useQuery({
    queryKey: ['dept-count'],
    queryFn: () => organisasiApi.getDepartemens().then((r) => r.data.data?.length ?? 0),
    staleTime: 300_000,
  });

  // ── Mutations ──────────────────────────────────────────────
  const toggleActive = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['user-stats'] }); toast.success(res.data.message ?? 'Status diperbarui.'); },
    onError: () => toast.error('Gagal mengubah status user.'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['user-stats'] }); toast.success('User dihapus.'); },
    onError: () => toast.error('Gagal menghapus user.'),
  });

  function confirmDelete(user: UserRow) {
    if (window.confirm(`Hapus user "${user.nama_lengkap}"? Tindakan ini tidak dapat dibatalkan.`)) deleteUser.mutate(user.id);
  }

  const users: UserRow[] = data?.data ?? [];
  const meta = data?.meta;

  // ── Stat cards ─────────────────────────────────────────────
  const statCards = [
    { label: 'Total User',       value: stats?.total    ?? 0, color: 'text-slate-800',   bg: 'bg-slate-50',   icon: Users },
    { label: 'User Aktif',       value: stats?.aktif    ?? 0, color: 'text-green-600',   bg: 'bg-green-50',   icon: Users },
    { label: 'User Non-Aktif',   value: stats?.non_aktif ?? 0, color: 'text-red-500',   bg: 'bg-red-50',     icon: Users },
    { label: 'Total Divisi',     value: divisiCount     ?? 0, color: 'text-blue-600',    bg: 'bg-blue-50',    icon: Building2 },
    { label: 'Total Departemen', value: deptCount       ?? 0, color: 'text-purple-600',  bg: 'bg-purple-50',  icon: Layers2 },
  ];

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
          <button onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['user-stats'] }); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> Tambah User
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl border border-slate-100 p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Cari nama, email, atau NIK..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Semua Role</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Non-aktif</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">NIK</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Modul</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Tidak ada user ditemukan</p>
              </td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                {/* User */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-600">{user.nama_lengkap.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.nama_lengkap}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </td>
                {/* NIK */}
                <td className="px-4 py-3.5">
                  <code className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{user.nik}</code>
                </td>
                {/* Role */}
                <td className="px-4 py-3.5">
                  <div className="space-y-1">
                    <RoleBadge role={user.role} />
                    {user.jabatan && <p className="text-[11px] text-slate-400">{user.jabatan}</p>}
                  </div>
                </td>
                {/* Modul */}
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(user.module_access ?? []).slice(0, 3).map((m) => (
                      <span key={m} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-100">{m}</span>
                    ))}
                    {(user.module_access ?? []).length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">+{(user.module_access ?? []).length - 3}</span>
                    )}
                    {!(user.module_access ?? []).length && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
                {/* Status */}
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                    {user.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </td>
                {/* Actions */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <button onClick={() => setDetailTarget(user)} title="Lihat detail" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => setEditTarget(user)} title="Edit" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setModuleAccessTarget(user)} title="Akses modul" className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Layers className="w-4 h-4" /></button>
                    <button onClick={() => setResetTarget(user)} title="Password" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><KeyRound className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive.mutate(user.id)} title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'} className={`p-1.5 rounded-lg transition-colors ${user.is_active ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                      {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => confirmDelete(user)} title="Hapus" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Menampilkan {users.length} dari {meta.total} user</p>
            <div className="flex gap-1">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 mb-0.5">Keamanan Password</p>
          <p className="text-xs text-blue-600">
            Password disimpan sebagai <strong>hash bcrypt</strong>. Pola default:{' '}
            <code className="bg-blue-100 px-1 rounded">3 digit terakhir NIK + '_' + nama belakang lowercase</code>.
            Contoh NIK <code className="bg-blue-100 px-1 rounded">199001001</code>, nama <em>Budi Santoso</em>{' '}
            → <code className="bg-blue-100 px-1 rounded">001_santoso</code>
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
