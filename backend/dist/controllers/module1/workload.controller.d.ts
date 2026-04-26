import { Request, Response } from 'express';
/**
 * Beban Kerja Auditor (Heatmap Bulanan)
 * ─────────────────────────────────────────────────────────────
 * Logika:
 * - Bobot per role_tim di program:
 *     Ketua Tim   = 1.0
 *     Anggota Tim = 0.5
 *     Pengendali Teknis / Penanggung Jawab = 0 (tidak dihitung)
 * - Untuk tiap bulan (1..12) dalam `tahun`, load auditor =
 *     Σ bobot dari program yang aktif di bulan tsb (overlap range).
 * - monthly_load > 1.0 → overwork (highlight merah).
 * - Kadiv / Kepala Departemen tidak ikut dihitung (jabatan struktural).
 *
 * Route : GET /api/workload?tahun=2026
 * Optional: ?user_id=... untuk data 1 auditor saja (dipakai saat cek overwork
 *           sebelum assign ke program baru).
 */
export declare function getWorkload(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Simulasi overwork — cek beban auditor JIKA ditambah ke program baru.
 * Route: POST /api/workload/simulate
 * Body: { user_ids: string[], tanggal_mulai, tanggal_selesai, role_tim }
 * Return: per-user monthly load sebelum & sesudah, plus flag overwork.
 */
export declare function simulateWorkload(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=workload.controller.d.ts.map