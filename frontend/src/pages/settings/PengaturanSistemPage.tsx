/**
 * Pengaturan Sistem — Master Data Modul 1
 *
 * Akses: kepala_spi, admin_spi (untuk full CRUD)
 * Sasaran Strategis bisa di-CRUD oleh seluruh user SPI.
 *
 * 4 Tab:
 * 1. House of Strategy   → 4 perspektif BSC per tahun
 * 2. Sasaran Strategis   → child HoS, free-input
 * 3. Bobot Peran         → bobot Man-Days per peran
 * 4. Tipe Penugasan      → sub-kategori program
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Target, Scale, Tags, Calendar, ChevronDown, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  settingsApi, HosKategori, SasaranStrategis, BobotPeran, TipePenugasan,
} from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

type TabId = 'hos' | 'sasaran' | 'bobot' | 'tipe';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'hos',     label: 'House of Strategy', icon: Layers },
  { id: 'sasaran', label: 'Sasaran Strategis', icon: Target },
  { id: 'bobot',   label: 'Bobot Peran',       icon: Scale  },
  { id: 'tipe',    label: 'Tipe Penugasan',    icon: Tags   },
];

export default function PengaturanSistemPage() {
  const [activeTab, setActiveTab] = useState<TabId>('hos');
  const [tahun, setTahun] = useState(CURRENT_YEAR);
  
  // State untuk mengontrol dropdown custom tahun
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  return (
    <div className="space-y-6 pb-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        
        {/* Title & Icon Header */}
        <div className="flex items-center gap-3.5">
          {/* Kotak Icon Header seperti pada Log Aktivitas */}
          <div className="flex items-center justify-center w-11 h-11 bg-slate-100 rounded-xl border border-slate-200/60">
            <Settings className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Pengaturan Sistem</h1>
            <p className="text-sm text-slate-500">Master data konfigurasi Modul Perencanaan</p>
          </div>
        </div>

        {/* Year Picker (Filter Tahun Custom) */}
        {(activeTab === 'hos' || activeTab === 'sasaran' || activeTab === 'bobot') && (
          <div className="flex items-center border border-indigo-200 rounded-lg bg-white shadow-sm overflow-visible h-9">
            
            {/* Label Area */}
            <div className="flex items-center gap-2 px-3 h-full">
              <Calendar className="w-4 h-4 text-slate-500" strokeWidth={2} />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mr-1">
                TAHUN AUDIT
              </span>
            </div>

            {/* Garis Pemisah (Divider) */}
            <div className="w-px h-full bg-indigo-100" />

            {/* Dropdown Trigger & Menu */}
            <div className="relative h-full">
              {/* Tombol Pemicu Dropdown */}
              <button
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center justify-between gap-2 px-3 h-full font-bold text-slate-800 hover:bg-slate-50 transition-colors rounded-r-lg min-w-[70px]"
              >
                {tahun}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Isi Dropdown (Custom List) */}
              {isYearDropdownOpen && (
                <>
                  {/* Backdrop tak kasat mata untuk menutup dropdown saat klik di luar */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsYearDropdownOpen(false)} 
                  />
                  
                  {/* Kotak Pilihan */}
                  <div className="absolute right-0 top-full mt-1 w-full min-w-[90px] bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden py-1">
                    {YEAR_OPTIONS.map((y) => (
                      <button
                        key={y}
                        onClick={() => {
                          setTahun(y);
                          setIsYearDropdownOpen(false); // Tutup dropdown setelah memilih
                        }}
                        className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                          y === tahun 
                            ? 'bg-blue-600 text-white font-medium' // Warna biru saat terpilih
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-slate-200 mt-2">
        <nav className="flex gap-8 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-[2px] transition-all whitespace-nowrap ${
                  active
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-primary-600' : 'text-slate-400'}`} strokeWidth={2} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT */}
      <div className="pt-2">
        {activeTab === 'hos'     && <HosTab tahun={tahun} />}
        {activeTab === 'sasaran' && <SasaranTab tahun={tahun} />}
        {activeTab === 'bobot'   && <BobotTab tahun={tahun} />}
        {activeTab === 'tipe'    && <TipeTab />}
      </div>
      
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 1: HOUSE OF STRATEGY KATEGORI
// ════════════════════════════════════════════════════════════
function HosTab({ tahun }: { tahun: number }) {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'kepala_spi' || role === 'admin_spi';
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<HosKategori> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hos-kategori', tahun],
    queryFn: () => settingsApi.getHosKategoris(tahun).then((r) => r.data.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: (payload: Partial<HosKategori>) => settingsApi.createHosKategori({ ...payload, tahun }),
    onSuccess: () => { toast.success('Kategori ditambahkan'); qc.invalidateQueries({ queryKey: ['hos-kategori'] }); setEditing(null); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? 'Gagal menyimpan'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...payload }: Partial<HosKategori> & { id: string }) =>
      settingsApi.updateHosKategori(id, payload),
    onSuccess: () => { toast.success('Tersimpan'); qc.invalidateQueries({ queryKey: ['hos-kategori'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: settingsApi.deleteHosKategori,
    onSuccess: () => { toast.success('Dihapus'); qc.invalidateQueries({ queryKey: ['hos-kategori'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">4 perspektif Balanced Scorecard tahun {tahun}.</p>
        {canEdit && (
          <button
            onClick={() => setEditing({ kode: '', nama_perspektif: '', urutan: 0 })}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            + Tambah Perspektif
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Urutan</th>
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama Perspektif</th>
              <th className="px-4 py-3 text-left">Deskripsi</th>
              {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada perspektif untuk tahun ini.</td></tr>
            )}
            {(data ?? []).map((k) => (
              <tr key={k.id}>
                <td className="px-4 py-3">{k.urutan}</td>
                <td className="px-4 py-3 font-mono text-xs">{k.kode}</td>
                <td className="px-4 py-3 font-medium">{k.nama_perspektif}</td>
                <td className="px-4 py-3 text-slate-500">{k.deskripsi ?? '-'}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditing(k)} className="text-primary-600 hover:underline text-xs font-medium">Edit</button>
                    <button onClick={() => { if (confirm(`Hapus ${k.nama_perspektif}?`)) deleteMut.mutate(k.id); }} className="text-red-600 hover:underline text-xs font-medium">Hapus</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <FormModal
          title={editing.id ? 'Edit Perspektif' : 'Tambah Perspektif'}
          onClose={() => setEditing(null)}
          onSubmit={() => editing.id
            ? updateMut.mutate({ ...editing, id: editing.id! })
            : createMut.mutate(editing)}
          loading={createMut.isPending || updateMut.isPending}
        >
          <FormRow label="Kode" required>
            <input className="input" value={editing.kode ?? ''} onChange={(e) => setEditing({ ...editing, kode: e.target.value })} placeholder="F | C | IBP | LG" />
          </FormRow>
          <FormRow label="Nama Perspektif" required>
            <input className="input" value={editing.nama_perspektif ?? ''} onChange={(e) => setEditing({ ...editing, nama_perspektif: e.target.value })} />
          </FormRow>
          <FormRow label="Urutan">
            <input type="number" className="input" value={editing.urutan ?? 0} onChange={(e) => setEditing({ ...editing, urutan: Number(e.target.value) })} />
          </FormRow>
          <FormRow label="Deskripsi">
            <textarea className="input min-h-[64px]" value={editing.deskripsi ?? ''} onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })} />
          </FormRow>
        </FormModal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 2: SASARAN STRATEGIS
// ════════════════════════════════════════════════════════════
function SasaranTab({ tahun }: { tahun: number }) {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = ['kepala_spi', 'admin_spi', 'pengendali_teknis', 'anggota_tim'].includes(role ?? '');
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<SasaranStrategis> | null>(null);
  const [filterKategori, setFilterKategori] = useState<string>('');

  const { data: kategoris } = useQuery({
    queryKey: ['hos-kategori', tahun],
    queryFn: () => settingsApi.getHosKategoris(tahun).then((r) => r.data.data ?? []),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sasaran-strategis', tahun, filterKategori],
    queryFn: () => settingsApi.getSasaranStrategis({
      tahun,
      ...(filterKategori ? { kategori_id: filterKategori } : {}),
    }).then((r) => r.data.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: (p: Partial<SasaranStrategis>) => settingsApi.createSasaranStrategis({ ...p, tahun }),
    onSuccess: () => { toast.success('Sasaran ditambahkan'); qc.invalidateQueries({ queryKey: ['sasaran-strategis'] }); setEditing(null); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? 'Gagal menyimpan'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...p }: Partial<SasaranStrategis> & { id: string }) => settingsApi.updateSasaranStrategis(id, p),
    onSuccess: () => { toast.success('Tersimpan'); qc.invalidateQueries({ queryKey: ['sasaran-strategis'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: settingsApi.deleteSasaranStrategis,
    onSuccess: () => { toast.success('Dihapus'); qc.invalidateQueries({ queryKey: ['sasaran-strategis'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Filter Perspektif</label>
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="">Semua</option>
            {(kategoris ?? []).map((k) => (
              <option key={k.id} value={k.id}>{k.kode} — {k.nama_perspektif}</option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing({ kategori_id: filterKategori || (kategoris?.[0]?.id ?? ''), kode: '', nama: '' })}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            + Tambah Sasaran
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Perspektif</th>
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama Sasaran</th>
              <th className="px-4 py-3 text-left">Dibuat oleh</th>
              {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada sasaran strategis.</td></tr>
            )}
            {(data ?? []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {s.kategori_kode ?? '-'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{s.kode ?? '-'}</td>
                <td className="px-4 py-3 font-medium">{s.nama}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s.created_by_nama ?? '-'}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditing(s)} className="text-primary-600 hover:underline text-xs font-medium">Edit</button>
                    <button onClick={() => { if (confirm(`Hapus ${s.nama}?`)) deleteMut.mutate(s.id); }} className="text-red-600 hover:underline text-xs font-medium">Hapus</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <FormModal
          title={editing.id ? 'Edit Sasaran' : 'Tambah Sasaran Strategis'}
          onClose={() => setEditing(null)}
          onSubmit={() => editing.id
            ? updateMut.mutate({ ...editing, id: editing.id! })
            : createMut.mutate(editing)}
          loading={createMut.isPending || updateMut.isPending}
        >
          <FormRow label="Perspektif" required>
            <select className="input" value={editing.kategori_id ?? ''} onChange={(e) => setEditing({ ...editing, kategori_id: e.target.value })}>
              <option value="">— Pilih perspektif —</option>
              {(kategoris ?? []).map((k) => (
                <option key={k.id} value={k.id}>{k.kode} — {k.nama_perspektif}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Kode (opsional)">
            <input className="input" value={editing.kode ?? ''} onChange={(e) => setEditing({ ...editing, kode: e.target.value })} placeholder="LG.1.1" />
          </FormRow>
          <FormRow label="Nama Sasaran" required>
            <input className="input" value={editing.nama ?? ''} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} placeholder="% Implementasi GRC" />
          </FormRow>
          <FormRow label="Deskripsi">
            <textarea className="input min-h-[64px]" value={editing.deskripsi ?? ''} onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })} />
          </FormRow>
        </FormModal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 3: BOBOT PERAN (mass upsert)
// ════════════════════════════════════════════════════════════
function BobotTab({ tahun }: { tahun: number }) {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'kepala_spi' || role === 'admin_spi';
  const qc = useQueryClient();
  const [draft, setDraft] = useState<BobotPeran[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bobot-peran', tahun],
    queryFn: () => settingsApi.getBobotPeran(tahun).then((r) => r.data.data ?? []),
  });

  const upsertMut = useMutation({
    mutationFn: () => settingsApi.upsertBobotPeran(tahun, draft ?? []),
    onSuccess: () => { toast.success('Bobot tersimpan'); qc.invalidateQueries({ queryKey: ['bobot-peran'] }); setDraft(null); },
  });

  const rows = draft ?? data ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        💡 Bobot peran dipakai untuk menghitung <b>Man-Days</b>:{' '}
        <code className="bg-white px-1 rounded text-xs">Man-Days = Σ (Hari Penugasan × Bobot Peran)</code>.
        <br />
        <b>Max Bobot/Bulan</b> = pagu maksimum akumulasi bobot per orang dalam satu bulan (cegah overload).
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Peran</th>
              <th className="px-4 py-3 text-left">Bobot</th>
              <th className="px-4 py-3 text-left">Max Bobot/Bulan</th>
              <th className="px-4 py-3 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Belum ada konfigurasi bobot tahun ini.</td></tr>
            )}
            {rows.map((b, idx) => (
              <tr key={b.id || b.peran}>
                <td className="px-4 py-3 font-medium">{b.peran}</td>
                <td className="px-4 py-3">
                  <input
                    type="number" step="0.05" min="0" max="5"
                    disabled={!canEdit}
                    className="input w-24"
                    value={b.bobot}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], bobot: Number(e.target.value) };
                      setDraft(next);
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number" step="0.5" min="0.5" max="31"
                    disabled={!canEdit}
                    className="input w-24"
                    value={b.max_bobot_per_bulan}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], max_bobot_per_bulan: Number(e.target.value) };
                      setDraft(next);
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{b.keterangan ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && draft && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setDraft(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Batal</button>
          <button
            onClick={() => upsertMut.mutate()}
            disabled={upsertMut.isPending}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {upsertMut.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  TAB 4: TIPE PENUGASAN
// ════════════════════════════════════════════════════════════
const KATEGORI_PROGRAM_OPTIONS = ['Assurance', 'Non Assurance', 'Pemantauan Risiko', 'Evaluasi'];

function TipeTab() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'kepala_spi' || role === 'admin_spi';
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Partial<TipePenugasan> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tipe-penugasan', filter],
    queryFn: () => settingsApi.getTipePenugasan(filter || undefined).then((r) => r.data.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: settingsApi.createTipePenugasan,
    onSuccess: () => { toast.success('Tipe ditambahkan'); qc.invalidateQueries({ queryKey: ['tipe-penugasan'] }); setEditing(null); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? 'Gagal'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...p }: Partial<TipePenugasan> & { id: string }) => settingsApi.updateTipePenugasan(id, p),
    onSuccess: () => { toast.success('Tersimpan'); qc.invalidateQueries({ queryKey: ['tipe-penugasan'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: settingsApi.deleteTipePenugasan,
    onSuccess: () => { toast.success('Dihapus'); qc.invalidateQueries({ queryKey: ['tipe-penugasan'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Filter Kategori</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
            <option value="">Semua</option>
            {KATEGORI_PROGRAM_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing({ kategori_program: filter || 'Assurance', kode: '', nama: '', urutan: 0 })}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            + Tambah Tipe
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">Default Hari</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Belum ada tipe penugasan.</td></tr>
            )}
            {(data ?? []).map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{t.kategori_program}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{t.kode}</td>
                <td className="px-4 py-3 font-medium">{t.nama}</td>
                <td className="px-4 py-3">{t.default_hari ?? '-'}</td>
                <td className="px-4 py-3">
                  {t.is_active
                    ? <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">Aktif</span>
                    : <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">Non-aktif</span>}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditing(t)} className="text-primary-600 hover:underline text-xs font-medium">Edit</button>
                    <button onClick={() => { if (confirm(`Hapus ${t.nama}?`)) deleteMut.mutate(t.id); }} className="text-red-600 hover:underline text-xs font-medium">Hapus</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <FormModal
          title={editing.id ? 'Edit Tipe Penugasan' : 'Tambah Tipe Penugasan'}
          onClose={() => setEditing(null)}
          onSubmit={() => editing.id
            ? updateMut.mutate({ ...editing, id: editing.id! })
            : createMut.mutate(editing)}
          loading={createMut.isPending || updateMut.isPending}
        >
          <FormRow label="Kategori Program" required>
            <select className="input" value={editing.kategori_program ?? ''} onChange={(e) => setEditing({ ...editing, kategori_program: e.target.value })}>
              {KATEGORI_PROGRAM_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormRow>
          <FormRow label="Kode" required>
            <input className="input" value={editing.kode ?? ''} onChange={(e) => setEditing({ ...editing, kode: e.target.value })} placeholder="AUDIT" />
          </FormRow>
          <FormRow label="Nama" required>
            <input className="input" value={editing.nama ?? ''} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} placeholder="Audit" />
          </FormRow>
          <FormRow label="Default Hari">
            <input type="number" className="input" value={editing.default_hari ?? ''} onChange={(e) => setEditing({ ...editing, default_hari: e.target.value === '' ? null : Number(e.target.value) })} />
          </FormRow>
          <FormRow label="Urutan">
            <input type="number" className="input" value={editing.urutan ?? 0} onChange={(e) => setEditing({ ...editing, urutan: Number(e.target.value) })} />
          </FormRow>
          {editing.id && (
            <FormRow label="Aktif">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="w-4 h-4" />
            </FormRow>
          )}
        </FormModal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Shared UI helpers
// ════════════════════════════════════════════════════════════
function FormModal({
  title, onClose, onSubmit, loading, children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Batal</button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}