"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const users_controller_1 = require("../controllers/users.controller");
const activity_log_controller_1 = require("../controllers/activity-log.controller");
const router = (0, express_1.Router)();
const adminOnly = (0, auth_middleware_1.requireRole)('admin_spi', 'it_admin');
// ── User Management ──────────────────────────────────────────
router.get('/users/stats', auth_middleware_1.authenticate, adminOnly, users_controller_1.getUserStats);
router.get('/users', auth_middleware_1.authenticate, adminOnly, users_controller_1.getUsers);
router.get('/users/:id', auth_middleware_1.authenticate, adminOnly, users_controller_1.getUserById);
router.post('/users', auth_middleware_1.authenticate, adminOnly, users_controller_1.createUser);
router.patch('/users/:id', auth_middleware_1.authenticate, adminOnly, users_controller_1.updateUser);
router.patch('/users/:id/module-access', auth_middleware_1.authenticate, adminOnly, users_controller_1.updateModuleAccess);
router.post('/users/:id/reset-password', auth_middleware_1.authenticate, adminOnly, users_controller_1.resetUserPassword);
router.post('/users/:id/set-password', auth_middleware_1.authenticate, adminOnly, users_controller_1.setUserPassword);
router.patch('/users/:id/toggle-active', auth_middleware_1.authenticate, adminOnly, users_controller_1.toggleUserActive);
router.delete('/users/:id', auth_middleware_1.authenticate, adminOnly, users_controller_1.deleteUser);
// ── Activity Log ─────────────────────────────────────────────
router.get('/activity-log', auth_middleware_1.authenticate, adminOnly, activity_log_controller_1.getActivityLog);
router.get('/activity-log/summary', auth_middleware_1.authenticate, adminOnly, activity_log_controller_1.getActivityLogSummary);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map