-- ============================================================
--  SATRIA — Modul 1: Perencanaan Pengawasan Tahunan (PKPT)
--  File   : 03_pkpt.sql
--  Urutan : 4 dari 7 (setelah 02_auth.sql)
--
--  Isi    :
--    - pkpt.risk_data          → Data risiko (dari TRUST / upload / manual)
--    - pkpt.annual_audit_plans → Program kerja audit tahunan
--    - pkpt.annual_plan_team   → Pivot: program ↔ tim auditor
--    - pkpt.annual_plan_risks  → Pivot: program ↔ risiko (landasan PKPT)
--
--  CATATAN DESAIN:
--    - risk_data.divisi  → TEXT (bukan FK) agar fleksibel dengan TRUST import
--    - risk_data.divisi_id → FK opsional ke master.divisi (jika dipetakan)
--    - annual_audit_plans.auditee → TEXT (nama unit yang diaudit)
--    - estimasi_hari → dihitung otomatis dari tanggal_mulai - tanggal_selesai
--    - annual_plan_team: hard DELETE (bukan soft) saat update untuk
--      menghindari konflik UNIQUE constraint saat user yang sama ditambah ulang
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
DROP TYPE  IF EXISTS pkpt.risk_level_enum          CASCADE;
DROP TYPE  IF EXISTS pkpt.risk_status_enum         CASCADE;
DROP TYPE  IF EXISTS pkpt.risk_source_enum         CASCADE;
DROP TYPE  IF EXISTS pkpt.jenis_program_enum       CASCADE;
DROP TYPE  IF EXISTS pkpt.kategori_program_enum    CASCADE;
DROP TYPE  IF EXISTS pkpt.status_program_enum      CASCADE;
DROP TYPE  IF EXISTS pkpt.status_pkpt_enum         CASCADE;
DROP TYPE  IF EXISTS pkpt.role_tim_enum            CASCADE;

-- ── ENUM ─────────────────────────────────────────────────────
CREATE TYPE pkpt.risk_level_enum       AS ENUM ('Critical','High','Medium','Low');
CREATE TYPE pkpt.risk_status_enum      AS ENUM ('Open','Mitigated','Closed');
CREATE TYPE pkpt.risk_source_enum      AS ENUM ('TRUST','Manual');
CREATE TYPE pkpt.jenis_program_enum    AS ENUM ('PKPT','Non PKPT');
CREATE TYPE pkpt.kategori_program_enum AS ENUM ('Assurance','Non Assurance','Pemantauan Risiko','Evaluasi');
CREATE TYPE pkpt.status_program_enum   AS ENUM ('Mandatory','Strategis','Emerging Risk');
CREATE TYPE pkpt.status_pkpt_enum      AS ENUM ('Draft','Final');
CREATE TYPE pkpt.role_tim_enum         AS ENUM ('Penanggung Jawab','Pengendali Teknis','Ketua Tim','Anggota Tim');

-- ── TABLE: pkpt.risk_data ─────────────────────────────────────
CREATE TABLE pkpt.risk_data (
    id                  UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_code           VARCHAR(50)             NOT NULL,
    tahun               SMALLINT                NOT NULL,
    -- Lokasi risiko (teks bebas dari TRUST / upload — tidak di-enforce FK)
    divisi              VARCHAR(200),           -- Nama divisi (teks, dari import TRUST)
    department_name     VARCHAR(200)            NOT NULL,  -- Nama departemen / unit
    -- Referensi organisasi (opsional — untuk korelasi data jika dipetakan manual)
    divisi_id           UUID                    REFERENCES master.divisi(id)     ON DELETE SET NULL,
    departemen_id       UUID                    REFERENCES master.departemen(id) ON DELETE SET NULL,
    -- Data risiko
    risk_description    TEXT                    NOT NULL,
    risk_level          pkpt.risk_level_enum    NOT NULL,
    status              pkpt.risk_status_enum   NOT NULL DEFAULT 'Open',
    source              pkpt.risk_source_enum   NOT NULL,
    -- Referensi dimensi (opsional — untuk analitik lanjutan)
    kategori_risiko_id  INTEGER                 REFERENCES master.kategori_risiko(id) ON DELETE SET NULL,
    -- Metadata import
    trust_connection_id UUID                    REFERENCES master.trust_connections(id) ON DELETE SET NULL,
    raw_data            JSONB,                  -- Data mentah dari API TRUST
    imported_by         UUID                    NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    -- Audit trail
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT uq_risk_code_tahun UNIQUE (risk_code, tahun)
);

COMMENT ON TABLE  pkpt.risk_data             IS 'Data risiko tahunan — sumber: TRUST API, upload file, atau manual';
COMMENT ON COLUMN pkpt.risk_data.divisi      IS 'Nama divisi teks dari TRUST/import. Untuk korelasi gunakan divisi_id';
COMMENT ON COLUMN pkpt.risk_data.divisi_id   IS 'FK opsional ke master.divisi — isi jika sudah dipetakan ke hierarki org';
COMMENT ON COLUMN pkpt.risk_data.raw_data    IS 'Payload JSON mentah dari API TRUST untuk keperluan audit/debug';

