/**
 * Modul 1 — Perencanaan Pengawasan Tahunan (PKPT)
 * Routes: risks, annual-plans, auditors, workload, dashboard stats
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {
  getRisks, getRiskById, createRisk, updateRisk, deleteRisk,
  importFromTrust, importFromFile, getTrustStatus, getDivisiList,
} from '../controllers/module1/risk.controller';
import {
  getAnnualPlans, getAnnualPlanById, createAnnualPlan,
  updateAnnualPlan, deleteAnnualPlan, finalizeAnnualPlan,
  getDashboardStats,
} from '../controllers/module1/annual-plans.controller';
import { getAuditors } from '../controllers/module1/auditors.controller';
import { getWorkload }  from '../controllers/module1/workload.controller';

const router = Router();

// ── Upload config ─────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Hanya file Excel (.xlsx, .xls) dan CSV yang diperbolehkan.'));
  },
});

// ── Dashboard Stats ───────────────────────────────────────────
router.get('/dashboard/stats', authenticate, getDashboardStats);

// ── Risk Data — static routes HARUS di atas /:id ─────────────
router.get ('/risks/trust/status',  authenticate, getTrustStatus);
router.get ('/risks/divisi-list',   authenticate, getDivisiList);
router.post('/risks/import/trust',  authenticate, importFromTrust);
router.post('/risks/import/file',   authenticate, upload.single('file'), importFromFile);

// CRUD risks
router.get   ('/risks',     authenticate, getRisks);
router.post  ('/risks',     authenticate, createRisk);
router.get   ('/risks/:id', authenticate, getRiskById);
router.patch ('/risks/:id', authenticate, updateRisk);
router.delete('/risks/:id', authenticate, deleteRisk);

// ── Auditors (untuk pilih anggota tim) ───────────────────────
router.get('/auditors', authenticate, getAuditors);

// ── Workload (Beban Kerja Auditor) ────────────────────────────
router.get('/workload', authenticate, getWorkload);

// ── Annual Audit Plans ────────────────────────────────────────
router.get   ('/annual-plans',              authenticate, getAnnualPlans);
router.post  ('/annual-plans',              authenticate, createAnnualPlan);
router.get   ('/annual-plans/:id',          authenticate, getAnnualPlanById);
router.patch ('/annual-plans/:id',          authenticate, updateAnnualPlan);
router.delete('/annual-plans/:id',          authenticate, deleteAnnualPlan);
router.patch ('/annual-plans/:id/finalize', authenticate, finalizeAnnualPlan);

export default router;
