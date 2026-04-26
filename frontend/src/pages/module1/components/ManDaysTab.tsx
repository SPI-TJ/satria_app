/**
 * Tab Man-Days — Kalkulator Pagu Tahunan SPI
 *
 * Layout:
 *   1. Summary cards: Hari Setahun · Libur · Hari Efektif · Auditor · PAGU PEMERIKSAAN
 *   2. Tabel 12 bulan: input Jumlah Hari + Jumlah Libur per bulan
 *   3. Action: Save · Lock/Unlock
 *
 * Rumus:
 *   Hari Efektif Bulan = Jumlah Hari − Jumlah Libur
 *   Total Hari Efektif = Σ semua bulan
 *   Pagu Man-Days      = Total Hari Efektif × Jumlah Auditor SPI Aktif
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, Save, Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { kalenderKerjaApi, KalenderBulan } from '../../../services/api';
import { useAuthStore } from '../../../store/auth.store';

const BULAN_LABEL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
const BULAN_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function ManDaysTab({ tahun }: { tahun: number }) {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'kepala_spi' || role === 'admin_spi';
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['kalender-kerja', tahun],
    queryFn: () => kalenderKerjaApi.get(tahun).then((r) => r.data.data),
  });

  const header = data?.header ?? null;
  const auditorCount = data?.auditor_count_now ?? 0;
  const isLocked = !!header?.locked_at;

  // Local editable state — sinkron dgn data dari server
  const [rows, setRows] = useState<KalenderBulan[]>([]);
  const [keterangan, setKeterangan] = useState<string>('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.bulan) {
      setRows(data.bulan);
      setKeterangan(data.header?.keterangan ?? '');
      setDirty(false);
    }
  }, [data]);

  const totalHari    = useMemo(() => rows.reduce((s, r) => s + (r.jumlah_hari || 0), 0), [rows]);
  const totalLibur   = useMemo(() => rows.reduce((s, r) => s + (r.jumlah_libur || 0), 0), [rows]);
  const totalEfektif = useMemo(
    () => rows.reduce((s, r) => s + Math.max((r.jumlah_hari || 0) - (r.jumlah_libur || 0), 0), 0),
    [rows],
  );
  const pagu = totalEfektif * auditorCount;

  const updateRow = (idx: number, patch: Partial<KalenderBulan>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      // recompute hari_efektif lokal
      next[idx].hari_efektif = Math.max((next[idx].jumlah_hari || 0) - (next[idx].jumlah_libur || 0), 0);
      return next;
    });
    setDirty(true);
  };

  const upsertMut = useMutation({
    mutationFn: () =>
      kalenderKerjaApi.upsert({
        tahun,
        keterangan: keterangan || null,
        bulan: rows.map((r) => ({
          bulan: r.bulan,
          jumlah_hari: r.jumlah_hari || 0,
          jumlah_libur: r.jumlah_libur || 0,
          catatan: r.catatan ?? null,
        })),
      }),
    onSuccess: () => {
      toast.success('Kalender tersimpan. Pagu Man-Days terupdate.');
      qc.invalidateQueries({ queryKey: ['kalender-kerja'] });
      setDirty(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Gagal menyimpan kalender'),
  });

  const lockMut = useMutation({
    mutationFn: () => kalenderKerjaApi.lock(header!.id),
    onSuccess: () => { toast.success('Kalender dikunci'); qc.invalidateQueries({ queryKey: ['kalender-kerja'] }); },
  });
  const unlockMut = useMutation({
    mutationFn: () => kalenderKerjaApi.unlock(header!.id),
    onSuccess: () => { toast.success('Kunci dibuka'); qc.invalidateQueries({ queryKey: ['kalender-kerja'] }); },
  });

  const inputDisabled = isLocked || !canEdit;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Hari" value={totalHari} suffix="hari" color="slate" />
        <SummaryCard label="Total Libur" value={totalLibur} suffix="hari" color="amber" />
        <SummaryCard label="Hari Efektif" value={totalEfektif} suffix="hari" color="green" />
        <SummaryCard
          label="Total Auditor" value={auditorCount} suffix="orang" color="blue"
          icon={<Users className="w-4 h-4" />}
        />
        <SummaryCard
          label="Pagu Pemeriksaan" value={pagu} suffix="man-days" color="primary"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Lock badge */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
          <Lock className="w-4 h-4" />
          <span>
            Kalender ini <b>dikunci</b> {header?.locked_at && `pada ${new Date(header.locked_at).toLocaleString('id-ID')}`}
            {header?.locked_by_nama && ` oleh ${header.locked_by_nama}`}.
            Pagu Man-Days tidak bisa diubah hingga kunci dibuka.
          </span>
        </div>
      )}

      {/* Tabel 12 bulan */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Bulan</th>
              <th className="px-4 py-3 text-right">Jumlah Hari</th>
              <th className="px-4 py-3 text-right">Hari Libur</th>
              <th className="px-4 py-3 text-right">Hari Efektif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>
            )}
            {!isLoading && rows.map((r, idx) => (
              <tr key={r.bulan}>
                <td className="px-4 py-2 font-medium">
                  <span className="inline-block w-8 text-slate-400 font-mono text-xs">{BULAN_LABEL[r.bulan - 1]}</span>
                  <span className="ml-2">{BULAN_FULL[r.bulan - 1]}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number" min={0} max={31}
                    disabled={inputDisabled}
                    value={r.jumlah_hari}
                    onChange={(e) => updateRow(idx, { jumlah_hari: Number(e.target.value) })}
                    className="input w-20 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number" min={0} max={31}
                    disabled={inputDisabled}
                    value={r.jumlah_libur}
                    onChange={(e) => updateRow(idx, { jumlah_libur: Number(e.target.value) })}
                    className="input w-20 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <span className={`inline-block px-2 py-1 rounded font-semibold ${
                    r.hari_efektif > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {r.hari_efektif}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 text-sm font-semibold">
            <tr>
              <td className="px-4 py-3 text-slate-700">TOTAL</td>
              <td className="px-4 py-3 text-right">{totalHari}</td>
              <td className="px-4 py-3 text-right">{totalLibur}</td>
              <td className="px-4 py-3 text-right text-green-700">{totalEfektif}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {dirty
              ? <><AlertTriangle className="w-4 h-4 text-amber-500" /> <span>Ada perubahan belum tersimpan</span></>
              : data?.header
                ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span>Tersimpan</span></>
                : <span>Belum ada kalender untuk tahun ini.</span>}
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && (
              <button
                onClick={() => upsertMut.mutate()}
                disabled={upsertMut.isPending || !dirty}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {upsertMut.isPending ? 'Menyimpan...' : 'Simpan Kalender'}
              </button>
            )}
            {header && !isLocked && (
              <button
                onClick={() => { if (confirm(`Kunci kalender tahun ${tahun}? Setelah dikunci, perubahan tidak diizinkan.`)) lockMut.mutate(); }}
                disabled={lockMut.isPending || dirty}
                className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Kunci Pagu
              </button>
            )}
            {header && isLocked && (
              <button
                onClick={() => { if (confirm('Buka kunci kalender? Pagu akan bisa diubah lagi.')) unlockMut.mutate(); }}
                disabled={unlockMut.isPending}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" /> Buka Kunci
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Summary Card
// ════════════════════════════════════════════════════════════
function SummaryCard({
  label, value, suffix, color, icon, highlight,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: 'slate' | 'amber' | 'green' | 'blue' | 'primary';
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    slate:   'bg-slate-50 border-slate-200 text-slate-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    green:   'bg-green-50 border-green-200 text-green-800',
    blue:    'bg-blue-50 border-blue-200 text-blue-800',
    primary: 'bg-primary-50 border-primary-200 text-primary-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]} ${highlight ? 'ring-2 ring-primary-400 shadow-md' : ''}`}>
      <div className="flex items-center justify-between text-xs font-medium opacity-80 mb-1">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight">
        {value.toLocaleString('id-ID')}
      </p>
      {suffix && <p className="text-xs opacity-70 mt-0.5">{suffix}</p>}
    </div>
  );
}
