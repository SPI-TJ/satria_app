import { Request, Response } from 'express';
import { query } from '../../config/database';
import logger from '../../utils/logger';

// GET /api/auditors — daftar auditor aktif untuk penugasan tim
export async function getAuditors(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, nik, nama_lengkap, role, jabatan
       FROM auth.users
       WHERE role IN ('kepala_spi', 'pengendali_teknis', 'anggota_tim')
         AND is_active = TRUE
         AND deleted_at IS NULL
       ORDER BY
         CASE role
           WHEN 'kepala_spi'        THEN 1
           WHEN 'pengendali_teknis' THEN 2
           WHEN 'anggota_tim'       THEN 3
         END,
         nama_lengkap ASC`,
    );

    logger.info('[AUDITORS] Fetched auditors list');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[AUDITORS] Get auditors failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
