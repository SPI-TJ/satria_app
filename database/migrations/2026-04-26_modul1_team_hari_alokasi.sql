-- ============================================================
--  Migration: Modul 1 — Hari Alokasi per Anggota Tim
--  Date     : 2026-04-26
--
--  Memperbaiki perhitungan Man-Days terpakai.
--  Formula lama: estimasi_hari × Σ(bobot) — keliru karena
--  estimasi_hari = durasi kalender, bukan hari kerja aktual.
--
--  Solusi: setiap anggota tim punya kolom `hari_alokasi`
--  (nullable; null = fallback ke estimasi_hari). Formula baru:
--    Σ (anggota.hari_alokasi × bobot_peran)
--
--  Aman dijalankan berulang.
-- ============================================================

ALTER TABLE pkpt.annual_plan_team
    ADD COLUMN IF NOT EXISTS hari_alokasi INTEGER
        CHECK (hari_alokasi IS NULL OR hari_alokasi >= 0);

COMMENT ON COLUMN pkpt.annual_plan_team.hari_alokasi
    IS 'Hari kerja aktual yang dialokasikan ke anggota ini untuk program. NULL = pakai estimasi_hari program sebagai default.';

-- ============================================================
--  Re-define VIEW: pakai hari_alokasi per anggota
--  (DROP dulu — kolom existing bisa berubah definisi)
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
    -- Man-Days terpakai = Σ (hari_alokasi × bobot_peran)
    -- Fallback: kalau hari_alokasi null, pakai estimasi_hari program
    COALESCE(SUM(
        COALESCE(t.hari_alokasi, p.estimasi_hari) * COALESCE(bp.bobot, 1.0)
    ), 0)::NUMERIC(10,2)                                AS man_days_terpakai,
    COUNT(t.id)::INT                                    AS jumlah_personil,
    -- Pagu terpakai % dari ratio man-days terpakai vs estimasi rencana
    CASE
        WHEN p.man_days_estimasi IS NULL OR p.man_days_estimasi = 0 THEN NULL
        ELSE ROUND(
            (COALESCE(SUM(COALESCE(t.hari_alokasi, p.estimasi_hari) * COALESCE(bp.bobot, 1.0)), 0)::NUMERIC
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
    'Agregat finansial & Man-Days per program. man_days_terpakai = Σ(hari_alokasi × bobot_peran), fallback ke estimasi_hari bila hari_alokasi null.';

SELECT '✔ Migration team.hari_alokasi + redefine view selesai' AS status;
