import { type ReactNode } from 'react';
import { X, Pencil, Building2, Target, Shield, AlertTriangle, Info } from 'lucide-react';
import { RiskData, RiskLevelKode } from '../../../types';

interface Props {
  risk: RiskData;
  onClose: () => void;
  onEdit?: () => void;
}

// ── Level badge colours (fallback if API colours absent) ──────
const LEVEL_DEFAULTS: Record<RiskLevelKode, { bg: string; text: string; border: string; label: string }> = {
  E:  { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     label: 'Extreme' },
  T:  { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300',  label: 'Tinggi' },
  MT: { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   label: 'Medium Tinggi' },
  M:  { bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-300',  label: 'Medium' },
  RM: { bg: 'bg-lime-100',    text: 'text-lime-700',    border: 'border-lime-300',    label: 'Rendah Medium' },
  R:  { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300',   label: 'Rendah' },
};

function LevelBadge({ level, skor, label }: { level?: RiskLevelKode; skor?: number; label?: string }) {
  if (!level && !skor) return <span className="text-slate-400 text-sm">—</span>;
  const d = level ? LEVEL_DEFAULTS[level] : null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
        ${d ? `${d.bg} ${d.text} ${d.border}` : 'bg-slate-100 text-slate-600 border-slate-200'}`}
    >
      {level && <span className="font-mono">{level}</span>}
      {skor !== undefined && <span className="opacity-75">({skor})</span>}
      {(label ?? d?.label) && (
        <span className="hidden sm:inline">{label ?? d?.label}</span>
      )}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value || '—'}</p>
    </div>
  );
}

export default function RiskDetailModal({ risk, onClose, onEdit }: Props) {
  const inherentLevel = risk.level_inherent as RiskLevelKode | undefined;
  const headerDef = inherentLevel ? LEVEL_DEFAULTS[inherentLevel] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[92vh]">

          {/* ── Colored header based on inherent level ─── */}
          <div
            className={`px-6 py-4 border-b flex-shrink-0 ${
              headerDef ? `${headerDef.bg} border-b ${headerDef.border}` : 'bg-slate-50 border-b border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {risk.id_risiko && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/70 text-slate-700 border border-slate-200">
                      {risk.id_risiko}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">Tahun {risk.tahun}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    risk.source === 'Import' ? 'bg-blue-100 text-blue-700'
                    : risk.source === 'TRUST' ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                    {risk.source}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                  {risk.nama_risiko}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────── */}
          <div className="overflow-y-auto flex-1">

            {/* ── Organisasi ───────────────────────────── */}
            <Section icon={<Building2 className="w-3.5 h-3.5" />} title="Organisasi">
              <div className="grid grid-cols-3 gap-4">
                <InfoRow label="Direktorat" value={risk.direktorat} />
                <InfoRow label="Divisi" value={risk.divisi} />
                <InfoRow label="Departemen" value={risk.departemen} />
              </div>
            </Section>

            {/* ── Sasaran & House of Strategy ──────────── */}
            {(risk.sasaran_korporat || risk.sasaran_bidang || risk.hos_kategori_nama || risk.sasaran_strategis_nama) && (
              <Section icon={<Target className="w-3.5 h-3.5" />} title="Sasaran & House of Strategy">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {risk.hos_kategori_nama && (
                    <InfoRow
                      label="Perspektif HoS"
                      value={risk.hos_kategori_nama}
                    />
                  )}
                  {risk.sasaran_strategis_nama && (
                    <InfoRow
                      label="Sasaran Strategis"
                      value={risk.sasaran_strategis_nama}
                    />
                  )}
                  {risk.sasaran_korporat && (
                    <InfoRow label="Sasaran Korporat" value={risk.sasaran_korporat} />
                  )}
                  {risk.sasaran_bidang && (
                    <InfoRow label="Sasaran Bidang" value={risk.sasaran_bidang} />
                  )}
                </div>
              </Section>
            )}

            {/* ── Detail Risiko ────────────────────────── */}
            <Section icon={<Info className="w-3.5 h-3.5" />} title="Detail Risiko">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Risiko / Peluang</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{risk.nama_risiko}</p>
                </div>
                {risk.parameter_kemungkinan && (
                  <InfoRow label="Parameter Kemungkinan" value={risk.parameter_kemungkinan} />
                )}
              </div>
            </Section>

            {/* ── Tingkat Risiko — comparison table ───── */}
            <Section icon={<Shield className="w-3.5 h-3.5" />} title="Tingkat Risiko">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 pr-4 w-1/3">
                        Inherent
                      </th>
                      <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 pr-4 w-1/3">
                        Target
                      </th>
                      <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 w-1/3">
                        Realisasi Eksisting
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pt-2 pr-4">
                        <LevelBadge
                          level={risk.level_inherent as RiskLevelKode}
                          skor={risk.skor_inherent}
                          label={risk.label_inherent}
                        />
                      </td>
                      <td className="pt-2 pr-4">
                        <LevelBadge
                          level={risk.level_target as RiskLevelKode}
                          skor={risk.skor_target}
                          label={risk.label_target}
                        />
                      </td>
                      <td className="pt-2">
                        <LevelBadge
                          level={risk.level_realisasi as RiskLevelKode}
                          skor={risk.skor_realisasi}
                          label={risk.label_realisasi}
                        />
                      </td>
                    </tr>
                    {/* Raw text fallback */}
                    {(risk.tingkat_risiko_inherent || risk.tingkat_risiko_target || risk.realisasi_tingkat_risiko) && (
                      <tr>
                        <td className="pt-1 pr-4">
                          <span className="font-mono text-xs text-slate-400">{risk.tingkat_risiko_inherent ?? '—'}</span>
                        </td>
                        <td className="pt-1 pr-4">
                          <span className="font-mono text-xs text-slate-400">{risk.tingkat_risiko_target ?? '—'}</span>
                        </td>
                        <td className="pt-1">
                          <span className="font-mono text-xs text-slate-400">{risk.realisasi_tingkat_risiko ?? '—'}</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Skor delta indicator */}
                {risk.skor_inherent !== undefined && risk.skor_realisasi !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Selisih Inherent vs Realisasi:</span>
                    {(() => {
                      const delta = (risk.skor_inherent ?? 0) - (risk.skor_realisasi ?? 0);
                      return (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          delta > 0 ? 'bg-green-100 text-green-700' :
                          delta < 0 ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {delta > 0 ? `-${delta}` : delta < 0 ? `+${Math.abs(delta)}` : '0'} poin
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            </Section>

            {/* ── Mitigasi ─────────────────────────────── */}
            {risk.pelaksanaan_mitigasi && (
              <Section icon={<Shield className="w-3.5 h-3.5" />} title="Pelaksanaan Mitigasi">
                <p className="text-sm text-slate-700 leading-relaxed">{risk.pelaksanaan_mitigasi}</p>
              </Section>
            )}

            {/* ── Penyebab ─────────────────────────────── */}
            {(risk.penyebab_internal || risk.penyebab_eksternal) && (
              <Section icon={<AlertTriangle className="w-3.5 h-3.5" />} title="Penyebab Risiko">
                <div className="grid grid-cols-2 gap-4">
                  {risk.penyebab_internal && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Internal</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{risk.penyebab_internal}</p>
                    </div>
                  )}
                  {risk.penyebab_eksternal && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Eksternal</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{risk.penyebab_eksternal}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── Metadata ─────────────────────────────── */}
            <div className="px-6 py-3 border-t border-slate-50 flex items-center gap-4 flex-wrap">
              {risk.imported_by_nama && (
                <p className="text-xs text-slate-400">
                  Diimpor oleh{' '}
                  <span className="font-semibold text-slate-600">{risk.imported_by_nama}</span>
                </p>
              )}
              {risk.created_at && (
                <p className="text-xs text-slate-400">
                  Dibuat{' '}
                  {new Date(risk.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              {risk.updated_at && risk.updated_at !== risk.created_at && (
                <p className="text-xs text-slate-400">
                  Diperbarui{' '}
                  {new Date(risk.updated_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="btn-secondary text-sm">
              Tutup
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Risiko
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Section wrapper ────────────────────────────────────────────
function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-6 py-4 border-b border-slate-50 last:border-b-0">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-slate-400">{icon}</span>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );
}
