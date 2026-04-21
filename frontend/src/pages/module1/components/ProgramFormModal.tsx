import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X, Loader2, Users, CalendarDays, AlertCircle,
  Search, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { annualPlansApi, auditorsApi, risksApi, CreatePlanPayload } from '../../../services/api';
import { AnnualAuditPlan, Auditor, JenisProgram, KategoriProgram, RiskData, RiskLevel, StatusProgram } from '../../../types';
import toast from 'react-hot-toast';

interface Props {
  tahun: number;
  editData?: AnnualAuditPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  jenis_program:       JenisProgram;
  judul_program:       string;
  kategori_program:    KategoriProgram;
  status_program:      StatusProgram;
  auditee:             string;
  deskripsi:           string;
  tanggal_mulai:       string;
  tanggal_selesai:     string;
  pengendali_teknis_id: string;
  ketua_tim_id:        string;
  anggota_ids:         string[];
  risk_ids:            string[];
}

const KATEGORI_OPTIONS: KategoriProgram[] = ['Assurance', 'Non Assurance', 'Pemantauan Risiko', 'Evaluasi'];
const STATUS_OPTIONS:   StatusProgram[]   = ['Mandatory', 'Strategis', 'Emerging Risk'];

const LEVEL_BADGE: Record<RiskLevel, string> = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-50 text-orange-700',
  Medium:   'bg-yellow-50 text-yellow-700',
  Low:      'bg-green-50 text-green-700',
};

