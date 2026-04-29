"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHosKategoris = getHosKategoris;
exports.createHosKategori = createHosKategori;
exports.updateHosKategori = updateHosKategori;
exports.deleteHosKategori = deleteHosKategori;
exports.getSasaranStrategis = getSasaranStrategis;
exports.createSasaranStrategis = createSasaranStrategis;
exports.updateSasaranStrategis = updateSasaranStrategis;
exports.deleteSasaranStrategis = deleteSasaranStrategis;
exports.getBobotPeran = getBobotPeran;
exports.upsertBobotPeran = upsertBobotPeran;
exports.getKelompokPenugasan = getKelompokPenugasan;
exports.createKelompokPenugasan = createKelompokPenugasan;
exports.updateKelompokPenugasan = updateKelompokPenugasan;
exports.deleteKelompokPenugasan = deleteKelompokPenugasan;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const currentYear = () => new Date().getFullYear();
// ════════════════════════════════════════════════════════════
//  1. HOUSE OF STRATEGY — KATEGORI (Perspektif)
// ════════════════════════════════════════════════════════════
async function getHosKategoris(req, res) {
    try {
        const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();
        const result = await (0, database_1.query)(`SELECT id, tahun, kode, nama_perspektif, deskripsi, urutan,
              created_at, updated_at
         FROM master.house_of_strategy_kategori
        WHERE deleted_at IS NULL AND tahun = $1
        ORDER BY urutan, kode`, [tahun]);
        return res.json({ success: true, data: result.rows, meta: { tahun } });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] HoS list failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function createHosKategori(req, res) {
    try {
        const { tahun, kode, nama_perspektif, deskripsi, urutan } = req.body;
        if (!kode || !nama_perspektif) {
            return res.status(400).json({ success: false, message: 'Kode dan nama wajib diisi.' });
        }
        const result = await (0, database_1.query)(`INSERT INTO master.house_of_strategy_kategori
         (tahun, kode, nama_perspektif, deskripsi, urutan)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`, [tahun ?? currentYear(), kode, nama_perspektif, deskripsi ?? null, urutan ?? 0]);
        logger_1.default.info('[SETTINGS] HoS kategori created', { id: result.rows[0].id, by: req.user.id });
        return res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        const msg = err.message;
        if (msg.includes('uq_hos_kategori')) {
            return res.status(409).json({ success: false, message: 'Kode sudah ada untuk tahun tersebut.' });
        }
        logger_1.default.error(`[SETTINGS] HoS create failed: ${msg}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function updateHosKategori(req, res) {
    try {
        const { id } = req.params;
        const { kode, nama_perspektif, deskripsi, urutan } = req.body;
        const result = await (0, database_1.query)(`UPDATE master.house_of_strategy_kategori
          SET kode            = COALESCE($2, kode),
              nama_perspektif = COALESCE($3, nama_perspektif),
              deskripsi       = COALESCE($4, deskripsi),
              urutan          = COALESCE($5, urutan),
              updated_at      = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`, [id, kode, nama_perspektif, deskripsi, urutan]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] HoS update failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function deleteHosKategori(req, res) {
    try {
        const { id } = req.params;
        await (0, database_1.query)(`UPDATE master.house_of_strategy_kategori
          SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`, [id]);
        logger_1.default.info('[SETTINGS] HoS kategori deleted', { id, by: req.user.id });
        return res.json({ success: true, message: 'Kategori dihapus.' });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] HoS delete failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
// ════════════════════════════════════════════════════════════
//  2. SASARAN STRATEGIS (Child of HoS Kategori)
// ════════════════════════════════════════════════════════════
async function getSasaranStrategis(req, res) {
    try {
        const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();
        const { kategori_id, search } = req.query;
        const params = [tahun];
        const conds = ['s.deleted_at IS NULL', 's.tahun = $1'];
        if (kategori_id) {
            params.push(kategori_id);
            conds.push(`s.kategori_id = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            conds.push(`(s.nama ILIKE $${params.length} OR s.kode ILIKE $${params.length})`);
        }
        const result = await (0, database_1.query)(`SELECT s.id, s.kategori_id, s.tahun, s.kode, s.nama, s.deskripsi,
              s.created_by, u.nama_lengkap AS created_by_nama,
              k.kode AS kategori_kode, k.nama_perspektif AS kategori_nama,
              s.created_at, s.updated_at
         FROM master.sasaran_strategis s
         LEFT JOIN master.house_of_strategy_kategori k ON k.id = s.kategori_id
         LEFT JOIN auth.users u ON u.id = s.created_by
        WHERE ${conds.join(' AND ')}
        ORDER BY k.urutan NULLS LAST, s.kode NULLS LAST, s.nama`, params);
        return res.json({ success: true, data: result.rows, meta: { tahun } });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Sasaran list failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function createSasaranStrategis(req, res) {
    try {
        const { kategori_id, tahun, kode, nama, deskripsi } = req.body;
        if (!kategori_id || !nama) {
            return res.status(400).json({ success: false, message: 'Kategori dan nama wajib diisi.' });
        }
        // Auto-derive tahun dari kategori jika tidak dikirim
        let finalTahun = tahun;
        if (!finalTahun) {
            const k = await (0, database_1.query)(`SELECT tahun FROM master.house_of_strategy_kategori WHERE id = $1`, [kategori_id]);
            finalTahun = k.rows[0]?.tahun ?? currentYear();
        }
        const result = await (0, database_1.query)(`INSERT INTO master.sasaran_strategis
         (kategori_id, tahun, kode, nama, deskripsi, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`, [kategori_id, finalTahun, kode ?? null, nama, deskripsi ?? null, req.user.id]);
        logger_1.default.info('[SETTINGS] Sasaran strategis created', { id: result.rows[0].id, by: req.user.id });
        return res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Sasaran create failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function updateSasaranStrategis(req, res) {
    try {
        const { id } = req.params;
        const { kode, nama, deskripsi, kategori_id } = req.body;
        const result = await (0, database_1.query)(`UPDATE master.sasaran_strategis
          SET kategori_id = COALESCE($2, kategori_id),
              kode        = COALESCE($3, kode),
              nama        = COALESCE($4, nama),
              deskripsi   = COALESCE($5, deskripsi),
              updated_at  = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`, [id, kategori_id, kode, nama, deskripsi]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sasaran tidak ditemukan.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Sasaran update failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function deleteSasaranStrategis(req, res) {
    try {
        const { id } = req.params;
        await (0, database_1.query)(`UPDATE master.sasaran_strategis SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`, [id]);
        logger_1.default.info('[SETTINGS] Sasaran deleted', { id, by: req.user.id });
        return res.json({ success: true, message: 'Sasaran strategis dihapus.' });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Sasaran delete failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
// ════════════════════════════════════════════════════════════
//  3. BOBOT PERAN (per tahun)
// ════════════════════════════════════════════════════════════
async function getBobotPeran(req, res) {
    try {
        const tahun = req.query.tahun ? Number(req.query.tahun) : currentYear();
        const result = await (0, database_1.query)(`SELECT id, tahun, peran, bobot, max_bobot_per_bulan, keterangan,
              created_at, updated_at
         FROM master.bobot_peran
        WHERE deleted_at IS NULL AND tahun = $1
        ORDER BY CASE peran
                   WHEN 'Penanggung Jawab'  THEN 1
                   WHEN 'Pengendali Teknis' THEN 2
                   WHEN 'Ketua Tim'         THEN 3
                   WHEN 'Anggota Tim'       THEN 4
                   ELSE 99
                 END`, [tahun]);
        return res.json({ success: true, data: result.rows, meta: { tahun } });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Bobot list failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
/**
 * Upsert bobot per tahun (mass update).
 * Body: { tahun, items: [{ peran, bobot, max_bobot_per_bulan }] }
 */
async function upsertBobotPeran(req, res) {
    try {
        const tahun = Number(req.body.tahun ?? currentYear());
        const items = req.body.items ?? [];
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Items wajib diisi (array).' });
        }
        for (const it of items) {
            await (0, database_1.query)(`INSERT INTO master.bobot_peran (tahun, peran, bobot, max_bobot_per_bulan)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tahun, peran)
         DO UPDATE SET bobot = EXCLUDED.bobot,
                       max_bobot_per_bulan = EXCLUDED.max_bobot_per_bulan,
                       updated_at = NOW()`, [tahun, it.peran, it.bobot, it.max_bobot_per_bulan]);
        }
        logger_1.default.info('[SETTINGS] Bobot peran upserted', { tahun, count: items.length, by: req.user.id });
        const result = await (0, database_1.query)(`SELECT * FROM master.bobot_peran
        WHERE tahun = $1 AND deleted_at IS NULL
        ORDER BY peran`, [tahun]);
        return res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Bobot upsert failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
// ════════════════════════════════════════════════════════════
//  4. KELOMPOK PENUGASAN  (master generik: Kategori / Sifat
//     Program / Kategori Anggaran / dst.)
// ════════════════════════════════════════════════════════════
async function getKelompokPenugasan(req, res) {
    try {
        const { tipe } = req.query;
        const params = [];
        const conds = ['deleted_at IS NULL'];
        if (tipe) {
            params.push(tipe);
            conds.push(`tipe = $${params.length}`);
        }
        const result = await (0, database_1.query)(`SELECT id, tipe, nilai, urutan, is_active, created_at, updated_at
         FROM master.kelompok_penugasan
        WHERE ${conds.join(' AND ')}
        ORDER BY tipe, urutan, nilai`, params);
        return res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Kelompok list failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function createKelompokPenugasan(req, res) {
    try {
        const { tipe, nilai, urutan } = req.body;
        if (!tipe || !nilai) {
            return res.status(400).json({ success: false, message: 'tipe dan nilai wajib diisi.' });
        }
        const result = await (0, database_1.query)(`INSERT INTO master.kelompok_penugasan (tipe, nilai, urutan)
       VALUES ($1,$2,$3)
       RETURNING *`, [tipe, nilai, urutan ?? 0]);
        logger_1.default.info('[SETTINGS] Kelompok penugasan created', { id: result.rows[0].id, by: req.user.id });
        return res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        const msg = err.message;
        if (msg.includes('uq_kelompok_penugasan')) {
            return res.status(409).json({ success: false, message: 'Nilai sudah ada untuk tipe tersebut.' });
        }
        logger_1.default.error(`[SETTINGS] Kelompok create failed: ${msg}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function updateKelompokPenugasan(req, res) {
    try {
        const { id } = req.params;
        const { tipe, nilai, urutan, is_active } = req.body;
        const result = await (0, database_1.query)(`UPDATE master.kelompok_penugasan
          SET tipe       = COALESCE($2, tipe),
              nilai      = COALESCE($3, nilai),
              urutan     = COALESCE($4, urutan),
              is_active  = COALESCE($5, is_active),
              updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`, [id, tipe, nilai, urutan, is_active]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelompok penugasan tidak ditemukan.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        const msg = err.message;
        if (msg.includes('uq_kelompok_penugasan')) {
            return res.status(409).json({ success: false, message: 'Nilai sudah ada untuk tipe tersebut.' });
        }
        logger_1.default.error(`[SETTINGS] Kelompok update failed: ${msg}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function deleteKelompokPenugasan(req, res) {
    try {
        const { id } = req.params;
        await (0, database_1.query)(`UPDATE master.kelompok_penugasan SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`, [id]);
        logger_1.default.info('[SETTINGS] Kelompok penugasan deleted', { id, by: req.user.id });
        return res.json({ success: true, message: 'Kelompok penugasan dihapus.' });
    }
    catch (err) {
        logger_1.default.error(`[SETTINGS] Kelompok delete failed: ${err.message}`, { error: err });
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
//# sourceMappingURL=settings.controller.js.map