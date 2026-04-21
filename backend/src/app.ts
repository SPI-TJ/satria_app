import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database';
import routes from './routes';

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

// ── Routes ────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'SATRIA API', time: new Date() }));

// ── Error handler ─────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err.message);
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
pool.connect()
  .then(client => {
    client.release();
    console.log('✅ Database connected');
    app.listen(PORT, () => console.log(`🚀 SATRIA API running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

export default app;
