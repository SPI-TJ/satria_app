-- ============================================================
--  SATRIA — Modul 1: Perencanaan Pengawasan Tahunan (PKPT)
--  File   : 03_pkpt.sql
--  Urutan : 4 dari 7 (setelah 02_auth.sql)
--
--  Isi    :
--    pkpt.risk_data          → Registri risiko RCSA (628 risiko from Excel)
--    pkpt.annual_audit_plans → Program kerja audit tahunan
--    pkpt.annual_plan_team   → Pivot: program ↔ tim auditor
--    pkpt.annual_plan_risks  → Pivot: program ↔ risiko
--
--  SKEMA RISK_DATA (RCSA-aligned):
--    Field sesuai kolom Report RCSA:
--      id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
--      sasaran_korporat_id, sasaran_bidang, nama_risiko,
--      parameter_kemungkinan,
--      tingkat_risiko_inherent + skor_inherent + level_inherent,
--      tingkat_risiko_target   + skor_target   + level_target,
--      pelaksanaan_mitigasi,
--      realisasi_tingkat_risiko + skor_realisasi + level_realisasi,
--      penyebab_internal, penyebab_eksternal
-- ============================================================

-- ── RESET ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_risk_data_updated_at    ON pkpt.risk_data;
DROP TRIGGER IF EXISTS trg_annual_plans_updated_at ON pkpt.annual_audit_plans;
DROP TRIGGER IF EXISTS trg_annual_team_updated_at  ON pkpt.annual_plan_team;
DROP TRIGGER IF EXISTS trg_annual_risks_updated_at ON pkpt.annual_plan_risks;
DROP TABLE IF EXISTS pkpt.annual_plan_risks        CASCADE;
DROP TABLE IF EXISTS pkpt.annual_plan_team         CASCADE;
DROP TABLE IF EXISTS pkpt.annual_audit_plans       CASCADE;
DROP TABLE IF EXISTS pkpt.risk_data                CASCADE;
DROP TYPE  IF EXISTS pkpt.risk_source_enum         CASCADE;
DROP TYPE  IF EXISTS pkpt.jenis_program_enum       CASCADE;
DROP TYPE  IF EXISTS pkpt.kategori_program_enum    CASCADE;
DROP TYPE  IF EXISTS pkpt.status_program_enum      CASCADE;
DROP TYPE  IF EXISTS pkpt.status_pkpt_enum         CASCADE;
DROP TYPE  IF EXISTS pkpt.role_tim_enum            CASCADE;

-- ── ENUM ─────────────────────────────────────────────────────
CREATE TYPE pkpt.risk_source_enum      AS ENUM ('TRUST', 'Manual', 'Import');
CREATE TYPE pkpt.jenis_program_enum    AS ENUM ('PKPT', 'Non PKPT');
CREATE TYPE pkpt.kategori_program_enum AS ENUM ('Assurance', 'Non Assurance', 'Pemantauan Risiko', 'Evaluasi');
CREATE TYPE pkpt.status_program_enum   AS ENUM ('Mandatory', 'Strategis', 'Emerging Risk');
CREATE TYPE pkpt.status_pkpt_enum      AS ENUM ('Open', 'On Progress', 'Closed');
CREATE TYPE pkpt.role_tim_enum         AS ENUM ('Penanggung Jawab', 'Pengendali Teknis', 'Ketua Tim', 'Anggota Tim');

