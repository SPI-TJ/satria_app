import { Request, Response } from 'express';
import { query } from '../../config/database';
import logger from '../../utils/logger';

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
      -- Kapasitas hari efektif tiap bulan dari kalender kerja (fallback 20)
      kapasitas AS (
        SELECT m.m AS bulan,
               COALESCE(MAX(kkb.hari_efektif), 20)::NUMERIC AS hari_efektif
        FROM months m
        LEFT JOIN pkpt.kalender_kerja kk
               ON kk.tahun = $1 AND kk.deleted_at IS NULL
        LEFT JOIN pkpt.kalender_kerja_bulan kkb
               ON kkb.kalender_id = kk.id AND kkb.bulan = m.m
        GROUP BY m.m
      ),
      -- Bobot peran tahun berjalan dari master (fallback 0 kalau master kosong)
      bp AS (
        SELECT peran, bobot::NUMERIC
        FROM master.bobot_peran
        WHERE tahun = $1 AND deleted_at IS NULL
      ),
      -- Per (user, program): hari_per_bulan + bobot dari master
      assignments AS (
        SELECT
          t.user_id,
          a.id            AS plan_id,
          a.tanggal_mulai,
          a.tanggal_selesai,
          COALESCE(t.hari_alokasi, a.estimasi_hari)::NUMERIC AS hari_total,
          GREATEST(1,
            ((EXTRACT(YEAR  FROM a.tanggal_selesai) - EXTRACT(YEAR  FROM a.tanggal_mulai)) * 12
           +  (EXTRACT(MONTH FROM a.tanggal_selesai) - EXTRACT(MONTH FROM a.tanggal_mulai)) + 1)::INT
          ) AS bulan_overlap,
          COALESCE(bp.bobot, 0)::NUMERIC AS bobot
        FROM pkpt.annual_plan_team t
        JOIN pkpt.annual_audit_plans a ON a.id = t.annual_plan_id
        LEFT JOIN bp ON bp.peran = t.role_tim::TEXT
        WHERE a.deleted_at IS NULL
          AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
          AND t.role_tim IN ('Pengendali Teknis', 'Ketua Tim', 'Anggota Tim')
        UNION ALL
        -- Kepala SPI otomatis terlibat di semua program kerja tahun tsb.
        -- Bobot mengikuti master.bobot_peran (peran = 'Penanggung Jawab').
        -- Pengendali Teknis tidak ikut auto-attach — harus dari penunjukan tim.
        SELECT
          u.id            AS user_id,
          a.id            AS plan_id,
          a.tanggal_mulai,
          a.tanggal_selesai,
          a.estimasi_hari::NUMERIC AS hari_total,
          GREATEST(1,
            ((EXTRACT(YEAR  FROM a.tanggal_selesai) - EXTRACT(YEAR  FROM a.tanggal_mulai)) * 12
           +  (EXTRACT(MONTH FROM a.tanggal_selesai) - EXTRACT(MONTH FROM a.tanggal_mulai)) + 1)::INT
          ) AS bulan_overlap,
          COALESCE((SELECT bobot FROM bp WHERE peran = 'Penanggung Jawab'), 0)::NUMERIC AS bobot
        FROM pkpt.annual_audit_plans a
        CROSS JOIN auth.users u
        WHERE a.deleted_at IS NULL
          AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
          AND u.role       = 'kepala_spi'
          AND u.is_active  = TRUE
          AND u.deleted_at IS NULL
      ),
      -- Kontribusi per (user, program, bulan) — hanya bulan-bulan overlap
      contrib AS (
        SELECT
          asg.user_id,
          m.m AS bulan,
          k.hari_efektif,
          -- hari kerja program ini di bulan ini (rata)
          (asg.hari_total / asg.bulan_overlap) AS hari_per_bulan,
          -- fraksi bulan yang dikerjakan, cap di 1.0
          LEAST(1.0,
            CASE WHEN k.hari_efektif > 0
              THEN (asg.hari_total / asg.bulan_overlap) / k.hari_efektif
              ELSE 0 END
          ) AS fraksi_bulan,
          asg.bobot
        FROM assignments asg
        CROSS JOIN months m
        JOIN kapasitas k ON k.bulan = m.m
        WHERE asg.tanggal_mulai   <= make_date($1::int, m.m, 1) + INTERVAL '1 month' - INTERVAL '1 day'
          AND asg.tanggal_selesai >= make_date($1::int, m.m, 1)
      ),
      matrix AS (
        SELECT
          au.id          AS user_id,
          au.nik,
          au.nama_lengkap,
          au.role,
          au.jabatan,
          m.m            AS bulan,
          -- load = Σ (bobot × fraksi_bulan)  — satuan "bobot"
          COALESCE(SUM(c.bobot * c.fraksi_bulan), 0)::NUMERIC(6,3) AS load_bobot,
          -- man-days display = Σ (hari_per_bulan × bobot)
          COALESCE(SUM(c.hari_per_bulan * c.bobot), 0)::NUMERIC(8,2) AS man_days
        FROM auditors au
        CROSS JOIN months m
        LEFT JOIN contrib c ON c.user_id = au.id AND c.bulan = m.m
        GROUP BY au.id, au.nik, au.nama_lengkap, au.role, au.jabatan, m.m
      )
      SELECT
        user_id, nik, nama_lengkap, role, jabatan,
        JSON_OBJECT_AGG(bulan, load_bobot)  AS monthly_load,
        JSON_OBJECT_AGG(bulan, man_days)    AS monthly_mandays,
        ROUND(AVG(load_bobot), 3)           AS avg_load,
        MAX(load_bobot)                     AS max_load,
        0::INT                              AS overwork_months
      FROM matrix
      GROUP BY user_id, nik, nama_lengkap, role, jabatan
      ORDER BY max_load DESC, nama_lengkap
    `;

    const params: unknown[] = [tahunNum];
    if (user_id) params.push(user_id);

    const result = await query<{
      user_id: string; nik: string; nama_lengkap: string; role: string; jabatan: string | null;
      monthly_load: Record<string, number>;     // satuan bobot (0..N); 1.0 = handle 1 program Ketua full-bulan
      monthly_mandays: Record<string, number>;  // man-days alokasi per bulan (untuk view "Hari")
      avg_load: number; max_load: number; overwork_months: number;
    }>(sql, params);

    // Lookup bobot peran + pagu max bobot per bulan dari master
    const masterRes = await query<{ peran: string; bobot: string; max_bobot: string }>(
      `SELECT peran, bobot::TEXT, max_bobot_per_bulan::TEXT AS max_bobot
       FROM master.bobot_peran
       WHERE tahun = $1 AND deleted_at IS NULL`,
      [tahunNum],
    );
    const bobotMap: Record<string, number> = {};
    let paguBobot = 2.0;
    masterRes.rows.forEach((r) => {
      bobotMap[r.peran] = Number(r.bobot);
      const mp = Number(r.max_bobot);
      if (Number.isFinite(mp) && mp > paguBobot) paguBobot = mp;
    });
    if (masterRes.rows.length === 0) paguBobot = 2.0;

    // Recompute overwork_months di JS karena backend SQL pakai placeholder 0
    result.rows.forEach((r) => {
      const months = Object.values(r.monthly_load ?? {}).map(Number);
      r.overwork_months = months.filter((v) => v > paguBobot).length;
    });

    // Kapasitas man-days tahun = total hari efektif kalender (per orang)
    // Fallback ke 240 (≈ 20 hari × 12 bulan) kalau kalender belum di-set.
    const kapRes = await query<{ total: string | null }>(
      `SELECT COALESCE(SUM(kkb.hari_efektif), 0)::TEXT AS total
       FROM pkpt.kalender_kerja kk
       JOIN pkpt.kalender_kerja_bulan kkb ON kkb.kalender_id = kk.id
       WHERE kk.tahun = $1 AND kk.deleted_at IS NULL`,
      [tahunNum],
    );
    const kapasitasMandays = Number(kapRes.rows[0]?.total ?? 0) || 240;

    // Program list per user (supaya UI bisa drill-down).
    // Setiap baris membawa hari_alokasi (atau estimasi_hari) + mandays = hari × bobot.
    const programsList = await query<{
      user_id: string; id: string; judul_program: string; jenis_program: string; status_pkpt: string;
      role_tim: string; tanggal_mulai: string; tanggal_selesai: string;
      bobot: string; hari_alokasi: string; mandays: string;
    }>(
      `WITH bp AS (
         SELECT peran, bobot::NUMERIC FROM master.bobot_peran
         WHERE tahun = $1 AND deleted_at IS NULL
       )
       SELECT
          t.user_id,
          a.id,
          a.judul_program,
          a.jenis_program,
          a.status_pkpt,
          t.role_tim::text AS role_tim,
          TO_CHAR(a.tanggal_mulai,   'YYYY-MM-DD') AS tanggal_mulai,
          TO_CHAR(a.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
          COALESCE(bp.bobot, 0)::NUMERIC AS bobot,
          COALESCE(t.hari_alokasi, a.estimasi_hari)::NUMERIC AS hari_alokasi,
          (COALESCE(t.hari_alokasi, a.estimasi_hari)::NUMERIC * COALESCE(bp.bobot, 0)::NUMERIC)::NUMERIC(10,2) AS mandays
       FROM pkpt.annual_plan_team t
       JOIN pkpt.annual_audit_plans a ON a.id = t.annual_plan_id
       LEFT JOIN bp ON bp.peran = t.role_tim::TEXT
       WHERE a.deleted_at IS NULL
         AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
         AND t.role_tim IN ('Pengendali Teknis', 'Ketua Tim', 'Anggota Tim')
         ${user_id ? 'AND t.user_id = $2' : ''}
       UNION ALL
       SELECT
          u.id            AS user_id,
          a.id,
          a.judul_program,
          a.jenis_program,
          a.status_pkpt,
          'Kepala SPI'::text AS role_tim,
          TO_CHAR(a.tanggal_mulai,   'YYYY-MM-DD') AS tanggal_mulai,
          TO_CHAR(a.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
          COALESCE((SELECT bobot FROM bp WHERE peran = 'Penanggung Jawab'), 0)::NUMERIC AS bobot,
          a.estimasi_hari::NUMERIC AS hari_alokasi,
          (a.estimasi_hari::NUMERIC * COALESCE((SELECT bobot FROM bp WHERE peran = 'Penanggung Jawab'), 0)::NUMERIC)::NUMERIC(10,2) AS mandays
       FROM pkpt.annual_audit_plans a
       CROSS JOIN auth.users u
       WHERE a.deleted_at IS NULL
         AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
         AND u.role       = 'kepala_spi'
         AND u.is_active  = TRUE
         AND u.deleted_at IS NULL
         ${user_id ? 'AND u.id = $2' : ''}
       ORDER BY tanggal_mulai`,
      user_id ? [tahunNum, user_id] : [tahunNum],
    );

    // Attach programs + agregat man-days per auditor
    const rows = result.rows.map((r) => {
      const programs = programsList.rows.filter((p) => p.user_id === r.user_id);
      const totalMandays = programs.reduce((s, p) => s + Number(p.mandays ?? 0), 0);
      return {
        ...r,
        programs,
        total_mandays:    Number(totalMandays.toFixed(2)),
        kapasitas_mandays: kapasitasMandays,
        utilisasi_mandays: kapasitasMandays > 0
          ? Number(((totalMandays / kapasitasMandays) * 100).toFixed(1))
          : 0,
      };
    });

    // Summary
    const totalAuditor   = rows.length;
    const avgLoad        = totalAuditor > 0
      ? Number((rows.reduce((s, r) => s + Number(r.avg_load), 0) / totalAuditor).toFixed(3))
      : 0;
    const overworkCount  = rows.filter((r) => Number(r.max_load) > paguBobot).length;
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
        pagu_bobot_per_bulan: paguBobot,
        bobot_peran:          bobotMap, // { 'Penanggung Jawab': 0.25, 'Pengendali Teknis': 0.25, 'Ketua Tim': 1.0, 'Anggota Tim': 0.5 }
        kapasitas_mandays:    kapasitasMandays, // total hari efektif kalender tahunan
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
 * Body: { user_ids: string[], tanggal_mulai, tanggal_selesai, role_tim, hari_alokasi? }
 * Return: per-user monthly load sebelum & sesudah, plus flag overwork.
 */
export async function simulateWorkload(req: Request, res: Response) {
  try {
    const { user_ids, tanggal_mulai, tanggal_selesai, role_tim, hari_alokasi } = req.body as {
      user_ids: string[];
      tanggal_mulai: string;
      tanggal_selesai: string;
      role_tim: string;
      hari_alokasi?: number;
    };

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'user_ids wajib diisi.' });
    }
    if (!tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ success: false, message: 'tanggal_mulai & tanggal_selesai wajib diisi.' });
    }

    const hariAlokasiNumber = Number(hari_alokasi);
    const hariAlokasi =
      Number.isFinite(hariAlokasiNumber) && hariAlokasiNumber >= 0 ? hariAlokasiNumber : null;
    const tahun = new Date(tanggal_mulai).getFullYear();

    // Bobot peran tahun simulasi dari master
    const bobotMasterRes = await query<{ peran: string; bobot: string }>(
      `SELECT peran, bobot::TEXT FROM master.bobot_peran
       WHERE tahun = $1 AND deleted_at IS NULL`,
      [tahun],
    );
    const bobotMap: Record<string, number> = {};
    bobotMasterRes.rows.forEach((r) => { bobotMap[r.peran] = Number(r.bobot); });
    const bobotPeran = bobotMap[role_tim] ?? 0;

    // Hitung load existing per user per bulan (satuan bobot, bukan ratio)
    const existing = await query<{ user_id: string; bulan: number; load: number }>(
      `WITH months AS (SELECT generate_series(1,12) AS m),
       bp AS (
         SELECT peran, bobot::NUMERIC FROM master.bobot_peran
         WHERE tahun = $1 AND deleted_at IS NULL
       ),
       kapasitas AS (
         SELECT m.m AS bulan,
                COALESCE(MAX(kkb.hari_efektif), 20)::NUMERIC AS hari_efektif
         FROM months m
         LEFT JOIN pkpt.kalender_kerja kk
                ON kk.tahun = $1 AND kk.deleted_at IS NULL
         LEFT JOIN pkpt.kalender_kerja_bulan kkb
                ON kkb.kalender_id = kk.id AND kkb.bulan = m.m
         GROUP BY m.m
       ),
       assignments AS (
         SELECT t.user_id, a.tanggal_mulai, a.tanggal_selesai,
                COALESCE(t.hari_alokasi, a.estimasi_hari)::NUMERIC AS hari_total,
                GREATEST(1,
                  ((EXTRACT(YEAR  FROM a.tanggal_selesai) - EXTRACT(YEAR  FROM a.tanggal_mulai)) * 12
                +  (EXTRACT(MONTH FROM a.tanggal_selesai) - EXTRACT(MONTH FROM a.tanggal_mulai)) + 1)::INT
                ) AS bulan_overlap,
                COALESCE(bp.bobot, 0)::NUMERIC AS bobot
         FROM pkpt.annual_plan_team t
         JOIN pkpt.annual_audit_plans a ON a.id = t.annual_plan_id
         LEFT JOIN bp ON bp.peran = t.role_tim::TEXT
         WHERE a.deleted_at IS NULL
           AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
           AND t.user_id = ANY($2::uuid[])
           AND t.role_tim IN ('Pengendali Teknis','Ketua Tim','Anggota Tim')
         UNION ALL
         SELECT u.id AS user_id, a.tanggal_mulai, a.tanggal_selesai,
                a.estimasi_hari::NUMERIC AS hari_total,
                GREATEST(1,
                  ((EXTRACT(YEAR  FROM a.tanggal_selesai) - EXTRACT(YEAR  FROM a.tanggal_mulai)) * 12
                +  (EXTRACT(MONTH FROM a.tanggal_selesai) - EXTRACT(MONTH FROM a.tanggal_mulai)) + 1)::INT
                ) AS bulan_overlap,
                COALESCE((SELECT bobot FROM bp WHERE peran = 'Penanggung Jawab'), 0)::NUMERIC AS bobot
         FROM pkpt.annual_audit_plans a
         CROSS JOIN auth.users u
         WHERE a.deleted_at IS NULL
           AND EXTRACT(YEAR FROM a.tahun_perencanaan) = $1
           AND u.id = ANY($2::uuid[])
           AND u.role = 'kepala_spi'
           AND u.is_active = TRUE
           AND u.deleted_at IS NULL
       ),
       contrib AS (
         SELECT asg.user_id, m.m AS bulan,
           asg.bobot * LEAST(1.0,
             CASE WHEN k.hari_efektif > 0
               THEN (asg.hari_total / asg.bulan_overlap) / k.hari_efektif
               ELSE 0 END
           ) AS bobot_efektif
         FROM assignments asg
         CROSS JOIN months m
         JOIN kapasitas k ON k.bulan = m.m
         WHERE asg.tanggal_mulai   <= make_date($1::int, m.m, 1) + INTERVAL '1 month' - INTERVAL '1 day'
           AND asg.tanggal_selesai >= make_date($1::int, m.m, 1)
       )
       SELECT u.user_id, m.m AS bulan,
         COALESCE(SUM(c.bobot_efektif), 0)::NUMERIC(6,3) AS load
       FROM (SELECT unnest($2::uuid[]) AS user_id) u
       CROSS JOIN months m
       LEFT JOIN contrib c ON c.user_id = u.user_id AND c.bulan = m.m
       GROUP BY u.user_id, m.m`,
      [tahun, user_ids],
    );

    // Lookup pagu bobot per bulan
    const paguRes = await query<{ pagu: string }>(
      `SELECT COALESCE(MAX(max_bobot_per_bulan), 2.0)::TEXT AS pagu
       FROM master.bobot_peran WHERE tahun = $1 AND deleted_at IS NULL`,
      [tahun],
    );
    const paguBobot = Number(paguRes.rows[0]?.pagu ?? 2.0);

    // Hari alokasi default untuk program simulasi = durasi kalender (estimasi_hari)
    const dStart = new Date(tanggal_mulai);
    const dEnd   = new Date(tanggal_selesai);
    const estimasiHari = hariAlokasi ?? Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / 86_400_000) + 1);
    const startMonth = dStart.getMonth() + 1;
    const endMonth   = dEnd.getMonth() + 1;
    const startYear  = dStart.getFullYear();
    const endYear    = dEnd.getFullYear();
    const bulanOverlap = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
    const hariPerBulan = estimasiHari / bulanOverlap;

    // Ambil hari efektif kalender untuk tahun simulasi
    const kalRes = await query<{ bulan: number; hari_efektif: number }>(
      `SELECT kkb.bulan, kkb.hari_efektif
       FROM pkpt.kalender_kerja kk
       JOIN pkpt.kalender_kerja_bulan kkb ON kkb.kalender_id = kk.id
       WHERE kk.tahun = $1 AND kk.deleted_at IS NULL`,
      [tahun],
    );
    const kapasitasMap: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) kapasitasMap[i] = 20;
    kalRes.rows.forEach((r) => { kapasitasMap[r.bulan] = Number(r.hari_efektif) || 20; });

    // Build result per user
    const result = user_ids.map((uid) => {
      const currentMap: Record<number, number> = {};
      for (let i = 1; i <= 12; i++) currentMap[i] = 0;
      existing.rows.filter((r) => r.user_id === uid).forEach((r) => {
        currentMap[r.bulan] = Number(r.load);
      });

      // Tambah kontribusi simulasi: bobot × LEAST(1, hariPerBulan / kapasitas)
      const afterMap: Record<number, number> = { ...currentMap };
      for (let m = 1; m <= 12; m++) {
        const firstDay = new Date(tahun, m - 1, 1);
        const lastDay  = new Date(tahun, m, 0);
        if (dStart <= lastDay && dEnd >= firstDay) {
          const fraksi = Math.min(1.0, hariPerBulan / (kapasitasMap[m] || 20));
          const tambah = bobotPeran * fraksi;
          afterMap[m] = Number((afterMap[m] + tambah).toFixed(3));
        }
      }

      const overworkMonths = Object.entries(afterMap)
        .filter(([, v]) => v > paguBobot)
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
