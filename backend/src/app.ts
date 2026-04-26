import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { pool } from './config/database';
import routes from './routes';
import logger from './utils/logger';
import morganMiddleware from './middleware/morgan.middleware';
import { scanDeadlineNotifications } from './utils/notifications';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP Request Logging ──────────────────────────────────────
app.use(morganMiddleware);

// ── Static uploads (PDF CEO Letter, dll) ──────────────────────
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'SATRIA API', time: new Date() }));

// ── Error handler ─────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`[Unhandled Error] ${err.message}`, { stack: err.stack });
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
pool.connect()
  .then(client => {
    client.release();
    logger.info('✅ Database connected successfully');
    app.listen(PORT, () => {
      logger.info(`🚀 SATRIA API running on http://localhost:${PORT}`);
      logger.debug(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // ── Scheduler: scan deadline notifications ───────────────────
    // Jalankan segera 10 detik setelah startup, lalu ulangi setiap 6 jam.
    // Dedup built-in di scanDeadlineNotifications mencegah spam.
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    setTimeout(() => {
      scanDeadlineNotifications()
        .then((s) => logger.info('[SCHEDULER] initial deadline scan done', s))
        .catch((e) => logger.error(`[SCHEDULER] initial scan failed: ${e.message}`));
    }, 10_000);
    setInterval(() => {
      scanDeadlineNotifications()
        .then((s) => logger.info('[SCHEDULER] periodic deadline scan done', s))
        .catch((e) => logger.error(`[SCHEDULER] periodic scan failed: ${e.message}`));
    }, SIX_HOURS_MS);
  })
  .catch(err => {
    logger.error(`❌ Database connection failed: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });

export default app;
