import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getUsers, getUserById, createUser, updateUser,
  resetUserPassword, setUserPassword, toggleUserActive, deleteUser,
  updateModuleAccess, getUserStats,
} from '../controllers/users.controller';
import { getActivityLog, getActivityLogSummary } from '../controllers/activity-log.controller';

const router = Router();
const adminOnly = requireRole('admin_spi', 'it_admin');

// ── User Management ──────────────────────────────────────────
router.get   ('/users/stats',             authenticate, adminOnly, getUserStats);
router.get   ('/users',                   authenticate, adminOnly, getUsers);
router.get   ('/users/:id',               authenticate, adminOnly, getUserById);
router.post  ('/users',                   authenticate, adminOnly, createUser);
router.patch ('/users/:id',               authenticate, adminOnly, updateUser);
router.patch ('/users/:id/module-access', authenticate, adminOnly, updateModuleAccess);
router.post  ('/users/:id/reset-password',authenticate, adminOnly, resetUserPassword);
router.post  ('/users/:id/set-password',  authenticate, adminOnly, setUserPassword);
router.patch ('/users/:id/toggle-active', authenticate, adminOnly, toggleUserActive);
router.delete('/users/:id',               authenticate, adminOnly, deleteUser);

// ── Activity Log ─────────────────────────────────────────────
router.get('/activity-log',         authenticate, adminOnly, getActivityLog);
router.get('/activity-log/summary', authenticate, adminOnly, getActivityLogSummary);

export default router;
