import { Request, Response } from 'express';
import { query } from '../config/database';
import {
  generateDefaultPassword,
  hashDefaultPassword,
  hashPassword,
} from '../utils/password';

// ── GET /api/users — daftar semua user ────────────────────────
export async function getUsers(req: Request, res: Response) {
  try {
    const { search, role, is_active, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions = ['u.deleted_at IS NULL'];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.nama_lengkap ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.nik ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (is_active !== undefined && is_active !== '') {
      params.push(is_active === 'true');
      conditions.push(`u.is_active = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM auth.users u WHERE ${where}`, params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(Number(limit), offset);
    const dataRes = await query(
      `SELECT u.id, u.nik, u.nama_lengkap, u.email, u.kontak_email, u.role, u.jabatan,
              u.is_active, u.module_access,
              u.direktorat_id, dr.nama AS direktorat_nama,
              u.divisi_id,    dv.nama AS divisi_nama,
              u.departemen_id, dp.nama AS departemen_nama,
              u.created_at, u.updated_at
       FROM auth.users u
       LEFT JOIN master.direktorat dr ON u.direktorat_id = dr.id
       LEFT JOIN master.divisi     dv ON u.divisi_id     = dv.id
       LEFT JOIN master.departemen dp ON u.departemen_id = dp.id
       WHERE ${where}
       ORDER BY
         CASE u.role
           WHEN 'it_admin'            THEN 1
           WHEN 'admin_spi'           THEN 2
           WHEN 'kepala_spi'          THEN 3
           WHEN 'pengendali_teknis'   THEN 4
           WHEN 'anggota_tim'         THEN 5
           WHEN 'auditee'             THEN 6
           ELSE 7
         END,
         u.nama_lengkap
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return res.json({
      success: true,
      data: dataRes.rows,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[users.getAll]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/users/stats — ringkasan jumlah user ──────────────
export async function getUserStats(_req: Request, res: Response) {
  try {
    const result = await query<{ total: string; aktif: string; non_aktif: string }>(
      `SELECT
         COUNT(*)                                  AS total,
         COUNT(*) FILTER (WHERE is_active = TRUE)  AS aktif,
         COUNT(*) FILTER (WHERE is_active = FALSE) AS non_aktif
       FROM auth.users WHERE deleted_at IS NULL`,
    );
    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        total:     Number(row.total),
        aktif:     Number(row.aktif),
        non_aktif: Number(row.non_aktif),
      },
    });
  } catch (err) {
    console.error('[users.stats]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/users/:id — detail satu user ─────────────────────
export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT u.id, u.nik, u.nama_lengkap, u.email, u.kontak_email, u.role, u.jabatan,
              u.is_active, u.module_access,
              u.direktorat_id, dr.nama AS direktorat_nama,
              u.divisi_id,    dv.nama AS divisi_nama,
              u.departemen_id, dp.nama AS departemen_nama,
              u.created_at, u.updated_at
       FROM auth.users u
       LEFT JOIN master.direktorat dr ON u.direktorat_id = dr.id
       LEFT JOIN master.divisi     dv ON u.divisi_id     = dv.id
       LEFT JOIN master.departemen dp ON u.departemen_id = dp.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[users.getById]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── POST /api/users — buat user baru ─────────────────────────
export async function createUser(req: Request, res: Response) {
  try {
    const { nik, nama_lengkap, email, kontak_email, role, jabatan, direktorat_id, divisi_id, departemen_id } = req.body;

    if (!nik || !nama_lengkap || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'NIK, nama lengkap, email, dan role wajib diisi.',
      });
    }

    // Cek email/NIK sudah ada
    const dupCheck = await query(
      `SELECT id FROM auth.users WHERE (email = $1 OR nik = $2) AND deleted_at IS NULL`,
      [email, nik],
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email atau NIK sudah terdaftar.',
      });
    }

    // Generate password default
    const defaultPassword = generateDefaultPassword(nik, nama_lengkap);
    const hash = await hashDefaultPassword(nik, nama_lengkap);

    // Default module_access based on role
    let defaultModuleAccess: string[] = [];
    if (['admin_spi', 'it_admin'].includes(role)) {
      defaultModuleAccess = ['pkpt', 'pelaksanaan', 'pelaporan', 'sintesis', 'pemantauan', 'ca-cm'];
    } else if (['kepala_spi', 'pengendali_teknis', 'anggota_tim'].includes(role)) {
      defaultModuleAccess = ['pkpt'];
    }
    // auditee gets empty array by default

    const result = await query<{ id: string }>(
      `INSERT INTO auth.users (nik, nama_lengkap, email, kontak_email, role, jabatan, password_hash, is_active, module_access, direktorat_id, divisi_id, departemen_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11)
       RETURNING id`,
      [nik, nama_lengkap, email, kontak_email ?? null, role, jabatan ?? null, hash, defaultModuleAccess, direktorat_id ?? null, divisi_id ?? null, departemen_id ?? null],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'CREATE_USER', 'user_management', $2)`,
      [req.user!.id, result.rows[0].id],
    ).catch(() => null);

    return res.status(201).json({
      success: true,
      message: `User berhasil dibuat. Password default telah di-generate.`,
      data: {
        id: result.rows[0].id,
        default_password: defaultPassword,
        hint: `Pola: 3 digit terakhir NIK + '_' + nama belakang lowercase`,
      },
    });
  } catch (err) {
    console.error('[users.create]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── PATCH /api/users/:id — update profil user ─────────────────
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nama_lengkap, email, kontak_email, jabatan, role, direktorat_id, divisi_id, departemen_id } = req.body;

    // Tidak boleh edit diri sendiri via endpoint ini (gunakan /auth/change-password)
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Gunakan halaman profil untuk mengubah data Anda sendiri.',
      });
    }

    await query(
      `UPDATE auth.users
       SET nama_lengkap = COALESCE($1, nama_lengkap),
           email        = COALESCE($2, email),
           kontak_email = COALESCE($3, kontak_email),
           jabatan      = COALESCE($4, jabatan),
           role         = COALESCE($5, role),
           direktorat_id = COALESCE($6, direktorat_id),
           divisi_id = COALESCE($7, divisi_id),
           departemen_id = COALESCE($8, departemen_id),
           updated_at   = NOW()
       WHERE id = $9 AND deleted_at IS NULL`,
      [nama_lengkap ?? null, email ?? null, kontak_email ?? null, jabatan ?? null, role ?? null, direktorat_id ?? null, divisi_id ?? null, departemen_id ?? null, id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'UPDATE_USER', 'user_management', $2)`,
      [req.user!.id, id],
    ).catch(() => null);

    return res.json({ success: true, message: 'Data user berhasil diperbarui.' });
  } catch (err) {
    console.error('[users.update]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── PATCH /api/users/:id/module-access — update module access ──
export async function updateModuleAccess(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { module_access } = req.body;

    // Validate module_access is an array
    if (!Array.isArray(module_access)) {
      return res.status(400).json({
        success: false,
        message: 'module_access harus berupa array.',
      });
    }

    // Validate each module_id is valid
    const validModules = ['pkpt', 'pelaksanaan', 'pelaporan', 'sintesis', 'pemantauan', 'ca-cm'];
    const invalidModules = module_access.filter((m: unknown) => !validModules.includes(m as string));
    if (invalidModules.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Module tidak valid: ${invalidModules.join(', ')}`,
      });
    }

    await query(
      `UPDATE auth.users
       SET module_access = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL`,
      [module_access, id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'UPDATE_MODULE_ACCESS', 'user_management', $2)`,
      [req.user!.id, id],
    ).catch(() => null);

    return res.json({ success: true, message: 'Akses modul berhasil diperbarui.' });
  } catch (err) {
    console.error('[users.updateModuleAccess]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── POST /api/users/:id/reset-password — reset ke default ─────
export async function resetUserPassword(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await query<{ nik: string; nama_lengkap: string }>(
      `SELECT nik, nama_lengkap FROM auth.users WHERE id = $1 AND deleted_at IS NULL`,

      [id],
    );
    const target = result.rows[0];
    if (!target) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const defaultPassword = generateDefaultPassword(target.nik, target.nama_lengkap);
    const hash = await hashDefaultPassword(target.nik, target.nama_lengkap);

    await query(
      `UPDATE auth.users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'RESET_PASSWORD', 'user_management', $2)`,
      [req.user!.id, id],
    ).catch(() => null);

    return res.json({
      success: true,
      message: 'Password berhasil direset ke default.',
      data: {
        default_password: defaultPassword,
        hint: `Pola: 3 digit terakhir NIK + '_' + nama belakang lowercase`,
      },
    });
  } catch (err) {
    console.error('[users.resetPassword]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── POST /api/users/:id/set-password — set password khusus ───
export async function setUserPassword(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter.',
      });
    }

    const hash = await hashPassword(new_password);
    await query(
      `UPDATE auth.users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`,
      [hash, id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'SET_PASSWORD', 'user_management', $2)`,
      [req.user!.id, id],
    ).catch(() => null);

    return res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error('[users.setPassword]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── PATCH /api/users/:id/toggle-active — aktif/nonaktif ──────
export async function toggleUserActive(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menonaktifkan akun Anda sendiri.',
      });
    }

    const result = await query<{ is_active: boolean; nama_lengkap: string }>(
      `SELECT is_active, nama_lengkap FROM auth.users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const newStatus = !result.rows[0].is_active;
    await query(
      `UPDATE auth.users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, $2, 'user_management', $3)`,
      [req.user!.id, newStatus ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', id],
    ).catch(() => null);

    return res.json({
      success: true,
      message: `User ${result.rows[0].nama_lengkap} berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
      data: { is_active: newStatus },
    });
  } catch (err) {
    console.error('[users.toggleActive]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── DELETE /api/users/:id — soft delete ──────────────────────
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun Anda sendiri.',
      });
    }

    await query(
      `UPDATE auth.users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    await query(
      `INSERT INTO auth.activity_log (user_id, action, modul, entity_id)
       VALUES ($1, 'DELETE_USER', 'user_management', $2)`,
      [req.user!.id, id],
    ).catch(() => null);

    return res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err) {
    console.error('[users.delete]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}
