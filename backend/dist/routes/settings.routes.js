"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Pengaturan Sistem — Routes
 *
 * Base path : /settings
 *
 * Access:
 *   - GET   : semua user terautentikasi (read untuk dropdown lain)
 *   - WRITE :
 *       · House of Strategy Kategori → kepala_spi, admin_spi
 *       · Sasaran Strategis           → semua SPI
 *       · Bobot Peran                 → kepala_spi, admin_spi
 *       · Tipe Penugasan              → kepala_spi, admin_spi
 */
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const settings_controller_1 = require("../controllers/settings.controller");
const router = (0, express_1.Router)();
const adminOnly = (0, auth_middleware_1.requireRole)('kepala_spi', 'admin_spi');
const allSpi = (0, auth_middleware_1.requireRole)('kepala_spi', 'admin_spi', 'pengendali_teknis', 'anggota_tim');
// ── House of Strategy — Kategori ─────────────────────────────
router.get('/settings/hos-kategori', auth_middleware_1.authenticate, settings_controller_1.getHosKategoris);
router.post('/settings/hos-kategori', auth_middleware_1.authenticate, adminOnly, settings_controller_1.createHosKategori);
router.patch('/settings/hos-kategori/:id', auth_middleware_1.authenticate, adminOnly, settings_controller_1.updateHosKategori);
router.delete('/settings/hos-kategori/:id', auth_middleware_1.authenticate, adminOnly, settings_controller_1.deleteHosKategori);
// ── Sasaran Strategis ────────────────────────────────────────
router.get('/settings/sasaran-strategis', auth_middleware_1.authenticate, settings_controller_1.getSasaranStrategis);
router.post('/settings/sasaran-strategis', auth_middleware_1.authenticate, allSpi, settings_controller_1.createSasaranStrategis);
router.patch('/settings/sasaran-strategis/:id', auth_middleware_1.authenticate, allSpi, settings_controller_1.updateSasaranStrategis);
router.delete('/settings/sasaran-strategis/:id', auth_middleware_1.authenticate, allSpi, settings_controller_1.deleteSasaranStrategis);
// ── Bobot Peran ──────────────────────────────────────────────
router.get('/settings/bobot-peran', auth_middleware_1.authenticate, settings_controller_1.getBobotPeran);
router.put('/settings/bobot-peran', auth_middleware_1.authenticate, adminOnly, settings_controller_1.upsertBobotPeran);
// ── Kelompok Penugasan (Kategori, Sifat Program, Kategori Anggaran, dll) ─
router.get('/settings/kelompok-penugasan', auth_middleware_1.authenticate, settings_controller_1.getKelompokPenugasan);
router.post('/settings/kelompok-penugasan', auth_middleware_1.authenticate, adminOnly, settings_controller_1.createKelompokPenugasan);
router.patch('/settings/kelompok-penugasan/:id', auth_middleware_1.authenticate, adminOnly, settings_controller_1.updateKelompokPenugasan);
router.delete('/settings/kelompok-penugasan/:id', auth_middleware_1.authenticate, adminOnly, settings_controller_1.deleteKelompokPenugasan);
exports.default = router;
//# sourceMappingURL=settings.routes.js.map