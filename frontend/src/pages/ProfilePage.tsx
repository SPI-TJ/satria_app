import { useAuthStore } from '../store/auth.store';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  User, Mail, BadgeInfo, MapPin,
  KeyRound, Eye, EyeOff, Check, Layers,
  Calendar, Shield, FileText, PieChart, CheckSquare, LayoutGrid
} from 'lucide-react';
import { ROLE_LABELS } from '../types';
import { authApi, organisasiApi } from '../services/api';
import toast from 'react-hot-toast';

const AVAILABLE_MODULES: { id: string; label: string; icon: any }[] = [
  { id: 'pkpt',        label: 'PKPT', icon: Calendar },
  { id: 'pelaksanaan', label: 'Pelaksanaan Audit & Kertas Kerja', icon: Shield },
  { id: 'pelaporan',   label: 'Pelaporan & Komunikasi Hasil', icon: FileText },
  { id: 'sintesis',    label: 'Sintesis Hasil Pengawasan', icon: PieChart },
  { id: 'pemantauan',  label: 'Pemantauan Tindak Lanjut Temuan', icon: CheckSquare },
  { id: 'ca-cm',       label: 'Dashboard CA-CM', icon: LayoutGrid },
];

const ROLE_COLORS: Record<string, string> = {
  it_admin:           'bg-purple-100 text-purple-700',
  admin_spi:          'bg-blue-100   text-blue-700',
  kepala_spi:         'bg-indigo-100 text-indigo-700',
  pengendali_teknis:  'bg-teal-100   text-teal-700',
  anggota_tim:        'bg-green-100  text-green-700',
  auditee:            'bg-orange-100 text-orange-700',
};

type Tab = 'identitas' | 'password';