// ── Auto-calc estimasi hari (inklusif) ─────────────────────────
function calcEstimasi(mulai: string, selesai: string): number {
  if (!mulai || !selesai) return 0;
  const diff = Math.round(
    (new Date(selesai).getTime() - new Date(mulai).getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
}

export default function ProgramFormModal({ tahun, editData, onClose, onSuccess }: Props) {
  const isEdit = !!editData;

  const [form, setForm] = useState<FormState>({
    jenis_program:        'PKPT',
    judul_program:        '',
    kategori_program:     'Assurance',
    status_program:       'Mandatory',
    auditee:              '',
    deskripsi:            '',
    tanggal_mulai:        '',
    tanggal_selesai:      '',
    pengendali_teknis_id: '',
    ketua_tim_id:         '',
    anggota_ids:          [],
    risk_ids:             [],
  });

  const [riskSearch,   setRiskSearch]   = useState('');
  const [anggotaOpen,  setAnggotaOpen]  = useState(false);

  // ── Populate form on edit ────────────────────────────────────
  const { data: detailRes } = useQuery({
    queryKey: ['annual-plan-detail', editData?.id],
    queryFn:  () => annualPlansApi.getById(editData!.id).then((r) => r.data.data!),
    enabled:  !!editData?.id,
  });

  useEffect(() => {
    if (detailRes) {
      const pengendalId = detailRes.team.find((t) => t.role_tim === 'Pengendali Teknis')?.user_id ?? '';
      const ketuaId     = detailRes.team.find((t) => t.role_tim === 'Ketua Tim')?.user_id ?? '';
      const anggotaIds  = detailRes.team.filter((t) => t.role_tim === 'Anggota Tim').map((t) => t.user_id);
      const riskIds     = detailRes.risks.map((r) => r.id);

      setForm({
        jenis_program:        detailRes.jenis_program,
        judul_program:        detailRes.judul_program,
        kategori_program:     detailRes.kategori_program,
        status_program:       detailRes.status_program,
        auditee:              detailRes.auditee ?? '',
        deskripsi:            detailRes.deskripsi ?? '',
        tanggal_mulai:        detailRes.tanggal_mulai?.slice(0, 10) ?? '',
        tanggal_selesai:      detailRes.tanggal_selesai?.slice(0, 10) ?? '',
        pengendali_teknis_id: pengendalId,
        ketua_tim_id:         ketuaId,
        anggota_ids:          anggotaIds,
        risk_ids:             riskIds,
      });
    }
  }, [detailRes]);

  // ── Data fetching ────────────────────────────────────────────
  const { data: auditorsRes } = useQuery({
    queryKey: ['auditors'],
    queryFn:  () => auditorsApi.getAll().then((r) => r.data.data ?? []),
  });

  const { data: riskRes } = useQuery({
    queryKey: ['risks-for-program', tahun],
    queryFn:  () => risksApi.getAll({ tahun, limit: 100 }).then((r) => r.data.data ?? []),
    enabled:  form.jenis_program === 'PKPT',
  });

  const auditors: Auditor[] = auditorsRes ?? [];
  const allRisks: RiskData[] = riskRes ?? [];

  // ── Computed values ──────────────────────────────────────────
  const estimasi_hari = useMemo(
    () => calcEstimasi(form.tanggal_mulai, form.tanggal_selesai),
    [form.tanggal_mulai, form.tanggal_selesai],
  );

  const jumlah_personil = useMemo(
    () =>
      (form.pengendali_teknis_id ? 1 : 0) +
      (form.ketua_tim_id ? 1 : 0) +
      form.anggota_ids.length,
    [form.pengendali_teknis_id, form.ketua_tim_id, form.anggota_ids],
  );

  const filteredRisks = useMemo(
    () =>
      allRisks.filter((r) =>
        !riskSearch ||
        r.risk_code.toLowerCase().includes(riskSearch.toLowerCase()) ||
        r.risk_description.toLowerCase().includes(riskSearch.toLowerCase()) ||
        (r.divisi ?? '').toLowerCase().includes(riskSearch.toLowerCase()),
      ),
    [allRisks, riskSearch],
  );

  // ── Auditors split by role ────────────────────────────────────
  const pengendaliOptions = auditors.filter((a) =>
    ['kepala_spi', 'pengendali_teknis'].includes(a.role),
  );
  const ketuaOptions = auditors.filter((a) =>
    ['pengendali_teknis', 'anggota_tim'].includes(a.role),
  );
  const anggotaOptions = auditors.filter((a) =>
    ['pengendali_teknis', 'anggota_tim'].includes(a.role),
  );

  // ── Helpers ──────────────────────────────────────────────────
  const set = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function toggleAnggota(uid: string) {
    setForm((f) => ({
      ...f,
      anggota_ids: f.anggota_ids.includes(uid)
        ? f.anggota_ids.filter((x) => x !== uid)
        : [...f.anggota_ids, uid],
    }));
  }

  function toggleRisk(id: string) {
    setForm((f) => ({
      ...f,
      risk_ids: f.risk_ids.includes(id)
        ? f.risk_ids.filter((x) => x !== id)
        : [...f.risk_ids, id],
    }));
  }

  const isValid =
    form.judul_program.trim() !== '' &&
    form.tanggal_mulai !== '' &&
    form.tanggal_selesai !== '' &&
    form.tanggal_selesai >= form.tanggal_mulai;

  // ── Mutation ─────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => {
      const payload: CreatePlanPayload = {
        jenis_program:        form.jenis_program,
        kategori_program:     form.kategori_program,
        judul_program:        form.judul_program,
        status_program:       form.status_program,
        auditee:              form.auditee || undefined,
        deskripsi:            form.deskripsi || undefined,
        tanggal_mulai:        form.tanggal_mulai,
        tanggal_selesai:      form.tanggal_selesai,
        pengendali_teknis_id: form.pengendali_teknis_id || undefined,
        ketua_tim_id:         form.ketua_tim_id || undefined,
        anggota_ids:          form.anggota_ids.length > 0 ? form.anggota_ids : undefined,
        risk_ids:             form.jenis_program === 'PKPT' && form.risk_ids.length > 0 ? form.risk_ids : undefined,
      };
      return isEdit
        ? annualPlansApi.update(editData!.id, payload)
        : annualPlansApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Program berhasil diperbarui' : 'Program kerja berhasil dibuat');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal menyimpan program';
      toast.error(msg);
    },
  });

  const selectedAuditorNames = [
    form.pengendali_teknis_id
      ? auditors.find((a) => a.id === form.pengendali_teknis_id)?.nama_lengkap
      : null,
    form.ketua_tim_id
      ? auditors.find((a) => a.id === form.ketua_tim_id)?.nama_lengkap
      : null,
    ...form.anggota_ids
      .map((id) => auditors.find((a) => a.id === id)?.nama_lengkap)
      .filter(Boolean),
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto flex flex-col max-h-[92vh] overflow-hidden">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                {isEdit ? 'Edit Program Kerja' : 'Buat Program Kerja Baru'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Tahun {tahun}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* ══ SEKSI 1: Informasi Program ══════════════════ */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Informasi Program
              </h3>
              <div className="grid grid-cols-2 gap-4">

                {/* Jenis Program */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Jenis Program <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(['PKPT', 'Non PKPT'] as JenisProgram[]).map((j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => set('jenis_program', j)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          form.jenis_program === j
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {j}
                        {j === 'PKPT' && (
                          <span className="block text-xs font-normal text-current opacity-60 mt-0.5">
                            Berbasis risiko
                          </span>
                        )}
                        {j === 'Non PKPT' && (
                          <span className="block text-xs font-normal text-current opacity-60 mt-0.5">
                            Independen / Ad-hoc
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Judul Program */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Judul Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.judul_program}
                    onChange={(e) => set('judul_program', e.target.value)}
                    placeholder="cth: Audit Keuangan & Pengadaan Q1 2026"
                    className="input text-sm"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori</label>
                  <select value={form.kategori_program} onChange={(e) => set('kategori_program', e.target.value)} className="input text-sm">
                    {KATEGORI_OPTIONS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>

                {/* Sifat */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sifat Program</label>
                  <select value={form.status_program} onChange={(e) => set('status_program', e.target.value)} className="input text-sm">
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Auditee */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Auditee (Unit / Bagian yang Diaudit)
                  </label>
                  <input
                    value={form.auditee}
                    onChange={(e) => set('auditee', e.target.value)}
                    placeholder="cth: Divisi Keuangan & Anggaran"
                    className="input text-sm"
                  />
                </div>

                {/* Deskripsi */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Deskripsi / Latar Belakang
                  </label>
                  <textarea
                    rows={3}
                    value={form.deskripsi}
                    onChange={(e) => set('deskripsi', e.target.value)}
                    placeholder="Jelaskan latar belakang dan ruang lingkup program audit ini..."
                    className="input text-sm resize-none"
                  />
                </div>
              </div>
            </section>

            {/* ══ SEKSI 2: Timeline Pelaksanaan ═══════════════ */}
            <section className="border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Timeline Pelaksanaan
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.tanggal_mulai}
                    onChange={(e) => set('tanggal_mulai', e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.tanggal_selesai}
                    min={form.tanggal_mulai}
                    onChange={(e) => set('tanggal_selesai', e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* Auto-calc badge */}
              {estimasi_hari > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary-500" />
                  <span className="text-sm text-slate-600">
                    Estimasi Hari Kerja:
                    <span className="ml-2 font-bold text-primary-700 text-base">{estimasi_hari}</span>
                    <span className="text-slate-400 text-xs ml-1">hari (dihitung otomatis)</span>
                  </span>
                </div>
              )}

              {form.tanggal_selesai && form.tanggal_mulai && form.tanggal_selesai < form.tanggal_mulai && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
                </div>
              )}
            </section>

            {/* ══ SEKSI 3: Tim Auditor ════════════════════════ */}
            <section className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Tim Auditor (SDM)
                </h3>
                {jumlah_personil > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 rounded-full">
                    <Users className="w-3.5 h-3.5 text-primary-600" />
                    <span className="text-xs font-bold text-primary-700">
                      {jumlah_personil} personil
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Pengendali Teknis */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Pengendali Teknis
                  </label>
                  <select
                    value={form.pengendali_teknis_id}
                    onChange={(e) => set('pengendali_teknis_id', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">— Pilih Pengendali Teknis —</option>
                    {pengendaliOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama_lengkap} ({a.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ketua Tim */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Ketua Tim
                  </label>
                  <select
                    value={form.ketua_tim_id}
                    onChange={(e) => set('ketua_tim_id', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">— Pilih Ketua Tim —</option>
                    {ketuaOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama_lengkap} ({a.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anggota Tim */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Anggota Tim
                    {form.anggota_ids.length > 0 && (
                      <span className="ml-2 text-primary-600">({form.anggota_ids.length} dipilih)</span>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={() => setAnggotaOpen((o) => !o)}
                    className="w-full flex items-center justify-between input text-sm text-left"
                  >
                    <span className={form.anggota_ids.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
                      {form.anggota_ids.length > 0
                        ? `${form.anggota_ids.length} anggota dipilih`
                        : '— Pilih Anggota Tim —'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${anggotaOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {anggotaOpen && (
                    <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                        {anggotaOptions.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-slate-400 text-center">Tidak ada auditor tersedia</p>
                        ) : (
                          anggotaOptions.map((a) => {
                            const checked = form.anggota_ids.includes(a.id);
                            return (
                              <label
                                key={a.id}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                  checked ? 'bg-primary-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAnggota(a.id)}
                                  className="rounded text-primary-600 flex-shrink-0"
                                />
                                <span className="text-sm text-slate-700 flex-1">{a.nama_lengkap}</span>
                                <span className="text-xs text-slate-400 capitalize">
                                  {a.role.replace('_', ' ')}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nama Auditor preview */}
                {selectedAuditorNames.length > 0 && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Tim Terpilih:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAuditorNames.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-xs text-slate-700">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ══ SEKSI 4: Risiko Terkait (PKPT only) ════════ */}
            {form.jenis_program === 'PKPT' && (
              <section className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Risiko Terkait
                  </h3>
                  {form.risk_ids.length > 0 && (
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
                      {form.risk_ids.length} risiko dipilih
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Pilih risiko dari tahun {tahun} yang menjadi dasar penyusunan program PKPT ini.
                </p>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={riskSearch}
                    onChange={(e) => setRiskSearch(e.target.value)}
                    placeholder="Cari risk code atau deskripsi..."
                    className="input pl-8 text-xs py-2"
                  />
                </div>

                {/* Risk checklist */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {filteredRisks.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-slate-400 text-center">
                        {allRisks.length === 0
                          ? `Belum ada data risiko untuk tahun ${tahun}.`
                          : 'Tidak ada risiko yang cocok dengan pencarian.'}
                      </p>
                    ) : (
                      filteredRisks.map((risk) => {
                        const checked = form.risk_ids.includes(risk.id);
                        return (
                          <label
                            key={risk.id}
                            className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              checked ? 'bg-primary-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRisk(risk.id)}
                              className="rounded text-primary-600 flex-shrink-0 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono text-xs font-bold text-primary-600">{risk.risk_code}</span>
                                <span className={`text-xs px-1.5 py-0 rounded-full font-medium ${LEVEL_BADGE[risk.risk_level]}`}>
                                  {risk.risk_level}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">{risk.risk_description}</p>
                              {risk.divisi && (
                                <p className="text-xs text-slate-400 mt-0.5">{risk.divisi}</p>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {filteredRisks.length > 0 && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{filteredRisks.length} risiko ditampilkan</span>
                      {form.risk_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={() => set('risk_ids', [])}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Hapus semua pilihan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
            {/* Summary strip */}
            {(estimasi_hari > 0 || jumlah_personil > 0) && (
              <div className="flex items-center gap-4 mb-4 bg-slate-50 rounded-xl px-4 py-2.5 text-xs text-slate-600">
                {estimasi_hari > 0 && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary-500" />
                    <strong>{estimasi_hari}</strong> hari kerja
                  </span>
                )}
                {jumlah_personil > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary-500" />
                    <strong>{jumlah_personil}</strong> personil
                  </span>
                )}
                {form.jenis_program === 'PKPT' && form.risk_ids.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />
                    <strong>{form.risk_ids.length}</strong> risiko terpilih
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="btn-secondary text-sm">
                Batal
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || !isValid}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
              >
                {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Simpan Perubahan' : 'Simpan sebagai Draft'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
