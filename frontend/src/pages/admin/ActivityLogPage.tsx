import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, Search, RefreshCw, Calendar, Activity,
  ChevronLeft, ChevronRight, Info, LogIn, Key,
  UserPlus, UserMinus, Edit2, Trash2, Layers, ToggleRight,
  FileUp, Download, CheckCircle,
} from 'lucide-react';
import api from '../../services/api';
import { ROLE_LABELS } from '../../types';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────
interface LogEntry {
  id: number;
  action: string;
  modul: string;
  entity_id: string | null;
  entity_type: string | null;
  ip_address: string | null;
  created_at: string;
  user_id: string;
  user_nama: string;
  user_role: string;
  user_nik: string;
}

interface LogMeta {
  total: number; page: number; limit: number; totalPages: number;
  moduls: string[]; actions: string[]; action_labels: Record<string, string>;
}

interface SummaryData {
  total_24h: number;
  by_modul_30d: { modul: string; count: number }[];
  by_action_7d: { action: string; label: string; count: number }[];
}

// ── Action icons & colors ─────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  LOGIN:               { icon: LogIn,       color: 'text-green-700',  bg: 'bg-green-100' },
  LOGOUT:              { icon: LogIn,       color: 'text-slate-600',  bg: 'bg-slate-100' },
  CHANGE_PASSWORD:     { icon: Key,         color: 'text-amber-700',  bg: 'bg-amber-100' },
  RESET_PASSWORD:      { icon: Key,         color: 'text-orange-700', bg: 'bg-orange-100' },
  CREATE_USER:         { icon: UserPlus,    color: 'text-blue-700',   bg: 'bg-blue-100' },
  UPDATE_USER:         { icon: Edit2,       color: 'text-indigo-700', bg: 'bg-indigo-100' },
  UPDATE_MODULE_ACCESS:{ icon: Layers,      color: 'text-violet-700', bg: 'bg-violet-100' },
  SET_PASSWORD:        { icon: Key,         color: 'text-amber-700',  bg: 'bg-amber-100' },
  ACTIVATE_USER:       { icon: ToggleRight, color: 'text-green-700',  bg: 'bg-green-100' },
  DEACTIVATE_USER:     { icon: UserMinus,   color: 'text-red-700',    bg: 'bg-red-100' },
  DELETE_USER:         { icon: Trash2,      color: 'text-red-700',    bg: 'bg-red-100' },
  CREATE_RISK:         { icon: UserPlus,    color: 'text-teal-700',   bg: 'bg-teal-100' },
  UPDATE_RISK:         { icon: Edit2,       color: 'text-teal-700',   bg: 'bg-teal-100' },
  DELETE_RISK:         { icon: Trash2,      color: 'text-red-700',    bg: 'bg-red-100' },
  IMPORT_RISK_TRUST:   { icon: Download,    color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  IMPORT_RISK_FILE:    { icon: FileUp,      color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  CREATE_PLAN:         { icon: UserPlus,    color: 'text-primary-700',bg: 'bg-primary-100' },
  UPDATE_PLAN:         { icon: Edit2,       color: 'text-primary-700',bg: 'bg-primary-100' },
  DELETE_PLAN:         { icon: Trash2,      color: 'text-red-700',    bg: 'bg-red-100' },
  FINALIZE_PLAN:       { icon: CheckCircle, color: 'text-green-700',  bg: 'bg-green-100' },
};

const MODUL_LABELS: Record<string, string> = {
  auth:            'Autentikasi',
  user_management: 'Manajemen User',
  pkpt:            'PKPT',
  risk:            'Data Risiko',
  penugasan:       'Penugasan',
  audit:           'Audit / KKA',
  pelaporan:       'Pelaporan',
};

const ROLE_COLORS: Record<string, string> = {
  it_admin:          'bg-purple-100 text-purple-700',
  admin_spi:         'bg-blue-100   text-blue-700',
  kepala_spi:        'bg-indigo-100 text-indigo-700',
  pengendali_teknis: 'bg-teal-100   text-teal-700',
  anggota_tim:       'bg-green-100  text-green-700',
  auditee:           'bg-orange-100 text-orange-700',
};

function ActionBadge({ action, label }: { action: string; label: string }) {
  const cfg = ACTION_CONFIG[action] ?? { icon: Info, color: 'text-slate-600', bg: 'bg-slate-100' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {label}
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function timeAgo(dateStr: string) {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}d lalu`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m lalu`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}j lalu`;
  return `${Math.floor(secs / 86400)} hari lalu`;
}

// ── Main Page ─────────────────────────────────────────────────
export default function ActivityLogPage() {
  const [search,     setSearch]     = useState('');
  const [modul,      setModul]      = useState('');
  const [action,     setAction]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [page,       setPage]       = useState(1);

  // ── Queries ───────────────────────────────────────────────
  const { data: logData, isLoading, refetch } = useQuery({
    queryKey: ['activity-log', search, modul, action, dateFrom, dateTo, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (search)   params.search   = search;
      if (modul)    params.modul    = modul;
      if (action)   params.action   = action;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const res = await api.get('/activity-log', { params });
      return res.data as { success: boolean; data: LogEntry[]; meta: LogMeta };
    },
    staleTime: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['activity-log-summary'],
    queryFn: async () => {
      const res = await api.get('/activity-log/summary');
      return res.data.data as SummaryData;
    },
    staleTime: 60_000,
  });

  const logs: LogEntry[]     = logData?.data ?? [];
  const meta: LogMeta | undefined = logData?.meta;
  const actionLabels         = meta?.action_labels ?? {};

  function handleReset() {
    setSearch(''); setModul(''); setAction('');
    setDateFrom(''); setDateTo(''); setPage(1);
    refetch();
    toast.success('Filter direset');
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Log Aktivitas Sistem</h1>
            <p className="text-sm text-slate-500">Riwayat seluruh aktivitas pengguna dalam sistem</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-400 mb-1">Aktivitas 24 Jam</p>
          <p className="text-2xl font-bold text-slate-800">{summary?.total_24h ?? 0}</p>
        </div>
        {(summary?.by_modul_30d ?? []).slice(0, 3).map((m) => (
          <div key={m.modul} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">{MODUL_LABELS[m.modul] ?? m.modul} (30 hari)</p>
            <p className="text-2xl font-bold text-primary-700">{m.count}</p>
          </div>
        ))}
      </div>

      {/* Top actions (7 days) */}
      {(summary?.by_action_7d ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Aksi Terbanyak — 7 Hari Terakhir</p>
          <div className="flex flex-wrap gap-2">
            {(summary?.by_action_7d ?? []).map((a) => (
              <div key={a.action} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <ActionBadge action={a.action} label={a.label} />
                <span className="text-sm font-bold text-slate-700">{a.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama user, aksi..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {/* Modul filter */}
          <select
            value={modul}
            onChange={(e) => { setModul(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Semua Modul</option>
            {(meta?.moduls ?? []).map((m) => (
              <option key={m} value={m}>{MODUL_LABELS[m] ?? m}</option>
            ))}
          </select>
          {/* Action filter */}
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Semua Aksi</option>
            {(meta?.actions ?? []).map((a) => (
              <option key={a} value={a}>{actionLabels[a] ?? a}</option>
            ))}
          </select>
          {/* Date from */}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <span className="text-slate-400 self-center text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {/* Reset */}
          {(search || modul || action || dateFrom || dateTo) && (
            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {meta ? `${meta.total.toLocaleString()} entri log` : 'Log Aktivitas'}
          </p>
          {meta && meta.totalPages > 1 && (
            <p className="text-xs text-slate-400">Halaman {meta.page} dari {meta.totalPages}</p>
          )}
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-slate-100 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada aktivitas yang ditemukan</p>
            {(search || modul || action || dateFrom || dateTo) && (
              <button onClick={handleReset} className="mt-2 text-xs text-primary-600 hover:underline">
                Hapus filter
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100' };
              const Icon = cfg.icon;
              const label = actionLabels[log.action] ?? log.action;
              const initials = log.user_nama.split(' ').slice(0, 2).map((n) => n[0]).join('');

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors">
                  {/* Action icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ActionBadge action={log.action} label={label} />
                      <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">
                        {MODUL_LABELS[log.modul] ?? log.modul}
                      </span>
                    </div>
                    {/* User */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-primary-700">{initials}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">{log.user_nama}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[log.user_role] ?? 'bg-slate-100 text-slate-500'}`}>
                        {ROLE_LABELS[log.user_role as keyof typeof ROLE_LABELS] ?? log.user_role}
                      </span>
                      <code className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">{log.user_nik}</code>
                    </div>
                    {/* IP + entity */}
                    {(log.ip_address || log.entity_id) && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                        {log.ip_address && log.entity_id && <span className="mx-1">·</span>}
                        {log.entity_id && <span className="font-mono">{log.entity_id.slice(0, 8)}...</span>}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-slate-600">{formatDate(log.created_at)}</p>
                    <p className="text-[11px] text-slate-400">{formatTime(log.created_at)}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">{timeAgo(log.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} dari {meta.total.toLocaleString()} log
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                const p = meta.totalPages <= 7 ? i + 1
                  : i === 0 ? 1
                  : i === 6 ? meta.totalPages
                  : Math.max(2, Math.min(meta.totalPages - 1, page - 2 + i));
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-600 mb-0.5">Kebijakan Retensi Log</p>
          <p className="text-xs text-slate-500">
            Log aktivitas bersifat <strong>append-only</strong> dan tidak dapat dihapus untuk menjaga integritas audit trail.
            Setiap aksi penting (login, perubahan data, reset password, dll.) tercatat otomatis beserta timestamp dan IP address.
          </p>
        </div>
      </div>

    </div>
  );
}
