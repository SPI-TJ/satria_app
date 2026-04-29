/**
 * Kalender Kerja & Man-Days
 *
 * Page Man-Days = kalkulator pagu Man-Days tahunan.
 * Output: jumlah hari pemeriksaan tersedia (HP × jumlah auditor SPI).
 *
 * Endpoints:
 *   GET    /kalender-kerja?tahun=YYYY      → ambil kalender + 12 bulan
 *   PUT    /kalender-kerja                 → upsert kalender + replace 12 bulan
 *   POST   /kalender-kerja/:id/lock        → kunci pagu (Kepala SPI)
 *   POST   /kalender-kerja/:id/unlock      → buka kunci (Kepala SPI)
 */
import { Request, Response } from 'express';
/**
 * GET /kalender-kerja?tahun=YYYY
 *
 * Kalau belum ada kalender utk tahun tsb → return template default (12 bulan dgn jumlah_hari per bulan auto)
 * supaya frontend bisa langsung tampil tabel kosong.
 */
export declare function getKalenderKerja(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /kalender-kerja
 * Body: { tahun, keterangan?, bulan: [{ bulan, jumlah_hari, jumlah_libur, catatan? }] }
 *
 * Upsert: kalau header sudah ada → update; kalau belum → create.
 * 12 bulan akan di-replace (delete-then-insert untuk konsistensi).
 * Tidak boleh diubah jika sudah locked.
 */
export declare function upsertKalenderKerja(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function lockKalenderKerja(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function unlockKalenderKerja(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=kalender-kerja.controller.d.ts.map