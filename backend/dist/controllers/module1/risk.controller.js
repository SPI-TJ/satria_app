"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRisks = getRisks;
exports.getTopRisks = getTopRisks;
exports.getRiskById = getRiskById;
exports.createRisk = createRisk;
exports.updateRisk = updateRisk;
exports.deleteRisk = deleteRisk;
exports.getRiskLevelRef = getRiskLevelRef;
exports.getSasaranKorporat = getSasaranKorporat;
exports.getRiskStats = getRiskStats;
exports.downloadRiskTemplate = downloadRiskTemplate;
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../../config/database");
const logger_1 = __importDefault(require("../../utils/logger"));
const notifications_1 = require("../../utils/notifications");
// ── Column list & joins reused across queries ─────────────────
const RISK_LIST_COLS = `
  r.id, r.id_risiko, r.tahun,
  COALESCE(d.nama,  r.direktorat_nama)  AS direktorat,
  COALESCE(dv.nama, r.divisi_nama)      AS divisi,
  COALESCE(dp.nama, r.departemen_nama)  AS departemen,
  r.direktorat_id, r.divisi_id, r.departemen_id,
  r.nama_risiko, r.parameter_kemungkinan,
  r.tingkat_risiko_inherent, r.skor_inherent, r.level_inherent,
  r.tingkat_risiko_target,   r.skor_target,   r.level_target,
  r.pelaksanaan_mitigasi,
  r.realisasi_tingkat_risiko, r.skor_realisasi, r.level_realisasi,
  r.penyebab_internal, r.penyebab_eksternal,
  r.sasaran_bidang, r.sasaran_korporat_id,
  COALESCE(sk.nama, r.sasaran_korporat_nama) AS sasaran_korporat_nama,
  -- House of Strategy
  r.hos_kategori_id,      hk.kode AS hos_kategori_kode, hk.nama_perspektif AS hos_kategori_nama,
  r.sasaran_strategis_id, ss.kode AS sasaran_strategis_kode, ss.nama AS sasaran_strategis_nama,
  l.label       AS label_inherent,
  l.warna_bg    AS bg_inherent,
  l.warna_text  AS text_inherent,
  r.source, r.created_at, r.updated_at`;
const RISK_JOINS = `
  FROM pkpt.risk_data r
  LEFT JOIN master.direktorat       d  ON d.id  = r.direktorat_id
  LEFT JOIN master.divisi           dv ON dv.id = r.divisi_id
  LEFT JOIN master.departemen       dp ON dp.id = r.departemen_id
  LEFT JOIN master.sasaran_korporat sk ON sk.id = r.sasaran_korporat_id
  LEFT JOIN master.house_of_strategy_kategori hk ON hk.id = r.hos_kategori_id
  LEFT JOIN master.sasaran_strategis          ss ON ss.id = r.sasaran_strategis_id
  LEFT JOIN master.risk_level_ref   l  ON l.kode = r.level_inherent`;
