import { useAuthStore } from '../store/auth.store';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  User, Mail, Phone, BadgeInfo, Building2, MapPin,
  KeyRound, Eye, EyeOff, Check, Layers, ShieldCheck,
} from 'lucide-react';
import { ROLE_LABELS } from '../types';
import { authApi, organisasiApi } from '../services/api';
import toast from 'react-hot-toast';

const AVAILABLE_MODULES: { id: string; label: string }[] = [
  { id: 'pkpt',        label: 'PKPT' },
  { id: 'pelaksanaan', label: 'Pelaksanaan Audit' },
  { id: 'pelaporan',   label: 'Pelaporan' },
  { id: 'sintesis',    label: 'Sintesis' },
  { id: 'pemantauan',  label: 'Pemantauan' },
  { id: 'ca-cm',       label: 'CA-CM' },
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
    <div className="space-y-5">
      {/* Identitas Dasar */}
      <section className="bg-white rounded-xl border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <BadgeInfo className="w-3.5 h-3.5" /> Identitas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">NIK</p>
            <code className="text-sm font-bold text-slate-700">{user.nik}</code>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Jabatan</p>
            <p className="text-sm font-semibold text-slate-700">{user.jabatan ?? '—'}</p>
          </div>
          <div className="sm:col-span-2 bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email Login
            </p>
            <p className="text-sm text-slate-700 break-all">{user.email}</p>
          </div>
          {user.kontak_email && (
            <div className="sm:col-span-2 bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Email Kontak
              </p>
              <p className="text-sm text-slate-700 break-all">{user.kontak_email}</p>
            </div>
          )}
        </div>
      </section>

      {/* Posisi Organisasi */}
      <section className="bg-white rounded-xl border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Posisi Organisasi
        </p>
        {orgLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (user.direktorat_id || user.divisi_id || user.departemen_id) ? (
          <div className="space-y-2">
            {user.direktorat_id && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 border-l-4 border-blue-400">
                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase">Direktorat</p>
                  <p className="text-sm font-semibold text-slate-800">{direktorat?.nama ?? '—'}</p>
                </div>
              </div>
            )}
            {user.divisi_id && (
              <div className="flex items-center gap-3 bg-teal-50 rounded-xl px-4 py-3 border-l-4 border-teal-400">
                <Building2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-teal-600 uppercase">Divisi</p>
                  <p className="text-sm font-semibold text-slate-800">{divisi?.nama ?? '—'}</p>
                </div>
              </div>
            )}
            {user.departemen_id && (
              <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3 border-l-4 border-purple-400">
                <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-purple-600 uppercase">Departemen</p>
                  <p className="text-sm font-semibold text-slate-800">{departemen?.nama ?? '—'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Posisi organisasi belum ditentukan.</p>
        )}
      </section>

      {/* Akses Modul */}
      {(user.module_access ?? []).length > 0 && (
        <section className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Akses Modul ({user.module_access!.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {user.module_access!.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                <ShieldCheck className="w-3 h-3" />
                {AVAILABLE_MODULES.find((mod) => mod.id === m)?.label ?? m.toUpperCase()}
              </span>
            ))}
          </div>
        </section>
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

  const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10';

  function ShowToggle({ field }: { field: 'old' | 'new' | 'confirm' }) {
    return (
      <button type="button" onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    );
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Password Berhasil Diubah</h3>
          <p className="text-sm text-slate-500">Gunakan password baru kamu saat login berikutnya.</p>
        </div>
        <button onClick={() => setDone(false)} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
          Ubah Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-1.5">
        <KeyRound className="w-3.5 h-3.5" /> Ubah Password
      </p>

      {/* Hint pola default */}
      {user && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
          <p className="text-xs text-blue-700">
            Password default pola:{' '}
            <code className="bg-blue-100 px-1 rounded font-mono">
              {user.nik?.slice(-3)}_{user.nama?.split(/\s+/).pop()?.toLowerCase()}
            </code>{' '}
            (3 digit terakhir NIK + '_' + nama belakang)
          </p>
        </div>
      )}

      <div className="space-y-4 max-w-md">
        {/* Password Lama */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Password Saat Ini <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={show.old ? 'text' : 'password'}
              value={form.old}
              onChange={(e) => setForm((f) => ({ ...f, old: e.target.value }))}
              placeholder="Masukkan password saat ini"
              className={inp}
            />
            <ShowToggle field="old" />
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Password Baru <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={show.new ? 'text' : 'password'}
              value={form.new}
              onChange={(e) => setForm((f) => ({ ...f, new: e.target.value }))}
              placeholder="Minimal 6 karakter"
              className={inp}
            />
            <ShowToggle field="new" />
          </div>
          {form.new.length > 0 && form.new.length < 6 && (
            <p className="text-[11px] text-amber-600 mt-1">Minimal 6 karakter</p>
          )}
        </div>

        {/* Konfirmasi */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Konfirmasi Password Baru <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={show.confirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="Ulangi password baru"
              className={`${inp} ${mismatch ? 'border-red-300 focus:ring-red-400' : ''}`}
            />
            <ShowToggle field="confirm" />
          </div>
          {mismatch && <p className="text-[11px] text-red-500 mt-1">Password tidak cocok</p>}
          {!mismatch && form.confirm.length >= 6 && form.new === form.confirm && (
            <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Password cocok</p>
          )}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !isValid}
          className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Profile header card */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 truncate">{user.nama}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                {roleLabel}
              </span>
              {user.jabatan && (
                <span className="text-xs text-slate-500">{user.jabatan}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
          </div>
          <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-slate-50 rounded-xl">
            <User className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {([
          { id: 'identitas' as Tab, label: 'Identitas', icon: BadgeInfo },
          { id: 'password'  as Tab, label: 'Ubah Password', icon: KeyRound },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'identitas' ? <IdentitasTab /> : <UbahPasswordTab />}
    </div>
  );
}
