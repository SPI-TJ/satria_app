/**
 * Diagnostic: periksa apakah password_hash tiap user masih match
 * default password yang dihitung dari NIK + nama_lengkap saat ini.
 *
 * Jalankan:
 *   npx ts-node --transpile-only scripts/check-user-passwords.ts
 */
import { pool } from '../src/config/database';
import { generateDefaultPassword, verifyPassword } from '../src/utils/password';

interface Row {
  id: string;
  nik: string;
  nama_lengkap: string;
  role: string;
  is_active: boolean;
  password_hash: string;
}

async function run() {
  const { rows } = await pool.query<Row>(
    `SELECT id, nik, nama_lengkap, role, is_active, password_hash
       FROM auth.users
      WHERE deleted_at IS NULL
      ORDER BY role, nik`,
  );

  const mismatched: Array<{ nik: string; nama: string; expected: string }> = [];
  console.log('\n──── Check default-password hash ────');
  for (const u of rows) {
    const expected = generateDefaultPassword(u.nik, u.nama_lengkap);
    const ok = await verifyPassword(expected, u.password_hash);
    const status = ok ? '✓ default OK ' : '✗ MISMATCH  ';
    console.log(`${status} | ${u.nik} | ${u.role.padEnd(18)} | ${u.nama_lengkap} → ${expected}`);
    if (!ok) mismatched.push({ nik: u.nik, nama: u.nama_lengkap, expected });
  }

  console.log(`\nTotal user         : ${rows.length}`);
  console.log(`Default masih OK   : ${rows.length - mismatched.length}`);
  console.log(`Hash tidak match   : ${mismatched.length}`);
  if (mismatched.length > 0) {
    console.log('\nBerarti user tsb sudah pernah ganti password sendiri, ATAU');
    console.log('NIK/nama diubah tanpa reset hash. Untuk reset massal ke default:');
    console.log('  psql -d <db> -f database/migrations/2026-04-24_reset_passwords_to_default.sql');
    console.log('\nAtau reset per user via endpoint POST /api/users/:id/reset-password.');
  }
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool.end());
