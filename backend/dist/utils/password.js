"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDefaultPassword = generateDefaultPassword;
exports.hashPassword = hashPassword;
exports.hashDefaultPassword = hashDefaultPassword;
exports.verifyPassword = verifyPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Generate password default dari NIP dan nama lengkap.
 * Pola: {3 digit terakhir NIP}_{nama belakang lowercase}
 */
function generateDefaultPassword(nip, namaLengkap) {
    const last3 = nip.trim().slice(-3);
    const parts = namaLengkap.trim().split(/\s+/);
    const lastName = parts[parts.length - 1].toLowerCase();
    return `${last3}_${lastName}`;
}
/**
 * Hash password dengan bcrypt (cost=12).
 */
async function hashPassword(plainText) {
    return bcryptjs_1.default.hash(plainText, 12);
}
/**
 * Hash password default untuk user baru.
 * Shortcut: hashDefaultPassword(nip, namaLengkap)
 */
async function hashDefaultPassword(nip, namaLengkap) {
    return hashPassword(generateDefaultPassword(nip, namaLengkap));
}
/**
 * Verifikasi password — support bcryptjs (aplikasi) dan pgcrypto (SQL seed).
 * pgcrypto menggunakan prefix $2a$ sedangkan bcryptjs $2b$, keduanya kompatibel.
 */
async function verifyPassword(plain, hash) {
    return bcryptjs_1.default.compare(plain, hash);
}
//# sourceMappingURL=password.js.map