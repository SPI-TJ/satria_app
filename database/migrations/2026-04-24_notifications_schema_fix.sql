-- ============================================================
--  Migration: Perbaiki schema pelaporan.notifications
--
--  Masalah lama:
--    1) CHECK constraint notification_type hanya menerima
--       'Risk', 'Program', 'System' — tapi kode backend sekarang
--       juga menggunakan 'Evaluation'. INSERT gagal silent.
--    2) Kolom link_url belum ada di DB lama — padahal dibutuhkan
--       untuk notifikasi yang clickable.
--
--  Aman dijalankan berulang (IF EXISTS / IF NOT EXISTS).
-- ============================================================

-- 1) Tambah kolom link_url kalau belum ada
ALTER TABLE pelaporan.notifications
    ADD COLUMN IF NOT EXISTS link_url VARCHAR(500);

COMMENT ON COLUMN pelaporan.notifications.link_url IS
    'URL navigasi ketika notifikasi diklik (opsional)';

-- 2) Drop & re-create CHECK constraint supaya menerima 'Evaluation'
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    -- Cari nama constraint saat ini (Postgres auto-generate nama-nya)
    SELECT conname INTO v_constraint_name
      FROM pg_constraint
     WHERE conrelid = 'pelaporan.notifications'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%notification_type%';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE pelaporan.notifications DROP CONSTRAINT %I', v_constraint_name);
    END IF;
END $$;

ALTER TABLE pelaporan.notifications
    ADD CONSTRAINT chk_notification_type
        CHECK (notification_type IN ('Risk', 'Program', 'System', 'Evaluation'));

COMMENT ON COLUMN pelaporan.notifications.notification_type IS
    'Risk | Program | System | Evaluation';

-- 3) Verifikasi
SELECT 'pelaporan.notifications OK — kolom & constraint sudah terupdate' AS status;