CREATE TRIGGER trg_risk_data_updated_at
    BEFORE UPDATE ON pkpt.risk_data
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_risk_tahun       ON pkpt.risk_data(tahun)              WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_level       ON pkpt.risk_data(risk_level)         WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_status      ON pkpt.risk_data(status)             WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_divisi      ON pkpt.risk_data(divisi_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_departemen  ON pkpt.risk_data(departemen_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_risk_description ON pkpt.risk_data USING gin(to_tsvector('indonesian', risk_description));

-- ── TABLE: pkpt.annual_audit_plans ────────────────────────────
CREATE TABLE pkpt.annual_audit_plans (
    id                UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun_perencanaan DATE                        NOT NULL,       -- Simpan YYYY-01-01
    jenis_program     pkpt.jenis_program_enum     NOT NULL,
    kategori_program  pkpt.kategori_program_enum  NOT NULL,
    judul_program     VARCHAR(300)                NOT NULL,
    status_program    pkpt.status_program_enum    NOT NULL,
    auditee           VARCHAR(300),                               -- Unit/entitas yang diaudit
    deskripsi         TEXT,                                       -- Nullable (tidak wajib)
    tanggal_mulai     DATE                        NOT NULL,
    tanggal_selesai   DATE                        NOT NULL,
    estimasi_hari     INTEGER                     NOT NULL DEFAULT 1 CHECK (estimasi_hari > 0),
    status_pkpt       pkpt.status_pkpt_enum       NOT NULL DEFAULT 'Draft',
    finalized_by      UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
    finalized_at      TIMESTAMPTZ,
    created_by        UUID                        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_by        UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chk_aap_tanggal  CHECK (tanggal_selesai >= tanggal_mulai),
    CONSTRAINT chk_aap_finalize CHECK (
        status_pkpt <> 'Final' OR (finalized_by IS NOT NULL AND finalized_at IS NOT NULL)
    )
);

COMMENT ON TABLE  pkpt.annual_audit_plans                   IS 'Program kerja audit tahunan (PKPT dan Non-PKPT)';
COMMENT ON COLUMN pkpt.annual_audit_plans.tahun_perencanaan IS 'Tahun perencanaan disimpan sebagai YYYY-01-01';
COMMENT ON COLUMN pkpt.annual_audit_plans.estimasi_hari     IS 'Auto-hitung: tanggal_selesai - tanggal_mulai + 1 (inklusif)';
COMMENT ON COLUMN pkpt.annual_audit_plans.auditee           IS 'Nama unit/entitas yang menjadi sasaran audit';

CREATE TRIGGER trg_annual_plans_updated_at
    BEFORE UPDATE ON pkpt.annual_audit_plans
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_aap_tahun       ON pkpt.annual_audit_plans(tahun_perencanaan) WHERE deleted_at IS NULL;
CREATE INDEX idx_aap_status_pkpt ON pkpt.annual_audit_plans(status_pkpt)       WHERE deleted_at IS NULL;
CREATE INDEX idx_aap_jenis       ON pkpt.annual_audit_plans(jenis_program)     WHERE deleted_at IS NULL;
CREATE INDEX idx_aap_created_by  ON pkpt.annual_audit_plans(created_by)        WHERE deleted_at IS NULL;

-- ── TABLE: pkpt.annual_plan_team ──────────────────────────────
-- Pivot: satu program ↔ banyak anggota tim (dengan peran masing-masing)
-- PENTING: Gunakan hard DELETE (bukan soft) saat update tim untuk menghindari
--          konflik UNIQUE constraint jika user yang sama ditambahkan ulang.
CREATE TABLE pkpt.annual_plan_team (
    id             UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    annual_plan_id UUID               NOT NULL REFERENCES pkpt.annual_audit_plans(id) ON DELETE CASCADE,
    user_id        UUID               NOT NULL REFERENCES auth.users(id)              ON DELETE RESTRICT,
    role_tim       pkpt.role_tim_enum NOT NULL,
    created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    -- Tidak ada deleted_at — gunakan hard DELETE saat update
    CONSTRAINT uq_annual_plan_team UNIQUE (annual_plan_id, user_id)
);

COMMENT ON TABLE pkpt.annual_plan_team IS
    'Tim audit per program PKPT. Update: hard DELETE then re-INSERT (bukan soft delete) '
    'untuk menghindari UNIQUE constraint conflict jika user yang sama ditambah ulang.';

CREATE TRIGGER trg_annual_team_updated_at
    BEFORE UPDATE ON pkpt.annual_plan_team
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_apt_plan ON pkpt.annual_plan_team(annual_plan_id);
CREATE INDEX idx_apt_user ON pkpt.annual_plan_team(user_id);

-- ── TABLE: pkpt.annual_plan_risks ─────────────────────────────
-- Pivot: program ↔ risiko (risiko landasan PKPT → koneksi ke Modul 2)
CREATE TABLE pkpt.annual_plan_risks (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    annual_plan_id UUID        NOT NULL REFERENCES pkpt.annual_audit_plans(id) ON DELETE CASCADE,
    risk_id        UUID        NOT NULL REFERENCES pkpt.risk_data(id)          ON DELETE RESTRICT,
    prioritas      SMALLINT    CHECK (prioritas BETWEEN 1 AND 10),
    catatan        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Tidak ada deleted_at — gunakan hard DELETE saat update
    CONSTRAINT uq_annual_plan_risk UNIQUE (annual_plan_id, risk_id)
);

COMMENT ON TABLE  pkpt.annual_plan_risks          IS 'Risiko landasan PKPT — koneksi ke Modul 2 (penugasan)';
COMMENT ON COLUMN pkpt.annual_plan_risks.prioritas IS 'Ranking prioritas 1–10 dari top risiko yang masuk PKPT';

CREATE TRIGGER trg_annual_risks_updated_at
    BEFORE UPDATE ON pkpt.annual_plan_risks
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_apr_plan ON pkpt.annual_plan_risks(annual_plan_id);
CREATE INDEX idx_apr_risk ON pkpt.annual_plan_risks(risk_id);
