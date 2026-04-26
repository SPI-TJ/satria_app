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
import { query, pool } from '../../config/database';
import logger from '../../utils/logger';

const currentYear = (): number => new Date().getFullYear();

/**
 * Hitung jumlah auditor SPI aktif.
 *
 * Definisi auditor (canonical): user dengan role 'kepala_spi', 'pengendali_teknis',
 * atau 'anggota_tim' yang aktif dan tidak terhapus. Cakupan jabatan: dari Kadiv SPI
 * sampai Staff SPI / Adjunct Auditor. `admin_spi` TIDAK dihitung karena perannya
 * administratif, bukan operasional audit.
 *
 * Definisi sama dipakai di:
 *   - dashboardApi.getStats (annual-plans.controller.ts → getDashboardStats)
 *   - workloadApi.get (workload.controller.ts)
 *   - auditorsApi.getAll (auditors.controller.ts)
 */
async function countActiveAuditors(): Promise<number> {
  const r = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM auth.users
      WHERE deleted_at IS NULL
        AND is_active = TRUE
        AND role IN ('kepala_spi','pengendali_teknis','anggota_tim')`,
  );
  return Number(r.rows[0]?.count ?? 0);
}

/**
 * GET /kalender-kerja?tahun=YYYY
 *
 * Kalau belum ada kalender utk tahun tsb → return template default (12 bulan dgn jumlah_hari per bulan auto)
 * supaya frontend bisa langsung tampil tabel kosong.
 */
export async function getKalenderKerja(req: Request, res: Response) {
  try {
    const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();

    const head = await query(
      `SELECT k.id, k.tahun, k.jumlah_auditor_snapshot, k.total_hari_efektif,
              k.hari_pemeriksaan_tersedia, k.locked_at, k.locked_by,
              k.keterangan, k.created_by, k.created_at, k.updated_at,
              u.nama_lengkap AS locked_by_nama
         FROM pkpt.kalender_kerja k
         LEFT JOIN auth.users u ON u.id = k.locked_by
        WHERE k.tahun = $1 AND k.deleted_at IS NULL`,
      [tahun],
    );

    const auditorCount = await countActiveAuditors();

    if (head.rows.length === 0) {
      // Template default — 12 bulan kosong (frontend akan minta user isi)
      const template = Array.from({ length: 12 }, (_, i) => ({
        bulan: i + 1,
        jumlah_hari: 0,
        jumlah_libur: 0,
        hari_efektif: 0,
        catatan: null,
      }));
      return res.json({
        success: true,
        data: {
          header: null,
          bulan: template,
          auditor_count_now: auditorCount,
        },
        meta: { tahun, exists: false },
      });
    }

    const id = head.rows[0].id;
    const bulanRes = await query(
      `SELECT id, kalender_id, bulan, jumlah_hari, jumlah_libur, hari_efektif, catatan
         FROM pkpt.kalender_kerja_bulan
        WHERE kalender_id = $1
        ORDER BY bulan`,
      [id],
    );

    return res.json({
      success: true,
      data: {
        header: head.rows[0],
        bulan: bulanRes.rows,
        auditor_count_now: auditorCount,
      },
      meta: { tahun, exists: true },
    });
  } catch (err) {
    logger.error(`[KALENDER] get failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * PUT /kalender-kerja
 * Body: { tahun, keterangan?, bulan: [{ bulan, jumlah_hari, jumlah_libur, catatan? }] }
 *
 * Upsert: kalau header sudah ada → update; kalau belum → create.
 * 12 bulan akan di-replace (delete-then-insert untuk konsistensi).
 * Tidak boleh diubah jika sudah locked.
 */
export async function upsertKalenderKerja(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const tahun = Number(req.body.tahun ?? currentYear());
    const keterangan: string | null = req.body.keterangan ?? null;
    const bulanList: Array<{
      bulan: number; jumlah_hari: number; jumlah_libur: number; catatan?: string | null;
    }> = req.body.bulan ?? [];

    if (!Array.isArray(bulanList) || bulanList.length !== 12) {
      return res.status(400).json({ success: false, message: 'Body wajib berisi 12 baris bulan.' });
    }

    await client.query('BEGIN');

    // Cek lock status
    const existing = await client.query(
      `SELECT id, locked_at FROM pkpt.kalender_kerja
        WHERE tahun = $1 AND deleted_at IS NULL`,
      [tahun],
    );
    if (existing.rows[0]?.locked_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Kalender sudah dikunci. Buka kunci terlebih dahulu sebelum mengubah.',
      });
    }

    // Hitung agregat
    const totalEfektif = bulanList.reduce(
      (s, b) => s + Math.max((b.jumlah_hari ?? 0) - (b.jumlah_libur ?? 0), 0), 0,
    );
    const auditorCount = await countActiveAuditors();
    const pagu = totalEfektif * auditorCount;

    let kalenderId: string;
    if (existing.rows.length > 0) {
      kalenderId = existing.rows[0].id;
      await client.query(
        `UPDATE pkpt.kalender_kerja
            SET jumlah_auditor_snapshot   = $2,
                total_hari_efektif        = $3,
                hari_pemeriksaan_tersedia = $4,
                keterangan                = COALESCE($5, keterangan),
                updated_at                = NOW()
          WHERE id = $1`,
        [kalenderId, auditorCount, totalEfektif, pagu, keterangan],
      );
      await client.query('DELETE FROM pkpt.kalender_kerja_bulan WHERE kalender_id = $1', [kalenderId]);
    } else {
      const ins = await client.query<{ id: string }>(
        `INSERT INTO pkpt.kalender_kerja
           (tahun, jumlah_auditor_snapshot, total_hari_efektif, hari_pemeriksaan_tersedia,
            keterangan, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [tahun, auditorCount, totalEfektif, pagu, keterangan, req.user!.id],
      );
      kalenderId = ins.rows[0].id;
    }

    // Insert 12 bulan
    for (const b of bulanList) {
      await client.query(
        `INSERT INTO pkpt.kalender_kerja_bulan (kalender_id, bulan, jumlah_hari, jumlah_libur, catatan)
         VALUES ($1,$2,$3,$4,$5)`,
        [kalenderId, b.bulan, b.jumlah_hari ?? 0, b.jumlah_libur ?? 0, b.catatan ?? null],
      );
    }

    await client.query('COMMIT');
    logger.info('[KALENDER] upserted', { tahun, kalenderId, totalEfektif, pagu, by: req.user!.id });

    // Return latest
    const head = await query(
      `SELECT * FROM pkpt.kalender_kerja WHERE id = $1`, [kalenderId],
    );
    const bulan = await query(
      `SELECT id, kalender_id, bulan, jumlah_hari, jumlah_libur, hari_efektif, catatan
         FROM pkpt.kalender_kerja_bulan WHERE kalender_id = $1 ORDER BY bulan`,
      [kalenderId],
    );

    return res.json({
      success: true,
      data: { header: head.rows[0], bulan: bulan.rows, auditor_count_now: auditorCount },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error(`[KALENDER] upsert failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
}

export async function lockKalenderKerja(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE pkpt.kalender_kerja
          SET locked_at = NOW(), locked_by = $2, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL AND locked_at IS NULL
        RETURNING *`,
      [id, req.user!.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kalender tidak ditemukan atau sudah terkunci.' });
    }
    logger.info('[KALENDER] locked', { id, by: req.user!.id });
    return res.json({ success: true, data: result.rows[0], message: 'Kalender dikunci. Pagu Man-Days terkunci untuk tahun ini.' });
  } catch (err) {
    logger.error(`[KALENDER] lock failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function unlockKalenderKerja(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE pkpt.kalender_kerja
          SET locked_at = NULL, locked_by = NULL, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kalender tidak ditemukan.' });
    }
    logger.info('[KALENDER] unlocked', { id, by: req.user!.id });
    return res.json({ success: true, data: result.rows[0], message: 'Kunci kalender dibuka.' });
  } catch (err) {
    logger.error(`[KALENDER] unlock failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
