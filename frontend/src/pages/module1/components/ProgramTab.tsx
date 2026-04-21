import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Eye, Pencil, Trash2, CheckCircle2, Clock,
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Users, CalendarDays, X,
} from 'lucide-react';
import { annualPlansApi } from '../../../services/api';
import { AnnualAuditPlan, JenisProgram, StatusPKPT } from '../../../types';
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
  Draft: { cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  Final: { cls: 'bg-green-50 text-green-700 border border-green-200',  icon: CheckCircle2 },
};

export default function ProgramTab({ tahun }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [jenisFilter, setJenisFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,  setPage]  = useState(1);

  const [formOpen,     setFormOpen]     = useState(false);
  const [editProgram,  setEditProgram]  = useState<AnnualAuditPlan | null>(null);
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnualAuditPlan | null>(null);

  const LIMIT = 15;

  // ── Queries ─────────────────────────────────────────────────
  const { data: planRes, isLoading } = useQuery({
    queryKey: ['annual-plans', { tahun, jenisFilter, statusFilter, page }],
    queryFn:  () =>
      annualPlansApi.getAll({
        tahun,
        jenis_program: jenisFilter || undefined,
        status_pkpt:   statusFilter || undefined,
        page,
        limit: LIMIT,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const plans = planRes?.data ?? [];
  const total = planRes?.meta?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);

  // ── Mutations ────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => annualPlansApi.delete(id),
    onSuccess: () => {
      toast.success('Program berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['annual-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal menghapus program';
      toast.error(msg);
    },
  });

  const finalizeMut = useMutation({
    mutationFn: (id: string) => annualPlansApi.finalize(id),
    onSuccess: () => {
      toast.success('Program berhasil difinalisasi');
      qc.invalidateQueries({ queryKey: ['annual-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Gagal memfinalisasi program'),
  });

  const canCreate   = ['kepala_spi', 'admin_spi', 'pengendali_teknis'].includes(user?.role ?? '');
  const canFinalize = user?.role === 'kepala_spi';

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {/* ── Header Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={jenisFilter}
          onChange={(e) => { setJenisFilter(e.target.value); setPage(1); }}
          className="input w-36 text-sm"
        >
          <option value="">Semua Jenis</option>
          <option value="PKPT">PKPT</option>
          <option value="Non PKPT">Non PKPT</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-32 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="Draft">Draft</option>
          <option value="Final">Final</option>
        </select>

        {(jenisFilter || statusFilter) && (
          <button
            onClick={() => { setJenisFilter(''); setStatusFilter(''); setPage(1); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
          >
            <X className="w-3 h-3" /> Reset
          </button>
        )}

        <div className="ml-auto">
          {canCreate && (
            <button
              onClick={() => { setEditProgram(null); setFormOpen(true); }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Buat Program Kerja
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Program', val: total, color: 'text-slate-800' },
          { label: 'Draft',  val: plans.filter((p) => p.status_pkpt === 'Draft').length,  color: 'text-amber-700' },
          { label: 'Final',  val: plans.filter((p) => p.status_pkpt === 'Final').length,  color: 'text-green-700' },
          { label: 'PKPT',   val: plans.filter((p) => p.jenis_program === 'PKPT').length, color: 'text-primary-700' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className={`text-2xl font-black ${c.color}`}>{c.val}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Program Table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-700 text-sm">
            Daftar Program Kerja <span className="text-slate-400 font-normal">— Tahun {tahun}</span>
          </h3>
          <span className="text-xs text-slate-400">
            {total > 0
              ? `${Math.min((page - 1) * LIMIT + 1, total)}–${Math.min(page * LIMIT, total)} dari ${total} program`
              : 'Belum ada program'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Judul Program</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Personil</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Nama Auditor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Auditee</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Est. Hari</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Periode</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Pengendali Teknis</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">Ketua Tim</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 12 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-10 h-10 text-slate-200" />
                      <p className="text-slate-400 text-sm">Belum ada program kerja untuk tahun {tahun}.</p>
                      {canCreate && (
                        <button
                          onClick={() => { setEditProgram(null); setFormOpen(true); }}
                          className="btn-primary text-sm flex items-center gap-2 mt-1"
                        >
                          <Plus className="w-4 h-4" /> Buat Program Pertama
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                plans.map((plan, idx) => {
                  const SBadge = STATUS_BADGE[plan.status_pkpt];
                  const SIcon  = SBadge.icon;
                  const rowNum = (page - 1) * LIMIT + idx + 1;

                  return (
                    <tr key={plan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 text-center">{rowNum}</td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${JENIS_BADGE[plan.jenis_program]}`}>
                          {plan.jenis_program}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-[200px]">
                        <button
                          onClick={() => setDetailId(plan.id)}
                          className="text-left text-sm font-semibold text-slate-800 hover:text-primary-600 line-clamp-2 transition-colors"
                        >
                          {plan.judul_program}
                        </button>
                        <p className="text-xs text-slate-400 mt-0.5">{plan.kategori_program}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${SBadge.cls}`}>
                          <SIcon className="w-3 h-3" />
                          {plan.status_pkpt}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <Users className="w-3 h-3 text-slate-400" />
                          {plan.jumlah_personil ?? 0}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-xs text-slate-600 line-clamp-2">
                          {plan.nama_auditor || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap max-w-[120px]">
                        <span className="text-xs text-slate-600 truncate block">
                          {plan.auditee || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          <CalendarDays className="w-3 h-3 text-slate-400" />
                          {plan.estimasi_hari}h
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-slate-600">{fmtDate(plan.tanggal_mulai)}</p>
                        <p className="text-xs text-slate-400">s/d {fmtDate(plan.tanggal_selesai)}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600">{plan.pengendali_teknis_nama || '—'}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600">{plan.ketua_nama || '—'}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailId(plan.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canCreate && plan.status_pkpt === 'Draft' && (
                            <button
                              onClick={() => { setEditProgram(plan); setFormOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canFinalize && plan.status_pkpt === 'Draft' && (
                            <button
                              onClick={() => finalizeMut.mutate(plan.id)}
                              disabled={finalizeMut.isPending}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Finalisasi"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canCreate && plan.status_pkpt === 'Draft' && (
                            <button
                              onClick={() => setDeleteTarget(plan)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus"
                            >
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

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">Halaman {page} dari {pages}</span>
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
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${page === pg ? 'bg-primary-500 text-white' : 'btn-secondary'}`}
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
                <div className="flex-1">
                  <p className="font-bold text-slate-800">Hapus Program?</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Program <span className="font-semibold text-slate-700">"{deleteTarget.judul_program}"</span> akan dihapus. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary text-sm">Batal</button>
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
        <ProgramFormModal
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
