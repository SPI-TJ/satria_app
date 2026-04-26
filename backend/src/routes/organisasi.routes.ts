import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getDirektorats, getDirektoratById, createDirektorat, updateDirektorat,
  getDivisis, getDivisiById, createDivisi, updateDivisi,
  getDepartemens, getDepartemenById, createDepartemen, updateDepartemen,
  getDirektoratsDropdown, getDivisDropdown, getDepartemensDropdown, getSasaranKorporatDropdown,
} from '../controllers/organisasi.controller';

const router = Router();
const adminOnly = requireRole('admin_spi', 'it_admin');

// ── Dropdown endpoints (simple list, no pagination) ──────────
router.get('/dropdown/direktorat',       getDirektoratsDropdown);
router.get('/dropdown/divisi',           getDivisDropdown);
router.get('/dropdown/departemen',       getDepartemensDropdown);
router.get('/dropdown/sasaran-korporat', getSasaranKorporatDropdown);

// ── Direktorat (Management with pagination) ─────────────────
router.get   ('/direktorat',     getDirektorats);
router.get   ('/direktorat/:id', getDirektoratById);
router.post  ('/direktorat',     authenticate, adminOnly, createDirektorat);
router.patch ('/direktorat/:id', authenticate, adminOnly, updateDirektorat);

// ── Divisi ────────────────────────────────────────────────────
router.get   ('/divisi',     getDivisis);
router.get   ('/divisi/:id', getDivisiById);
router.post  ('/divisi',     authenticate, adminOnly, createDivisi);
router.patch ('/divisi/:id', authenticate, adminOnly, updateDivisi);

// ── Departemen ────────────────────────────────────────────────
router.get   ('/departemen',     getDepartemens);
router.get   ('/departemen/:id', getDepartemenById);
router.post  ('/departemen',     authenticate, adminOnly, createDepartemen);
router.patch ('/departemen/:id', authenticate, adminOnly, updateDepartemen);

export default router;
