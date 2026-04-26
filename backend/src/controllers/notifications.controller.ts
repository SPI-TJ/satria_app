import { Request, Response } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';

export async function getNotifications(req: Request, res: Response) {
  try {
    const { type, unread_only } = req.query;
    const userId = req.user!.id;

    let sql = `
      SELECT id, title, message, notification_type AS type,
             is_read, entity_id, entity_type, link_url, created_at
      FROM pelaporan.notifications
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (type && type !== 'All') {
      params.push(type);
      sql += ` AND notification_type = $${params.length}`;
    }
    if (unread_only === 'true') {
      sql += ' AND is_read = FALSE';
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, params);

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM pelaporan.notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId],
    );

    logger.info(`[NOTIFICATIONS] Fetched notifications for user`, { user_id: userId, unread_count: countResult.rows[0]?.count });
    return res.json({
      success: true,
      data: result.rows,
      meta: { unread_count: Number(countResult.rows[0]?.count ?? 0) },
    });
  } catch (err) {
    logger.error(`[NOTIFICATIONS] Get notifications failed: ${(err as Error).message}`, { error: err, user_id: req.user?.id });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE pelaporan.notifications SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, req.user!.id],
    );
    logger.info(`[NOTIFICATIONS] Marked notification as read`, { notification_id: id, user_id: req.user!.id });
    return res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    logger.error(`[NOTIFICATIONS] Mark as read failed: ${(err as Error).message}`, { error: err, notification_id: req.params.id });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    await query(
      `UPDATE pelaporan.notifications SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user!.id],
    );
    logger.info(`[NOTIFICATIONS] Marked all notifications as read`, { user_id: req.user!.id });
    return res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    logger.error(`[NOTIFICATIONS] Mark all as read failed: ${(err as Error).message}`, { error: err, user_id: req.user!.id });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      'DELETE FROM pelaporan.notifications WHERE id = $1 AND user_id = $2',
      [id, req.user!.id],
    );
    logger.info(`[NOTIFICATIONS] Deleted notification`, { notification_id: id, user_id: req.user!.id });
    return res.json({ success: true, message: 'Notifikasi dihapus.' });
  } catch (err) {
    logger.error(`[NOTIFICATIONS] Delete notification failed: ${(err as Error).message}`, { error: err, notification_id: req.params.id });
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
