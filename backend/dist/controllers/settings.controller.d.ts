/**
 * Pengaturan Sistem — Master Data Modul 1 Enhancement
 *
 * Mencakup 4 master:
 *   1. House of Strategy Kategori (perspektif BSC per tahun)
 *   2. Sasaran Strategis (child HoS — bisa di-CRUD seluruh user SPI)
 *   3. Bobot Peran Audit (per tahun, untuk hitung Man-Days)
 *   4. Tipe Penugasan (sub-kategori Audit/Review/Evaluasi/dst)
 *
 * Access Policy:
 *   - GET (read)   : semua authenticated user
 *   - POST/PATCH/DELETE :
 *       · HoS Kategori, Bobot Peran, Tipe Penugasan → kepala_spi, admin_spi
 *       · Sasaran Strategis → semua SPI (kepala_spi, admin_spi,
 *                                pengendali_teknis, anggota_tim)
 */
import { Request, Response } from 'express';
export declare function getHosKategoris(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createHosKategori(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateHosKategori(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteHosKategori(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSasaranStrategis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createSasaranStrategis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateSasaranStrategis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteSasaranStrategis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getBobotPeran(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Upsert bobot per tahun (mass update).
 * Body: { tahun, items: [{ peran, bobot, max_bobot_per_bulan }] }
 */
export declare function upsertBobotPeran(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getKelompokPenugasan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createKelompokPenugasan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateKelompokPenugasan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteKelompokPenugasan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=settings.controller.d.ts.map