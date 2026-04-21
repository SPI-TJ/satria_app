import { useQuery } from '@tanstack/react-query';
import {
  X, Pencil, Users, CalendarDays, CheckCircle2, Clock,
  AlertCircle, Loader2, ShieldCheck,
} from 'lucide-react';
import { annualPlansApi } from '../../../services/api';
import { AnnualAuditPlan, RiskLevel } from '../../../types';

interface Props {
  programId: string;
  onClose: () => void;
  onEdit?: (plan: AnnualAuditPlan) => void;
}

const LEVEL_BADGE: Record<RiskLevel, string> = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-50 text-orange-700',
  Medium:   'bg-yellow-50 text-yellow-700',
  Low:      'bg-green-50 text-green-700',
};

export default function ProgramDetailModal({ programId, onClose, onEdit }: Props) {
  const { data: res, isLoading } = useQuery({
    queryKey: ['annual-plan-detail', programId],
    queryFn:  () => annualPlansApi.getById(programId).then((r) => r.data.data!),
  });

  const plan = res;

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-shrink-0">
            {isLoading ? (
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                    plan?.jenis_program === 'PKPT'
                      ? 'bg-primary-50 text-primary-700 border-primary-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {plan?.jenis_program}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    plan?.status_pkpt === 'Final'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {plan?.status_pkpt === 'Final'
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <Clock className="w-3 h-3" />}
                    {plan?.status_pkpt}
                  </span>
                </div>
                <h2 className="font-bold text-slate-800 text-base leading-snug">{plan?.judul_program}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {plan?.kategori_program} · {plan?.status_program} · Tahun {plan?.tahun}
                </p>
              </div>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
                ))}
                <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto mt-4" />
              </div>
            ) : !plan ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Program tidak ditemukan.</p>
              </div>
            ) : (
              <>
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Timeline */}
                  <div className="col-span-2 bg-primary-50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary-600" />
                      <div>
                        <p className="text-xs text-primary-500 font-medium">Periode</p>
                        <p className="text-sm font-bold text-primary-800">
                          {fmtDate(plan.tanggal_mulai)} — {fmtDate(plan.tanggal_selesai)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-primary-500 font-medium">Estimasi Hari Kerja</p>
                      <p className="text-2xl font-black text-primary-700">{plan.estimasi_hari}
                        <span className="text-sm font-semibold ml-1">hari</span>
                      </p>
                    </div>
                  </div>

                  {/* Auditee */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Auditee</p>
                    <p className="text-sm text-slate-700">{plan.auditee || '—'}</p>
                  </div>

                  {/* Jumlah Personil */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Personil</p>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary-500" />
                      <p className="text-sm font-bold text-slate-800">{plan.team?.length ?? 0} personil</p>
                    </div>
                  </div>
                </div>

                {/* Deskripsi */}
                {plan.deskripsi && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{plan.deskripsi}</p>
                  </div>
                )}

                {/* Tim Auditor */}
                {plan.team && plan.team.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tim Auditor</p>
                    <div className="space-y-2">
                      {plan.team.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                            {member.nama_lengkap.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{member.nama_lengkap}</p>
                            <p className="text-xs text-slate-400">{member.jabatan || member.role.replace('_', ' ')}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            member.role_tim === 'Pengendali Teknis' ? 'bg-blue-50 text-blue-700' :
                            member.role_tim === 'Ketua Tim'         ? 'bg-primary-50 text-primary-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {member.role_tim}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risiko Terkait */}
                {plan.risks && plan.risks.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Risiko Terkait ({plan.risks.length})
                    </p>
                    <div className="space-y-2">
                      {plan.risks.map((risk) => (
                        <div key={risk.id} className="flex items-start gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                          <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-xs font-bold text-primary-600">{risk.risk_code}</span>
                              <span className={`text-xs px-1.5 py-0 rounded-full font-medium ${LEVEL_BADGE[risk.risk_level]}`}>
                                {risk.risk_level}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">{risk.risk_description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="btn-secondary text-sm">Tutup</button>
            {onEdit && plan && plan.status_pkpt === 'Draft' && (
              <button
                onClick={() => onEdit(plan as unknown as AnnualAuditPlan)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Program
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
