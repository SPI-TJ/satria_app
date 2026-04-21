import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
} from '../controllers/notifications.controller';

const router = Router();

router.get   ('/notifications',          authenticate, getNotifications);
router.put   ('/notifications/read-all', authenticate, markAllAsRead);
router.put   ('/notifications/:id/read', authenticate, markAsRead);
router.delete('/notifications/:id',      authenticate, deleteNotification);

export default router;
