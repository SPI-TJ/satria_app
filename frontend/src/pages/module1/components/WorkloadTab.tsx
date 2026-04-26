import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, AlertTriangle, Loader2, RefreshCw, Info,
  ChevronDown, ChevronRight, CalendarDays, X,
} from 'lucide-react';
import { workloadApi, kalenderKerjaApi, settingsApi } from '../../../services/api';
import { WorkloadAuditor } from '../../../types';
import { ROLE_LABELS } from '../../../types';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/** Skala warna heatmap. Angka ratio adalah utilisasi (load / pagu_per_bulan).
 *  ≤0       : abu-abu (idle)
 *  ≤0.5     : hijau muda (ringan)
 *  ≤0.8     : hijau terang (sehat)
 *  ≤1.0     : amber (penuh)
 *  ≤1.3     : merah muda (overload ringan)
 *  >1.3     : merah pekat (overwork berat)
 */
function getCellColor(ratio: number) {
  if (ratio <= 0)    return 'bg-slate-100 text-slate-400';
  if (ratio <= 0.5)  return 'bg-green-100 text-green-800';
  if (ratio <= 0.8)  return 'bg-emerald-200 text-emerald-900';
  if (ratio <= 1.0)  return 'bg-amber-300 text-amber-900';
  if (ratio <= 1.3)  return 'bg-red-300 text-red-900';
  return 'bg-red-500 text-white';
}

