"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.me);
router.put('/change-password', auth_middleware_1.authenticate, auth_controller_1.changePassword);
router.post('/reset-password', auth_middleware_1.authenticate, auth_controller_1.resetToDefault);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map