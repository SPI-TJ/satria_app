"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
router.get('/notifications', auth_middleware_1.authenticate, notifications_controller_1.getNotifications);
router.put('/notifications/read-all', auth_middleware_1.authenticate, notifications_controller_1.markAllAsRead);
router.put('/notifications/:id/read', auth_middleware_1.authenticate, notifications_controller_1.markAsRead);
router.delete('/notifications/:id', auth_middleware_1.authenticate, notifications_controller_1.deleteNotification);
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map