import { X, Pencil, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { RiskData, RiskLevel, RiskStatus } from '../../../types';

interface Props {
  risk: RiskData;
  onClose: () => void;
  onEdit?: () => void;
}

const LEVEL_COLOR: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
  High:     { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  Medium:   { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  Low:      { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200' },
};

const STATUS_ICON: Record<RiskStatus, React.ElementType> = {
  Open:      AlertTriangle,
  Mitigated: MinusCircle,
  Closed:    CheckCircle2,
};

const STATUS_COLOR: Record<RiskStatus, string> = {
  Open:      'text-slate-600 bg-slate-100',
  Mitigated: 'text-blue-700 bg-blue-50',
  Closed:    'text-green-700 bg-green-100',
};

export default function RiskDetailModal({ risk, onClose, onEdit }: Props) {
  const level   = LEVEL_COLOR[risk.risk_level];
  const SIcon   = STATUS_ICON[risk.status];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto overflow-hidden">
          {/* Color accent header */}
          <div className={`${level.bg} px-6 py-4 border-b ${level.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${level.bg} ${level.text} ${level.border}`}>
                    {risk.risk_level}
                  </span>
                  <span className="font-bold font-mono text-slate-700 text-sm">{risk.risk_code}</span>
                </div>
                <p className="text-xs text-slate-500">Tahun {risk.tahun} · {risk.source}</p>
              </div>
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Deskripsi */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Risiko</p>
              <p className="text-sm text-slate-700 leading-relaxed">{risk.risk_description}</p>
            </div>

            {/* Grid info */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Divisi</p>
                <p className="text-sm text-slate-700">{risk.divisi || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Departemen</p>
                <p className="text-sm text-slate-700">{risk.department_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[risk.status]}`}>
                  <SIcon className="w-3.5 h-3.5" />
                  {risk.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sumber Data</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  risk.source === 'TRUST' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {risk.source}
                </span>
              </div>
            </div>

            {/* Imported by */}
            {risk.imported_by_nama && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Diimpor oleh <span className="font-semibold text-slate-600">{risk.imported_by_nama}</span>
                  {risk.created_at && (
                    <> pada {new Date(risk.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">
              Tutup
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Risiko
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
