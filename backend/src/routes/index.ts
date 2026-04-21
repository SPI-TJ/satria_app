/**
 * API Router — menggabungkan semua domain route.
 * Setiap file route mengelola satu domain/modul secara independen.
 */
import { Router } from 'express';
import authRoutes          from './auth.routes';
import notificationRoutes  from './notifications.routes';
import adminRoutes         from './admin.routes';
import module1Routes       from './module1.routes';
import organisasiRoutes    from './organisasi.routes';

const router = Router();

// ── Auth ──────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── Notifications ─────────────────────────────────────────────
router.use('/', notificationRoutes);

// ── Admin (User Management + Activity Log) ────────────────────
router.use('/', adminRoutes);

// ── Modul 1: Perencanaan Pengawasan Tahunan ───────────────────
router.use('/', module1Routes);

// ── Organisasi (Direktorat, Divisi, Departemen) ───────────────
router.use('/', organisasiRoutes);

export default router;
