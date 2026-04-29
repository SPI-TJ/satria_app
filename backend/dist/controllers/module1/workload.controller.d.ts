import { Request, Response } from 'express';
/**
 * Beban Kerja Auditor (Heatmap Bulanan) — Bobot Peran × Fraksi Bulan
 * ─────────────────────────────────────────────────────────────
 * Konsep:
 *   - Bobot peran = multiplier "berat tanggung jawab":
 *       Ketua Tim   = 1.0
 *       Anggota Tim = 0.5
 *       Pengendali Teknis= 0.25  (hanya program tempat ia ditunjuk)
 *       Kepala SPI       = 0.25  (otomatis di setiap program kerja tahun tsb)
 *   - Pagu max bobot per bulan (dari master.bobot_peran.max_bobot_per_bulan,
 *     default 2.0) = berapa banyak program simultan yang sanggup ditangani.
 *   - Bobot di-skala oleh "fraksi bulan yang dikerjakan" supaya
 *     program part-time (mis. 2 hari/bulan selama setahun) tidak dianggap
 *     setara dengan program full-time.
 *
 * Formula per (auditor, program, bulan):
 *   hari_per_bulan = COALESCE(hari_alokasi, estimasi_hari) / jumlah_bulan_overlap
 *   fraksi_bulan   = LEAST(1.0, hari_per_bulan / hari_efektif_bulan)
 *   bobot_efektif  = bobot_peran × fraksi_bulan
 *
 * Aggregate per (auditor, bulan):
 *   load        = Σ bobot_efektif dari semua program yang aktif di bulan tsb
 *   utilisasi   = load / pagu_bobot_per_bulan        (0..N, > 1.0 = overwork)
 *   man_days    = Σ hari_per_bulan × bobot_peran     (untuk view "Hari")
 *
 * Contoh:
 *   - Tina Ketua, hari_alokasi=55 default, 3 bulan: 18.3/bulan; 19 hari efektif Jan
 *       fraksi=0.96 (cap 1.0) → bobot_efektif≈1.0 → utilisasi=1.0/2.0=50%
 *   - Miftah Ketua, hari_alokasi=24, 12 bulan: 2/bulan
 *       fraksi=0.105 → bobot_efektif=0.105 → utilisasi=5%
 *
 * Route : GET /api/workload?tahun=2026
 * Optional: ?user_id=... untuk data 1 auditor saja.
 */
export declare function getWorkload(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Simulasi overwork — cek beban auditor JIKA ditambah ke program baru.
 * Route: POST /api/workload/simulate
 * Body: { user_ids: string[], tanggal_mulai, tanggal_selesai, role_tim, hari_alokasi? }
 * Return: per-user monthly load sebelum & sesudah, plus flag overwork.
 */
export declare function simulateWorkload(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=workload.controller.d.ts.map