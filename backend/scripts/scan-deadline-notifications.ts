/* eslint-disable no-console */
/**
 * Scan harian: kirim notifikasi ke semua auditor yang terlibat + Kepala SPI untuk
 *   (a) program yang mendekati deadline (H-7) dan
 *   (b) program yang sudah overdue (tanggal_selesai < hari ini) namun belum completed.
 *
 * Jalankan harian via cron/Task Scheduler (contoh crontab — 07:00 pagi):
 *   0 7 * * *  cd /path/satria_app/backend && npx ts-node --transpile-only scripts/scan-deadline-notifications.ts
 *
 * Windows Task Scheduler:
 *   Program: cmd
 *   Arguments: /c "cd C:\path\backend && npx ts-node --transpile-only scripts\scan-deadline-notifications.ts"
 */
import { scanDeadlineNotifications } from '../src/utils/notifications';
import { pool } from '../src/config/database';

async function run() {
  try {
    const stats = await scanDeadlineNotifications();
    console.log(`✔ Scan selesai — nearDeadline: ${stats.nearDeadline}, overdue: ${stats.overdue}`);
  } catch (err) {
    console.error('❌ Scan failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
