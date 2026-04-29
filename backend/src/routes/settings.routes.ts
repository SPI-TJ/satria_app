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
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getHosKategoris, createHosKategori, updateHosKategori, deleteHosKategori,
  getSasaranStrategis, createSasaranStrategis, updateSasaranStrategis, deleteSasaranStrategis,
  getBobotPeran, upsertBobotPeran,
  getKelompokPenugasan, createKelompokPenugasan, updateKelompokPenugasan, deleteKelompokPenugasan,
} from '../controllers/settings.controller';

const router = Router();

const adminOnly = requireRole('kepala_spi', 'admin_spi');
const allSpi = requireRole('kepala_spi', 'admin_spi', 'pengendali_teknis', 'anggota_tim');

// ── House of Strategy — Kategori ─────────────────────────────
router.get   ('/settings/hos-kategori',     authenticate, getHosKategoris);
router.post  ('/settings/hos-kategori',     authenticate, adminOnly, createHosKategori);
router.patch ('/settings/hos-kategori/:id', authenticate, adminOnly, updateHosKategori);
router.delete('/settings/hos-kategori/:id', authenticate, adminOnly, deleteHosKategori);

// ── Sasaran Strategis ────────────────────────────────────────
router.get   ('/settings/sasaran-strategis',     authenticate, getSasaranStrategis);
router.post  ('/settings/sasaran-strategis',     authenticate, allSpi, createSasaranStrategis);
router.patch ('/settings/sasaran-strategis/:id', authenticate, allSpi, updateSasaranStrategis);
router.delete('/settings/sasaran-strategis/:id', authenticate, allSpi, deleteSasaranStrategis);

// ── Bobot Peran ──────────────────────────────────────────────
router.get  ('/settings/bobot-peran', authenticate, getBobotPeran);
router.put  ('/settings/bobot-peran', authenticate, adminOnly, upsertBobotPeran);

// ── Kelompok Penugasan (Kategori, Sifat Program, Kategori Anggaran, dll) ─
router.get   ('/settings/kelompok-penugasan',     authenticate, getKelompokPenugasan);
router.post  ('/settings/kelompok-penugasan',     authenticate, adminOnly, createKelompokPenugasan);
router.patch ('/settings/kelompok-penugasan/:id', authenticate, adminOnly, updateKelompokPenugasan);
router.delete('/settings/kelompok-penugasan/:id', authenticate, adminOnly, deleteKelompokPenugasan);

export default router;
