-- ============================================================
--  Migration: Rename status_pkpt_enum values + add 'On Progress'
--  From: 'Draft'  → 'Open'
--  From: 'Final'  → 'Closed'
--  New : 'On Progress'  (otomatis di-set saat auditor setup modul 2)
-- ============================================================
--  Jalankan sekali di DB yang sudah ada data.
--  NOTE: ALTER TYPE ... ADD VALUE tidak boleh di dalam transaction
--        block di PG < 12; jalankan file ini langsung via psql,
--        bukan di blok BEGIN/COMMIT.
-- ============================================================

-- 1) Drop CHECK constraint yang referensi 'Final' (akan dibuat ulang)
ALTER TABLE pkpt.annual_audit_plans
    DROP CONSTRAINT IF EXISTS chk_aap_finalize;

-- 2) Rename nilai enum existing
ALTER TYPE pkpt.status_pkpt_enum RENAME VALUE 'Draft' TO 'Open';
ALTER TYPE pkpt.status_pkpt_enum RENAME VALUE 'Final' TO 'Closed';

-- 3) Tambah nilai baru 'On Progress'
ALTER TYPE pkpt.status_pkpt_enum ADD VALUE IF NOT EXISTS 'On Progress';

-- 4) Update DEFAULT dari 'Draft' (sudah jadi 'Open') — PG otomatis
--    mengikuti rename, tapi kita pastikan eksplisit:
ALTER TABLE pkpt.annual_audit_plans
    ALTER COLUMN status_pkpt SET DEFAULT 'Open';

-- 5) Re-create CHECK constraint (sekarang referensi 'Closed')
ALTER TABLE pkpt.annual_audit_plans
    ADD CONSTRAINT chk_aap_finalize CHECK (
        status_pkpt <> 'Closed'
        OR (finalized_by IS NOT NULL AND finalized_at IS NOT NULL)
    );

COMMENT ON COLUMN pkpt.annual_audit_plans.status_pkpt IS
    'Siklus program kerja: Open (baru direncanakan, belum dikerjakan auditor), '
    'On Progress (auditor sudah setup/eksekusi di modul 2 Pelaksanaan), '
    'Closed (program sudah final/selesai).';
