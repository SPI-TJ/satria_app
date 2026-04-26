import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Eye, Pencil, Trash2, CheckCircle2, Clock,
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Users, CalendarDays, X, AlertTriangle, Hourglass, PlayCircle, Flag, Search,
  Briefcase, TrendingDown,
} from 'lucide-react';
import { annualPlansApi, kalenderKerjaApi } from '../../../services/api';
import { AnnualAuditPlan, JenisProgram, StatusPKPT, KategoriProgram, StatusProgram } from '../../../types';
import { useAuthStore } from '../../../store/auth.store';
import toast from 'react-hot-toast';
import ProgramFormModal from './ProgramFormModal';
import ProgramDetailModal from './ProgramDetailModal';

interface Props { tahun: number; }

const JENIS_BADGE: Record<JenisProgram, string> = {
  'PKPT':     'bg-primary-50 text-primary-700 border border-primary-200',
  'Non PKPT': 'bg-purple-50 text-purple-700 border border-purple-200',
};

const STATUS_BADGE: Record<StatusPKPT, { cls: string; icon: React.ElementType }> = {
  'Open':        { cls: 'bg-amber-50 text-amber-700 border border-amber-200',      icon: Clock },
  'On Progress': { cls: 'bg-primary-50 text-primary-700 border border-primary-200', icon: PlayCircle },
  'Closed':      { cls: 'bg-green-50 text-green-700 border border-green-200',       icon: CheckCircle2 },
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// ── Timeline / Deadline Status ────────────────────────────────
type TimelineKey = 'not_started' | 'running' | 'near_deadline' | 'overdue' | 'done';
const TIMELINE_BADGE: Record<TimelineKey, { label: string; cls: string; icon: React.ElementType }> = {
  not_started:   { label: 'Belum Mulai',        cls: 'bg-slate-100 text-slate-600 border border-slate-200',   icon: Hourglass    },
  running:       { label: 'Berjalan',           cls: 'bg-green-50 text-green-700 border border-green-200',    icon: PlayCircle   },
  near_deadline: { label: 'Mendekati Deadline', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-300', icon: AlertTriangle },
  overdue:       { label: 'Overdue',            cls: 'bg-red-50 text-red-700 border border-red-200',          icon: AlertTriangle },
  done:          { label: 'Selesai',            cls: 'bg-blue-50 text-blue-700 border border-blue-200',       icon: Flag         },
};

/**
 * Derive timeline status dari tanggal_mulai, tanggal_selesai, completed_at.
 * Threshold "Mendekati Deadline" = 7 hari sebelum tanggal_selesai.
 */
function deriveTimelineStatus(p: { tanggal_mulai?: string; tanggal_selesai?: string; completed_at?: string | null; status_pkpt?: string }): TimelineKey {
  // Timeline "Selesai" HANYA saat program sudah Closed (final).
  // Open / On Progress tetap dihitung dari tanggal — walaupun completed_at terisi,
  // selama status belum Closed, timeline harus merefleksikan realita deadline.
  if (p.status_pkpt === 'Closed') return 'done';
  const mulai   = p.tanggal_mulai   ? new Date(p.tanggal_mulai)   : null;
  const selesai = p.tanggal_selesai ? new Date(p.tanggal_selesai) : null;
  if (!mulai || !selesai || Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) return 'not_started';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  mulai.setHours(0, 0, 0, 0); selesai.setHours(0, 0, 0, 0);
  if (today < mulai) return 'not_started';
  if (today > selesai) return 'overdue';
  const dayMs = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((selesai.getTime() - today.getTime()) / dayMs);
  if (daysLeft <= 7) return 'near_deadline';
  return 'running';
}

export default function ProgramTab({ tahun }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [search, setSearch]                     = useState('');
  const [jenisFilter, setJenisFilter]           = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [kategoriFilter, setKategoriFilter]     = useState('');
  const [sifatProgramFilter, setSifatProgramFilter] = useState('');
  const [kategoriAnggaranFilter, setKategoriAnggaranFilter] = useState('');
  const [bulanFilter, setBulanFilter]           = useState('');
  const [page,  setPage]  = useState(1);

  const [formOpen,     setFormOpen]     = useState(false);
  const [editProgram,  setEditProgram]  = useState<AnnualAuditPlan | null>(null);
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnualAuditPlan | null>(null);

  const LIMIT = 15;

  const { data: planRes, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['annual-plans', { tahun, search, jenisFilter, statusFilter, kategoriFilter, sifatProgramFilter, kategoriAnggaranFilter, bulanFilter, page }],
    queryFn: async () => {
      const res = await annualPlansApi.getAll({
        tahun,
        search: search || undefined,
        jenis_program: jenisFilter || undefined,
        status_pkpt:   statusFilter || undefined,
        kategori_program:  kategoriFilter || undefined,
        status_program:    sifatProgramFilter || undefined,
        kategori_anggaran: kategoriAnggaranFilter || undefined,
        bulan: bulanFilter || undefined,
        page,
        limit: LIMIT,
      });
      return res.data as unknown as {
        data: AnnualAuditPlan[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    },
    placeholderData: (prev) => prev,
  });

  const plans = planRes?.data ?? [];
  const total = planRes?.meta?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);

  // ── Ringkasan utilisasi pagu HP tahunan (semua program, non-paginated) ──
  const { data: allPlansRes } = useQuery({
    queryKey: ['annual-plans-all-yearly', tahun],
    queryFn: async () => {
      const res = await annualPlansApi.getAll({ tahun, limit: 500 });
      return (res.data as unknown as { data: AnnualAuditPlan[] }).data ?? [];
    },
    staleTime: 60_000,
  });
  const { data: kalenderRes } = useQuery({
    queryKey: ['kalender-kerja-program-tab', tahun],
    queryFn: () => kalenderKerjaApi.get(tahun),
    staleTime: 5 * 60_000,
  });

  const paguHP        = kalenderRes?.data?.data?.header?.hari_pemeriksaan_tersedia ?? 0;
  const totalTerpakai = (allPlansRes ?? []).reduce(
    (s, p) => s + Number(p.man_days_terpakai ?? 0),
    0,
  );
  const sisaHP   = Math.max(0, paguHP - totalTerpakai);
  const persenHP = paguHP > 0 ? (totalTerpakai / paguHP) * 100 : 0;

  const deleteMut = useMutation({
    mutationFn: (id: string) => annualPlansApi.delete(id),
    onSuccess: () => {
      toast.success('Program berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['annual-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Gagal menghapus program';
      toast.error(msg);
    },
  });

  const finalizeMut = useMutation({
    mutationFn: (id: string) => annualPlansApi.finalize(id),
    onSuccess: () => {
      toast.success('Program ditutup (Closed)');
      qc.invalidateQueries({ queryKey: ['annual-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Gagal menutup program'),
  });

  const canCreate   = ['kepala_spi', 'admin_spi', 'pengendali_teknis'].includes(user?.role ?? '');
  const canFinalize = user?.role === 'kepala_spi';

  function fmtDate(d?: string) {
    if (!d) return '—';
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Format Rupiah ringkas: 1.500.000 → 1.5jt, 25.000.000 → 25jt, 1.250.000.000 → 1.25M
  function fmtRupiahShort(v?: number | null): string {
    if (v == null) return '—';
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
    if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1).replace(/\.?0+$/, '')}jt`;
    if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}rb`;
    return `Rp ${v}`;
  }

  return (
    <div className="space-y-6">
      
      {/* --- Filter & Action Section --- */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Daftar Program Kerja Tahun {tahun}</h2>
          {canCreate && (
            <button type="button" onClick={() => { setEditProgram(null); setFormOpen(true); }} className="btn-primary flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
              <Plus className="w-4 h-4" /> Buat Program Kerja
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Judul Program atau Auditee..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
            />
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Bulan</label>
              <select
                value={bulanFilter}
                onChange={(e) => { setBulanFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                <option value="">Semua Bulan</option>
                {MONTH_LABELS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Jenis Program</label>
              <select
                value={jenisFilter}
                onChange={(e) => { setJenisFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                <option value="">Semua Jenis</option>
                <option value="PKPT">PKPT</option>
                <option value="Non PKPT">Non PKPT</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Status PKPT</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                <option value="">Semua Status</option>
                <option value="Open">Open</option>
                <option value="On Progress">On Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Kategori Program</label>
              <select
                value={kategoriFilter}
                onChange={(e) => { setKategoriFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                <option value="">Semua Kategori</option>
                <option value="Assurance">Assurance</option>
                <option value="Non Assurance">Non Assurance</option>
                <option value="Pemantauan Risiko">Pemantauan Risiko</option>
                <option value="Evaluasi">Evaluasi</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Sifat Program</label>
              <select
                value={sifatProgramFilter}
                onChange={(e) => { setSifatProgramFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                <option value="">Semua Sifat</option>
                <option value="Mandatory">Mandatory</option>
                <option value="Strategis">Strategis</option>
                <option value="Emerging Risk">Emerging Risk</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Kategori Anggaran</label>
              <select
                value={kategoriAnggaranFilter}
                onChange={(e) => { setKategoriAnggaranFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                <option value="">Semua Kategori</option>
                <option value="Subsidi">Subsidi</option>
                <option value="Non Subsidi">Non Subsidi</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(search || jenisFilter || statusFilter || kategoriFilter || sifatProgramFilter || kategoriAnggaranFilter || bulanFilter) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {search && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs">
                  <span className="text-primary-700 font-medium">Cari: {search}</span>
                  <button onClick={() => { setSearch(''); setPage(1); }} className="text-primary-500 hover:text-primary-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {bulanFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs">
                  <span className="text-blue-700 font-medium">Bulan: {MONTH_LABELS[Number(bulanFilter) - 1]}</span>
                  <button onClick={() => { setBulanFilter(''); setPage(1); }} className="text-blue-500 hover:text-blue-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {jenisFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs">
                  <span className="text-violet-700 font-medium">Jenis: {jenisFilter}</span>
                  <button onClick={() => { setJenisFilter(''); setPage(1); }} className="text-violet-500 hover:text-violet-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {statusFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs">
                  <span className="text-amber-700 font-medium">Status: {statusFilter}</span>
                  <button onClick={() => { setStatusFilter(''); setPage(1); }} className="text-amber-500 hover:text-amber-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {kategoriFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs">
                  <span className="text-green-700 font-medium">Kategori: {kategoriFilter}</span>
                  <button onClick={() => { setKategoriFilter(''); setPage(1); }} className="text-green-500 hover:text-green-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {sifatProgramFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs">
                  <span className="text-indigo-700 font-medium">Sifat: {sifatProgramFilter}</span>
                  <button onClick={() => { setSifatProgramFilter(''); setPage(1); }} className="text-indigo-500 hover:text-indigo-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {kategoriAnggaranFilter && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-xs ${
                  kategoriAnggaranFilter === 'Subsidi'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-medium ${
                    kategoriAnggaranFilter === 'Subsidi' ? 'text-emerald-700' : 'text-slate-700'
                  }`}>
                    Anggaran: {kategoriAnggaranFilter}
                  </span>
                  <button
                    onClick={() => { setKategoriAnggaranFilter(''); setPage(1); }}
                    className={kategoriAnggaranFilter === 'Subsidi' ? 'text-emerald-500 hover:text-emerald-700' : 'text-slate-500 hover:text-slate-700'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <button
                onClick={() => { setSearch(''); setJenisFilter(''); setStatusFilter(''); setKategoriFilter(''); setSifatProgramFilter(''); setKategoriAnggaranFilter(''); setBulanFilter(''); setPage(1); }}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-3 h-3" /> Reset Semua
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Pagu HP Tahunan Utilisasi (Fase 5) --- */}
      {paguHP > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary-50">
                <Briefcase className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Utilisasi Pagu Hari Pemeriksaan {tahun}</p>
                <p className="text-[11px] text-slate-400">
                  Total Man-Days terpakai dari semua program vs pagu kalender kerja
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pagu</p>
                <p className="text-base font-black text-slate-700 tabular-nums">{paguHP.toLocaleString('id-ID')} <span className="text-[10px] font-semibold text-slate-400">HP</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Terpakai</p>
                <p className={`text-base font-black tabular-nums ${persenHP >= 100 ? 'text-red-700' : persenHP >= 80 ? 'text-amber-700' : 'text-primary-700'}`}>
                  {totalTerpakai.toFixed(1)} <span className="text-[10px] font-semibold opacity-70">HP</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-end gap-1">
                  <TrendingDown className="w-2.5 h-2.5" /> Sisa
                </p>
                <p className={`text-base font-black tabular-nums ${sisaHP === 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {sisaHP.toFixed(1)} <span className="text-[10px] font-semibold opacity-70">HP</span>
                </p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                persenHP >= 100 ? 'bg-red-500' :
                persenHP >= 80  ? 'bg-amber-500' :
                persenHP >= 50  ? 'bg-emerald-500' :
                                  'bg-blue-500'
              }`}
              style={{ width: `${Math.max(2, Math.min(100, persenHP))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
            {persenHP.toFixed(1)}% pagu sudah terpakai
            {persenHP >= 100 && <span className="ml-2 font-bold text-red-700">⚠ MELAMPAUI PAGU TAHUNAN</span>}
          </p>
        </div>
      )}

      {/* --- Stat Cards Section --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Program', val: total, color: 'text-slate-800' },
          { label: 'Open',        val: plans.filter((p) => p.status_pkpt === 'Open').length,        color: 'text-amber-700' },
          { label: 'On Progress', val: plans.filter((p) => p.status_pkpt === 'On Progress').length, color: 'text-primary-700' },
          { label: 'Closed',      val: plans.filter((p) => p.status_pkpt === 'Closed').length,      color: 'text-green-700' },
          { label: 'PKPT',        val: plans.filter((p) => p.jenis_program === 'PKPT').length,      color: 'text-primary-700' },
          { label: 'Non PKPT',    val: plans.filter((p) => p.jenis_program === 'Non PKPT').length,  color: 'text-purple-700' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-col justify-center">
            <p className={`text-2xl font-black ${c.color}`}>{c.val}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* --- Data Table Section --- */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-700 text-sm">
            Data Program Kerja <span className="text-slate-400 font-normal">— Menampilkan {LIMIT} baris per halaman</span>
          </h3>
          <span className="text-xs text-slate-400">
            {total > 0 ? `${Math.min((page - 1) * LIMIT + 1, total)}–${Math.min(page * LIMIT, total)} dari ${total} program` : 'Belum ada program'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Judul Program</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Personil</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Est. Hari</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Man-Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500 whitespace-nowrap">Anggaran</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Periode</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Timeline</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Kategori</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Sifat Program</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Kategori Anggaran</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 14 }).map((__, j) => <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      <p className="text-center">Gagal memuat data program.</p>
                      <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary text-xs">Coba lagi</button>
                    </div>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-10 h-10 text-slate-200" />
                      <p className="text-slate-400 text-sm">Belum ada program kerja untuk tahun {tahun}.</p>
                      {canCreate && (
                        <button onClick={() => { setEditProgram(null); setFormOpen(true); }} className="btn-primary text-sm flex items-center gap-2 mt-1">
                          <Plus className="w-4 h-4" /> Buat Program Pertama
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                plans.map((plan, idx) => {
                  const SBadge = STATUS_BADGE[plan.status_pkpt as StatusPKPT];
                  const SIcon  = SBadge?.icon ?? Clock;
                  const rowNum = (page - 1) * LIMIT + idx + 1;
                  const timelineKey = deriveTimelineStatus(plan as any);
                  const timelineInfo = TIMELINE_BADGE[timelineKey];
                  const TIcon = timelineInfo.icon;

                  return (
                    <tr key={plan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-center">{rowNum}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${JENIS_BADGE[plan.jenis_program as JenisProgram]}`}>{plan.jenis_program}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <button onClick={() => setDetailId(plan.id)} className="text-left font-semibold text-slate-800 hover:text-primary-600 break-words transition-colors">
                          {plan.judul_program}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${SBadge?.cls}`}>
                          <SIcon className="w-3 h-3" /> {plan.status_pkpt}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center gap-1 text-slate-600">
                          <Users className="w-3 h-3 text-slate-400" /> {plan.jumlah_personil ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          <CalendarDays className="w-3 h-3 text-slate-400" /> {plan.estimasi_hari}
                        </span>
                      </td>
                      {/* Man-Days terpakai (Fase 5) */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {plan.man_days_terpakai != null ? (
                          <span className="font-semibold text-slate-700">
                            {Number(plan.man_days_terpakai).toFixed(1)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      {/* Anggaran (Fase 5) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-slate-700">
                          {fmtRupiahShort(plan.anggaran)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-slate-600">{fmtDate(plan.tanggal_mulai)}</p>
                        <p className="text-slate-400">s/d {fmtDate(plan.tanggal_selesai)}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${timelineInfo.cls}`}>
                          <TIcon className="w-3 h-3" /> {timelineInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {plan.kategori_program}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {plan.status_program || '—'}
                        </span>
                      </td>
                      {/* Kategori Anggaran (Fase 5) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {plan.kategori_anggaran ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold border ${
                            plan.kategori_anggaran === 'Subsidi'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {plan.kategori_anggaran}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => setDetailId(plan.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Detail">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canCreate && plan.status_pkpt !== 'Closed' && (
                            <button type="button" onClick={() => { setEditProgram(plan); setFormOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canFinalize && plan.status_pkpt !== 'Closed' && (
                            <button type="button" onClick={() => finalizeMut.mutate(plan.id)} disabled={finalizeMut.isPending} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Tutup Program (Closed)">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canCreate && plan.status_pkpt === 'Open' && (
                            <button type="button" onClick={() => setDeleteTarget(plan)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">Halaman {page} dari {pages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const pg = pages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                if (pg > pages) return null;
                return <button key={pg} onClick={() => setPage(pg)} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${page === pg ? 'bg-primary-500 text-white' : 'btn-secondary'}`}>{pg}</button>;
              })}
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full pointer-events-auto">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">Hapus Program?</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Program <span className="font-semibold text-slate-700">"{deleteTarget.judul_program}"</span> akan dihapus.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary text-sm">Batal</button>
                <button onClick={() => deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {deleteMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {formOpen && (
        <ProgramFormModal
          key={editProgram?.id ?? 'new'}
          tahun={tahun}
          editData={editProgram}
          onClose={() => { setFormOpen(false); setEditProgram(null); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['annual-plans'] });
            qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setFormOpen(false);
            setEditProgram(null);
          }}
        />
      )}

      {detailId && (
        <ProgramDetailModal
          programId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={canCreate ? (plan) => {
            setDetailId(null);
            setEditProgram(plan);
            setFormOpen(true);
          } : undefined}
        />
      )}
    </div>
  );
}
