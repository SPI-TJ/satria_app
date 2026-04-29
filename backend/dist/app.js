"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
const morgan_middleware_1 = __importDefault(require("./middleware/morgan.middleware"));
const notifications_1 = require("./utils/notifications");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// ── Middleware ────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ── HTTP Request Logging ──────────────────────────────────────
app.use(morgan_middleware_1.default);
// ── Static uploads (PDF CEO Letter, dll) ──────────────────────
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
// ── Routes ────────────────────────────────────────────────────
app.use('/api', routes_1.default);
// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'SATRIA API', time: new Date() }));
// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    logger_1.default.error(`[Unhandled Error] ${err.message}`, { stack: err.stack });
    res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});
// ── Start ─────────────────────────────────────────────────────
database_1.pool.connect()
    .then(client => {
    client.release();
    logger_1.default.info('✅ Database connected successfully');
    app.listen(PORT, () => {
        logger_1.default.info(`🚀 SATRIA API running on http://localhost:${PORT}`);
        logger_1.default.debug(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    // ── Scheduler: scan deadline notifications ───────────────────
    // Jalankan segera 10 detik setelah startup, lalu ulangi setiap 6 jam.
    // Dedup built-in di scanDeadlineNotifications mencegah spam.
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    setTimeout(() => {
        (0, notifications_1.scanDeadlineNotifications)()
            .then((s) => logger_1.default.info('[SCHEDULER] initial deadline scan done', s))
            .catch((e) => logger_1.default.error(`[SCHEDULER] initial scan failed: ${e.message}`));
    }, 10000);
    setInterval(() => {
        (0, notifications_1.scanDeadlineNotifications)()
            .then((s) => logger_1.default.info('[SCHEDULER] periodic deadline scan done', s))
            .catch((e) => logger_1.default.error(`[SCHEDULER] periodic scan failed: ${e.message}`));
    }, SIX_HOURS_MS);
})
    .catch(err => {
    logger_1.default.error(`❌ Database connection failed: ${err.message}`, { stack: err.stack });
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=app.js.map