function getRoleBadge(role: string) {
  const map: Record<string, string> = {
    kepala_spi:        'bg-purple-100 text-purple-700',
    pengendali_teknis: 'bg-blue-100   text-blue-700',
    anggota_tim:       'bg-teal-100   text-teal-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-600';
}

/** Anggota tim ditampilkan dengan nama jabatan (Analis, Staf, dst.);
 *  role struktural lain pakai label role standar. */
function getAuditorLabel(role: string, jabatan: string | null) {
  if (role === 'anggota_tim' && jabatan) return jabatan;
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

function getRoleTimBadge(role: string) {
  const map: Record<string, string> = {
    'Ketua Tim':   'bg-indigo-100 text-indigo-700',
    'Anggota Tim': 'bg-teal-100   text-teal-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-600';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

interface HeatmapRowProps {
  auditor: WorkloadAuditor;
  viewMode: 'load' | 'utilisasi';
  /** Pagu bobot per bulan (dari master.bobot_peran.max_bobot_per_bulan) */
  paguBobotPerBulan: number;
}

// ── Auditor Heatmap Row ──────────────────────────────────────
function HeatmapRow({ auditor, viewMode, paguBobotPerBulan }: HeatmapRowProps) {
  const [expanded, setExpanded] = useState(false);
  const max = Number(auditor.max_load);
  const overwork = max > paguBobotPerBulan;
  const avgUtil = paguBobotPerBulan > 0 ? Number(auditor.avg_load) / paguBobotPerBulan : 0;
  const maxUtil = paguBobotPerBulan > 0 ? max / paguBobotPerBulan : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-slate-400 flex-shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 truncate">{auditor.nama_lengkap}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadge(auditor.role)}`}>
                {getAuditorLabel(auditor.role, auditor.jabatan)}
              </span>
              {overwork && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> OVERWORK
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              NIK {auditor.nik} · Avg {Number(auditor.avg_load).toFixed(2)} · Max {max.toFixed(2)}
              {paguBobotPerBulan > 0 && (
                <span className="ml-1 text-slate-400">
                  (util avg {(avgUtil * 100).toFixed(0)}% · max {(maxUtil * 100).toFixed(0)}%)
                </span>
              )}
              {auditor.overwork_months > 0 && ` · ${auditor.overwork_months} bulan overwork`}
            </p>
          </div>

          {/* Mini heatmap 12 bulan */}
          <div className="hidden md:grid grid-cols-12 gap-0.5 flex-shrink-0">
            {Array.from({ length: 12 }, (_, i) => {
              const load = Number(auditor.monthly_load?.[String(i + 1)] ?? 0);
              const ratio = paguBobotPerBulan > 0 ? load / paguBobotPerBulan : load;
              const display = viewMode === 'utilisasi'
                ? (load > 0 ? `${Math.round(ratio * 100)}%` : '')
                : (load > 0 ? load.toFixed(1) : '');
              return (
                <div
                  key={i}
                  title={`${MONTH_LABELS[i]}: bobot ${load.toFixed(2)}${paguBobotPerBulan > 0 ? ` / pagu ${paguBobotPerBulan.toFixed(1)} → ${(ratio * 100).toFixed(0)}%` : ''}`}
                  className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${getCellColor(ratio)}`}
                >
                  {display}
                </div>
              );
            })}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {/* Full-width heatmap untuk mobile */}
          <div className="md:hidden grid grid-cols-12 gap-0.5">
            {Array.from({ length: 12 }, (_, i) => {
              const load = Number(auditor.monthly_load?.[String(i + 1)] ?? 0);
              const ratio = paguBobotPerBulan > 0 ? load / paguBobotPerBulan : load;
              const display = viewMode === 'utilisasi'
                ? (load > 0 ? `${Math.round(ratio * 100)}%` : '-')
                : (load > 0 ? load.toFixed(1) : '-');
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className={`w-full h-7 rounded text-[10px] font-bold flex items-center justify-center ${getCellColor(ratio)}`}>
                    {display}
                  </div>
                  <span className="text-[9px] text-slate-500">{MONTH_LABELS[i]}</span>
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Program Terkait ({auditor.programs.length})
            </p>
            {auditor.programs.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Belum ada penugasan Ketua/Anggota Tim.</p>
            ) : (
              <div className="space-y-1.5">
                {auditor.programs.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-slate-50 text-sm">
                    <CalendarDays className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 truncate">{p.judul_program}</p>
                      <p className="text-xs text-slate-500">
                        {fmtDate(p.tanggal_mulai)} — {fmtDate(p.tanggal_selesai)} · bobot {Number(p.bobot).toFixed(1)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleTimBadge(p.role_tim)}`}>
                      {p.role_tim}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary card ─────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${color}`}>
      <div className="p-2 rounded-lg bg-white/60"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main WorkloadTab ─────────────────────────────────────────
export default function WorkloadTab({ tahun }: { tahun: number }) {
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterRoleTeam, setFilterRoleTeam] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'max' | 'avg' | 'nama'>('max');
  const [viewMode, setViewMode] = useState<'load' | 'utilisasi'>('utilisasi');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['workload', tahun],
    queryFn: () => workloadApi.get(tahun).then((r) => r.data),
    staleTime: 60_000,
  });

  // Kalender kerja → pagu hari kerja efektif per bulan (Fase 6)
  const { data: kalenderRes } = useQuery({
    queryKey: ['kalender-kerja-workload', tahun],
    queryFn: () => kalenderKerjaApi.get(tahun),
    staleTime: 5 * 60_000,
  });
  const kalender = kalenderRes?.data?.data;

  // Bobot peran → max_bobot_per_bulan (default 2.5)
  const { data: bobotRes } = useQuery({
    queryKey: ['bobot-peran-workload', tahun],
    queryFn: () => settingsApi.getBobotPeran(tahun),
    staleTime: 5 * 60_000,
  });
  const paguBobotPerBulan = useMemo(() => {
    const list = bobotRes?.data?.data ?? [];
    if (!list.length) return 2.5;
    return Math.max(...list.map((b) => Number(b.max_bobot_per_bulan)));
  }, [bobotRes]);

  const summary = data?.summary;
  const auditors = useMemo(() => {
    let list = data?.data ?? [];
    
    // Filter berdasarkan role
    if (filterRole !== 'all') list = list.filter((a) => a.role === filterRole);
    
    // Filter berdasarkan bulan
    if (filterMonth) {
      const monthNum = Number(filterMonth);
      list = list.filter((a) => {
        const load = Number(a.monthly_load?.[filterMonth] ?? 0);
        return load > 0;
      });
    }
    
    // Filter berdasarkan role tim
    if (filterRoleTeam !== 'all') {
      list = list.filter((a) => {
        const hasRole = a.programs.some((p) => p.role_tim === filterRoleTeam);
        return hasRole || a.programs.length === 0; // Tetap tampilkan auditor tanpa penugasan
      });
    }
    
    // Sort
    if (sortBy === 'max')  return [...list].sort((a, b) => Number(b.max_load) - Number(a.max_load));
    if (sortBy === 'avg')  return [...list].sort((a, b) => Number(b.avg_load) - Number(a.avg_load));
    return [...list].sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
  }, [data, filterRole, filterMonth, filterRoleTeam, sortBy]);

  return (
    <div className="space-y-5">
      {/* Info box */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 flex gap-2 text-sm text-primary-800">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          Pagu bobot per bulan: <b>{paguBobotPerBulan.toFixed(1)}</b> (dari Master Bobot Peran).
          Bulan dengan akumulasi bobot melampaui pagu ditandai sebagai <span className="font-bold text-red-700">overwork</span>.
          {kalender?.header && (
            <> Total hari pemeriksaan tersedia tahun {tahun}: <b>{kalender.header.hari_pemeriksaan_tersedia}</b> man-days.</>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">Semua Role</option>
            <option value="kepala_spi">Kepala SPI</option>
            <option value="pengendali_teknis">Pengendali Teknis</option>
            <option value="anggota_tim">Anggota Tim</option>
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">Semua Bulan</option>
            {MONTH_LABELS.map((m, i) => (
              <option key={i} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterRoleTeam}
            onChange={(e) => setFilterRoleTeam(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">Semua Role Tim</option>
            <option value="Ketua Tim">Ketua Tim</option>
            <option value="Anggota Tim">Anggota Tim</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="max">Urut: Max Load</option>
            <option value="avg">Urut: Avg Load</option>
            <option value="nama">Urut: Nama</option>
          </select>
          {/* View mode toggle (Fase 6) */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden text-xs">
            <button
              onClick={() => setViewMode('utilisasi')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'utilisasi' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Utilisasi %
            </button>
            <button
              onClick={() => setViewMode('load')}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                viewMode === 'load' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Bobot
            </button>
          </div>
          {(filterRole !== 'all' || filterMonth !== '' || filterRoleTeam !== 'all') && (
            <button
              onClick={() => {
                setFilterRole('all');
                setFilterMonth('');
                setFilterRoleTeam('all');
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      )}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          Gagal memuat data beban kerja.
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total Auditor" value={summary.total_auditor} sub={`Tahun ${summary.tahun}`} color="border-blue-200 bg-blue-50 text-blue-800" />
          <StatCard
            icon={TrendingUp}
            label="Avg Utilisasi / Bulan"
            value={paguBobotPerBulan > 0 ? `${((summary.avg_load / paguBobotPerBulan) * 100).toFixed(0)}%` : summary.avg_load.toFixed(2)}
            sub={`Pagu ${paguBobotPerBulan.toFixed(1)} bobot/bulan`}
            color="border-green-200 bg-green-50 text-green-800"
          />
          <StatCard
            icon={AlertTriangle}
            label={`Overwork (>${paguBobotPerBulan.toFixed(1)})`}
            value={summary.overwork}
            sub="Auditor yang melampaui pagu"
            color={summary.overwork > 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600'}
          />
          <StatCard icon={Users} label="Idle" value={summary.idle} sub="Auditor tanpa penugasan" color="border-amber-200 bg-amber-50 text-amber-800" />
        </div>
      )}

      {/* Legend (Fase 6) */}
      {!isLoading && auditors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-semibold mr-1">Skala:</span>
          {[
            { lbl: 'Idle',   cls: 'bg-slate-100 text-slate-400' },
            { lbl: '≤50%',   cls: 'bg-green-100 text-green-800' },
            { lbl: '≤80%',   cls: 'bg-emerald-200 text-emerald-900' },
            { lbl: '≤100%',  cls: 'bg-amber-300 text-amber-900' },
            { lbl: '≤130%',  cls: 'bg-red-300 text-red-900' },
            { lbl: '>130%',  cls: 'bg-red-500 text-white' },
          ].map((s) => (
            <span key={s.lbl} className={`px-2 py-0.5 rounded font-medium ${s.cls}`}>{s.lbl}</span>
          ))}
        </div>
      )}

      {/* Month labels header (desktop only) */}
      {!isLoading && auditors.length > 0 && (
        <div className="hidden md:flex items-center gap-3 px-4">
          <div className="flex-1" />
          <div className="grid grid-cols-12 gap-0.5">
            {MONTH_LABELS.map((m) => (
              <div key={m} className="w-6 text-[10px] font-bold text-slate-500 text-center">{m}</div>
            ))}
          </div>
        </div>
      )}

      {/* Rows */}
      {!isLoading && (
        auditors.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Tidak ada auditor ditemukan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {auditors.map((a) => (
              <HeatmapRow
                key={a.user_id}
                auditor={a}
                viewMode={viewMode}
                paguBobotPerBulan={paguBobotPerBulan}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
