import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, AlertTriangle, Loader2, RefreshCw, Info,
  ChevronDown, ChevronRight, CalendarDays, X,
} from 'lucide-react';
import { workloadApi, kalenderKerjaApi } from '../../../services/api';
import { WorkloadAuditor } from '../../../types';
import { ROLE_LABELS } from '../../../types';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

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

function getAuditorLabel(role: string, jabatan: string | null) {
  if (role === 'anggota_tim' && jabatan) return jabatan;
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

function getRoleTimBadge(role: string) {
  const map: Record<string, string> = {
    'Ketua Tim':   'bg-indigo-100 text-indigo-700',
    'Anggota Tim': 'bg-teal-100   text-teal-700',
    'Kepala SPI':         'bg-purple-100 text-purple-700',
    'Pengendali Teknis':  'bg-blue-100   text-blue-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-600';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

interface HeatmapRowProps {
  auditor: WorkloadAuditor;
  viewMode: 'utilisasi' | 'bobot';
  paguBobotPerBulan: number;
}

// ── Auditor Heatmap Row (Redesigned) ─────────────────────────
function HeatmapRow({ auditor, viewMode, paguBobotPerBulan }: HeatmapRowProps) {
  const [expanded, setExpanded] = useState(false);
  
  const max = Number(auditor.max_load);
  const overwork = max > paguBobotPerBulan;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-all">
      {/* HEADER ROW */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="text-slate-400 flex-shrink-0">
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
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
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>NIK {auditor.nik}</span>
              {auditor.total_mandays != null && auditor.kapasitas_mandays != null && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>
                    <b className="text-slate-700">{auditor.total_mandays.toFixed(1)}</b> / {auditor.kapasitas_mandays} HP
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>{(auditor.utilisasi_mandays ?? 0).toFixed(0)}% Digunakan</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MINI HEATMAP */}
        <div className="hidden lg:flex grid-cols-12 gap-1 flex-shrink-0">
          {Array.from({ length: 12 }, (_, i) => {
            const bobot = Number(auditor.monthly_load?.[String(i + 1)] ?? 0);
            const ratio = paguBobotPerBulan > 0 ? bobot / paguBobotPerBulan : bobot;
            const display = viewMode === 'utilisasi'
              ? (bobot > 0 ? `${Math.round(ratio * 100)}%` : '')
              : (bobot > 0 ? bobot.toFixed(2) : '');
            return (
              <div
                key={i}
                title={`${MONTH_LABELS[i]}: ${(ratio * 100).toFixed(0)}% utilisasi`}
                className={`w-10 h-7 rounded text-[10px] font-medium flex items-center justify-center transition-colors ${getCellColor(ratio)}`}
              >
                {display}
              </div>
            );
          })}
        </div>
      </button>

      {/* EXPANDED CONTENT (Unified Dashboard) */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 flex flex-col md:flex-row gap-6">
          
          {/* LEFT COLUMN: Kapasitas & Detail */}
          <div className="w-full md:w-1/3 space-y-6">
            {auditor.total_mandays != null && auditor.kapasitas_mandays != null && (
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Utilisasi Kapasitas</h3>
                
                <div className="flex items-end justify-between mb-2">
                  <p className="text-3xl font-bold text-slate-900">
                    {(auditor.utilisasi_mandays ?? 0).toFixed(1)}%
                  </p>
                  <span className={`text-sm font-medium ${
                    auditor.utilisasi_mandays! > 100 ? 'text-red-600' : auditor.utilisasi_mandays! > 80 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {auditor.utilisasi_mandays! > 100 ? 'Overload' : auditor.utilisasi_mandays! > 80 ? 'Penuh' : 'Sehat'}
                  </span>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
                  <div
                    className={`h-full transition-all ${
                      auditor.utilisasi_mandays! > 100 ? 'bg-red-500' : auditor.utilisasi_mandays! > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((auditor.utilisasi_mandays ?? 0), 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Terpakai</p>
                    <p className="text-base font-bold text-slate-900">{auditor.total_mandays.toFixed(1)} <span className="text-xs font-normal text-slate-500">HP</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Sisa Kapasitas</p>
                    <p className={`text-base font-bold ${
                      (auditor.kapasitas_mandays - (auditor.total_mandays ?? 0)) < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {(auditor.kapasitas_mandays - (auditor.total_mandays ?? 0)).toFixed(1)} <span className="text-xs font-normal text-slate-500">HP</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Program Kerja */}
          <div className="w-full md:w-2/3 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Daftar Program ({auditor.programs.length})</h3>
            
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-1">
              {auditor.programs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Belum ada program terkait.</div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto p-2">
                  <div className="space-y-1">
                    {auditor.programs.map((p) => {
                      const mandays = Number(p.mandays ?? 0);
                      const totalMandaysForAuditor = auditor.total_mandays ?? 0;
                      const percentOfTotal = totalMandaysForAuditor > 0 ? (mandays / totalMandaysForAuditor) * 100 : 0;
                      
                      return (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors gap-3 border border-transparent hover:border-slate-100">
                          <div className="flex gap-3 items-start flex-1 min-w-0">
                            <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-800 text-sm truncate" title={p.judul_program}>
                                {p.judul_program}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <span>{fmtDate(p.tanggal_mulai)} — {fmtDate(p.tanggal_selesai)}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getRoleTimBadge(p.role_tim)}`}>
                                  {p.role_tim}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 pl-7 sm:pl-0">
                            <span className="text-sm font-bold text-slate-900">{mandays.toFixed(1)} HP</span>
                            <span className="text-[10px] font-medium text-slate-400">{percentOfTotal.toFixed(0)}% dr total</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
    <div className={`rounded-xl border p-4 flex items-start gap-3 bg-white/50 shadow-sm ${color}`}>
      <div className="p-2 rounded-lg bg-white/80 shadow-sm"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-bold leading-none text-slate-800">{value}</p>
        <p className="text-xs font-semibold mt-1 opacity-90">{label}</p>
        {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
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
  const [viewMode, setViewMode] = useState<'utilisasi' | 'bobot'>('utilisasi');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['workload', tahun],
    queryFn: () => workloadApi.get(tahun).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: kalenderRes } = useQuery({
    queryKey: ['kalender-kerja-workload', tahun],
    queryFn: () => kalenderKerjaApi.get(tahun),
    staleTime: 5 * 60_000,
  });
  const kalender = kalenderRes?.data?.data;

  const paguBobotPerBulan = data?.summary?.pagu_bobot_per_bulan ?? 2.0;
  const bobotPeran = data?.summary?.bobot_peran ?? {};
  const fmtBobot = (peran: string, fallback: number) =>
    Number(bobotPeran[peran] ?? fallback).toString();

  const summary = data?.summary;
  const auditors = useMemo(() => {
    let list = data?.data ?? [];
    if (filterRole !== 'all') list = list.filter((a) => a.role === filterRole);
    if (filterMonth) {
      const monthNum = Number(filterMonth);
      list = list.filter((a) => {
        const load = Number(a.monthly_load?.[filterMonth] ?? 0);
        return load > 0;
      });
    }
    if (filterRoleTeam !== 'all') {
      list = list.filter((a) => {
        const hasRole = a.programs.some((p) => p.role_tim === filterRoleTeam);
        return hasRole;
      });
    }
    if (sortBy === 'max')  return [...list].sort((a, b) => Number(b.max_load) - Number(a.max_load));
    if (sortBy === 'avg')  return [...list].sort((a, b) => Number(b.avg_load) - Number(a.avg_load));
    return [...list].sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
  }, [data, filterRole, filterMonth, filterRoleTeam, sortBy]);

  return (
    <div className="space-y-6 bg-slate-50/30 p-2 rounded-2xl">
      {/* Info box */}
      <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-4 flex gap-3 text-sm text-primary-800 shadow-sm">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary-600" />
        <div className="space-y-2 leading-relaxed">
          <p>
            Beban kerja dihitung per bulan dari <b>bobot peran × porsi hari penugasan</b>.
            Bobot: <b>Ketua Tim {fmtBobot('Ketua Tim', 1.0)}</b>, <b>Anggota Tim {fmtBobot('Anggota Tim', 0.5)}</b>, <b>Pengendali Teknis {fmtBobot('Pengendali Teknis', 0.25)}</b>, dan <b>Kepala SPI {fmtBobot('Penanggung Jawab', 0.25)}</b>.
          </p>
          <p>
            Batas normal per bulan adalah <b>{paguBobotPerBulan.toFixed(1)}</b>. Auditor yang melampaui batas akan ditandai <span className="font-bold text-red-600">OVERWORK</span>.
            {kalender?.header && (
              <span> Total pagu pemeriksaan tahun {tahun}: <b>{kalender.header.hari_pemeriksaan_tersedia}</b> man-days.</span>
            )}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white transition-colors focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">Semua Role</option>
            <option value="kepala_spi">Kepala SPI</option>
            <option value="pengendali_teknis">Pengendali Teknis</option>
            <option value="anggota_tim">Anggota Tim</option>
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white transition-colors focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Semua Bulan</option>
            {MONTH_LABELS.map((m, i) => (
              <option key={i} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select
            value={filterRoleTeam}
            onChange={(e) => setFilterRoleTeam(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white transition-colors focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">Semua Role Tim</option>
            <option value="Ketua Tim">Ketua Tim</option>
            <option value="Anggota Tim">Anggota Tim</option>
            <option value="Kepala SPI">Kepala SPI</option>
            <option value="Pengendali Teknis">Pengendali Teknis</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white transition-colors focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="max">Urut: Max Load</option>
            <option value="avg">Urut: Avg Load</option>
            <option value="nama">Urut: Nama</option>
          </select>
          
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm h-9">
            <button
              onClick={() => setViewMode('utilisasi')}
              className={`px-3 py-1 font-medium transition-colors ${
                viewMode === 'utilisasi' ? 'bg-primary-600 text-white' : 'text-slate-600 bg-slate-50 hover:bg-white'
              }`}
            >
              %
            </button>
            <button
              onClick={() => setViewMode('bobot')}
              className={`px-3 py-1 font-medium transition-colors border-l border-slate-200 ${
                viewMode === 'bobot' ? 'bg-primary-600 text-white' : 'text-slate-600 bg-slate-50 hover:bg-white'
              }`}
            >
              Bobot
            </button>
          </div>

          {(filterRole !== 'all' || filterMonth !== '' || filterRoleTeam !== 'all') && (
            <button
              onClick={() => {
                setFilterRole('all'); setFilterMonth(''); setFilterRoleTeam('all');
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-transparent hover:border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 rounded-lg px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Auditor" value={summary.total_auditor} sub={`Tahun ${summary.tahun}`} color="border-blue-100 text-blue-900" />
          <StatCard
            icon={TrendingUp}
            label="Avg Utilisasi / Bulan"
            value={`${((summary.avg_load / paguBobotPerBulan) * 100).toFixed(0)}%`}
            sub={`Avg bobot ${summary.avg_load.toFixed(2)} dari Maks ${paguBobotPerBulan.toFixed(1)}`}
            color="border-green-100 text-green-900"
          />
          <StatCard
            icon={AlertTriangle}
            label={`Overwork (>${paguBobotPerBulan.toFixed(1)})`}
            value={summary.overwork}
            sub="Melampaui maks bobot"
            color={summary.overwork > 0 ? 'border-red-200 text-red-900' : 'border-slate-200 text-slate-600'}
          />
          <StatCard icon={Users} label="Idle" value={summary.idle} sub="Tanpa penugasan aktif" color="border-amber-100 text-amber-900" />
        </div>
      )}

      {!isLoading && auditors.length > 0 && (
        <div className="hidden lg:flex items-center gap-4 px-4 pt-2">
          <div className="flex-1" />
          <div className="grid grid-cols-12 gap-1 flex-shrink-0">
            {MONTH_LABELS.map((m) => (
              <div key={m} className="w-10 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">{m}</div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      )}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          Gagal memuat data beban kerja.
        </div>
      )}

      {!isLoading && (
        auditors.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">Tidak ada auditor ditemukan</p>
          </div>
        ) : (
          <div className="space-y-3">
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