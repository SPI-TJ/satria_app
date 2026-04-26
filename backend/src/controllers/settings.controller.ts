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
import { query } from '../config/database';
import logger from '../utils/logger';

const currentYear = (): number => new Date().getFullYear();

// ════════════════════════════════════════════════════════════
//  1. HOUSE OF STRATEGY — KATEGORI (Perspektif)
// ════════════════════════════════════════════════════════════

export async function getHosKategoris(req: Request, res: Response) {
  try {
    const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();
    const result = await query(
      `SELECT id, tahun, kode, nama_perspektif, deskripsi, urutan,
              created_at, updated_at
         FROM master.house_of_strategy_kategori
        WHERE deleted_at IS NULL AND tahun = $1
        ORDER BY urutan, kode`,
      [tahun],
    );
    return res.json({ success: true, data: result.rows, meta: { tahun } });
  } catch (err) {
    logger.error(`[SETTINGS] HoS list failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createHosKategori(req: Request, res: Response) {
  try {
    const { tahun, kode, nama_perspektif, deskripsi, urutan } = req.body;
    if (!kode || !nama_perspektif) {
      return res.status(400).json({ success: false, message: 'Kode dan nama wajib diisi.' });
    }
    const result = await query(
      `INSERT INTO master.house_of_strategy_kategori
         (tahun, kode, nama_perspektif, deskripsi, urutan)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [tahun ?? currentYear(), kode, nama_perspektif, deskripsi ?? null, urutan ?? 0],
    );
    logger.info('[SETTINGS] HoS kategori created', { id: result.rows[0].id, by: req.user!.id });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('uq_hos_kategori')) {
      return res.status(409).json({ success: false, message: 'Kode sudah ada untuk tahun tersebut.' });
    }
    logger.error(`[SETTINGS] HoS create failed: ${msg}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateHosKategori(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { kode, nama_perspektif, deskripsi, urutan } = req.body;
    const result = await query(
      `UPDATE master.house_of_strategy_kategori
          SET kode            = COALESCE($2, kode),
              nama_perspektif = COALESCE($3, nama_perspektif),
              deskripsi       = COALESCE($4, deskripsi),
              urutan          = COALESCE($5, urutan),
              updated_at      = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id, kode, nama_perspektif, deskripsi, urutan],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[SETTINGS] HoS update failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteHosKategori(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE master.house_of_strategy_kategori
          SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    logger.info('[SETTINGS] HoS kategori deleted', { id, by: req.user!.id });
    return res.json({ success: true, message: 'Kategori dihapus.' });
  } catch (err) {
    logger.error(`[SETTINGS] HoS delete failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════════════
//  2. SASARAN STRATEGIS (Child of HoS Kategori)
// ════════════════════════════════════════════════════════════

export async function getSasaranStrategis(req: Request, res: Response) {
  try {
    const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();
    const { kategori_id, search } = req.query;
    const params: unknown[] = [tahun];
    const conds: string[] = ['s.deleted_at IS NULL', 's.tahun = $1'];

    if (kategori_id) {
      params.push(kategori_id);
      conds.push(`s.kategori_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(s.nama ILIKE $${params.length} OR s.kode ILIKE $${params.length})`);
    }

    const result = await query(
      `SELECT s.id, s.kategori_id, s.tahun, s.kode, s.nama, s.deskripsi,
              s.created_by, u.nama_lengkap AS created_by_nama,
              k.kode AS kategori_kode, k.nama_perspektif AS kategori_nama,
              s.created_at, s.updated_at
         FROM master.sasaran_strategis s
         LEFT JOIN master.house_of_strategy_kategori k ON k.id = s.kategori_id
         LEFT JOIN auth.users u ON u.id = s.created_by
        WHERE ${conds.join(' AND ')}
        ORDER BY k.urutan NULLS LAST, s.kode NULLS LAST, s.nama`,
      params,
    );
    return res.json({ success: true, data: result.rows, meta: { tahun } });
  } catch (err) {
    logger.error(`[SETTINGS] Sasaran list failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createSasaranStrategis(req: Request, res: Response) {
  try {
    const { kategori_id, tahun, kode, nama, deskripsi } = req.body;
    if (!kategori_id || !nama) {
      return res.status(400).json({ success: false, message: 'Kategori dan nama wajib diisi.' });
    }
    // Auto-derive tahun dari kategori jika tidak dikirim
    let finalTahun = tahun;
    if (!finalTahun) {
      const k = await query<{ tahun: number }>(
        `SELECT tahun FROM master.house_of_strategy_kategori WHERE id = $1`,
        [kategori_id],
      );
      finalTahun = k.rows[0]?.tahun ?? currentYear();
    }
    const result = await query(
      `INSERT INTO master.sasaran_strategis
         (kategori_id, tahun, kode, nama, deskripsi, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [kategori_id, finalTahun, kode ?? null, nama, deskripsi ?? null, req.user!.id],
    );
    logger.info('[SETTINGS] Sasaran strategis created', { id: result.rows[0].id, by: req.user!.id });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[SETTINGS] Sasaran create failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateSasaranStrategis(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { kode, nama, deskripsi, kategori_id } = req.body;
    const result = await query(
      `UPDATE master.sasaran_strategis
          SET kategori_id = COALESCE($2, kategori_id),
              kode        = COALESCE($3, kode),
              nama        = COALESCE($4, nama),
              deskripsi   = COALESCE($5, deskripsi),
              updated_at  = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id, kategori_id, kode, nama, deskripsi],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sasaran tidak ditemukan.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[SETTINGS] Sasaran update failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteSasaranStrategis(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE master.sasaran_strategis SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    logger.info('[SETTINGS] Sasaran deleted', { id, by: req.user!.id });
    return res.json({ success: true, message: 'Sasaran strategis dihapus.' });
  } catch (err) {
    logger.error(`[SETTINGS] Sasaran delete failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════════════
//  3. BOBOT PERAN (per tahun)
// ════════════════════════════════════════════════════════════

export async function getBobotPeran(req: Request, res: Response) {
  try {
    const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();
    const result = await query(
      `SELECT id, tahun, peran, bobot, max_bobot_per_bulan, keterangan,
              created_at, updated_at
         FROM master.bobot_peran
        WHERE deleted_at IS NULL AND tahun = $1
        ORDER BY CASE peran
                   WHEN 'Penanggung Jawab'  THEN 1
                   WHEN 'Pengendali Teknis' THEN 2
                   WHEN 'Ketua Tim'         THEN 3
                   WHEN 'Anggota Tim'       THEN 4
                   ELSE 99
                 END`,
      [tahun],
    );
    return res.json({ success: true, data: result.rows, meta: { tahun } });
  } catch (err) {
    logger.error(`[SETTINGS] Bobot list failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Upsert bobot per tahun (mass update).
 * Body: { tahun, items: [{ peran, bobot, max_bobot_per_bulan }] }
 */
export async function upsertBobotPeran(req: Request, res: Response) {
  try {
    const tahun = Number(req.body.tahun ?? currentYear());
    const items: Array<{ peran: string; bobot: number; max_bobot_per_bulan: number }> =
      req.body.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items wajib diisi (array).' });
    }
    for (const it of items) {
      await query(
        `INSERT INTO master.bobot_peran (tahun, peran, bobot, max_bobot_per_bulan)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tahun, peran)
         DO UPDATE SET bobot = EXCLUDED.bobot,
                       max_bobot_per_bulan = EXCLUDED.max_bobot_per_bulan,
                       updated_at = NOW()`,
        [tahun, it.peran, it.bobot, it.max_bobot_per_bulan],
      );
    }
    logger.info('[SETTINGS] Bobot peran upserted', { tahun, count: items.length, by: req.user!.id });
    const result = await query(
      `SELECT * FROM master.bobot_peran
        WHERE tahun = $1 AND deleted_at IS NULL
        ORDER BY peran`,
      [tahun],
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[SETTINGS] Bobot upsert failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════════════
//  4. TIPE PENUGASAN
// ════════════════════════════════════════════════════════════

export async function getTipePenugasan(req: Request, res: Response) {
  try {
    const { kategori_program } = req.query;
    const params: unknown[] = [];
    const conds: string[] = ['deleted_at IS NULL', 'is_active = TRUE'];

    if (kategori_program) {
      params.push(kategori_program);
      conds.push(`kategori_program = $${params.length}`);
    }
    const result = await query(
      `SELECT id, kategori_program, kode, nama, deskripsi, default_hari, urutan, is_active,
              created_at, updated_at
         FROM master.tipe_penugasan
        WHERE ${conds.join(' AND ')}
        ORDER BY kategori_program, urutan, kode`,
      params,
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[SETTINGS] Tipe list failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createTipePenugasan(req: Request, res: Response) {
  try {
    const { kategori_program, kode, nama, deskripsi, default_hari, urutan } = req.body;
    if (!kategori_program || !kode || !nama) {
      return res.status(400).json({ success: false, message: 'kategori_program, kode, nama wajib diisi.' });
    }
    const result = await query(
      `INSERT INTO master.tipe_penugasan
         (kategori_program, kode, nama, deskripsi, default_hari, urutan)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [kategori_program, kode, nama, deskripsi ?? null, default_hari ?? null, urutan ?? 0],
    );
    logger.info('[SETTINGS] Tipe penugasan created', { id: result.rows[0].id, by: req.user!.id });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('uq_tipe_penugasan')) {
      return res.status(409).json({ success: false, message: 'Kode sudah ada di kategori tersebut.' });
    }
    logger.error(`[SETTINGS] Tipe create failed: ${msg}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateTipePenugasan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { kode, nama, deskripsi, default_hari, urutan, is_active } = req.body;
    const result = await query(
      `UPDATE master.tipe_penugasan
          SET kode         = COALESCE($2, kode),
              nama         = COALESCE($3, nama),
              deskripsi    = COALESCE($4, deskripsi),
              default_hari = COALESCE($5, default_hari),
              urutan       = COALESCE($6, urutan),
              is_active    = COALESCE($7, is_active),
              updated_at   = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id, kode, nama, deskripsi, default_hari, urutan, is_active],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tipe penugasan tidak ditemukan.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[SETTINGS] Tipe update failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteTipePenugasan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE master.tipe_penugasan SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    logger.info('[SETTINGS] Tipe penugasan deleted', { id, by: req.user!.id });
    return res.json({ success: true, message: 'Tipe penugasan dihapus.' });
  } catch (err) {
    logger.error(`[SETTINGS] Tipe delete failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
