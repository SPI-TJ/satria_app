import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { risksApi } from '../../../services/api';
import { RiskData, RiskLevel, RiskStatus } from '../../../types';
import toast from 'react-hot-toast';

interface Props {
  tahun: number;
  editData?: RiskData | null;
  onClose: () => void;
  onSuccess: () => void;
}

const LEVEL_OPTIONS: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS: RiskStatus[] = ['Open', 'Mitigated', 'Closed'];

const CURRENT_YEAR = new Date().getFullYear();

export default function RiskFormModal({ tahun, editData, onClose, onSuccess }: Props) {
  const isEdit = !!editData;

  const [form, setForm] = useState({
    risk_code:        '',
    divisi:           '',
    department_name:  '',
    risk_description: '',
    risk_level:       'Medium' as RiskLevel,
    status:           'Open' as RiskStatus,
    tahun:            tahun,
  });

  useEffect(() => {
    if (editData) {
      setForm({
        risk_code:        editData.risk_code,
        divisi:           editData.divisi ?? '',
        department_name:  editData.department_name,
        risk_description: editData.risk_description,
        risk_level:       editData.risk_level,
        status:           editData.status,
        tahun:            editData.tahun,
      });
    }
  }, [editData]);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () =>
      isEdit
        ? risksApi.update(editData!.id, {
            risk_code:        form.risk_code,
            divisi:           form.divisi || undefined,
            department_name:  form.department_name,
            risk_description: form.risk_description,
            risk_level:       form.risk_level,
            status:           form.status,
          })
        : risksApi.create({
            risk_code:        form.risk_code,
            divisi:           form.divisi || undefined,
            department_name:  form.department_name,
            risk_description: form.risk_description,
            risk_level:       form.risk_level,
            status:           form.status,
            tahun:            form.tahun,
          }),
    onSuccess: () => {
      toast.success(isEdit ? 'Risiko berhasil diperbarui' : 'Risiko berhasil ditambahkan');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal menyimpan data risiko';
      toast.error(msg);
    },
  });

  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

  const isValid =
    form.risk_code.trim() !== '' &&
    form.risk_description.trim() !== '' &&
    form.risk_level !== '' &&
    form.tahun > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                {isEdit ? 'Edit Risiko' : 'Tambah Risiko Manual'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit ? `Edit data untuk ${editData?.risk_code}` : 'Input satu data risiko secara manual'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Risk Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Risk ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.risk_code}
                  onChange={(e) => set('risk_code', e.target.value.toUpperCase())}
                  placeholder="cth: RSK-2026-001"
                  className="input text-sm"
                />
              </div>

              {/* Tahun */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tahun <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tahun}
                  onChange={(e) => set('tahun', Number(e.target.value))}
                  disabled={isEdit}
                  className="input text-sm disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Divisi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Divisi
                </label>
                <input
                  value={form.divisi}
                  onChange={(e) => set('divisi', e.target.value)}
                  placeholder="cth: Divisi Teknologi Informasi"
                  className="input text-sm"
                />
              </div>

              {/* Departemen */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Departemen
                </label>
                <input
                  value={form.department_name}
                  onChange={(e) => set('department_name', e.target.value)}
                  placeholder="cth: IT Operations"
                  className="input text-sm"
                />
              </div>

              {/* Level Risk */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Level Risk <span className="text-red-500">*</span>
                </label>
                <select value={form.risk_level} onChange={(e) => set('risk_level', e.target.value)} className="input text-sm">
                  {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Status
                </label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input text-sm">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi Risiko <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.risk_description}
                onChange={(e) => set('risk_description', e.target.value)}
                placeholder="Jelaskan risiko secara singkat dan spesifik..."
                className="input text-sm resize-none"
              />
            </div>

            {!isValid && form.risk_code && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Lengkapi Risk ID dan Deskripsi Risiko terlebih dahulu.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="btn-secondary text-sm">
              Batal
            </button>
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !isValid}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
            >
              {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Simpan Perubahan' : 'Tambah Risiko'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