// ── Tab: Identitas ────────────────────────────────────────────
function IdentitasTab() {
  const { user } = useAuthStore();

  const { data: direktorat, isLoading: lDir } = useQuery({
    queryKey: ['direktorat-detail', user?.direktorat_id],
    queryFn: () => organisasiApi.getDirektorats()
      .then((r) => (r.data.data ?? []).find((d) => d.id === user?.direktorat_id) ?? null),
    enabled: !!user?.direktorat_id,
    staleTime: 300_000,
  });

  const { data: divisi, isLoading: lDiv } = useQuery({
    queryKey: ['divisi-detail', user?.divisi_id],
    queryFn: () => organisasiApi.getDivisis()
      .then((r) => (r.data.data ?? []).find((d) => d.id === user?.divisi_id) ?? null),
    enabled: !!user?.divisi_id,
    staleTime: 300_000,
  });

  const { data: departemen, isLoading: lDept } = useQuery({
    queryKey: ['departemen-detail', user?.departemen_id],
    queryFn: () => organisasiApi.getDepartemens()
      .then((r) => (r.data.data ?? []).find((d) => d.id === user?.departemen_id) ?? null),
    enabled: !!user?.departemen_id,
    staleTime: 300_000,
  });

  const orgLoading = lDir || lDiv || lDept;

  if (!user) return null;

  return (
    <div className="space-y-8 mt-2">
      {/* SECTION 1: Identitas Dasar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BadgeInfo className="w-4 h-4 text-slate-400" />
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Identitas Pengguna
          </h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* NIK */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 mb-1">NIK (KREDENSIAL LOGIN)</p>
              <p className="text-[14px] font-bold text-slate-800">{user.nik}</p>
            </div>
            {/* STATUS */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 mb-1">STATUS</p>
              <div className="flex items-center text-[13px] font-bold text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                Aktif
              </div>
            </div>
          </div>
          {/* EMAIL */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> EMAIL NOTIFIKASI
            </p>
            <p className="text-[14px] font-medium text-slate-800 break-all">{user.email}</p>
          </div>
          {/* JABATAN */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 mb-1">JABATAN STRUKTURAL</p>
            <p className="text-[14px] font-medium text-slate-800">{user.jabatan ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Posisi Organisasi */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-slate-400" />
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Posisi Organisasi
          </h3>
        </div>

        {orgLoading ? (
          <div className="space-y-4 pl-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 w-2/3 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (user.direktorat_id || user.divisi_id || user.departemen_id) ? (
          <div className="relative pl-1.5 space-y-5">
            {/* Garis vertikal penghubung */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />

            <div className="relative flex items-start gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 ring-4 ring-white z-10" />
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5 tracking-wider">Direktorat</p>
                <p className="text-[14px] font-semibold text-slate-800">{direktorat?.nama ?? '—'}</p>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 mt-1.5 ring-4 ring-white z-10" />
              <div>
                <p className="text-[10px] font-bold text-teal-600 uppercase mb-0.5 tracking-wider">Divisi</p>
                <p className="text-[14px] font-semibold text-slate-800">{divisi?.nama ?? '—'}</p>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 ring-4 ring-white z-10" />
              <div>
                <p className="text-[10px] font-bold text-purple-600 uppercase mb-0.5 tracking-wider">Departemen</p>
                <p className="text-[14px] font-semibold text-slate-800">{departemen?.nama ?? '—'}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Posisi organisasi belum ditentukan.</p>
        )}
      </div>

      {/* SECTION 3: Akses Modul */}
      {(user.module_access ?? []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Akses Modul ({user.module_access!.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {user.module_access!.map((m) => {
              const moduleDef = AVAILABLE_MODULES.find((mod) => mod.id === m);
              const label = moduleDef?.label ?? m.toUpperCase();
              const Icon = moduleDef?.icon ?? LayoutGrid;

              return (
                <div key={m} className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <Icon className="w-4 h-4 text-indigo-500" />
                  <span className="text-[12px] font-semibold text-slate-700">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Ubah Password ────────────────────────────────────────
function UbahPasswordTab() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ old: '', new: '', confirm: '' });
  const [show, setShow]  = useState({ old: false, new: false, confirm: false });
  const [done, setDone]  = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(form.old, form.new),
    onSuccess: () => { setDone(true); setForm({ old: '', new: '', confirm: '' }); toast.success('Password berhasil diubah!'); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal mengubah password.';
      toast.error(msg);
    },
  });

  const isValid = form.old.length >= 1 && form.new.length >= 6 && form.new === form.confirm;
  const mismatch = form.confirm.length > 0 && form.new !== form.confirm;
  const inp = 'w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10 shadow-sm bg-white';

  function ShowToggle({ field }: { field: 'old' | 'new' | 'confirm' }) {
    return (
      <button type="button" onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    );
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-8 flex flex-col items-center text-center gap-4 mt-4 shadow-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Password Berhasil Diubah</h3>
          <p className="text-sm text-slate-500">Gunakan password baru kamu saat login berikutnya.</p>
        </div>
        <button onClick={() => setDone(false)} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors font-medium">
          Ubah Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Hint pola default */}
      {user && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6">
          <p className="text-xs text-blue-700">
            Password default pola:{' '}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold">
              {user.nik?.slice(-3)}_{user.nama?.split(/\s+/).pop()?.toLowerCase()}
            </code>{' '}
            (3 digit terakhir NIK + '_' + nama belakang)
          </p>
        </div>
      )}

      <div className="space-y-4 max-w-md">
        {/* Password Lama */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Password Saat Ini <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type={show.old ? 'text' : 'password'} value={form.old} onChange={(e) => setForm((f) => ({ ...f, old: e.target.value }))} placeholder="Masukkan password saat ini" className={inp} />
            <ShowToggle field="old" />
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Password Baru <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type={show.new ? 'text' : 'password'} value={form.new} onChange={(e) => setForm((f) => ({ ...f, new: e.target.value }))} placeholder="Minimal 6 karakter" className={inp} />
            <ShowToggle field="new" />
          </div>
          {form.new.length > 0 && form.new.length < 6 && (
            <p className="text-[11px] font-medium text-amber-600 mt-1.5">Minimal 6 karakter</p>
          )}
        </div>

        {/* Konfirmasi */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Konfirmasi Password Baru <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type={show.confirm ? 'text' : 'password'} value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Ulangi password baru" className={`${inp} ${mismatch ? 'border-red-300 focus:ring-red-400' : ''}`} />
            <ShowToggle field="confirm" />
          </div>
          {mismatch && <p className="text-[11px] font-medium text-red-500 mt-1.5">Password tidak cocok</p>}
          {!mismatch && form.confirm.length >= 6 && form.new === form.confirm && (
            <p className="text-[11px] font-medium text-green-600 mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> Password cocok</p>
          )}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !isValid}
          className="w-full py-3 bg-primary-600 text-white rounded-xl text-[13px] font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors mt-2"
        >
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('identitas');

  if (!user) return <div className="p-8 text-center text-slate-500">Tidak ada data pengguna.</div>;

  const initials = user.nama?.split(' ').slice(0, 2).map((n) => n[0]).join('') ?? 'U';
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div className="max-w-[640px] mx-auto py-4">
      {/* KARTU UTAMA SEPERTI MODAL */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header Profile (Sama dengan bagian atas gambar referensi) */}
        <div className="p-6 sm:px-8 sm:pt-8 pb-6 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar Circle */}
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                {initials}
              </div>
              {/* Nama dan Role */}
              <div>
                <h1 className="text-[20px] font-bold text-slate-800 leading-tight">
                  {user.nama}
                </h1>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Tabs Navigation (Untuk pindah ke Ubah Password) */}
        <div className="px-6 sm:px-8 border-b border-slate-100 bg-slate-50/50">
          <nav className="flex gap-6">
            {([
              { id: 'identitas' as Tab, label: 'Detail Pengguna' },
              { id: 'password'  as Tab, label: 'Ubah Password' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 text-[13px] font-bold border-b-[3px] transition-all ${
                  activeTab === id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:px-8 pb-8 bg-slate-50/30">
          {activeTab === 'identitas' ? <IdentitasTab /> : <UbahPasswordTab />}
        </div>
      </div>
    </div>
  );
}