// ── GET /api/risks ────────────────────────────────────────────
async function getRisks(req, res) {
    try {
        const { search, tahun = new Date().getFullYear(), direktorat_id, divisi_id, level_inherent, hos_kategori_id, sasaran_strategis_id, page = '1', limit = '20', } = req.query;
        const params = [Number(tahun)];
        const conds = ['r.deleted_at IS NULL', 'r.tahun = $1'];
        if (search) {
            params.push(`%${search}%`);
            conds.push(`(r.id_risiko ILIKE $${params.length} OR r.nama_risiko ILIKE $${params.length})`);
        }
        if (direktorat_id) {
            params.push(direktorat_id);
            conds.push(`r.direktorat_id = $${params.length}`);
        }
        if (divisi_id) {
            params.push(divisi_id);
            conds.push(`r.divisi_id = $${params.length}`);
        }
        if (level_inherent) {
            params.push(level_inherent);
            conds.push(`r.level_inherent = $${params.length}`);
        }
        if (hos_kategori_id) {
            params.push(hos_kategori_id);
            conds.push(`r.hos_kategori_id = $${params.length}`);
        }
        if (sasaran_strategis_id) {
            params.push(sasaran_strategis_id);
            conds.push(`r.sasaran_strategis_id = $${params.length}`);
        }
        const where = conds.join(' AND ');
        const pg = Math.max(1, Number(page));
        const lim = Math.min(100, Math.max(1, Number(limit)));
        const offset = (pg - 1) * lim;
        const [dataRes, countRes] = await Promise.all([
            (0, database_1.query)(`SELECT ${RISK_LIST_COLS} ${RISK_JOINS}
         WHERE ${where}
         ORDER BY r.skor_inherent DESC NULLS LAST, r.id_risiko
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, lim, offset]),
            (0, database_1.query)(`SELECT COUNT(*)::INT AS total ${RISK_JOINS} WHERE ${where}`, params),
        ]);
        const total = Number(countRes.rows[0]?.total ?? 0);
        logger_1.default.info('[RISK] getRisks executed successfully', { total, page: pg, limit: lim });
        return res.json({
            success: true,
            data: {
                data: dataRes.rows,
                meta: {
                    total,
                    page: pg,
                    limit: lim,
                    totalPages: Math.ceil(total / lim),
                },
            },
        });
    }
    catch (err) {
        logger_1.default.error(`[RISK] getRisks failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/risks/top ─────────────────────────────────────────
async function getTopRisks(req, res) {
    try {
        const { tahun = new Date().getFullYear(), n = '15' } = req.query;
        const result = await (0, database_1.query)(`SELECT ${RISK_LIST_COLS} ${RISK_JOINS}
       WHERE r.deleted_at IS NULL AND r.tahun = $1
       ORDER BY r.skor_inherent DESC NULLS LAST
       LIMIT $2`, [Number(tahun), Number(n)]);
        logger_1.default.info('[RISK] getTopRisks executed successfully', { count: result.rows.length, tahun });
        return res.json({ success: true, data: result.rows, count: result.rows.length });
    }
    catch (err) {
        logger_1.default.error(`[RISK] getTopRisks failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/risks/:id ────────────────────────────────────────
async function getRiskById(req, res) {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`SELECT ${RISK_LIST_COLS} ${RISK_JOINS}
       WHERE r.id = $1 AND r.deleted_at IS NULL`, [id]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Risiko tidak ditemukan.' });
        }
        logger_1.default.info('[RISK] getRiskById executed successfully', { riskId: id });
        return res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        logger_1.default.error(`[RISK] getRiskById failed: ${err.message}`, { error: err, risk_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── POST /api/risks ───────────────────────────────────────────
async function createRisk(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { id_risiko, tahun, direktorat_id, divisi_id, departemen_id, sasaran_korporat_id, sasaran_bidang, hos_kategori_id, sasaran_strategis_id, nama_risiko, parameter_kemungkinan, tingkat_risiko_inherent, tingkat_risiko_target, pelaksanaan_mitigasi, realisasi_tingkat_risiko, penyebab_internal, penyebab_eksternal, } = req.body;
        if (!nama_risiko || !tahun) {
            return res.status(400).json({
                success: false,
                message: 'Field wajib: nama_risiko, tahun.',
            });
        }
        const finalIdRisiko = (id_risiko || '').trim() ||
            `RR-MNL-${tahun}-${String(Date.now()).slice(-4)}`;
        const [skor_i, level_i] = parseScore(tingkat_risiko_inherent);
        const [skor_t, level_t] = parseScore(tingkat_risiko_target);
        const [skor_r, level_r] = parseScore(realisasi_tingkat_risiko);
        const orgNames = await resolveOrgNames(direktorat_id, divisi_id, departemen_id);
        const skName = await resolveSasaranName(sasaran_korporat_id);
        const result = await (0, database_1.query)(`INSERT INTO pkpt.risk_data (
         id_risiko, tahun,
         direktorat_id, divisi_id, departemen_id,
         direktorat_nama, divisi_nama, departemen_nama,
         sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
         hos_kategori_id, sasaran_strategis_id,
         nama_risiko, parameter_kemungkinan,
         tingkat_risiko_inherent, skor_inherent, level_inherent,
         tingkat_risiko_target,   skor_target,   level_target,
         pelaksanaan_mitigasi,
         realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
         penyebab_internal, penyebab_eksternal,
         source, imported_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
         $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
         'Manual',$28
       )
       ON CONFLICT (id_risiko, tahun) DO UPDATE SET
         direktorat_id           = EXCLUDED.direktorat_id,
         divisi_id               = EXCLUDED.divisi_id,
         departemen_id           = EXCLUDED.departemen_id,
         direktorat_nama         = EXCLUDED.direktorat_nama,
         divisi_nama             = EXCLUDED.divisi_nama,
         departemen_nama         = EXCLUDED.departemen_nama,
         sasaran_korporat_id     = EXCLUDED.sasaran_korporat_id,
         sasaran_korporat_nama   = EXCLUDED.sasaran_korporat_nama,
         sasaran_bidang          = EXCLUDED.sasaran_bidang,
         hos_kategori_id         = EXCLUDED.hos_kategori_id,
         sasaran_strategis_id    = EXCLUDED.sasaran_strategis_id,
         nama_risiko             = EXCLUDED.nama_risiko,
         parameter_kemungkinan   = EXCLUDED.parameter_kemungkinan,
         tingkat_risiko_inherent = EXCLUDED.tingkat_risiko_inherent,
         skor_inherent           = EXCLUDED.skor_inherent,
         level_inherent          = EXCLUDED.level_inherent,
         tingkat_risiko_target   = EXCLUDED.tingkat_risiko_target,
         skor_target             = EXCLUDED.skor_target,
         level_target            = EXCLUDED.level_target,
         pelaksanaan_mitigasi    = EXCLUDED.pelaksanaan_mitigasi,
         realisasi_tingkat_risiko= EXCLUDED.realisasi_tingkat_risiko,
         skor_realisasi          = EXCLUDED.skor_realisasi,
         level_realisasi         = EXCLUDED.level_realisasi,
         penyebab_internal       = EXCLUDED.penyebab_internal,
         penyebab_eksternal      = EXCLUDED.penyebab_eksternal,
         updated_at              = NOW()
       RETURNING id`, [
            finalIdRisiko, Number(tahun),
            direktorat_id || null, divisi_id || null, departemen_id || null,
            orgNames.dir, orgNames.div, orgNames.dep,
            sasaran_korporat_id || null, skName, sasaran_bidang || null,
            hos_kategori_id || null, sasaran_strategis_id || null,
            nama_risiko, parameter_kemungkinan || null,
            tingkat_risiko_inherent || null, skor_i, level_i,
            tingkat_risiko_target || null, skor_t, level_t,
            pelaksanaan_mitigasi || null,
            realisasi_tingkat_risiko || null, skor_r, level_r,
            penyebab_internal || null, penyebab_eksternal || null,
            userId,
        ]);
        // Notifikasi ke Kepala SPI jika risiko high/critical
        const lvl = (level_i ?? '').toString().toUpperCase();
        if (['HIGH', 'CRITICAL', 'VERY HIGH', 'TINGGI', 'SANGAT TINGGI'].some((k) => lvl.includes(k))) {
            (0, notifications_1.notifyHighRiskAdded)(result.rows[0].id, req.body.nama_risiko ?? '(tanpa nama)', level_i ?? lvl)
                .catch((err) => logger_1.default.error(`[RISK] notifyHighRiskAdded error: ${err.message}`));
        }
        logger_1.default.info('[RISK] createRisk executed successfully', { riskId: finalIdRisiko, tahun, id: result.rows[0].id });
        return res.status(201).json({
            success: true,
            message: 'Risiko berhasil ditambahkan.',
            data: { id: result.rows[0].id },
        });
    }
    catch (err) {
        logger_1.default.error(`[RISK] createRisk failed: ${err.message}`, { error: err, risk_id_risiko: req.body.id_risiko });
        if (err.message?.includes('unique') || err.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'ID Risiko sudah terdaftar untuk tahun ini.',
            });
        }
        return res.status(500).json({ success: false, message: 'Gagal menyimpan data risiko.' });
    }
}
// ── PATCH /api/risks/:id ──────────────────────────────────────
async function updateRisk(req, res) {
    try {
        const { id } = req.params;
        const existing = await (0, database_1.query)(`SELECT id FROM pkpt.risk_data WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (!existing.rows[0]) {
            return res.status(404).json({ success: false, message: 'Risiko tidak ditemukan.' });
        }
        const { direktorat_id, divisi_id, departemen_id, sasaran_korporat_id, sasaran_bidang, hos_kategori_id, sasaran_strategis_id, nama_risiko, parameter_kemungkinan, tingkat_risiko_inherent, tingkat_risiko_target, pelaksanaan_mitigasi, realisasi_tingkat_risiko, penyebab_internal, penyebab_eksternal, } = req.body;
        const [skor_i, level_i] = parseScore(tingkat_risiko_inherent);
        const [skor_t, level_t] = parseScore(tingkat_risiko_target);
        const [skor_r, level_r] = parseScore(realisasi_tingkat_risiko);
        const orgNames = await resolveOrgNames(direktorat_id, divisi_id, departemen_id);
        const skName = await resolveSasaranName(sasaran_korporat_id);
        await (0, database_1.query)(`UPDATE pkpt.risk_data SET
         direktorat_id           = COALESCE($1,  direktorat_id),
         divisi_id               = COALESCE($2,  divisi_id),
         departemen_id           = COALESCE($3,  departemen_id),
         direktorat_nama         = COALESCE($4,  direktorat_nama),
         divisi_nama             = COALESCE($5,  divisi_nama),
         departemen_nama         = COALESCE($6,  departemen_nama),
         sasaran_korporat_id     = COALESCE($7,  sasaran_korporat_id),
         sasaran_korporat_nama   = COALESCE($8,  sasaran_korporat_nama),
         sasaran_bidang          = COALESCE($9,  sasaran_bidang),
         hos_kategori_id         = COALESCE($10, hos_kategori_id),
         sasaran_strategis_id    = COALESCE($11, sasaran_strategis_id),
         nama_risiko             = COALESCE($12, nama_risiko),
         parameter_kemungkinan   = COALESCE($13, parameter_kemungkinan),
         tingkat_risiko_inherent = COALESCE($14, tingkat_risiko_inherent),
         skor_inherent           = COALESCE($15, skor_inherent),
         level_inherent          = COALESCE($16, level_inherent),
         tingkat_risiko_target   = COALESCE($17, tingkat_risiko_target),
         skor_target             = COALESCE($18, skor_target),
         level_target            = COALESCE($19, level_target),
         pelaksanaan_mitigasi    = COALESCE($20, pelaksanaan_mitigasi),
         realisasi_tingkat_risiko= COALESCE($21, realisasi_tingkat_risiko),
         skor_realisasi          = COALESCE($22, skor_realisasi),
         level_realisasi         = COALESCE($23, level_realisasi),
         penyebab_internal       = COALESCE($24, penyebab_internal),
         penyebab_eksternal      = COALESCE($25, penyebab_eksternal),
         updated_at              = NOW()
       WHERE id = $26 AND deleted_at IS NULL`, [
            direktorat_id || null, divisi_id || null, departemen_id || null,
            orgNames.dir, orgNames.div, orgNames.dep,
            sasaran_korporat_id || null, skName, sasaran_bidang || null,
            hos_kategori_id || null, sasaran_strategis_id || null,
            nama_risiko || null, parameter_kemungkinan || null,
            tingkat_risiko_inherent || null, skor_i, level_i,
            tingkat_risiko_target || null, skor_t, level_t,
            pelaksanaan_mitigasi || null,
            realisasi_tingkat_risiko || null, skor_r, level_r,
            penyebab_internal || null, penyebab_eksternal || null,
            id,
        ]);
        logger_1.default.info('[RISK] updateRisk executed successfully', { riskId: id });
        return res.json({ success: true, message: 'Risiko berhasil diperbarui.' });
    }
    catch (err) {
        logger_1.default.error(`[RISK] updateRisk failed: ${err.message}`, { error: err, risk_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data risiko.' });
    }
}
// ── DELETE /api/risks/:id (soft delete) ──────────────────────
async function deleteRisk(req, res) {
    try {
        const { id } = req.params;
        const usageCheck = await (0, database_1.query)(`SELECT COUNT(*)::INT AS cnt FROM pkpt.annual_plan_risks WHERE risk_id = $1`, [id]);
        if (Number(usageCheck.rows[0]?.cnt ?? 0) > 0) {
            return res.status(409).json({
                success: false,
                message: 'Risiko ini sudah digunakan dalam Program PKPT dan tidak dapat dihapus.',
            });
        }
        const result = await (0, database_1.query)(`UPDATE pkpt.risk_data SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`, [id]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Risiko tidak ditemukan.' });
        }
        logger_1.default.info('[RISK] deleteRisk executed successfully', { riskId: id });
        return res.json({ success: true, message: 'Risiko berhasil dihapus.' });
    }
    catch (err) {
        logger_1.default.error(`[RISK] deleteRisk failed: ${err.message}`, { error: err, risk_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Gagal menghapus data risiko.' });
    }
}
// ── GET /api/risks/level-ref ──────────────────────────────────
async function getRiskLevelRef(_req, res) {
    try {
        const result = await (0, database_1.query)(`SELECT kode, label, warna_hex, warna_bg, warna_text, skor_min, skor_max, urutan
       FROM master.risk_level_ref
       ORDER BY urutan`);
        logger_1.default.info('[RISK] getRiskLevelRef executed successfully', { count: result.rows.length });
        return res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error(`[RISK] getRiskLevelRef failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/risks/sasaran-korporat ──────────────────────────
async function getSasaranKorporat(_req, res) {
    try {
        const result = await (0, database_1.query)(`SELECT id, kode, nama
       FROM master.sasaran_korporat
       WHERE is_active = TRUE
       ORDER BY kode`);
        logger_1.default.info('[RISK] getSasaranKorporat executed successfully', { count: result.rows.length });
        return res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error(`[RISK] getSasaranKorporat failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/risks/stats ──────────────────────────────────────
async function getRiskStats(req, res) {
    try {
        const { tahun } = req.query;
        const params = [];
        const cond = ['r.deleted_at IS NULL'];
        if (tahun) {
            params.push(Number(tahun));
            cond.push(`r.tahun = $${params.length}`);
        }
        const where = cond.join(' AND ');
        const params2 = [];
        const cond2 = ['deleted_at IS NULL'];
        if (tahun) {
            params2.push(Number(tahun));
            cond2.push(`tahun = $${params2.length}`);
        }
        const where2 = cond2.join(' AND ');
        const [byLevel, byDir, total] = await Promise.all([
            (0, database_1.query)(`SELECT r.level_inherent AS kode, l.label, l.warna_hex, COUNT(*)::INT AS jumlah
         FROM pkpt.risk_data r
         LEFT JOIN master.risk_level_ref l ON l.kode = r.level_inherent
         WHERE ${where}
         GROUP BY r.level_inherent, l.label, l.warna_hex, l.urutan
         ORDER BY l.urutan NULLS LAST`, params),
            (0, database_1.query)(`SELECT COALESCE(d.nama, r.direktorat_nama) AS direktorat, COUNT(*)::INT AS jumlah
         FROM pkpt.risk_data r
         LEFT JOIN master.direktorat d ON d.id = r.direktorat_id
         WHERE ${where}
         GROUP BY COALESCE(d.nama, r.direktorat_nama)
         ORDER BY jumlah DESC`, params),
            (0, database_1.query)(`SELECT COUNT(*)::INT AS total FROM pkpt.risk_data WHERE ${where2}`, params2),
        ]);
        logger_1.default.info('[RISK] getRiskStats executed successfully', { total: total.rows[0]?.total ?? 0, tahun });
        return res.json({
            success: true,
            data: {
                total: total.rows[0]?.total ?? 0,
                by_level: byLevel.rows,
                by_direktorat: byDir.rows,
            },
        });
    }
    catch (err) {
        logger_1.default.error(`[RISK] getRiskStats failed: ${err.message}`, { error: err, tahun: Number(req.query.tahun) });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── Helpers ───────────────────────────────────────────────────
function parseScore(raw) {
    if (!raw)
        return [null, null];
    const m = String(raw).match(/^(\d+)\s*\((\w+)\)/);
    if (!m)
        return [null, null];
    return [parseInt(m[1], 10), m[2].toUpperCase()];
}
async function resolveOrgNames(dirId, divId, depId) {
    const [dir, div, dep] = await Promise.all([
        dirId ? (0, database_1.query)(`SELECT nama FROM master.direktorat  WHERE id = $1`, [dirId]) : null,
        divId ? (0, database_1.query)(`SELECT nama FROM master.divisi      WHERE id = $1`, [divId]) : null,
        depId ? (0, database_1.query)(`SELECT nama FROM master.departemen  WHERE id = $1`, [depId]) : null,
    ]);
    return {
        dir: dir?.rows[0]?.nama ?? null,
        div: div?.rows[0]?.nama ?? null,
        dep: dep?.rows[0]?.nama ?? null,
    };
}
async function resolveSasaranName(skId) {
    if (!skId)
        return null;
    const r = await (0, database_1.query)(`SELECT nama FROM master.sasaran_korporat WHERE id = $1`, [skId]);
    return r.rows[0]?.nama ?? null;
}
// ── GET /api/risks/template — download Excel template untuk import ───
async function downloadRiskTemplate(_req, res) {
    try {
        const headers = [
            'id_risiko',
            'tahun',
            'direktorat_nama',
            'divisi_nama',
            'departemen_nama',
            'sasaran_korporat_nama',
            'sasaran_bidang',
            'nama_risiko',
            'parameter_kemungkinan',
            'tingkat_risiko_inherent',
            'skor_inherent',
            'level_inherent',
            'tingkat_risiko_target',
            'skor_target',
            'level_target',
            'pelaksanaan_mitigasi',
            'realisasi_tingkat_risiko',
            'skor_realisasi',
            'level_realisasi',
            'penyebab_internal',
            'penyebab_eksternal',
        ];
        const exampleRow = {
            id_risiko: 'RR-OOK-2026-001',
            tahun: 2026,
            direktorat_nama: 'Direktorat Operasional dan Keselamatan',
            divisi_nama: 'Operasional Bus',
            departemen_nama: 'Operasional Bus Rapid Transit (BRT)',
            sasaran_korporat_nama: 'Layanan Transportasi Berkualitas',
            sasaran_bidang: 'Meningkatkan keselamatan penumpang',
            nama_risiko: 'Keselamatan Penumpang: Kecelakaan Kendaraan',
            parameter_kemungkinan: 'Frekuensi',
            tingkat_risiko_inherent: '54 (E)',
            skor_inherent: 54,
            level_inherent: 'E',
            tingkat_risiko_target: '16 (M)',
            skor_target: 16,
            level_target: 'M',
            pelaksanaan_mitigasi: 'Pelatihan driver berkala + audit kendaraan',
            realisasi_tingkat_risiko: '25 (MT)',
            skor_realisasi: 25,
            level_realisasi: 'MT',
            penyebab_internal: 'Kelelahan driver, pemeliharaan kurang',
            penyebab_eksternal: 'Kondisi jalan, cuaca ekstrem',
        };
        const notes = [
            ['PETUNJUK PENGISIAN — Template Import Risiko RCSA SATRIA'],
            [''],
            ['Kolom wajib: id_risiko, tahun, nama_risiko'],
            ['Kolom level (level_inherent, level_target, level_realisasi) hanya boleh salah satu dari:'],
            ['  E  = Extreme      (51-54)'],
            ['  T  = Tinggi       (41-50)'],
            ['  MT = Medium Tinggi (31-40)'],
            ['  M  = Medium       (21-30)'],
            ['  RM = Rendah Medium (11-20)'],
            ['  R  = Rendah       (1-10)'],
            [''],
            ['Kolom direktorat_nama/divisi_nama/departemen_nama akan dipetakan otomatis ke master organisasi.'],
            ['Jika nama tidak ditemukan di master, data tetap disimpan sebagai teks fallback.'],
            [''],
            ['Contoh baris tersedia di sheet "Data".'],
            ['Hapus baris contoh sebelum import sesungguhnya.'],
        ];
        const wb = XLSX.utils.book_new();
        const wsData = XLSX.utils.aoa_to_sheet([headers, headers.map((h) => exampleRow[h] ?? '')]);
        wsData['!cols'] = headers.map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(wb, wsData, 'Data');
        const wsNotes = XLSX.utils.aoa_to_sheet(notes);
        wsNotes['!cols'] = [{ wch: 90 }];
        XLSX.utils.book_append_sheet(wb, wsNotes, 'Petunjuk');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="template_import_risiko.xlsx"');
        logger_1.default.info('[RISKS] Template risiko diunduh');
        return res.send(buf);
    }
    catch (err) {
        logger_1.default.error(`[RISKS] Download template gagal: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Gagal membuat template Excel.' });
    }
}
//# sourceMappingURL=risk.controller.js.map