"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLog = getActivityLog;
exports.getActivityLogSummary = getActivityLogSummary;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const ACTION_LABELS = {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    CHANGE_PASSWORD: 'Ubah Password',
    RESET_PASSWORD: 'Reset Password',
    CREATE_USER: 'Tambah User',
    UPDATE_USER: 'Edit User',
    UPDATE_MODULE_ACCESS: 'Ubah Akses Modul',
    SET_PASSWORD: 'Set Password Baru',
    ACTIVATE_USER: 'Aktifkan User',
    DEACTIVATE_USER: 'Nonaktifkan User',
    DELETE_USER: 'Hapus User',
    CREATE_RISK: 'Tambah Risiko',
    UPDATE_RISK: 'Edit Risiko',
    DELETE_RISK: 'Hapus Risiko',
    IMPORT_RISK_TRUST: 'Import Risiko (TRUST)',
    IMPORT_RISK_FILE: 'Import Risiko (File)',
    CREATE_PLAN: 'Buat Program PKPT',
    UPDATE_PLAN: 'Edit Program PKPT',
    DELETE_PLAN: 'Hapus Program PKPT',
    FINALIZE_PLAN: 'Finalisasi PKPT',
};
// ── GET /api/activity-log ────────────────────────────────────
async function getActivityLog(req, res) {
    try {
        const { user_id, action, modul, date_from, date_to, search, page = '1', limit = '25', } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const params = [];
        const conditions = [];
        if (user_id) {
            params.push(user_id);
            conditions.push(`l.user_id = $${params.length}`);
        }
        if (action) {
            params.push(action);
            conditions.push(`l.action = $${params.length}`);
        }
        if (modul) {
            params.push(modul);
            conditions.push(`l.modul = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            conditions.push(`l.created_at >= $${params.length}::date`);
        }
        if (date_to) {
            params.push(date_to);
            conditions.push(`l.created_at < ($${params.length}::date + INTERVAL '1 day')`);
        }
        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(u.nama_lengkap ILIKE $${params.length} OR l.action ILIKE $${params.length} OR l.modul ILIKE $${params.length})`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRes = await (0, database_1.query)(`SELECT COUNT(*)
       FROM auth.activity_log l
       JOIN auth.users u ON u.id = l.user_id
       ${where}`, params);
        const total = Number(countRes.rows[0]?.count ?? 0);
        params.push(Number(limit), offset);
        const dataRes = await (0, database_1.query)(`SELECT
         l.id,
         l.action,
         l.modul,
         l.entity_id,
         l.entity_type,
         l.ip_address,
         l.created_at,
         u.id        AS user_id,
         u.nama_lengkap AS user_nama,
         u.role      AS user_role,
         u.nik       AS user_nik
       FROM auth.activity_log l
       JOIN auth.users u ON u.id = l.user_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        // Distinct modul & action values for filter dropdowns
        const modulRes = await (0, database_1.query)(`SELECT DISTINCT modul FROM auth.activity_log ORDER BY modul`);
        const actionRes = await (0, database_1.query)(`SELECT DISTINCT action FROM auth.activity_log ORDER BY action`);
        logger_1.default.info('[ACTIVITY_LOG] Fetched activity logs', { page, limit, total, user_id });
        return res.json({
            success: true,
            data: dataRes.rows,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
                moduls: modulRes.rows.map((r) => r.modul),
                actions: actionRes.rows.map((r) => r.action),
                action_labels: ACTION_LABELS,
            },
        });
    }
    catch (err) {
        logger_1.default.error(`[ACTIVITY_LOG] Get activity logs failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
// ── GET /api/activity-log/summary — ringkasan per modul ──────
async function getActivityLogSummary(_req, res) {
    try {
        const [byModul, byAction, recent] = await Promise.all([
            (0, database_1.query)(`SELECT modul, COUNT(*) AS count
         FROM auth.activity_log
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY modul ORDER BY count DESC`),
            (0, database_1.query)(`SELECT action, COUNT(*) AS count
         FROM auth.activity_log
         WHERE created_at >= NOW() - INTERVAL '7 days'
         GROUP BY action ORDER BY count DESC LIMIT 10`),
            (0, database_1.query)(`SELECT COUNT(*) AS count FROM auth.activity_log WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        ]);
        logger_1.default.info('[ACTIVITY_LOG] Fetched activity log summary');
        return res.json({
            success: true,
            data: {
                total_24h: Number(recent.rows[0]?.count ?? 0),
                by_modul_30d: byModul.rows.map((r) => ({ modul: r.modul, count: Number(r.count) })),
                by_action_7d: byAction.rows.map((r) => ({ action: r.action, label: ACTION_LABELS[r.action] ?? r.action, count: Number(r.count) })),
            },
        });
    }
    catch (err) {
        logger_1.default.error(`[ACTIVITY_LOG] Get activity log summary failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
//# sourceMappingURL=activity-log.controller.js.map