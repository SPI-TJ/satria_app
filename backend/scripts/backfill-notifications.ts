/**
 * Backfill notifikasi untuk data yang sudah ada:
 *  1) Kirim "Selamat Datang" + "Lengkapi Identitas" ke semua user aktif
 *     yang belum pernah menerima welcome notif.
 *  2) Jalankan scan deadline (near_deadline + overdue) sekarang juga,
 *     sehingga semua program aktif langsung dapat alert yang sesuai.
 *
 *  Jalankan:
 *    npx ts-node --transpile-only scripts/backfill-notifications.ts
 *
 *  Aman dijalankan berulang — dedup via existence check.
 */
import { pool } from '../src/config/database';
import { notifyWelcomeUser, scanDeadlineNotifications } from '../src/utils/notifications';

interface UserRow { id: string; nama_lengkap: string; nik: string; role: string; }

async function run() {
  console.log('\n──── Backfill Notifications ────\n');

  // 1) Welcome + Lengkapi Identitas
  const users = await pool.query<UserRow>(
    `SELECT u.id, u.nama_lengkap, u.nik, u.role
       FROM auth.users u
      WHERE u.deleted_at IS NULL AND u.is_active = TRUE
      ORDER BY u.role, u.nik`,
  );
  let welcomeSent = 0;
  let welcomeSkipped = 0;
  for (const u of users.rows) {
    // Skip kalau sudah pernah dikirim (dedup by title)
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM pelaporan.notifications
        WHERE user_id = $1 AND title = 'Selamat Datang di SATRIA' LIMIT 1`,
      [u.id],
    );
    if (existing.rows.length > 0) {
      welcomeSkipped++;
      console.log(`  skip  (sudah ada)  ${u.nik} · ${u.nama_lengkap}`);
      continue;
    }
    await notifyWelcomeUser(u.id, u.nama_lengkap);
    welcomeSent++;
    console.log(`  sent  welcome+profil  ${u.nik} · ${u.nama_lengkap}`);
  }
  console.log(`\n  Welcome: ${welcomeSent} dikirim, ${welcomeSkipped} di-skip (sudah ada).\n`);

  // 2) Scan deadline
  console.log('  Menjalankan deadline scan...');
  const stats = await scanDeadlineNotifications();
  console.log(`  Deadline scan: nearDeadline=${stats.nearDeadline}, overdue=${stats.overdue}`);

  console.log('\n✔ Backfill selesai.\n');
}

run()
  .catch((e) => { console.error('❌ Backfill failed:', e); process.exitCode = 1; })
  .finally(() => pool.end());
