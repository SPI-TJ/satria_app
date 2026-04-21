import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { login, me, changePassword, resetToDefault } from '../controllers/auth.controller';

const router = Router();

router.post('/login',           login);
router.get ('/me',              authenticate, me);
router.put ('/change-password', authenticate, changePassword);
router.post('/reset-password',  authenticate, resetToDefault);

export default router;
