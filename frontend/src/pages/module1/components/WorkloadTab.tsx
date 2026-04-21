import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, AlertTriangle, Clock,
  ChevronDown, ChevronRight, CalendarDays,
  Settings2, Loader2, RefreshCw,
} from 'lucide-react';
import { workloadApi } from '../../../services/api';
import { WorkloadAuditor, WorkloadProgram } from '../../../types';
import { ROLE_LABELS } from '../../../types';

// ── Helpers ──────────────────────────────────────────────────
function getBadgeColor(persen: number) {
  if (persen === 0)   return 'bg-slate-100 text-slate-500';
  if (persen <= 50)   return 'bg-green-100 text-green-700';
  if (persen <= 75)   return 'bg-yellow-100 text-yellow-700';
  if (persen <= 90)   return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function getBarColor(persen: number) {
  if (persen === 0)   return 'bg-slate-300';
  if (persen <= 50)   return 'bg-green-500';
  if (persen <= 75)   return 'bg-yellow-400';
  if (persen <= 90)   return 'bg-orange-500';
  return 'bg-red-500';
}

function getRoleBadge(role: string) {
  const map: Record<string, string> = {
    kepala_spi:         'bg-purple-100 text-purple-700',
    pengendali_teknis:  'bg-blue-100   text-blue-700',
    anggota_tim:        'bg-teal-100   text-teal-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-600';
}

function getStatusBadge(status: string) {
  return status === 'Final'
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-100 text-amber-700';
}

function getRoleTimBadge(role: string) {
  const map: Record<string, string> = {
    'Penanggung Jawab':   'bg-purple-100 text-purple-700',
    'Pengendali Teknis':  'bg-blue-100   text-blue-700',
    'Ketua Tim':          'bg-indigo-100 text-indigo-700',
    'Anggota Tim':        'bg-teal-100   text-teal-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-600';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Program Row (collapsible detail inside auditor card) ──────
function ProgramRow({ p }: { p: WorkloadProgram }) {
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-white border border-slate-100 text-sm">
      <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-700 truncate">{p.judul_program}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {fmtDate(p.tanggal_mulai)} — {fmtDate(p.tanggal_selesai)}
          <span className="mx-1">·</span>
          <span className="font-medium text-slate-600">{p.estimasi_hari} hari</span>
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(p.status_pkpt)}`}>
          {p.status_pkpt}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleTimBadge(p.role_tim)}`}>
          {p.role_tim}
        </span>
      </div>
    </div>
  );
}

// ── Auditor Card ──────────────────────────────────────────────
function AuditorCard({ auditor }: { auditor: WorkloadAuditor }) {
  const [expanded, setExpanded] = useState(false);
  const persen = Number(auditor.persen_beban);
  const barWidth = Math.min(100, persen);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-semibold text-sm">
            {auditor.nama_lengkap.split(' ').slice(0, 2).map((n) => n[0]).join('')}
          </span>
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 truncate">{auditor.nama_lengkap}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(auditor.role)}`}>
              {ROLE_LABELS[auditor.role]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {auditor.jabatan ?? auditor.nik}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-5 flex-shrink-0 text-center">
          <div>
            <p className="text-lg font-bold text-slate-800">{auditor.total_program}</p>
            <p className="text-xs text-slate-500">Program</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{auditor.total_hari}</p>
            <p className="text-xs text-slate-500">Hari</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${persen > 80 ? 'text-red-600' : persen > 60 ? 'text-orange-500' : 'text-green-600'}`}>
              {persen}%
            </p>
            <p className="text-xs text-slate-500">Beban</p>
          </div>
        </div>

        {/* Expand icon */}
        <div className="text-slate-400 flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getBarColor(persen)}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className={`text-xs font-medium ${getBadgeColor(persen)} px-2 py-0.5 rounded-full`}>
            {persen === 0 ? 'Tidak ada penugasan'
              : persen <= 50 ? 'Ringan'
              : persen <= 75 ? 'Sedang'
              : persen <= 90 ? 'Berat'
              : 'Sangat Berat'}
          </span>
          {/* Mobile stats */}
          <div className="flex sm:hidden gap-3 text-xs text-slate-500">
            <span>{auditor.total_program} program · {auditor.total_hari} hari · <b>{persen}%</b></span>
          </div>
        </div>
      </div>

      {/* Expanded: program list */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3 space-y-2">
          {auditor.programs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">Belum ada penugasan program</p>
          ) : (
            auditor.programs.map((p) => <ProgramRow key={p.id} p={p} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary Stat Card ─────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${color}`}>
      <div className="p-2 rounded-lg bg-white/60">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main WorkloadTab ──────────────────────────────────────────
export default function WorkloadTab({ tahun }: { tahun: number }) {
  const [hariKerja, setHariKerja] = useState(230);
  const [showSettings, setShowSettings] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'persen' | 'nama' | 'program'>('persen');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['workload', tahun, hariKerja],
    queryFn: () => workloadApi.get(tahun, hariKerja).then((r) => r.data),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const auditors = useMemo(() => {
    let list = data?.data ?? [];
    if (filterRole !== 'all') list = list.filter((a) => a.role === filterRole);
    if (sortBy === 'persen') return [...list].sort((a, b) => b.persen_beban - a.persen_beban);
    if (sortBy === 'nama')   return [...list].sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
    return [...list].sort((a, b) => b.total_program - a.total_program);
  }, [data, filterRole, sortBy]);

  return (
    <div className="space-y-5">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-primary-300 focus:outline-none"
          >
            <option value="all">Semua Role</option>
            <option value="kepala_spi">Kepala SPI</option>
            <option value="pengendali_teknis">Pengendali Teknis</option>
            <option value="anggota_tim">Anggota Tim</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-primary-300 focus:outline-none"
          >
            <option value="persen">Urut: % Beban</option>
            <option value="nama">Urut: Nama</option>
            <option value="program">Urut: Jumlah Program</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Settings (hari kerja) */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5 border transition-colors ${
              showSettings ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Referensi Hari Kerja
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-primary-800">
              Referensi Hari Kerja per Tahun
            </label>
            <input
              type="number"
              min={100}
              max={365}
              value={hariKerja}
              onChange={(e) => setHariKerja(Math.max(1, Number(e.target.value)))}
              className="w-24 text-sm border border-primary-300 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-primary-400 focus:outline-none bg-white"
            />
            <span className="text-sm text-primary-700">hari</span>
          </div>
          <p className="text-xs text-primary-600">
            Beban kerja = Total Hari Ditugaskan ÷ {hariKerja} × 100%.
            Standar nasional ± 230 hari kerja/tahun.
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          Gagal memuat data beban kerja. Silakan refresh.
        </div>
      )}

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label="Total Auditor"
            value={summary.total_auditor}
            sub={`Tahun ${summary.tahun}`}
            color="border-blue-200 bg-blue-50 text-blue-800"
          />
          <StatCard
            icon={TrendingUp}
            label="Rata-rata Beban"
            value={`${summary.avg_beban_persen}%`}
            sub={`Ref. ${summary.ref_hari_kerja} hari/tahun`}
            color="border-green-200 bg-green-50 text-green-800"
          />
          <StatCard
            icon={AlertTriangle}
            label="Overloaded (>80%)"
            value={summary.overloaded}
            sub="Auditor perlu perhatian"
            color={summary.overloaded > 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600'}
          />
          <StatCard
            icon={Clock}
            label="Total Hari Dialokasikan"
            value={summary.total_hari_all}
            sub={`${summary.idle} auditor tanpa penugasan`}
            color="border-amber-200 bg-amber-50 text-amber-800"
          />
        </div>
      )}

      {/* ── Beban Kerja Visualization ── */}
      {!isLoading && summary && (
        <div>
          {/* Distribution bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <p className="text-sm font-medium text-slate-600 mb-3">
              Distribusi Beban Kerja — {summary.tahun} ({auditors.length} auditor)
            </p>
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
              {auditors.length === 0 ? (
                <div className="flex-1 bg-slate-100 rounded-lg" />
              ) : (
                auditors.map((a) => {
                  const persen = Number(a.persen_beban);
                  return (
                    <div
                      key={a.user_id}
                      title={`${a.nama_lengkap}: ${persen}%`}
                      style={{ flex: 1 }}
                      className={`${getBarColor(persen)} rounded-sm`}
                    />
                  );
                })
              )}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap">
              {[
                { label: 'Ringan (≤50%)',      color: 'bg-green-500',  n: auditors.filter((a) => a.persen_beban > 0 && a.persen_beban <= 50).length },
                { label: 'Sedang (51–75%)',    color: 'bg-yellow-400', n: auditors.filter((a) => a.persen_beban > 50 && a.persen_beban <= 75).length },
                { label: 'Berat (76–90%)',     color: 'bg-orange-500', n: auditors.filter((a) => a.persen_beban > 75 && a.persen_beban <= 90).length },
                { label: 'Sangat Berat (>90%)',color: 'bg-red-500',    n: auditors.filter((a) => a.persen_beban > 90).length },
                { label: 'Tidak Ditugaskan',   color: 'bg-slate-300',  n: auditors.filter((a) => a.persen_beban === 0).length },
              ].map(({ label, color, n }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {label}: <b>{n}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Auditor cards */}
          {auditors.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Tidak ada auditor ditemukan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditors.map((a) => <AuditorCard key={a.user_id} auditor={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