-- ============================================================
--  TABLE: pkpt.risk_data — Registri Risiko RCSA
-- ============================================================
CREATE TABLE pkpt.risk_data (
    id                      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ── Identifikasi ─────────────────────────────────────────
    id_risiko               VARCHAR(50)     NOT NULL,   -- e.g. RR-KTP-2025-002
    tahun                   SMALLINT        NOT NULL,   -- tahun RCSA (e.g. 2025)

    -- ── Dimensi Organisasi (FK ke master) ────────────────────
    direktorat_id           UUID            REFERENCES master.direktorat(id)    ON DELETE SET NULL,
    divisi_id               UUID            REFERENCES master.divisi(id)        ON DELETE SET NULL,
    departemen_id           UUID            REFERENCES master.departemen(id)    ON DELETE SET NULL,
    -- Teks fallback (untuk import / data sebelum pemetaan)
    direktorat_nama         VARCHAR(200),
    divisi_nama             VARCHAR(200),
    departemen_nama         VARCHAR(200),

    -- ── Sasaran ──────────────────────────────────────────────
    sasaran_korporat_id     UUID            REFERENCES master.sasaran_korporat(id) ON DELETE SET NULL,
    sasaran_korporat_nama   VARCHAR(300),   -- teks fallback
    sasaran_bidang          TEXT,

    -- ── Identitas Risiko ─────────────────────────────────────
    nama_risiko             TEXT            NOT NULL,
    parameter_kemungkinan   VARCHAR(50),    -- Frekuensi / Unknown

    -- ── Tingkat Risiko Inherent ───────────────────────────────
    -- Format raw: "54 (E)" | Skor: 54 | Level: E
    tingkat_risiko_inherent VARCHAR(20),
    skor_inherent           SMALLINT,       -- nilai numerik (11–54)
    level_inherent          VARCHAR(5)      REFERENCES master.risk_level_ref(kode) ON DELETE SET NULL,

    -- ── Tingkat Risiko Target ────────────────────────────────
    tingkat_risiko_target   VARCHAR(20),
    skor_target             SMALLINT,
    level_target            VARCHAR(5)      REFERENCES master.risk_level_ref(kode) ON DELETE SET NULL,

    -- ── Mitigasi ─────────────────────────────────────────────
    pelaksanaan_mitigasi    TEXT,

    -- ── Realisasi Tingkat Risiko ─────────────────────────────
    realisasi_tingkat_risiko VARCHAR(20),
    skor_realisasi          SMALLINT,
    level_realisasi         VARCHAR(5)      REFERENCES master.risk_level_ref(kode) ON DELETE SET NULL,

    -- ── Penyebab ─────────────────────────────────────────────
    penyebab_internal       TEXT,
    penyebab_eksternal      TEXT,

    -- ── Metadata Import ──────────────────────────────────────
    source                  pkpt.risk_source_enum NOT NULL DEFAULT 'Manual',
    imported_by             UUID            REFERENCES auth.users(id) ON DELETE SET NULL,

    -- ── Audit Trail ──────────────────────────────────────────
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT uq_risk_id_tahun UNIQUE (id_risiko, tahun)
);

COMMENT ON TABLE  pkpt.risk_data IS 'Registri risiko RCSA (Report RCSA) — sumber: Import Excel, TRUST API, atau Manual';
COMMENT ON COLUMN pkpt.risk_data.id_risiko IS 'ID risiko sesuai RCSA, contoh: RR-KTP-2025-002';
COMMENT ON COLUMN pkpt.risk_data.skor_inherent IS 'Nilai numerik dari tingkat risiko inherent (11–54), digunakan untuk sorting Top Risk';
COMMENT ON COLUMN pkpt.risk_data.level_inherent IS 'Kode level: E=Extreme, T=Tinggi, MT=Medium Tinggi, M=Medium, RM=Rendah Medium, R=Rendah';

