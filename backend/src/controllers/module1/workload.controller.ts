import { Request, Response } from 'express';
import { query } from '../../config/database';
import logger from '../../utils/logger';

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
export async function getWorkload(req: Request, res: Response) {
  try {
    const { tahun, user_id } = req.query;

    if (!tahun) {
      return res.status(400).json({ success: false, message: 'Parameter tahun wajib diisi.' });
    }

    const tahunNum = Number(tahun);
    if (!Number.isFinite(tahunNum)) {
      return res.status(400).json({ success: false, message: 'Parameter tahun harus angka.' });
    }

    // Query: untuk tiap user + bulan, hitung total bobot.
    // Definisi auditor canonical: role kepala_spi/pengendali_teknis/anggota_tim
    // (semua jabatan dari Kadiv SPI s.d. Staff SPI / Adjunct Auditor masuk hitungan).
    // admin_spi tidak dihitung karena fungsinya administratif.
    const sql = `
      WITH months AS (
        SELECT generate_series(1, 12) AS m
      ),
      auditors AS (
        SELECT u.id, u.nik, u.nama_lengkap, u.role, u.jabatan
        FROM auth.users u
        WHERE u.role IN ('kepala_spi', 'pengendali_teknis', 'anggota_tim')
          AND u.is_active  = TRUE
          AND u.deleted_at IS NULL
          ${user_id ? 'AND u.id = $2' : ''}
      ),
      programs AS (
        SELECT
          a.id,
          a.judul_program,
          a.jenis_program,
          a.status_pkpt,
          a.tanggal_mulai,
          a.tanggal_selesai,
          t.user_id,
          t.role_tim,
          CASE t.role_tim
            WHEN 'Ketua Tim'    THEN 1.0
            WHEN 'Anggota Tim'  THEN 0.5
            ELSE 0
          END AS bobot
        FROM pkpt.annual_plan_team t
        JOIN pkpt.annual_audit_plans a ON a.id = t.annual_plan_id
        WHERE a.deleted_at IS NULL
          AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
          AND t.role_tim IN ('Ketua Tim', 'Anggota Tim')
      ),
      matrix AS (
        SELECT
          au.id          AS user_id,
          au.nik,
          au.nama_lengkap,
          au.role,
          au.jabatan,
          m.m            AS bulan,
          COALESCE(SUM(p.bobot) FILTER (
            WHERE p.tanggal_mulai <= make_date($1::int, m.m, 1) + INTERVAL '1 month' - INTERVAL '1 day'
              AND p.tanggal_selesai >= make_date($1::int, m.m, 1)
          ), 0)::NUMERIC(4,2) AS load
        FROM auditors au
        CROSS JOIN months m
        LEFT JOIN programs p ON p.user_id = au.id
        GROUP BY au.id, au.nik, au.nama_lengkap, au.role, au.jabatan, m.m
      )
      SELECT
        user_id, nik, nama_lengkap, role, jabatan,
        JSON_OBJECT_AGG(bulan, load) AS monthly_load,
        ROUND(AVG(load), 2)           AS avg_load,
        MAX(load)                     AS max_load,
        COUNT(*) FILTER (WHERE load > 1.0)::INT AS overwork_months
      FROM matrix
      GROUP BY user_id, nik, nama_lengkap, role, jabatan
      ORDER BY max_load DESC, nama_lengkap
    `;

    const params: unknown[] = [tahunNum];
    if (user_id) params.push(user_id);

    const result = await query<{
      user_id: string; nik: string; nama_lengkap: string; role: string; jabatan: string | null;
      monthly_load: Record<string, number>; avg_load: number; max_load: number; overwork_months: number;
    }>(sql, params);

    // Program list per user (supaya UI bisa drill-down)
    const programsList = await query(
      `SELECT
          t.user_id,
          a.id,
          a.judul_program,
          a.jenis_program,
          a.status_pkpt,
          t.role_tim,
          TO_CHAR(a.tanggal_mulai,   'YYYY-MM-DD') AS tanggal_mulai,
          TO_CHAR(a.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
          CASE t.role_tim
            WHEN 'Ketua Tim'   THEN 1.0
            WHEN 'Anggota Tim' THEN 0.5
            ELSE 0
          END AS bobot
       FROM pkpt.annual_plan_team t
       JOIN pkpt.annual_audit_plans a ON a.id = t.annual_plan_id
       WHERE a.deleted_at IS NULL
         AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
         AND t.role_tim IN ('Ketua Tim', 'Anggota Tim')
         ${user_id ? 'AND t.user_id = $2' : ''}
       ORDER BY a.tanggal_mulai`,
      user_id ? [tahunNum, user_id] : [tahunNum],
    );

    // Attach programs to each row
    const rows = result.rows.map((r) => ({
      ...r,
      programs: programsList.rows.filter((p) => p.user_id === r.user_id),
    }));

    // Summary
    const totalAuditor   = rows.length;
    const avgLoad        = totalAuditor > 0
      ? Number((rows.reduce((s, r) => s + Number(r.avg_load), 0) / totalAuditor).toFixed(2))
      : 0;
    const overworkCount  = rows.filter((r) => Number(r.max_load) > 1.0).length;
    const idleCount      = rows.filter((r) => Number(r.max_load) === 0).length;

    logger.info('[WORKLOAD] getWorkload executed', { tahun: tahunNum, totalAuditor, avgLoad, overworkCount, idleCount });
    return res.json({
      success: true,
      data: rows,
      summary: {
        total_auditor: totalAuditor,
        avg_load:      avgLoad,
        overwork:      overworkCount,
        idle:          idleCount,
        tahun:         tahunNum,
      },
    });
  } catch (err) {
    logger.error(`[WORKLOAD] getWorkload failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

/**
 * Simulasi overwork — cek beban auditor JIKA ditambah ke program baru.
 * Route: POST /api/workload/simulate
 * Body: { user_ids: string[], tanggal_mulai, tanggal_selesai, role_tim }
 * Return: per-user monthly load sebelum & sesudah, plus flag overwork.
 */
export async function simulateWorkload(req: Request, res: Response) {
  try {
    const { user_ids, tanggal_mulai, tanggal_selesai, role_tim } = req.body as {
      user_ids: string[];
      tanggal_mulai: string;
      tanggal_selesai: string;
      role_tim: string;
    };

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'user_ids wajib diisi.' });
    }
    if (!tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ success: false, message: 'tanggal_mulai & tanggal_selesai wajib diisi.' });
    }

    const bobotAdd = role_tim === 'Ketua Tim' ? 1.0 : role_tim === 'Anggota Tim' ? 0.5 : 0;
    const tahun = new Date(tanggal_mulai).getFullYear();

    // Hitung load existing per user per bulan
    const existing = await query<{ user_id: string; bulan: number; load: number }>(
      `WITH months AS (SELECT generate_series(1,12) AS m),
       programs AS (
         SELECT t.user_id, a.tanggal_mulai, a.tanggal_selesai,
                CASE t.role_tim WHEN 'Ketua Tim' THEN 1.0 WHEN 'Anggota Tim' THEN 0.5 ELSE 0 END AS bobot
         FROM pkpt.annual_plan_team t
         JOIN pkpt.annual_audit_plans a ON a.id = t.annual_plan_id
         WHERE a.deleted_at IS NULL
           AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
           AND t.user_id = ANY($2::uuid[])
           AND t.role_tim IN ('Ketua Tim','Anggota Tim')
       )
       SELECT p.user_id, m.m AS bulan,
         COALESCE(SUM(p.bobot) FILTER (
           WHERE p.tanggal_mulai <= make_date($1::int, m.m, 1) + INTERVAL '1 month' - INTERVAL '1 day'
             AND p.tanggal_selesai >= make_date($1::int, m.m, 1)
         ), 0)::NUMERIC(4,2) AS load
       FROM (SELECT unnest($2::uuid[]) AS user_id) p
       CROSS JOIN months m
       LEFT JOIN programs p2 ON p2.user_id = p.user_id
       GROUP BY p.user_id, m.m`,
      [tahun, user_ids],
    );

    // Build result per user
    const result = user_ids.map((uid) => {
      const currentMap: Record<number, number> = {};
      for (let i = 1; i <= 12; i++) currentMap[i] = 0;
      existing.rows.filter((r) => r.user_id === uid).forEach((r) => {
        currentMap[r.bulan] = Number(r.load);
      });

      // Bulan yang overlap program baru
      const start = new Date(tanggal_mulai);
      const end   = new Date(tanggal_selesai);
      const afterMap: Record<number, number> = { ...currentMap };
      for (let m = 1; m <= 12; m++) {
        const firstDay = new Date(tahun, m - 1, 1);
        const lastDay  = new Date(tahun, m, 0);
        if (start <= lastDay && end >= firstDay) {
          afterMap[m] = Number((afterMap[m] + bobotAdd).toFixed(2));
        }
      }

      const overworkMonths = Object.entries(afterMap)
        .filter(([, v]) => v > 1.0)
        .map(([k]) => Number(k));

      return {
        user_id: uid,
        current: currentMap,
        after: afterMap,
        overwork_months: overworkMonths,
        is_overwork: overworkMonths.length > 0,
      };
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[WORKLOAD] simulateWorkload failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
