-- ============================================================
--  SATRIA — Seed Akhir (Notifikasi & Verifikasi)
--  File   : 99_seed.sql
--  Urutan : Terakhir — setelah semua schema & seed lain
--
--  Catatan:
--    - Dimensi organisasi sudah di-seed di 01_master.sql
--    - Users awal sudah di-seed di 02_auth.sql
--    - Data risiko RCSA ada di 09_seed_rcsa.sql
--    - File ini hanya: notifikasi selamat datang + verifikasi
-- ============================================================

-- ── Notifikasi selamat datang untuk Admin ────────────────────
-- (Hanya insert jika tabel notifications sudah ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'pelaporan' AND table_name = 'notifications'
  ) THEN
    INSERT INTO pelaporan.notifications (user_id, title, message, notification_type, is_read)
    SELECT
      u.id,
      'Selamat Datang di SATRIA',
      'Sistem Akuntabilitas Internal Audit Transjakarta siap digunakan. '
      'Mulai dengan menambahkan user SPI melalui halaman User Management, '
      'kemudian data risiko RCSA tersedia di tab Data Risiko.',
      'System',
      FALSE
    FROM auth.users u
    WHERE u.role IN ('admin_spi', 'it_admin')
      AND u.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM pelaporan.notifications n
        WHERE n.user_id = u.id AND n.title = 'Selamat Datang di SATRIA'
      );

    RAISE NOTICE 'Notifikasi selamat datang berhasil dikirim.';
  ELSE
    RAISE NOTICE 'Tabel pelaporan.notifications belum ada — skip notifikasi.';
  END IF;
END $$;

-- ── Verifikasi akhir — tampilkan jumlah data per tabel ───────
SELECT
  'master.direktorat'  AS tabel, COUNT(*) AS jumlah
FROM master.direktorat WHERE deleted_at IS NULL
UNION ALL SELECT 'master.divisi',      COUNT(*) FROM master.divisi      WHERE deleted_at IS NULL
UNION ALL SELECT 'master.departemen',  COUNT(*) FROM master.departemen  WHERE deleted_at IS NULL
UNION ALL SELECT 'master.risk_level_ref', COUNT(*) FROM master.risk_level_ref
UNION ALL SELECT 'master.sasaran_korporat', COUNT(*) FROM master.sasaran_korporat WHERE is_active = TRUE
UNION ALL SELECT 'auth.users',         COUNT(*) FROM auth.users         WHERE deleted_at IS NULL
UNION ALL SELECT 'pkpt.risk_data',     COUNT(*) FROM pkpt.risk_data     WHERE deleted_at IS NULL
UNION ALL SELECT 'pkpt.annual_audit_plans', COUNT(*) FROM pkpt.annual_audit_plans WHERE deleted_at IS NULL
ORDER BY tabel;