CREATE TRIGGER trg_risk_data_updated_at
    BEFORE UPDATE ON pkpt.risk_data
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_risk_tahun          ON pkpt.risk_data(tahun)              WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_skor_inherent  ON pkpt.risk_data(skor_inherent DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_level_inherent ON pkpt.risk_data(level_inherent)     WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_direktorat     ON pkpt.risk_data(direktorat_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_divisi         ON pkpt.risk_data(divisi_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_departemen     ON pkpt.risk_data(departemen_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_nama_fts ON pkpt.risk_data USING gin(to_tsvector('indonesian', nama_risiko));

-- ============================================================
--  TABLE: pkpt.annual_audit_plans — Program Kerja Audit
-- ============================================================
CREATE TABLE pkpt.annual_audit_plans (
    id                UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun_perencanaan DATE                        NOT NULL,
    jenis_program     pkpt.jenis_program_enum     NOT NULL,
    kategori_program  pkpt.kategori_program_enum  NOT NULL,
    judul_program     VARCHAR(300)                NOT NULL,
    status_program    pkpt.status_program_enum    NOT NULL,
    auditee           VARCHAR(300),
    deskripsi         TEXT,
    tanggal_mulai     DATE                        NOT NULL,
    tanggal_selesai   DATE                        NOT NULL,
    estimasi_hari     INTEGER                     NOT NULL DEFAULT 1 CHECK (estimasi_hari > 0),
    status_pkpt       pkpt.status_pkpt_enum       NOT NULL DEFAULT 'Open',
    finalized_by      UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
    finalized_at      TIMESTAMPTZ,
    created_by        UUID                        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_by        UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chk_aap_tanggal  CHECK (tanggal_selesai >= tanggal_mulai),
    CONSTRAINT chk_aap_finalize CHECK (
        status_pkpt <> 'Closed' OR (finalized_by IS NOT NULL AND finalized_at IS NOT NULL)
    )
);

CREATE TRIGGER trg_annual_plans_updated_at
    BEFORE UPDATE ON pkpt.annual_audit_plans
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_aap_tahun       ON pkpt.annual_audit_plans(tahun_perencanaan) WHERE deleted_at IS NULL;
CREATE INDEX idx_aap_status_pkpt ON pkpt.annual_audit_plans(status_pkpt)       WHERE deleted_at IS NULL;

-- ============================================================
--  TABLE: pkpt.annual_plan_team
-- ============================================================
CREATE TABLE pkpt.annual_plan_team (
    id             UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    annual_plan_id UUID               NOT NULL REFERENCES pkpt.annual_audit_plans(id) ON DELETE CASCADE,
    user_id        UUID               NOT NULL REFERENCES auth.users(id)              ON DELETE RESTRICT,
    role_tim       pkpt.role_tim_enum NOT NULL,
    created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_annual_plan_team UNIQUE (annual_plan_id, user_id)
);

CREATE TRIGGER trg_annual_team_updated_at
    BEFORE UPDATE ON pkpt.annual_plan_team
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_apt_plan ON pkpt.annual_plan_team(annual_plan_id);
CREATE INDEX idx_apt_user ON pkpt.annual_plan_team(user_id);

-- ============================================================
--  TABLE: pkpt.annual_plan_risks
-- ============================================================
CREATE TABLE pkpt.annual_plan_risks (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    annual_plan_id UUID        NOT NULL REFERENCES pkpt.annual_audit_plans(id) ON DELETE CASCADE,
    risk_id        UUID        NOT NULL REFERENCES pkpt.risk_data(id)          ON DELETE RESTRICT,
    prioritas      SMALLINT    CHECK (prioritas BETWEEN 1 AND 10),
    catatan        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_annual_plan_risk UNIQUE (annual_plan_id, risk_id)
);

CREATE TRIGGER trg_annual_risks_updated_at
    BEFORE UPDATE ON pkpt.annual_plan_risks
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_apr_plan ON pkpt.annual_plan_risks(annual_plan_id);
CREATE INDEX idx_apr_risk ON pkpt.annual_plan_risks(risk_id);

-- ============================================================
--  VIEW: pkpt.risk_data_legacy (compatibility)
--  Map RCSA fields → legacy names for older queries
-- ============================================================
CREATE OR REPLACE VIEW pkpt.risk_data_legacy AS
SELECT
    r.id,
    r.id_risiko AS risk_code,
    r.departemen_id AS department_id,
    COALESCE(dp.nama, r.departemen_nama) AS department_name,
    r.nama_risiko AS risk_description,
    r.level_inherent AS risk_level,
    NULL::VARCHAR(20) AS status,
    r.source,
    r.tahun,
    r.imported_by AS imported_by,
    r.created_at
FROM pkpt.risk_data r
LEFT JOIN master.departemen dp ON dp.id = r.departemen_id
WHERE r.deleted_at IS NULL;
