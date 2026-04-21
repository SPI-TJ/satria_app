import { Request, Response } from 'express';
import { query } from '../../config/database';

// ── GET /api/workload?tahun=2026&hari_kerja=230 ───────────────
// Mengembalikan beban kerja setiap auditor untuk tahun tertentu.
// Beban = total estimasi_hari dari semua program yang ditugaskan
//         dibagi referensi hari kerja setahun × 100%
export async function getWorkload(req: Request, res: Response) {
  try {
    const { tahun, hari_kerja = '230' } = req.query;

    if (!tahun) {
      return res.status(400).json({ success: false, message: 'Parameter tahun wajib diisi.' });
    }

    const refDays = Math.max(1, Number(hari_kerja));

    // ── Main query: 1 query dengan JSON_AGG untuk program list ──
    const result = await query(
      `SELECT
          u.id                                                         AS user_id,
          u.nik,
          u.nama_lengkap,
          u.role,
          u.jabatan,
          COUNT(DISTINCT a.id)::INT                                    AS total_program,
          COALESCE(SUM(a.estimasi_hari), 0)::INT                      AS total_hari,
          ROUND(
            COALESCE(SUM(a.estimasi_hari), 0)::NUMERIC / $2 * 100, 1
          )                                                            AS persen_beban,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',             a.id,
                'judul_program',  a.judul_program,
                'jenis_program',  a.jenis_program,
                'status_pkpt',    a.status_pkpt,
                'role_tim',       t.role_tim,
                'estimasi_hari',  a.estimasi_hari,
                'tanggal_mulai',  TO_CHAR(a.tanggal_mulai,  'YYYY-MM-DD'),
                'tanggal_selesai',TO_CHAR(a.tanggal_selesai,'YYYY-MM-DD')
              ) ORDER BY a.tanggal_mulai
            ) FILTER (WHERE a.id IS NOT NULL),
            '[]'::json
          )                                                            AS programs
       FROM auth.users u
       LEFT JOIN pkpt.annual_plan_team t
              ON t.user_id = u.id
       LEFT JOIN pkpt.annual_audit_plans a
              ON a.id = t.annual_plan_id
             AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
             AND a.deleted_at IS NULL
       WHERE u.role IN ('kepala_spi', 'pengendali_teknis', 'anggota_tim')
         AND u.is_active  = TRUE
         AND u.deleted_at IS NULL
       GROUP BY u.id, u.nik, u.nama_lengkap, u.role, u.jabatan
       ORDER BY total_hari DESC, u.nama_lengkap`,
      [Number(tahun), refDays],
    );

    // ── Ringkasan statistik ─────────────────────────────────────
    const rows = result.rows;
    const totalAuditor  = rows.length;
    const avgBeban      = totalAuditor > 0
      ? Math.round(rows.reduce((s, r) => s + Number(r.persen_beban), 0) / totalAuditor)
      : 0;
    const overloaded    = rows.filter((r) => Number(r.persen_beban) > 80).length;
    const idle          = rows.filter((r) => Number(r.persen_beban) === 0).length;
    const totalHariAll  = rows.reduce((s, r) => s + Number(r.total_hari), 0);

    return res.json({
      success: true,
      data: rows,
      summary: {
        total_auditor:    totalAuditor,
        avg_beban_persen: avgBeban,
        overloaded,
        idle,
        total_hari_all:   totalHariAll,
        ref_hari_kerja:   refDays,
        tahun:            Number(tahun),
      },
    });
  } catch (err) {
    console.error('[workload.get]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
