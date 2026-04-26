-- ============================================================
--  Migration: Reset semua password user ke default saat ini.
--  Alasan  : Sebelum adanya auto-reset saat NIK/nama diubah,
--            admin yg mengedit NIK user lewat UserManagementPage
--            membuat password_hash lama tidak match dgn pola baru
--            (default_password = last3(NIK) + '_' + lastname lower).
--  Efek    : Setiap user dapat login ulang dengan password default
--            berdasarkan NIK+nama mereka yang sekarang tersimpan.
--
--  AMAN utk dijalankan berulang. Password yg sebelumnya sudah
--  diubah user via Change Password juga akan ter-reset — beri tahu
--  mereka sebelum run di production.
--
--  Opsional: Ganti kondisi WHERE sesuai kebutuhan, misal hanya
--  user tertentu. Default: semua user aktif non-deleted.
-- ============================================================

UPDATE auth.users
   SET password_hash = crypt(
           auth.default_password(nik, nama_lengkap),
           gen_salt('bf', 12)
       ),
       updated_at = NOW()
 WHERE deleted_at IS NULL;

-- Verifikasi
SELECT nik, nama_lengkap, role,
       auth.default_password(nik, nama_lengkap) AS expected_default_password
  FROM auth.users
 WHERE deleted_at IS NULL
 ORDER BY role, nik;
