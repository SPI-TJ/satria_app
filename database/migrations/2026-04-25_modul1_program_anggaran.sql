-- ============================================================
--  Migration: Modul 1 — Program Anggaran & Realisasi (Fase 5)
--  Date     : 2026-04-25
--
--  Menambah field finansial & tipe penugasan pada
--  pkpt.annual_audit_plans:
--    - tipe_penugasan_id   : FK ke master.tipe_penugasan
--    - anggaran            : pagu rupiah (BIGINT)
--    - realisasi_anggaran  : realisasi rupiah (BIGINT)
--    - man_days_estimasi   : pagu Man-Days dari rencana
--
--  Plus VIEW pkpt.v_program_finansial yang meng-aggregate
--  Man-Days terpakai dari tim × durasi × bobot peran.
--
--  Aman dijalankan berulang.
-- ============================================================

ALTER TABLE pkpt.annual_audit_plans
    ADD COLUMN IF NOT EXISTS tipe_penugasan_id   UUID
        REFERENCES master.tipe_penugasan(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS anggaran            BIGINT
        CHECK (anggaran IS NULL OR anggaran >= 0),
    ADD COLUMN IF NOT EXISTS realisasi_anggaran  BIGINT
        CHECK (realisasi_anggaran IS NULL OR realisasi_anggaran >= 0),
    ADD COLUMN IF NOT EXISTS man_days_estimasi   NUMERIC(8,2)
        CHECK (man_days_estimasi IS NULL OR man_days_estimasi >= 0);

COMMENT ON COLUMN pkpt.annual_audit_plans.tipe_penugasan_id   IS 'FK ke master.tipe_penugasan (Audit/Review/Evaluasi/dst)';
COMMENT ON COLUMN pkpt.annual_audit_plans.anggaran            IS 'Pagu anggaran program (Rupiah)';
COMMENT ON COLUMN pkpt.annual_audit_plans.realisasi_anggaran  IS 'Realisasi penyerapan anggaran (Rupiah)';
COMMENT ON COLUMN pkpt.annual_audit_plans.man_days_estimasi   IS 'Pagu Man-Days dari rencana (HP × jumlah personil × bobot)';

CREATE INDEX IF NOT EXISTS idx_aap_tipe_penugasan
    ON pkpt.annual_audit_plans(tipe_penugasan_id) WHERE deleted_at IS NULL;

-- ============================================================
--  VIEW: agregat man-days terpakai per program
--  Formula: SUM(estimasi_hari × bobot_peran) untuk setiap anggota
-- ============================================================
CREATE OR REPLACE VIEW pkpt.v_program_finansial AS
SELECT
    p.id                                                AS plan_id,
    p.tahun_perencanaan,
    EXTRACT(YEAR FROM p.tahun_perencanaan)::INT         AS tahun,
    p.estimasi_hari,
    p.anggaran,
    p.realisasi_anggaran,
    p.man_days_estimasi,
    -- Man-Days terpakai (terikat ke tim aktual + bobot peran tahun)
    COALESCE(SUM(
        p.estimasi_hari * COALESCE(bp.bobot, 1.0)
    ), 0)::NUMERIC(10,2)                                AS man_days_terpakai,
    COUNT(t.id)::INT                                    AS jumlah_personil,
    -- Pagu terpakai = realisasi / anggaran (0..100), null bila anggaran null
    CASE
        WHEN p.anggaran IS NULL OR p.anggaran = 0 THEN NULL
        ELSE ROUND((COALESCE(p.realisasi_anggaran,0)::NUMERIC / p.anggaran::NUMERIC) * 100, 2)
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

COMMENT ON VIEW pkpt.v_program_finansial IS 'Agregat finansial & Man-Days per program (Fase 5 Modul 1)';

-- ============================================================
--  VERIFIKASI
-- ============================================================
SELECT '✔ Modul 1 Fase 5 — kolom anggaran & view v_program_finansial siap' AS status;
