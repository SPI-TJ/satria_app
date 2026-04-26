"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditors = getAuditors;
const database_1 = require("../../config/database");
const logger_1 = __importDefault(require("../../utils/logger"));
// GET /api/auditors — daftar auditor aktif untuk penugasan tim
async function getAuditors(req, res) {
    try {
        const result = await (0, database_1.query)(`SELECT id, nik, nama_lengkap, role, jabatan
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
         nama_lengkap ASC`);
        logger_1.default.info('[AUDITORS] Fetched auditors list');
        return res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error(`[AUDITORS] Get auditors failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
//# sourceMappingURL=auditors.controller.js.map