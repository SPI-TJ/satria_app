import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, Trash2,
  ChevronLeft, ChevronRight, BarChart3,
  AlertTriangle, X, Download, Upload, Database,
} from 'lucide-react';
import { risksApi, organisasiApi, settingsApi } from '../../../services/api';
import { RiskData, RiskLevelKode } from '../../../types';
import { useAuthStore } from '../../../store/auth.store';
import toast from 'react-hot-toast';
import RiskDetailModal from './RiskDetailModal';
import RiskFormModal from './RiskFormModal';

interface Props { tahun: number; }

// ── Badge Risk Level ──────────────────────────────────────────
export function RiskLevelBadge({ level, label, bg, text }: {
  level?: string; label?: string; bg?: string; text?: string;
}) {
  if (!level) return <span className="text-slate-300 text-xs">—</span>;
  const bgClass  = bg   || LEVEL_COLORS[level as RiskLevelKode]?.bg   || 'bg-slate-100';
  const txtClass = text || LEVEL_COLORS[level as RiskLevelKode]?.text || 'text-slate-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${bgClass} ${txtClass}`}>
      {level}
      {label && <span className="font-normal opacity-75">({label})</span>}
    </span>
  );
}

const LEVEL_COLORS: Record<RiskLevelKode, { bg: string; text: string }> = {
  E:  { bg: 'bg-red-100',    text: 'text-red-700' },
  T:  { bg: 'bg-orange-100', text: 'text-orange-700' },
  MT: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  M:  { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  RM: { bg: 'bg-lime-100',   text: 'text-lime-700' },
  R:  { bg: 'bg-green-100',  text: 'text-green-700' },
};

export default function RiskTab({ tahun }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = ['admin_spi', 'it_admin', 'kepala_spi'].includes(user?.role ?? '');

  // ── State ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [direktoratId, setDirektoratId] = useState('');
  const [divisiId, setDivisiId] = useState('');
  const [levelInherent, setLevelInherent] = useState('');
  const [hosKategoriId, setHosKategoriId] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [detailRisk, setDetailRisk] = useState<RiskData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RiskData | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<RiskData | null>(null);

  // Import / template
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const res = await risksApi.downloadTemplate();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_import_risiko.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh template');
    } finally {
      setDownloadingTemplate(false);
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    toast('Fitur import Excel sedang dalam pengembangan. File: ' + file.name, { icon: '🛠️' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const LIMIT = 20;

  // ── Queries ────────────────────────────────────────────────
  const { data: risksRes, isLoading, isError } = useQuery({
    queryKey: ['risks', { tahun, search, direktoratId, divisiId, levelInherent, hosKategoriId, page }],
    queryFn: () => risksApi.getAll({
      tahun,
      search: search || undefined,
      direktorat_id: direktoratId || undefined,
      divisi_id: divisiId || undefined,
      level_inherent: levelInherent || undefined,
      hos_kategori_id: hosKategoriId || undefined,
      page,
      limit: LIMIT,
    }),
    staleTime: 30_000,
  });

  const { data: direktoratsRes } = useQuery({
    queryKey: ['direktorats-dropdown'],
    queryFn: () => organisasiApi.getDirektorats(),
    staleTime: 3600_000,
  });

  const { data: divisRes } = useQuery({
    queryKey: ['divisi-dropdown', direktoratId],
    queryFn: () => organisasiApi.getDivisis(direktoratId || undefined),
    staleTime: 3600_000,
  });

  const { data: levelRefRes } = useQuery({
    queryKey: ['risk-level-ref'],
    queryFn: () => risksApi.getLevelRef(),
    staleTime: 3600_000,
  });

  const { data: hosKategoriRes } = useQuery({
    queryKey: ['hos-kategori-filter', tahun],
    queryFn: () => settingsApi.getHosKategoris(tahun),
    staleTime: 3600_000,
  });

  // Extract data — axiosRes.data = API body, body.data = payload
  const risksList   = risksRes?.data?.data?.data ?? [];
  const meta        = risksRes?.data?.data?.meta;
  const direktorats = direktoratsRes?.data?.data  ?? [];
  const divisi      = divisRes?.data?.data        ?? [];
  const levelRefs   = levelRefRes?.data?.data     ?? [];
  const hosKategoris = hosKategoriRes?.data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => risksApi.delete(id),
    onSuccess: () => {
      toast.success('Risiko berhasil dihapus');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['risks'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Gagal menghapus risiko';
      toast.error(msg);
      setDeleteTarget(null);
    },
  });

  // ── Handlers ───────────────────────────────────────────────
  const handleFilterChange = (key: string, value: string) => {
    setPage(1);
    if (key === 'direktorat') { 
      setDirektoratId(value); 
      setDivisiId(''); // Reset divisi
    }
    if (key === 'divisi') setDivisiId(value);
    if (key === 'level') setLevelInherent(value);
    if (key === 'hos') setHosKategoriId(value);
    if (key === 'search') setSearch(value);
  };

  const resetFilters = () => {
    setSearch('');
    setDirektoratId('');
    setDivisiId('');
    setLevelInherent('');
    setHosKategoriId('');
    setPage(1);
  };

  const hasFilters = search || direktoratId || divisiId || levelInherent || hosKategoriId;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Registri Risiko RCSA {tahun}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {meta?.total ?? 0} risiko terdaftar · Berdasarkan Report RCSA Transjakarta
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingTemplate ? 'Menyiapkan...' : 'Download Template'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              disabled
              title="Integrasi TRUST — akan tersedia setelah API TRUST terhubung"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed transition-all"
            >
              <Database className="w-4 h-4" />
              Sinkronisasi TRUST
              <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">SOON</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Info sumber data ─────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <div>
            Data risiko bersumber dari <strong>TRUST</strong> (otomatis) atau <strong>Import Excel</strong>. Unduh template terlebih dahulu untuk melihat field yang dibutuhkan sebelum import.
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID Risiko atau Nama Risiko..."
            value={search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Direktorat */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">Direktorat</label>
            <select
              value={direktoratId}
              onChange={(e) => handleFilterChange('direktorat', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">Semua Direktorat</option>
              {direktorats.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
            </select>
          </div>

          {/* Divisi */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">Divisi</label>
            <select
              value={divisiId}
              onChange={(e) => handleFilterChange('divisi', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">Semua Divisi</option>
              {divisi.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
            </select>
          </div>

          {/* Perspektif HoS */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">Perspektif HoS</label>
            <select
              value={hosKategoriId}
              onChange={(e) => handleFilterChange('hos', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">Semua Perspektif</option>
              {hosKategoris.map((h) => (
                <option key={h.id} value={h.id}>{h.nama_perspektif}</option>
              ))}
            </select>
          </div>

          {/* Level Risiko Inherent */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">Tingkat Risiko</label>
            <select
              value={levelInherent}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">Semua Level</option>
              {levelRefs.map((lr) => (
                <option key={lr.kode} value={lr.kode}>
                  {lr.kode} - {lr.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          {hasFilters && (
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 pt-2">
            {search && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs">
                <span className="text-primary-700 font-medium">Cari: {search}</span>
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {direktoratId && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs">
                <span className="text-blue-700 font-medium">
                  Dir: {direktorats.find(d => d.id === direktoratId)?.nama}
                </span>
                <button
                  onClick={() => handleFilterChange('direktorat', '')}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {divisiId && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs">
                <span className="text-green-700 font-medium">
                  Div: {divisi.find(d => d.id === divisiId)?.nama}
                </span>
                <button
                  onClick={() => handleFilterChange('divisi', '')}
                  className="text-green-500 hover:text-green-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {levelInherent && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs">
                <span className="text-orange-700 font-medium">Level: {levelInherent}</span>
                <button
                  onClick={() => handleFilterChange('level', '')}
                  className="text-orange-500 hover:text-orange-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {hosKategoriId && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs">
                <span className="text-indigo-700 font-medium">
                  HoS: {hosKategoris.find(h => h.id === hosKategoriId)?.nama_perspektif}
                </span>
                <button
                  onClick={() => handleFilterChange('hos', '')}
                  className="text-indigo-500 hover:text-indigo-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Data Table ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border border-slate-300 border-t-primary-600" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Gagal memuat data risiko</p>
            <p className="text-sm text-red-700 mt-1">Silakan coba refresh halaman atau hubungi support</p>
          </div>
        </div>
      ) : risksList.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Tidak ada risiko yang ditemukan</p>
          <p className="text-sm text-slate-500 mt-1">Coba ubah filter, atau import data dari Excel / TRUST.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">ID Risiko</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Direktorat</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Divisi</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Nama Risiko</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-700">Tingkat Risiko</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Perspektif HoS</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Sasaran Strategis</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risksList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{r.id_risiko}</td>
                    <td className="px-5 py-4 text-slate-800">{r.direktorat || '—'}</td>
                    <td className="px-5 py-4 text-slate-800">{r.divisi || '—'}</td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="font-medium text-slate-900 line-clamp-2">{r.nama_risiko}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <RiskLevelBadge
                        level={r.level_inherent}
                        label={r.label_inherent}
                        bg={r.bg_inherent}
                        text={r.text_inherent}
                      />
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {r.hos_kategori_nama ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold">
                          {r.hos_kategori_nama}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-xs max-w-[200px]">
                      {r.sasaran_strategis_nama ? (
                        <p className="text-slate-700 line-clamp-2" title={r.sasaran_strategis_nama}>
                          {r.sasaran_strategis_nama}
                        </p>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setDetailRisk(r)}
                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> • Total: <strong>{meta?.total}</strong> risiko
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, page - 2) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {detailRisk && (
        <RiskDetailModal
          risk={detailRisk}
          open={!!detailRisk}
          onClose={() => setDetailRisk(null)}
          onEdit={isAdmin ? () => {
            setEditRisk(detailRisk);
            setDetailRisk(null);
            setFormOpen(true);
          } : undefined}
          onDelete={() => setDeleteTarget(detailRisk)}
        />
      )}

      {formOpen && (
        <RiskFormModal
          tahun={tahun}
          editData={editRisk}
          onClose={() => { setFormOpen(false); setEditRisk(null); }}
          onSuccess={() => {
            setFormOpen(false);
            setEditRisk(null);
            qc.invalidateQueries({ queryKey: ['risks'] });
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <div>
              <p className="font-bold text-slate-900">Hapus Risiko</p>
              <p className="text-sm text-slate-600 mt-2">
                Anda yakin ingin menghapus risiko <strong>{deleteTarget.id_risiko}</strong>? Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
