// ============================================================
//  SATRIA — Password Utility
//
//  Pola password default:
//    3 digit terakhir NIP + '_' + nama belakang (lowercase)
//
//  Contoh:
//    NIP: 120199, Nama: Hafiizh Taufiqul Hakim → '199_hakim'
//    NIP: 199001001, Nama: Budi Santoso        → '001_santoso'
// ============================================================

import bcrypt from 'bcryptjs';

/**
 * Generate password default dari NIP dan nama lengkap.
 * Pola: {3 digit terakhir NIP}_{nama belakang lowercase}
 */
export function generateDefaultPassword(nip: string, namaLengkap: string): string {
  const last3     = nip.trim().slice(-3);
  const parts     = namaLengkap.trim().split(/\s+/);
  const lastName  = parts[parts.length - 1].toLowerCase();
  return `${last3}_${lastName}`;
}

/**
 * Hash password dengan bcrypt (cost=12).
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 12);
}

/**
 * Hash password default untuk user baru.
 * Shortcut: hashDefaultPassword(nip, namaLengkap)
 */
export async function hashDefaultPassword(nip: string, namaLengkap: string): Promise<string> {
  return hashPassword(generateDefaultPassword(nip, namaLengkap));
}

/**
 * Verifikasi password — support bcryptjs (aplikasi) dan pgcrypto (SQL seed).
 * pgcrypto menggunakan prefix $2a$ sedangkan bcryptjs $2b$, keduanya kompatibel.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
