"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnnualPlans = getAnnualPlans;
exports.getAnnualPlanById = getAnnualPlanById;
exports.createAnnualPlan = createAnnualPlan;
exports.updateAnnualPlan = updateAnnualPlan;
exports.deleteAnnualPlan = deleteAnnualPlan;
exports.finalizeAnnualPlan = finalizeAnnualPlan;
exports.markPlanCompleted = markPlanCompleted;
exports.markPlanOnProgress = markPlanOnProgress;
exports.runDeadlineScan = runDeadlineScan;
exports.getDashboardStats = getDashboardStats;
const database_1 = require("../../config/database");
const logger_1 = __importDefault(require("../../utils/logger"));
const notifications_1 = require("../../utils/notifications");
// ── Helper: hitung estimasi hari kerja (inklusif) ─────────────
function calcEstimasiHari(mulai, selesai) {
    const d1 = new Date(mulai);
    const d2 = new Date(selesai);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
}
// ── GET /api/annual-plans ─────────────────────────────────────
async function getAnnualPlans(req, res) {
    try {
        const { status_pkpt, jenis_program, kategori_program, status_program, kategori_anggaran, tahun, bulan, search, page = '1', limit = '20' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const params = [];
        const conditions = ['a.deleted_at IS NULL'];
        if (tahun) {
            params.push(tahun);
            conditions.push(`EXTRACT(YEAR FROM a.tahun_perencanaan) = $${params.length}`);
        }
        if (status_pkpt) {
            params.push(status_pkpt);
            conditions.push(`a.status_pkpt = $${params.length}`);
        }
        if (jenis_program) {
            params.push(jenis_program);
            conditions.push(`a.jenis_program = $${params.length}`);
        }
        if (kategori_program) {
            params.push(kategori_program);
            conditions.push(`a.kategori_program = $${params.length}`);
        }
        if (status_program) {
            params.push(status_program);
            conditions.push(`a.status_program = $${params.length}`);
        }
        if (kategori_anggaran) {
            params.push(kategori_anggaran);
            conditions.push(`a.kategori_anggaran = $${params.length}`);
        }
        if (bulan) {
            params.push(bulan);
            // Bulan jatuh dalam rentang tanggal_mulai..tanggal_selesai
            conditions.push(`$${params.length}::INT BETWEEN EXTRACT(MONTH FROM a.tanggal_mulai)::INT AND EXTRACT(MONTH FROM a.tanggal_selesai)::INT`);
        }
        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(a.judul_program ILIKE $${params.length} OR a.auditee ILIKE $${params.length})`);
        }
        // Scope access: SPI leaders (kepala_spi, admin_spi) lihat semua.
        // Auditor lain (pengendali_teknis, anggota_tim) hanya program di mana dia terlibat.
        const role = req.user?.role;
        const isSpiLeader = role === 'kepala_spi' || role === 'admin_spi';
        if (!isSpiLeader && req.user?.id) {
            params.push(req.user.id);
            conditions.push(`EXISTS (SELECT 1 FROM pkpt.annual_plan_team t
                 WHERE t.annual_plan_id = a.id AND t.user_id = $${params.length})`);
        }
        const where = conditions.join(' AND ');
        const countRes = await (0, database_1.query)(`SELECT COUNT(*) FROM pkpt.annual_audit_plans a WHERE ${where}`, params);
        params.push(Number(limit), offset);
        const dataRes = await (0, database_1.query)(`SELECT
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
          a.completed_at,
          a.deskripsi,
          a.created_at,
          -- Finansial (Fase 5)
          a.anggaran,
          a.realisasi_anggaran,
          a.kategori_anggaran,
          a.man_days_estimasi,
          vf.man_days_terpakai,
          vf.persen_pagu_terpakai,
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
            SELECT STRING_AGG(u2.nama_lengkap, ', ' ORDER BY u2.nama_lengkap)
            FROM pkpt.annual_plan_team t
            JOIN auth.users u2 ON u2.id = t.user_id
            WHERE t.annual_plan_id = a.id AND t.role_tim = 'Ketua Tim'
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
       LEFT JOIN pkpt.v_program_finansial vf ON vf.plan_id = a.id
       WHERE ${where}
       ORDER BY a.tahun_perencanaan DESC, a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        logger_1.default.info('[PLAN] getAnnualPlans executed successfully', { total: Number(countRes.rows[0]?.count ?? 0), page, limit });
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
    }
    catch (err) {
        logger_1.default.error(`[PLAN] getAnnualPlans failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/annual-plans/:id ─────────────────────────────────
async function getAnnualPlanById(req, res) {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`SELECT a.*,
              EXTRACT(YEAR FROM a.tahun_perencanaan)::INT AS tahun,
              vf.man_days_terpakai,
              vf.persen_pagu_terpakai
       FROM pkpt.annual_audit_plans a
       LEFT JOIN pkpt.v_program_finansial vf ON vf.plan_id = a.id
       WHERE a.id = $1 AND a.deleted_at IS NULL`, [id]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
        }
        // Scope access check
        const role = req.user?.role;
        const isSpiLeader = role === 'kepala_spi' || role === 'admin_spi';
        if (!isSpiLeader && req.user?.id) {
            const mem = await (0, database_1.query)(`SELECT 1 FROM pkpt.annual_plan_team WHERE annual_plan_id = $1 AND user_id = $2 LIMIT 1`, [id, req.user.id]);
            if (!mem.rows[0]) {
                return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak terlibat dalam program ini.' });
            }
        }
        // Risiko terkait
        const risks = await (0, database_1.query)(`SELECT
         rd.id,
         rd.id_risiko,
         rd.tahun,
         COALESCE(d.nama,  rd.direktorat_nama) AS direktorat,
         COALESCE(dv.nama, rd.divisi_nama)     AS divisi,
         COALESCE(dp.nama, rd.departemen_nama) AS departemen,
         rd.direktorat_id,
         rd.divisi_id,
         rd.departemen_id,
         rd.nama_risiko,
         rd.parameter_kemungkinan,
         rd.tingkat_risiko_inherent,
         rd.skor_inherent,
         rd.level_inherent,
         rd.tingkat_risiko_target,
         rd.skor_target,
         rd.level_target,
         rd.pelaksanaan_mitigasi,
         rd.realisasi_tingkat_risiko,
         rd.skor_realisasi,
         rd.level_realisasi,
         rd.penyebab_internal,
         rd.penyebab_eksternal,
         rd.sasaran_bidang,
         rd.sasaran_korporat_id,
         COALESCE(sk.nama, rd.sasaran_korporat_nama) AS sasaran_korporat,
         rd.source,
         rd.created_at,
         rd.updated_at,
         apr.prioritas
       FROM pkpt.annual_plan_risks apr
       JOIN pkpt.risk_data rd ON rd.id = apr.risk_id
       LEFT JOIN master.direktorat       d  ON d.id  = rd.direktorat_id
       LEFT JOIN master.divisi           dv ON dv.id = rd.divisi_id
       LEFT JOIN master.departemen       dp ON dp.id = rd.departemen_id
       LEFT JOIN master.sasaran_korporat sk ON sk.id = rd.sasaran_korporat_id
       WHERE apr.annual_plan_id = $1
         AND rd.deleted_at IS NULL
       ORDER BY apr.prioritas NULLS LAST`, [id]);
        // Tim
        const team = await (0, database_1.query)(`SELECT t.id, t.role_tim, t.hari_alokasi,
              u.id AS user_id, u.nama_lengkap, u.role, u.jabatan
       FROM pkpt.annual_plan_team t
       JOIN auth.users u ON u.id = t.user_id
       WHERE t.annual_plan_id = $1
       ORDER BY
         CASE t.role_tim
           WHEN 'Penanggung Jawab'  THEN 1
           WHEN 'Pengendali Teknis' THEN 2
           WHEN 'Ketua Tim'         THEN 3
           WHEN 'Anggota Tim'       THEN 4
         END`, [id]);
        logger_1.default.info('[PLAN] getAnnualPlanById executed successfully', { planId: id, teamSize: team.rows.length, riskCount: risks.rows.length });
        return res.json({
            success: true,
            data: {
                ...result.rows[0],
                risks: risks.rows,
                team: team.rows,
                jumlah_personil: team.rows.length,
            },
        });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] getAnnualPlanById failed: ${err.message}`, { error: err, plan_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── POST /api/annual-plans ────────────────────────────────────
async function createAnnualPlan(req, res) {
    try {
        const { tahun_perencanaan, jenis_program, kategori_program, judul_program, status_program, auditee, deskripsi, tanggal_mulai, tanggal_selesai, 
        // Finansial (Fase 5)
        anggaran, realisasi_anggaran, kategori_anggaran, man_days_estimasi, 
        // SDM
        pengendali_teknis_id, ketua_tim_id, ketua_tim_ids, anggota_ids, 
        // Alokasi hari per anggota (key = user_id, value = hari_alokasi)
        team_alokasi, 
        // Risiko (hanya untuk PKPT)
        risk_ids, } = req.body;
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
        const result = await (0, database_1.query)(`INSERT INTO pkpt.annual_audit_plans
         (tahun_perencanaan, jenis_program, kategori_program, judul_program,
          status_program, auditee, deskripsi, estimasi_hari,
          tanggal_mulai, tanggal_selesai, status_pkpt,
          anggaran, realisasi_anggaran, kategori_anggaran, man_days_estimasi,
          created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Open',$11,$12,$13,$14,$15)
       RETURNING id`, [
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
            anggaran ?? null,
            realisasi_anggaran ?? null,
            kategori_anggaran || null,
            man_days_estimasi ?? null,
            req.user.id,
        ]);
        const planId = result.rows[0].id;
        const ketuaIds = Array.isArray(ketua_tim_ids)
            ? ketua_tim_ids
            : (ketua_tim_id ? [ketua_tim_id] : []);
        // ── Masukkan tim auditor (dengan hari_alokasi opsional) ─
        const alokasiOf = (uid) => {
            const v = team_alokasi?.[uid];
            if (v === null || v === undefined || v === '')
                return null;
            const n = Number(v);
            return Number.isFinite(n) && n >= 0 ? n : null;
        };
        if (pengendali_teknis_id) {
            await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim, hari_alokasi)
         VALUES ($1,$2,'Pengendali Teknis',$3) ON CONFLICT (annual_plan_id, user_id) DO NOTHING`, [planId, pengendali_teknis_id, alokasiOf(pengendali_teknis_id)]);
        }
        for (const uid of ketuaIds) {
            await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim, hari_alokasi)
         VALUES ($1,$2,'Ketua Tim',$3) ON CONFLICT (annual_plan_id, user_id) DO NOTHING`, [planId, uid, alokasiOf(uid)]);
        }
        if (Array.isArray(anggota_ids)) {
            for (const uid of anggota_ids) {
                await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim, hari_alokasi)
           VALUES ($1,$2,'Anggota Tim',$3) ON CONFLICT (annual_plan_id, user_id) DO NOTHING`, [planId, uid, alokasiOf(uid)]);
            }
        }
        // ── Hubungkan risiko (khusus PKPT) ──────────────────────
        if (Array.isArray(risk_ids) && risk_ids.length > 0) {
            for (const [idx, riskId] of risk_ids.entries()) {
                await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [planId, riskId, idx + 1]);
            }
        }
        // Fire-and-forget: notifikasi ke semua anggota tim yg di-assign
        (0, notifications_1.notifyProgramCreated)(planId).catch((err) => logger_1.default.error(`[PLAN] notifyProgramCreated error: ${err.message}`, { planId }));
        logger_1.default.info('[PLAN] createAnnualPlan executed successfully', { planId, judul_program, estimasi_hari });
        return res.status(201).json({
            success: true,
            message: 'Program kerja berhasil dibuat dengan status Open.',
            data: { id: planId, estimasi_hari },
        });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] createAnnualPlan failed: ${err.message}`, { error: err, judul_program: req.body.judul_program });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── PATCH /api/annual-plans/:id ───────────────────────────────
async function updateAnnualPlan(req, res) {
    try {
        const { id } = req.params;
        const { jenis_program, kategori_program, judul_program, status_program, auditee, deskripsi, tanggal_mulai, tanggal_selesai, anggaran, realisasi_anggaran, kategori_anggaran, man_days_estimasi, pengendali_teknis_id, ketua_tim_id, ketua_tim_ids, anggota_ids, team_alokasi, risk_ids, } = req.body;
        const existing = await (0, database_1.query)(`SELECT id, status_pkpt, tanggal_mulai, tanggal_selesai
       FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (!existing.rows[0]) {
            return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
        }
        if (existing.rows[0].status_pkpt === 'Closed') {
            return res.status(409).json({ success: false, message: 'Program yang sudah Closed tidak dapat diedit.' });
        }
        const newMulai = tanggal_mulai || existing.rows[0].tanggal_mulai;
        const newSelesai = tanggal_selesai || existing.rows[0].tanggal_selesai;
        const estimasi_hari = calcEstimasiHari(newMulai, newSelesai);
        await (0, database_1.query)(`UPDATE pkpt.annual_audit_plans SET
         jenis_program       = COALESCE($1, jenis_program),
         kategori_program    = COALESCE($2, kategori_program),
         judul_program       = COALESCE($3, judul_program),
         status_program      = COALESCE($4, status_program),
         auditee             = COALESCE($5, auditee),
         deskripsi           = COALESCE($6, deskripsi),
         tanggal_mulai       = COALESCE($7, tanggal_mulai),
         tanggal_selesai     = COALESCE($8, tanggal_selesai),
         estimasi_hari       = $9,
         anggaran            = COALESCE($10, anggaran),
         realisasi_anggaran  = COALESCE($11, realisasi_anggaran),
         kategori_anggaran   = COALESCE($12, kategori_anggaran),
         man_days_estimasi   = COALESCE($13, man_days_estimasi),
         updated_by          = $14,
         updated_at          = NOW()
       WHERE id = $15 AND deleted_at IS NULL`, [
            jenis_program, kategori_program, judul_program,
            status_program, auditee, deskripsi,
            tanggal_mulai, tanggal_selesai,
            estimasi_hari,
            anggaran ?? null,
            realisasi_anggaran ?? null,
            kategori_anggaran ?? null,
            man_days_estimasi ?? null,
            req.user.id, id,
        ]);
        // ── Update tim: hard-delete dulu supaya tidak konflik UNIQUE ─
        const ketuaIdsUpd = Array.isArray(ketua_tim_ids)
            ? ketua_tim_ids
            : (ketua_tim_id ? [ketua_tim_id] : []);
        const alokasiOfUpd = (uid) => {
            const v = team_alokasi?.[uid];
            if (v === null || v === undefined || v === '')
                return null;
            const n = Number(v);
            return Number.isFinite(n) && n >= 0 ? n : null;
        };
        if (pengendali_teknis_id !== undefined ||
            ketua_tim_id !== undefined ||
            ketua_tim_ids !== undefined ||
            anggota_ids !== undefined) {
            await (0, database_1.query)(`DELETE FROM pkpt.annual_plan_team WHERE annual_plan_id = $1`, [id]);
            if (pengendali_teknis_id) {
                await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim, hari_alokasi)
           VALUES ($1,$2,'Pengendali Teknis',$3)`, [id, pengendali_teknis_id, alokasiOfUpd(pengendali_teknis_id)]);
            }
            for (const uid of ketuaIdsUpd) {
                await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim, hari_alokasi)
           VALUES ($1,$2,'Ketua Tim',$3)`, [id, uid, alokasiOfUpd(uid)]);
            }
            if (Array.isArray(anggota_ids)) {
                for (const uid of anggota_ids) {
                    await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim, hari_alokasi)
             VALUES ($1,$2,'Anggota Tim',$3)`, [id, uid, alokasiOfUpd(uid)]);
                }
            }
        }
        // ── Update risiko terkait ────────────────────────────────
        if (Array.isArray(risk_ids)) {
            await (0, database_1.query)(`DELETE FROM pkpt.annual_plan_risks WHERE annual_plan_id = $1`, [id]);
            for (const [idx, riskId] of risk_ids.entries()) {
                await (0, database_1.query)(`INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas)
           VALUES ($1,$2,$3)`, [id, riskId, idx + 1]);
            }
        }
        logger_1.default.info('[PLAN] updateAnnualPlan executed successfully', { planId: id, estimasi_hari });
        return res.json({ success: true, message: 'Program berhasil diperbarui.', data: { estimasi_hari } });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] updateAnnualPlan failed: ${err.message}`, { error: err, plan_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── DELETE /api/annual-plans/:id (soft delete) ───────────────
async function deleteAnnualPlan(req, res) {
    try {
        const { id } = req.params;
        const existing = await (0, database_1.query)(`SELECT status_pkpt FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (!existing.rows[0]) {
            return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
        }
        if (existing.rows[0].status_pkpt === 'Closed') {
            return res.status(409).json({ success: false, message: 'Program yang sudah Closed tidak dapat dihapus.' });
        }
        await (0, database_1.query)(`UPDATE pkpt.annual_audit_plans SET deleted_at = NOW() WHERE id = $1`, [id]);
        logger_1.default.info('[PLAN] deleteAnnualPlan executed successfully', { planId: id });
        return res.json({ success: true, message: 'Program berhasil dihapus.' });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] deleteAnnualPlan failed: ${err.message}`, { error: err, plan_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── PATCH /api/annual-plans/:id/finalize ─────────────────────
async function finalizeAnnualPlan(req, res) {
    try {
        const { id } = req.params;
        await (0, database_1.query)(`UPDATE pkpt.annual_audit_plans
       SET status_pkpt = 'Closed', finalized_by = $1, finalized_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL`, [req.user.id, id]);
        (0, notifications_1.notifyProgramClosed)(id).catch((err) => logger_1.default.error(`[PLAN] notifyProgramClosed error: ${err.message}`, { planId: id }));
        logger_1.default.info('[PLAN] finalizeAnnualPlan executed successfully', { planId: id });
        return res.json({ success: true, message: 'Program PKPT berhasil ditutup (Closed).' });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] finalizeAnnualPlan failed: ${err.message}`, { error: err, plan_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── PATCH /api/annual-plans/:id/mark-completed ────────────────
// Tandai program selesai + trigger notifikasi ke PT & Kepala SPI
async function markPlanCompleted(req, res) {
    try {
        const { id } = req.params;
        const existing = await (0, database_1.query)(`SELECT id, completed_at FROM pkpt.annual_audit_plans
        WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (!existing.rows[0]) {
            return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
        }
        if (existing.rows[0].completed_at) {
            return res.status(409).json({ success: false, message: 'Program sudah ditandai selesai.' });
        }
        await (0, database_1.query)(`UPDATE pkpt.annual_audit_plans
          SET completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`, [id]);
        // Fire-and-forget notification — jangan blok response jika gagal
        (0, notifications_1.notifyProgramCompleted)(id).catch((err) => logger_1.default.error(`[PLAN] notifyProgramCompleted error: ${err.message}`, { planId: id }));
        logger_1.default.info('[PLAN] markPlanCompleted executed successfully', { planId: id });
        return res.json({ success: true, message: 'Program ditandai selesai. Notifikasi penilaian dikirim.' });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] markPlanCompleted failed: ${err.message}`, { error: err, plan_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── PATCH /api/annual-plans/:id/mark-on-progress ──────────────
// Transisi otomatis 'Open' → 'On Progress' saat auditor mulai setup
// pelaksanaan di Modul 2. Idempotent: jika sudah 'On Progress'/'Closed' → no-op.
async function markPlanOnProgress(req, res) {
    try {
        const { id } = req.params;
        const existing = await (0, database_1.query)(`SELECT status_pkpt FROM pkpt.annual_audit_plans
        WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (!existing.rows[0]) {
            return res.status(404).json({ success: false, message: 'Program tidak ditemukan.' });
        }
        const current = existing.rows[0].status_pkpt;
        if (current === 'Closed') {
            return res.status(409).json({ success: false, message: 'Program sudah Closed, tidak dapat diubah.' });
        }
        if (current === 'On Progress') {
            return res.json({ success: true, message: 'Program sudah berstatus On Progress.', data: { status_pkpt: 'On Progress' } });
        }
        await (0, database_1.query)(`UPDATE pkpt.annual_audit_plans
          SET status_pkpt = 'On Progress', updated_at = NOW(), updated_by = $1
        WHERE id = $2 AND deleted_at IS NULL`, [req.user.id, id]);
        (0, notifications_1.notifyProgramOnProgress)(id).catch((err) => logger_1.default.error(`[PLAN] notifyProgramOnProgress error: ${err.message}`, { planId: id }));
        logger_1.default.info('[PLAN] markPlanOnProgress executed successfully', { planId: id });
        return res.json({ success: true, message: 'Status program diubah ke On Progress.', data: { status_pkpt: 'On Progress' } });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] markPlanOnProgress failed: ${err.message}`, { error: err, plan_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── POST /api/annual-plans/scan-deadlines ─────────────────────
// Trigger scan notifikasi deadline manual (Kepala SPI / Admin SPI only)
async function runDeadlineScan(req, res) {
    try {
        const role = req.user?.role;
        if (role !== 'kepala_spi' && role !== 'admin_spi') {
            return res.status(403).json({ success: false, message: 'Hanya Kepala/Admin SPI yang dapat menjalankan scan.' });
        }
        const stats = await (0, notifications_1.scanDeadlineNotifications)();
        return res.json({ success: true, data: stats, message: 'Scan deadline selesai.' });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] runDeadlineScan failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/dashboard/stats ──────────────────────────────────
async function getDashboardStats(req, res) {
    try {
        const tahun = new Date().getFullYear();
        const [pkptCount, finishedCount, unfinishedCount, riskCount, auditorCount] = await Promise.all([
            (0, database_1.query)(`SELECT COUNT(*) FROM pkpt.annual_audit_plans
         WHERE EXTRACT(YEAR FROM tahun_perencanaan) = $1 AND deleted_at IS NULL`, [tahun]),
            (0, database_1.query)(`SELECT COUNT(*) FROM pkpt.annual_audit_plans
         WHERE EXTRACT(YEAR FROM tahun_perencanaan) = $1
           AND status_pkpt = 'Closed' AND deleted_at IS NULL`, [tahun]),
            (0, database_1.query)(`SELECT COUNT(*) FROM pkpt.annual_audit_plans
         WHERE EXTRACT(YEAR FROM tahun_perencanaan) = $1
           AND status_pkpt != 'Closed' AND deleted_at IS NULL`, [tahun]),
            (0, database_1.query)(`SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = $1 AND deleted_at IS NULL`, [tahun]),
            (0, database_1.query)(`SELECT COUNT(*) FROM auth.users
         WHERE role IN ('kepala_spi','pengendali_teknis','anggota_tim')
           AND is_active = TRUE AND deleted_at IS NULL`),
        ]);
        logger_1.default.info('[PLAN] getDashboardStats executed successfully', { tahun, pkpt_programs: Number(pkptCount.rows[0]?.count ?? 0) });
        return res.json({
            success: true,
            data: {
                pkpt_programs: Number(pkptCount.rows[0]?.count ?? 0),
                program_selesai: Number(finishedCount.rows[0]?.count ?? 0),
                program_belum_selesai: Number(unfinishedCount.rows[0]?.count ?? 0),
                total_risks: Number(riskCount.rows[0]?.count ?? 0),
                total_auditors: Number(auditorCount.rows[0]?.count ?? 0),
                tahun,
            },
        });
    }
    catch (err) {
        logger_1.default.error(`[PLAN] getDashboardStats failed: ${err.message}`, { error: err, tahun: new Date().getFullYear() });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
//# sourceMappingURL=annual-plans.controller.js.map