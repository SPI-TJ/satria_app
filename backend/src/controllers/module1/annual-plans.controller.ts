import { Request, Response } from 'express';
import { query } from '../../config/database';

// ── Helper: hitung estimasi hari kerja (inklusif) ─────────────
function calcEstimasiHari(mulai: string, selesai: string): number {
  const d1 = new Date(mulai);
  const d2 = new Date(selesai);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// ── GET /api/annual-plans ─────────────────────────────────────
export async function getAnnualPlans(req: Request, res: Response) {
  try {
    const { status_pkpt, jenis_program, tahun, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions = ['a.deleted_at IS NULL'];

    if (tahun)        { params.push(tahun);        conditions.push(`EXTRACT(YEAR FROM a.tahun_perencanaan) = $${params.length}`); }
    if (status_pkpt)  { params.push(status_pkpt);  conditions.push(`a.status_pkpt = $${params.length}`); }
    if (jenis_program){ params.push(jenis_program); conditions.push(`a.jenis_program = $${params.length}`); }

    const where = conditions.join(' AND ');

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM pkpt.annual_audit_plans a WHERE ${where}`, params,
    );

    params.push(Number(limit), offset);
    const dataRes = await query(
      `SELECT
          a.id,
          EXTRACT(YEAR FROM a.tahun_perencanaan)::INT  AS tahun,
          a.tahun_perencanaan,
          a.jenis_program,
          a.kategori_program,
          a.judul_program,
          a.status_program,
          a.status_pkpt,
          a.auditee,
          a.estimasi_hari,
          a.tanggal_mulai,
          a.tanggal_selesai,
          a.deskripsi,
          a.created_at,
          -- Tim aggregates
          (
            SELECT COUNT(*)
            FROM pkpt.annual_plan_team t
            WHERE t.annual_plan_id = a.id
          )::INT AS jumlah_personil,
          (
            SELECT STRING_AGG(u2.nama_lengkap, ', ' ORDER BY u2.nama_lengkap)
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id
          ) AS nama_auditor,
          (
            SELECT u2.nama_lengkap
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id AND t.role_tim = 'Pengendali Teknis'
            LIMIT 1
          ) AS pengendali_teknis_nama,
          (
            SELECT u2.id
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id AND t.role_tim = 'Pengendali Teknis'
            LIMIT 1
          ) AS pengendali_teknis_id,
          (
            SELECT u2.nama_lengkap
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id AND t.role_tim = 'Ketua Tim'
            LIMIT 1
          ) AS ketua_nama,
          (
            SELECT u2.id
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id AND t.role_tim = 'Ketua Tim'
            LIMIT 1
          ) AS ketua_id,
          (
            SELECT STRING_AGG(u2.nama_lengkap, ', ' ORDER BY u2.nama_lengkap)
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id AND t.role_tim = 'Anggota Tim'
          ) AS anggota_names,
          -- Jumlah risiko terkait
          (
            SELECT COUNT(*)
            FROM pkpt.annual_plan_risks r
            WHERE r.annual_plan_id = a.id
          )::INT AS jumlah_risiko
       FROM pkpt.annual_audit_plans a
       WHERE ${where}
       ORDER BY a.tahun_perencanaan DESC, a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return res.json({
      success: true,
      data: dataRes.rows,
      meta: {
        total: Number(countRes.rows[0]?.count ?? 0),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(countRes.rows[0]?.count ?? 0) / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[annualPlans.getAll]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/annual-plans/:id ─────────────────────────────────
export async function getAnnualPlanById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*,
              EXTRACT(YEAR FROM a.tahun_perencanaan)::INT AS tahun
       FROM pkpt.annual_audit_plans a
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
    }

    // Risiko terkait
    const risks = await query(
      `SELECT rd.id, rd.risk_code, rd.divisi, rd.department_name,
              rd.risk_description, rd.risk_level, rd.status, apr.prioritas
       FROM pkpt.annual_plan_risks apr
       JOIN pkpt.risk_data rd ON rd.id = apr.risk_id
       WHERE apr.annual_plan_id = $1
       ORDER BY apr.prioritas NULLS LAST`,
      [id],
    );

    // Tim
    const team = await query(
      `SELECT t.id, t.role_tim, u.id AS user_id, u.nama_lengkap, u.role, u.jabatan
       FROM pkpt.annual_plan_team t
       JOIN auth.users u ON u.id = t.user_id
       WHERE t.annual_plan_id = $1
       ORDER BY
         CASE t.role_tim
           WHEN 'Penanggung Jawab'  THEN 1
           WHEN 'Pengendali Teknis' THEN 2
           WHEN 'Ketua Tim'         THEN 3
           WHEN 'Anggota Tim'       THEN 4
         END`,
      [id],
    );

    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        risks: risks.rows,
        team: team.rows,
        jumlah_personil: team.rows.length,
      },
    });
  } catch (err) {
    console.error('[annualPlans.getById]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── POST /api/annual-plans ────────────────────────────────────
export async function createAnnualPlan(req: Request, res: Response) {
  try {
    const {
      tahun_perencanaan,
      jenis_program,
      kategori_program,
      judul_program,
      status_program,
      auditee,
      deskripsi,
      tanggal_mulai,
      tanggal_selesai,
      // SDM
      pengendali_teknis_id,
      ketua_tim_id,
      anggota_ids,
      // Risiko (hanya untuk PKPT)
      risk_ids,
    } = req.body;

    if (!judul_program || !jenis_program || !tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({
        success: false,
        message: 'Field wajib: judul_program, jenis_program, tanggal_mulai, tanggal_selesai.',
      });
    }

    // Auto-hitung estimasi hari dari rentang tanggal
    const estimasi_hari = calcEstimasiHari(tanggal_mulai, tanggal_selesai);

    // Tahun dari tanggal mulai jika tidak disuplai
    const tahunStr = tahun_perencanaan || `${new Date(tanggal_mulai).getFullYear()}-01-01`;

    const result = await query<{ id: string }>(
      `INSERT INTO pkpt.annual_audit_plans
         (tahun_perencanaan, jenis_program, kategori_program, judul_program,
          status_program, auditee, deskripsi, estimasi_hari,
          tanggal_mulai, tanggal_selesai, status_pkpt, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Draft',$11)
       RETURNING id`,
      [
        tahunStr,
        jenis_program,
        kategori_program || 'Assurance',
        judul_program,
        status_program || 'Mandatory',
        auditee || null,
        deskripsi || '',
        estimasi_hari,
        tanggal_mulai,
        tanggal_selesai,
        req.user!.id,
      ],
    );

    const planId = result.rows[0].id;

    // ── Masukkan tim auditor ────────────────────────────────
    if (pengendali_teknis_id) {
      await query(
        `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim)
         VALUES ($1,$2,'Pengendali Teknis') ON CONFLICT (annual_plan_id, user_id) DO NOTHING`,
        [planId, pengendali_teknis_id],
      );
    }
    if (ketua_tim_id) {
      await query(
        `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim)
         VALUES ($1,$2,'Ketua Tim') ON CONFLICT (annual_plan_id, user_id) DO NOTHING`,
        [planId, ketua_tim_id],
      );
    }
    if (Array.isArray(anggota_ids)) {
      for (const uid of anggota_ids) {
        await query(
          `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim)
           VALUES ($1,$2,'Anggota Tim') ON CONFLICT (annual_plan_id, user_id) DO NOTHING`,
          [planId, uid],
        );
      }
    }

    // ── Hubungkan risiko (khusus PKPT) ──────────────────────
    if (Array.isArray(risk_ids) && risk_ids.length > 0) {
      for (const [idx, riskId] of risk_ids.entries()) {
        await query(
          `INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [planId, riskId, idx + 1],
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Program kerja berhasil dibuat sebagai Draft.',
      data: { id: planId, estimasi_hari },
    });
  } catch (err) {
    console.error('[annualPlans.create]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── PATCH /api/annual-plans/:id ───────────────────────────────
export async function updateAnnualPlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      jenis_program, kategori_program, judul_program,
      status_program, auditee, deskripsi,
      tanggal_mulai, tanggal_selesai,
      pengendali_teknis_id, ketua_tim_id, anggota_ids,
      risk_ids,
    } = req.body;

    const existing = await query(
      `SELECT id, status_pkpt, tanggal_mulai, tanggal_selesai
       FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
    }
    if (existing.rows[0].status_pkpt === 'Final') {
      return res.status(409).json({ success: false, message: 'Program yang sudah Final tidak dapat diedit.' });
    }

    const newMulai   = tanggal_mulai   || existing.rows[0].tanggal_mulai;
    const newSelesai = tanggal_selesai || existing.rows[0].tanggal_selesai;
    const estimasi_hari = calcEstimasiHari(newMulai, newSelesai);

    await query(
      `UPDATE pkpt.annual_audit_plans SET
         jenis_program    = COALESCE($1, jenis_program),
         kategori_program = COALESCE($2, kategori_program),
         judul_program    = COALESCE($3, judul_program),
         status_program   = COALESCE($4, status_program),
         auditee          = COALESCE($5, auditee),
         deskripsi        = COALESCE($6, deskripsi),
         tanggal_mulai    = COALESCE($7, tanggal_mulai),
         tanggal_selesai  = COALESCE($8, tanggal_selesai),
         estimasi_hari    = $9,
         updated_by       = $10,
         updated_at       = NOW()
       WHERE id = $11 AND deleted_at IS NULL`,
      [
        jenis_program, kategori_program, judul_program,
        status_program, auditee, deskripsi,
        tanggal_mulai, tanggal_selesai,
        estimasi_hari, req.user!.id, id,
      ],
    );

    // ── Update tim: hard-delete dulu supaya tidak konflik UNIQUE ─
    if (
      pengendali_teknis_id !== undefined ||
      ketua_tim_id !== undefined ||
      anggota_ids !== undefined
    ) {
      await query(`DELETE FROM pkpt.annual_plan_team WHERE annual_plan_id = $1`, [id]);
      if (pengendali_teknis_id) {
        await query(
          `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim)
           VALUES ($1,$2,'Pengendali Teknis')`,
          [id, pengendali_teknis_id],
        );
      }
      if (ketua_tim_id) {
        await query(
          `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim)
           VALUES ($1,$2,'Ketua Tim')`,
          [id, ketua_tim_id],
        );
      }
      if (Array.isArray(anggota_ids)) {
        for (const uid of anggota_ids) {
          await query(
            `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim)
             VALUES ($1,$2,'Anggota Tim')`,
            [id, uid],
          );
        }
      }
    }

    // ── Update risiko terkait ────────────────────────────────
    if (Array.isArray(risk_ids)) {
      await query(`DELETE FROM pkpt.annual_plan_risks WHERE annual_plan_id = $1`, [id]);
      for (const [idx, riskId] of risk_ids.entries()) {
        await query(
          `INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas)
           VALUES ($1,$2,$3)`,
          [id, riskId, idx + 1],
        );
      }
    }

    return res.json({ success: true, message: 'Program berhasil diperbarui.', data: { estimasi_hari } });
  } catch (err) {
    console.error('[annualPlans.update]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── DELETE /api/annual-plans/:id (soft delete) ───────────────
export async function deleteAnnualPlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await query(
      `SELECT status_pkpt FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
    }
    if (existing.rows[0].status_pkpt === 'Final') {
      return res.status(409).json({ success: false, message: 'Program yang sudah Final tidak dapat dihapus.' });
    }

    await query(
      `UPDATE pkpt.annual_audit_plans SET deleted_at = NOW() WHERE id = $1`,
      [id],
    );
    return res.json({ success: true, message: 'Program berhasil dihapus.' });
  } catch (err) {
    console.error('[annualPlans.delete]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── PATCH /api/annual-plans/:id/finalize ─────────────────────
export async function finalizeAnnualPlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE pkpt.annual_audit_plans
       SET status_pkpt = 'Final', finalized_by = $1, finalized_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL`,
      [req.user!.id, id],
    );
    return res.json({ success: true, message: 'Program PKPT berhasil difinalisasi.' });
  } catch (err) {
    console.error('[annualPlans.finalize]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/dashboard/stats ──────────────────────────────────
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const tahun = new Date().getFullYear();
    const [pkptCount, finishedCount, unfinishedCount, riskCount, auditorCount] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) FROM pkpt.annual_audit_plans
         WHERE EXTRACT(YEAR FROM tahun_perencanaan) = $1 AND deleted_at IS NULL`,
        [tahun],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) FROM pkpt.annual_audit_plans
         WHERE EXTRACT(YEAR FROM tahun_perencanaan) = $1
           AND status_pkpt = 'Final' AND deleted_at IS NULL`,
        [tahun],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) FROM pkpt.annual_audit_plans
         WHERE EXTRACT(YEAR FROM tahun_perencanaan) = $1
           AND status_pkpt != 'Final' AND deleted_at IS NULL`,
        [tahun],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = $1 AND deleted_at IS NULL`,
        [tahun],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) FROM auth.users
         WHERE role IN ('kepala_spi','pengendali_teknis','anggota_tim')
           AND is_active = TRUE AND deleted_at IS NULL`,
      ),
    ]);

    return res.json({
      success: true,
      data: {
        pkpt_programs:          Number(pkptCount.rows[0]?.count ?? 0),
        program_selesai:        Number(finishedCount.rows[0]?.count ?? 0),
        program_belum_selesai:  Number(unfinishedCount.rows[0]?.count ?? 0),
        total_risks:            Number(riskCount.rows[0]?.count ?? 0),
        total_auditors:         Number(auditorCount.rows[0]?.count ?? 0),
        tahun,
      },
    });
  } catch (err) {
    console.error('[dashboard.stats]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
