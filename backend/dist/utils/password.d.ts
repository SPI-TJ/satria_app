/**
 * Generate password default dari NIP dan nama lengkap.
 * Pola: {3 digit terakhir NIP}_{nama belakang lowercase}
 */
export declare function generateDefaultPassword(nip: string, namaLengkap: string): string;
/**
 * Hash password dengan bcrypt (cost=12).
 */
export declare function hashPassword(plainText: string): Promise<string>;
/**
 * Hash password default untuk user baru.
 * Shortcut: hashDefaultPassword(nip, namaLengkap)
 */
export declare function hashDefaultPassword(nip: string, namaLengkap: string): Promise<string>;
/**
 * Verifikasi password — support bcryptjs (aplikasi) dan pgcrypto (SQL seed).
 * pgcrypto menggunakan prefix $2a$ sedangkan bcryptjs $2b$, keduanya kompatibel.
 */
export declare function verifyPassword(plain: string, hash: string): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map