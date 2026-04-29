-- ============================================================
--  Migration: Modul 1 — Kelompok Penugasan (master generik)
--  Date     : 2026-04-26
--
--  Tujuan:
--    Sebelumnya kategori program (Assurance/Non Assurance/dll),
--    sifat program (Mandatory/Strategis/dll), dan kategori
--    anggaran (Subsidi/Non Subsidi) disimpan sebagai enum/CHECK
--    yang hardcoded → tidak bisa ditambah/diubah dari UI.
--
--    Sekarang dijadikan satu master generik:
--      master.kelompok_penugasan(tipe, nilai, urutan, is_active)
--    Tab "Tipe Penugasan" di Pengaturan Sistem dipakai untuk
--    mengelola nilai-nilai untuk tipe pengelompokan apa pun.
--
--  Migrasi data:
--    - Drop FK tipe_penugasan_id (tabel master.tipe_penugasan
--      legacy di-DROP, FK-nya tidak dipakai lagi).
--    - Konversi kolom enum jadi VARCHAR (free text).
--    - Drop CHECK constraint kategori_anggaran.
--    - Seed nilai default untuk 3 tipe pengelompokan.
--
--  Aman dijalankan berulang.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Buat tabel master.kelompok_penugasan
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master.kelompok_penugasan (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipe        VARCHAR(50)  NOT NULL,        -- 'Kategori' | 'Sifat Program' | 'Kategori Anggaran' | …
    nilai       VARCHAR(100) NOT NULL,        -- e.g. 'Assurance', 'Mandatory', 'Subsidi'
    urutan      SMALLINT     NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT uq_kelompok_penugasan UNIQUE (tipe, nilai)
);

COMMENT ON TABLE  master.kelompok_penugasan       IS 'Master generik untuk pengelompokan program kerja (Kategori, Sifat Program, Kategori Anggaran, dll)';
COMMENT ON COLUMN master.kelompok_penugasan.tipe  IS 'Dimensi pengelompokan: Kategori | Sifat Program | Kategori Anggaran | (custom)';
COMMENT ON COLUMN master.kelompok_penugasan.nilai IS 'Nilai dalam dimensi tsb (mis. Assurance, Mandatory, Subsidi)';

DROP TRIGGER IF EXISTS trg_kelompok_penugasan_updated ON master.kelompok_penugasan;
CREATE TRIGGER trg_kelompok_penugasan_updated
    BEFORE UPDATE ON master.kelompok_penugasan
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kelompok_penugasan_tipe
    ON master.kelompok_penugasan(tipe) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. Lepaskan dependency ke master.tipe_penugasan (legacy)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pkpt.annual_audit_plans
    DROP CONSTRAINT IF EXISTS annual_audit_plans_tipe_penugasan_id_fkey;
DROP INDEX IF EXISTS pkpt.idx_aap_tipe_penugasan;
ALTER TABLE pkpt.annual_audit_plans
    DROP COLUMN IF EXISTS tipe_penugasan_id;

DROP TABLE IF EXISTS master.tipe_penugasan CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 3. Konversi kolom enum → VARCHAR (free text)
--    View v_program_finansial perlu di-drop sementara karena
--    bergantung ke kolom-kolom tsb (lewat SELECT *).
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS pkpt.v_program_finansial;

ALTER TABLE pkpt.annual_audit_plans
    ALTER COLUMN kategori_program TYPE VARCHAR(50) USING kategori_program::TEXT;

ALTER TABLE pkpt.annual_audit_plans
    ALTER COLUMN status_program   TYPE VARCHAR(50) USING status_program::TEXT;

-- Drop CHECK constraint pada kategori_anggaran (lookup nama constraint dinamis)
DO $$
DECLARE
    cname TEXT;
BEGIN
    SELECT con.conname INTO cname
      FROM pg_constraint con
      JOIN pg_class      rel ON rel.oid = con.conrelid
      JOIN pg_namespace  nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'pkpt'
       AND rel.relname = 'annual_audit_plans'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%kategori_anggaran%';
    IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE pkpt.annual_audit_plans DROP CONSTRAINT %I', cname);
    END IF;
END $$;

-- Drop enum types yang sekarang yatim (CASCADE hanya jika tidak terpakai)
DROP TYPE IF EXISTS pkpt.kategori_program_enum CASCADE;
DROP TYPE IF EXISTS pkpt.status_program_enum   CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 4. Re-create v_program_finansial (sama persis dgn migrasi
--    2026-04-26_modul1_kategori_anggaran.sql — diulang di sini
--    karena view tadi di-drop)
-- ─────────────────────────────────────────────────────────────
CREATE VIEW pkpt.v_program_finansial AS
SELECT
    p.id                                                AS plan_id,
    p.tahun_perencanaan,
    EXTRACT(YEAR FROM p.tahun_perencanaan)::INT         AS tahun,
    p.estimasi_hari,
    p.anggaran,
    p.realisasi_anggaran,
    p.man_days_estimasi,
    p.kategori_anggaran,
    COALESCE(SUM(
        p.estimasi_hari * COALESCE(bp.bobot, 1.0)
    ), 0)::NUMERIC(10,2)                                AS man_days_terpakai,
    COUNT(t.id)::INT                                    AS jumlah_personil,
    CASE
        WHEN p.man_days_estimasi IS NULL OR p.man_days_estimasi = 0 THEN NULL
        ELSE ROUND(
            (COALESCE(SUM(p.estimasi_hari * COALESCE(bp.bobot, 1.0)), 0)::NUMERIC
             / p.man_days_estimasi::NUMERIC) * 100, 2)
    END                                                 AS persen_pagu_terpakai
FROM pkpt.annual_audit_plans p
LEFT JOIN pkpt.annual_plan_team t
       ON t.annual_plan_id = p.id
LEFT JOIN master.bobot_peran bp
       ON bp.peran = t.role_tim::TEXT
      AND bp.tahun = EXTRACT(YEAR FROM p.tahun_perencanaan)::SMALLINT
      AND bp.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- ─────────────────────────────────────────────────────────────
-- 5. Seed nilai default
-- ─────────────────────────────────────────────────────────────
INSERT INTO master.kelompok_penugasan (tipe, nilai, urutan) VALUES
    ('Kategori',          'Assurance',         1),
    ('Kategori',          'Non Assurance',     2),
    ('Kategori',          'Pemantauan Risiko', 3),
    ('Kategori',          'Evaluasi',          4),
    ('Sifat Program',     'Mandatory',         1),
    ('Sifat Program',     'Strategis',         2),
    ('Sifat Program',     'Emerging Risk',     3),
    ('Kategori Anggaran', 'Subsidi',           1),
    ('Kategori Anggaran', 'Non Subsidi',       2)
ON CONFLICT (tipe, nilai) DO NOTHING;

SELECT '✔ Migration kelompok_penugasan selesai' AS status;
