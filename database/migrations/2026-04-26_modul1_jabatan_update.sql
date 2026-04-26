-- ============================================================
--  Migration: Modul 1 — Update Jabatan Auditor SPI
--  Date     : 2026-04-26
--
--  Perubahan:
--    1. Rename data jabatan 'Staf' → 'Staff SPI'
--    2. Jabatan baru 'Adjunct Auditor' (auditor tidak tetap)
--       tinggal ditambah di frontend JABATAN_OPTIONS — tidak ada
--       constraint enum di DB jadi otomatis terdukung.
--
--  Aman dijalankan berulang.
-- ============================================================

UPDATE auth.users
SET    jabatan = 'Staff SPI'
WHERE  jabatan = 'Staf';

SELECT
    COUNT(*) FILTER (WHERE jabatan = 'Staff SPI')        AS staff_spi_count,
    COUNT(*) FILTER (WHERE jabatan = 'Adjunct Auditor')  AS adjunct_auditor_count,
    '✔ Migration jabatan update selesai'                 AS status
FROM auth.users
WHERE deleted_at IS NULL;
