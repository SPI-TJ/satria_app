"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.deleteNotification = deleteNotification;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
async function getNotifications(req, res) {
    try {
        const { type, unread_only } = req.query;
        const userId = req.user.id;
        let sql = `
      SELECT id, title, message, notification_type AS type,
             is_read, entity_id, entity_type, link_url, created_at
      FROM pelaporan.notifications
      WHERE user_id = $1
    `;
        const params = [userId];
        if (type && type !== 'All') {
            params.push(type);
            sql += ` AND notification_type = $${params.length}`;
        }
        if (unread_only === 'true') {
            sql += ' AND is_read = FALSE';
        }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const result = await (0, database_1.query)(sql, params);
        const countResult = await (0, database_1.query)('SELECT COUNT(*) FROM pelaporan.notifications WHERE user_id = $1 AND is_read = FALSE', [userId]);
        logger_1.default.info(`[NOTIFICATIONS] Fetched notifications for user`, { user_id: userId, unread_count: countResult.rows[0]?.count });
        return res.json({
            success: true,
            data: result.rows,
            meta: { unread_count: Number(countResult.rows[0]?.count ?? 0) },
        });
    }
    catch (err) {
        logger_1.default.error(`[NOTIFICATIONS] Get notifications failed: ${err.message}`, { error: err, user_id: req.user?.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        await (0, database_1.query)(`UPDATE pelaporan.notifications SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
        logger_1.default.info(`[NOTIFICATIONS] Marked notification as read`, { notification_id: id, user_id: req.user.id });
        return res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
    }
    catch (err) {
        logger_1.default.error(`[NOTIFICATIONS] Mark as read failed: ${err.message}`, { error: err, notification_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
async function markAllAsRead(req, res) {
    try {
        await (0, database_1.query)(`UPDATE pelaporan.notifications SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE`, [req.user.id]);
        logger_1.default.info(`[NOTIFICATIONS] Marked all notifications as read`, { user_id: req.user.id });
        return res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
    }
    catch (err) {
        logger_1.default.error(`[NOTIFICATIONS] Mark all as read failed: ${err.message}`, { error: err, user_id: req.user.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
async function deleteNotification(req, res) {
    try {
        const { id } = req.params;
        await (0, database_1.query)('DELETE FROM pelaporan.notifications WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        logger_1.default.info(`[NOTIFICATIONS] Deleted notification`, { notification_id: id, user_id: req.user.id });
        return res.json({ success: true, message: 'Notifikasi dihapus.' });
    }
    catch (err) {
        logger_1.default.error(`[NOTIFICATIONS] Delete notification failed: ${err.message}`, { error: err, notification_id: req.params.id });
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
//# sourceMappingURL=notifications.controller.js.map