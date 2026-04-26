-- ============================================================
--  Migration: Modul 1 — Kategori Anggaran (Subsidi / Non Subsidi)
--  Date     : 2026-04-26
--
--  Penyederhanaan field finansial program:
--    1. Tambah kolom kategori_anggaran ('Subsidi' | 'Non Subsidi')
--    2. Re-define VIEW pkpt.v_program_finansial:
--         - persen_pagu_terpakai sekarang dihitung otomatis dari
--           ratio man_days_terpakai / man_days_estimasi (×100)
--         - tidak lagi bergantung pada realisasi_anggaran
--    3. Kolom realisasi_anggaran tetap dipertahankan di tabel
--       (tidak di-drop) supaya data lama tidak hilang dan bisa
--       dipakai Modul 2 (Pelaksanaan) di masa depan.
--
--  Aman dijalankan berulang.
-- ============================================================

ALTER TABLE pkpt.annual_audit_plans
    ADD COLUMN IF NOT EXISTS kategori_anggaran VARCHAR(20)
        CHECK (kategori_anggaran IS NULL OR kategori_anggaran IN ('Subsidi', 'Non Subsidi'));

COMMENT ON COLUMN pkpt.annual_audit_plans.kategori_anggaran
    IS 'Kategori sumber anggaran: Subsidi (PSO) atau Non Subsidi';

CREATE INDEX IF NOT EXISTS idx_aap_kategori_anggaran
    ON pkpt.annual_audit_plans(kategori_anggaran) WHERE deleted_at IS NULL;

-- ============================================================
--  VIEW: agregat finansial — pagu terpakai dari Man-Days ratio
--  DROP dulu karena urutan/nama kolom berubah (CREATE OR REPLACE
--  tidak mengizinkan perubahan struktur kolom).
-- ============================================================
DROP VIEW IF EXISTS pkpt.v_program_finansial;

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
    -- Man-Days terpakai (terikat ke tim aktual + bobot peran tahun)
    COALESCE(SUM(
        p.estimasi_hari * COALESCE(bp.bobot, 1.0)
    ), 0)::NUMERIC(10,2)                                AS man_days_terpakai,
    COUNT(t.id)::INT                                    AS jumlah_personil,
    -- Pagu terpakai = % man-days terpakai dibanding estimasi (auto-calc)
    -- Jika estimasi belum diisi → NULL
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

COMMENT ON VIEW pkpt.v_program_finansial IS
    'Agregat finansial & Man-Days per program. persen_pagu_terpakai = (man_days_terpakai / man_days_estimasi) × 100.';

SELECT '✔ Migration kategori_anggaran + redefine view v_program_finansial selesai' AS status;
