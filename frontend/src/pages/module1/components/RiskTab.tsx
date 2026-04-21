import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Link2, Upload, RefreshCw, Loader2, Plus,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  CloudUpload, FileSpreadsheet, X, AlertCircle,
} from 'lucide-react';
import { risksApi } from '../../../services/api';
import { RiskData, RiskLevel, RiskStatus } from '../../../types';
import { useAuthStore } from '../../../store/auth.store';
import toast from 'react-hot-toast';
import RiskFormModal from './RiskFormModal';
import RiskDetailModal from './RiskDetailModal';

interface Props { tahun: number; }

const LEVEL_BADGE: Record<RiskLevel, string> = {
  Critical: 'bg-red-100 text-red-700 border border-red-200',
  High:     'bg-orange-50 text-orange-700 border border-orange-200',
  Medium:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Low:      'bg-green-50 text-green-700 border border-green-200',
};

const STATUS_BADGE: Record<RiskStatus, string> = {
  Open:      'bg-slate-100 text-slate-600',
  Mitigated: 'bg-blue-50 text-blue-700',
  Closed:    'bg-green-100 text-green-700',
};

type ImportPanel = 'trust' | 'file' | null;

export default function RiskTab({ tahun }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search,       setSearch]       = useState('');
  const [divisi,       setDivisi]       = useState('');
  const [departemen,   setDepartemen]   = useState('');
  const [level,        setLevel]        = useState('');
  const [page,         setPage]         = useState(1);
  const [importPanel,  setImportPanel]  = useState<ImportPanel>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [formOpen,     setFormOpen]     = useState(false);
  const [editRisk,     setEditRisk]     = useState<RiskData | null>(null);
  const [detailRisk,   setDetailRisk]   = useState<RiskData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RiskData | null>(null);

  const LIMIT = 10;

  // ── Queries ─────────────────────────────────────────────────
  const { data: trustStatus } = useQuery({
    queryKey: ['trust-status'],
    queryFn:  () => risksApi.getTrustStatus().then((r) => r.data),
  });

  const { data: divisiList } = useQuery({
    queryKey: ['divisi-list', tahun],
    queryFn:  () => risksApi.getDivisiList(tahun).then((r) => r.data.data ?? []),
  });

  // Payload queryFn disesuaikan dengan parameter departemen
  const { data: riskRes, isLoading } = useQuery({
    queryKey: ['risks', { tahun, search, divisi, departemen, level, page }],
    queryFn:  () =>
      risksApi.getAll({ tahun, search, divisi, department_name: departemen, level, page, limit: LIMIT } as any)
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const risks  = riskRes?.data ?? [];
  const total  = riskRes?.meta?.total ?? 0;
  const pages  = Math.ceil(total / LIMIT);
  const isConnected = (trustStatus as { connected?: boolean })?.connected === true;

  // Mendapatkan daftar departemen unik berdasarkan data risiko yang dirender
  const deptList = Array.from(new Set(risks.map((r) => r.department_name).filter(Boolean)));

  // ── Mutations ────────────────────────────────────────────────
  const importTrust = useMutation({
    mutationFn: () => {
      const conn = (trustStatus as { data?: { id: string } })?.data;
      return risksApi.importFromTrust(tahun, conn?.id);
    },
    onSuccess: (res) => {
      toast.success(res.data.message ?? 'Import berhasil');
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['divisi-list'] });
      setImportPanel(null);
    },
    onError: () => toast.error('Gagal import dari TRUST'),
  });

  const importFile = useMutation({
    mutationFn: (file: File) => risksApi.importFromFile(file, tahun),
    onSuccess: (res) => {
      const { imported, errors } = res.data.data as { imported: number; errors: string[] };
      if (errors?.length) toast.error(`${errors.length} baris gagal`);
      toast.success(`${imported} risiko berhasil diimpor`);
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['divisi-list'] });
      setImportPanel(null);
    },
    onError: () => toast.error('Gagal memproses file'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => risksApi.delete(id),
    onSuccess: () => {
      toast.success('Risiko berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['risks'] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal menghapus risiko';
      toast.error(msg);
    },
  });

  function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Format file harus .xlsx, .xls, atau .csv');
      return;
    }
    importFile.mutate(file);
  }

  function resetPage() { setPage(1); }

  const canEdit = ['kepala_spi', 'admin_spi', 'pengendali_teknis'].includes(user?.role ?? '');

  return (
    <div className="space-y-4">

      {/* ── Import Action Bar ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Impor Data Risiko
          </p>
          <div className="flex flex-wrap gap-2">
            {/* TRUST */}
            <button
              onClick={() => setImportPanel(importPanel === 'trust' ? null : 'trust')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                importPanel === 'trust'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Import dari TRUST
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-slate-300'} ${importPanel === 'trust' ? '' : ''}`} />
            </button>

            {/* File */}
            <button
              onClick={() => setImportPanel(importPanel === 'file' ? null : 'file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                importPanel === 'file'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100'
              }`}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              Upload File
            </button>

            {/* Manual */}
            {canEdit && (
              <button
                onClick={() => { setEditRisk(null); setFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Manual
              </button>
            )}
          </div>

          {importPanel && (
            <button onClick={() => setImportPanel(null)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── TRUST Panel ─── */}
        {importPanel === 'trust' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-slate-500'}`}>
                  {isConnected ? 'TRUST Terhubung' : 'TRUST Tidak Terhubung'}
                </span>
              </div>
              {isConnected ? (
                <p className="text-xs text-slate-500 flex-1">
                  Klik "Sync Sekarang" untuk menarik data risiko terbaru untuk tahun {tahun}.
                </p>
              ) : (
                <p className="text-xs text-slate-500 flex-1">
                  Koneksi TRUST belum dikonfigurasi. Hubungi IT Admin untuk setup.
                </p>
              )}
              <button
                onClick={() => importTrust.mutate()}
                disabled={!isConnected || importTrust.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importTrust.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                  : <><RefreshCw className="w-4 h-4" /> Sync Sekarang</>}
              </button>
            </div>
          </div>
        )}

        {/* ── File Upload Panel ─── */}
        {importPanel === 'file' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragOver ? 'border-orange-400 bg-orange-50' : 'border-orange-200 hover:border-orange-300 bg-orange-50/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              {importFile.isPending ? (
                <div className="flex items-center justify-center gap-2 text-orange-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Memproses file...</span>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600 mb-1">Drag & drop file di sini</p>
                  <p className="text-xs text-slate-400 mb-3">Kolom: Risk ID, Divisi, Department, Risk Description, Level, Status</p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 inline mr-1.5" />Browse File
                  </button>
                  <input
                    ref={fileRef} type="file" className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Filters (Penambahan Departemen Dropdown) ─────────── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Cari risk code, deskripsi..."
            className="input pl-9 text-sm"
          />
        </div>

        <select
          value={divisi}
          onChange={(e) => { setDivisi(e.target.value); setDepartemen(''); resetPage(); }}
          className="input w-48 text-sm"
        >
          <option value="">Semua Divisi</option>
          {(divisiList ?? []).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Dropdown Departemen */}
        <select
          value={departemen}
          onChange={(e) => { setDepartemen(e.target.value); resetPage(); }}
          className="input w-48 text-sm"
        >
          <option value="">Semua Departemen</option>
          {deptList.map((d) => (
            <option key={d as string} value={d as string}>{d}</option>
          ))}
        </select>

        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); resetPage(); }}
          className="input w-36 text-sm"
        >
          <option value="">Semua Level</option>
          {(['Critical', 'High', 'Medium', 'Low'] as RiskLevel[]).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {(search || divisi || departemen || level) && (
          <button
            onClick={() => { setSearch(''); setDivisi(''); setDepartemen(''); setLevel(''); resetPage(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reset Filter
          </button>
        )}
      </div>

      {/* ── Risk Table ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-700 text-sm">
            Data Risiko <span className="text-slate-400 font-normal">— Tahun {tahun}</span>
          </h3>
          <span className="text-xs text-slate-400">
            {total > 0
              ? `${Math.min((page - 1) * LIMIT + 1, total)}–${Math.min(page * LIMIT, total)} dari ${total} risiko`
              : 'Belum ada data'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Risk ID</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Tahun</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Divisi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Departemen</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Deskripsi Risiko</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Level Risk</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Source</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : risks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-10 h-10 text-slate-200" />
                      <p className="text-slate-400 text-sm">
                        Belum ada data risiko untuk tahun {tahun}.
                      </p>
                      <p className="text-xs text-slate-300">
                        Impor dari TRUST, upload file, atau tambah manual.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                risks.map((risk) => (
                  <tr
                    key={risk.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-600 whitespace-nowrap">
                      {risk.risk_code}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-center">
                      {risk.tahun}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[140px]">
                      <span className="truncate block">{risk.divisi || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[140px]">
                      <span className="truncate block">{risk.department_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <span className="line-clamp-2 text-xs leading-relaxed">{risk.risk_description}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_BADGE[risk.risk_level]}`}>
                        {risk.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[risk.status]}`}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        risk.source === 'TRUST' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {risk.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailRisk(risk)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => { setEditRisk(risk); setFormOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(risk)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Halaman {page} dari {pages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
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
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      page === pg ? 'bg-primary-500 text-white' : 'btn-secondary'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm ───────────────────────────────────── */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full pointer-events-auto">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-base">Hapus Risiko?</p>
                  <p className="text-sm text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">{deleteTarget.risk_code}</span> akan dihapus secara permanen.
                    Risiko yang sudah digunakan dalam Program tidak dapat dihapus.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary text-sm">
                  Batal
                </button>
                <button
                  onClick={() => deleteMut.mutate(deleteTarget.id)}
                  disabled={deleteMut.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {deleteMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {formOpen && (
        <RiskFormModal
          tahun={tahun}
          editData={editRisk}
          onClose={() => { setFormOpen(false); setEditRisk(null); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['risks'] });
            qc.invalidateQueries({ queryKey: ['divisi-list'] });
            setFormOpen(false);
            setEditRisk(null);
          }}
        />
      )}

      {detailRisk && (
        <RiskDetailModal
          risk={detailRisk}
          onClose={() => setDetailRisk(null)}
          onEdit={canEdit ? () => { setEditRisk(detailRisk); setDetailRisk(null); setFormOpen(true); } : undefined}
        />
      )}
    </div>
  );
}