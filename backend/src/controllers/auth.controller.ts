import { Request, Response } from 'express';
import { query } from '../config/database';
import { generateToken } from '../middleware/auth.middleware';
import {
  verifyPassword,
  hashPassword,
  hashDefaultPassword,
  generateDefaultPassword,
} from '../utils/password';

// ── POST /api/auth/login ──────────────────────────────────────
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    const result = await query<{
      id: string; nik: string; nama_lengkap: string; email: string; kontak_email?: string;
      password_hash: string; role: string; jabatan: string; is_active: boolean;
      module_access: string; direktorat_id?: string; divisi_id?: string; departemen_id?: string;
    }>(
      `SELECT id, nik, nama_lengkap, email, kontak_email, password_hash, role, jabatan, is_active, module_access, direktorat_id, divisi_id, departemen_id
       FROM auth.users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Akun tidak aktif.' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    // Parse module_access from JSON column
    let moduleAccess: string[] = [];
    try {
      moduleAccess = typeof user.module_access === 'string' 
        ? JSON.parse(user.module_access) 
        : (user.module_access || []);
    } catch {
      moduleAccess = [];
    }

    const token = generateToken({
      id:           user.id,
      nik:          user.nik,
      nama:         user.nama_lengkap,
      email:        user.email,
      kontak_email: user.kontak_email,
      role:         user.role as never,
      module_access: moduleAccess as never,
      direktorat_id: user.direktorat_id,
      divisi_id:    user.divisi_id,
      departemen_id: user.departemen_id,
    });

    // Catat activity log
    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, ip_address)
       VALUES ($1, 'LOGIN', 'auth', $2)`,
      [user.id, req.ip],
    ).catch(() => null); // log gagal tidak boleh gagalkan login

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id:           user.id,
          nik:          user.nik,
          nama:         user.nama_lengkap,
          email:        user.email,
          kontak_email: user.kontak_email,
          role:         user.role,
          jabatan:      user.jabatan,
          module_access: moduleAccess,
          direktorat_id: user.direktorat_id,
          divisi_id:    user.divisi_id,
          departemen_id: user.departemen_id,
        },
      },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────
export async function me(req: Request, res: Response) {
  try {
    const result = await query<{
      id: string; nik: string; nama_lengkap: string; email: string; kontak_email?: string;
      role: string; jabatan: string; module_access: string; direktorat_id?: string;
      divisi_id?: string; departemen_id?: string;
    }>(
      `SELECT id, nik, nama_lengkap, email, kontak_email, role, jabatan, module_access, direktorat_id, divisi_id, departemen_id
       FROM auth.users WHERE id = $1 AND deleted_at IS NULL`,
      [req.user!.id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }
    
    const user = result.rows[0];
    let moduleAccess: string[] = [];
    try {
      moduleAccess = typeof user.module_access === 'string' 
        ? JSON.parse(user.module_access) 
        : (user.module_access || []);
    } catch {
      moduleAccess = [];
    }
    
    return res.json({ 
      success: true, 
      data: {
        ...user,
        module_access: moduleAccess,
      } 
    });
  } catch (err) {
    console.error('[auth.me]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── PUT /api/auth/change-password ─────────────────────────────
export async function changePassword(req: Request, res: Response) {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const result = await query<{ password_hash: string }>(
      'SELECT password_hash FROM auth.users WHERE id = $1 AND deleted_at IS NULL',
      [req.user!.id],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const valid = await verifyPassword(old_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Password lama tidak sesuai.' });
    }

    const hash = await hashPassword(new_password);
    await query(
      'UPDATE auth.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.user!.id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul)
       VALUES ($1, 'CHANGE_PASSWORD', 'auth')`,
      [req.user!.id],
    ).catch(() => null);

    return res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error('[auth.changePassword]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── POST /api/auth/reset-password (IT Admin atau Admin SPI only)
// Reset password user ke password default berdasarkan NIP + nama
export async function resetToDefault(req: Request, res: Response) {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id wajib diisi.' });
    }

    // Hanya IT Admin atau Admin SPI yang boleh reset password user lain
    const callerRole = req.user!.role;
    if (!['it_admin', 'admin_spi'].includes(callerRole)) {
      return res.status(403).json({ success: false, message: 'Tidak memiliki akses reset password.' });
    }

    const result = await query<{ nik: string; nama_lengkap: string }>(
      'SELECT nik, nama_lengkap FROM auth.users WHERE id = $1 AND deleted_at IS NULL',
      [user_id],
    );
    const target = result.rows[0];
    if (!target) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const defaultPw   = generateDefaultPassword(target.nik, target.nama_lengkap);
    const hash        = await hashDefaultPassword(target.nik, target.nama_lengkap);

    await query(
      'UPDATE auth.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, user_id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'RESET_PASSWORD', 'auth', $2)`,
      [req.user!.id, user_id],
    ).catch(() => null);

    return res.json({
      success: true,
      message: 'Password berhasil direset ke default.',
      data: {
        // Tampilkan password default HANYA untuk IT Admin (tampil sekali)
        default_password: defaultPw,
        hint: `Pola: 3 digit terakhir NIP + '_' + nama belakang lowercase`,
      },
    });
  } catch (err) {
    console.error('[auth.resetToDefault]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
