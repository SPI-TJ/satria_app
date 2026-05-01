-- ============================================================
--  SATRIA — Modul 2 & 3: Penugasan & Audit (KKA)
--  File   : 04_operasional.sql
--  Urutan : 5 dari 7 (setelah 03_pkpt.sql)
--
--  Isi    :
--    Schema penugasan (Modul 2 — Perencanaan Individual):
--      - penugasan.individual_audit_plans → Surat Tugas per program PKPT
--      - penugasan.audit_team_members     → Pivot: surat tugas ↔ anggota tim
--
--    Schema audit (Modul 3 — Kertas Kerja Audit):
--      - audit.audit_workpapers → KKA per prosedur audit
--
--  KONEKSI ANTAR MODUL:
--    Modul 1 (PKPT) → Modul 2 (Penugasan): individual_audit_plans.annual_plan_id
--    Modul 2        → Modul 3 (KKA):       audit_workpapers.audit_plan_id
--    Modul 3        → Modul 4 (Pelaporan): notifikasi_temuan.workpaper_id
-- ============================================================

-- ── RESET: Modul 3 (audit) ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_aw_updated_at ON audit.audit_workpapers;
DROP TABLE IF EXISTS audit.audit_workpapers CASCADE;
DROP TYPE  IF EXISTS audit.status_kka_enum  CASCADE;

-- ── RESET: Modul 2 (penugasan) ───────────────────────────────
DROP TRIGGER IF EXISTS trg_iap_updated_at ON penugasan.individual_audit_plans;
DROP TRIGGER IF EXISTS trg_atm_updated_at ON penugasan.audit_team_members;
DROP TABLE IF EXISTS penugasan.audit_team_members     CASCADE;
DROP TABLE IF EXISTS penugasan.individual_audit_plans CASCADE;
DROP TYPE  IF EXISTS penugasan.status_penugasan_enum  CASCADE;

-- ============================================================
--  MODUL 2: PENUGASAN INDIVIDUAL
-- ============================================================

CREATE TYPE penugasan.status_penugasan_enum AS ENUM (
    'Draft',        -- Surat tugas belum diajukan / dalam penyusunan
    'Approved',     -- Disetujui Kepala SPI
    'In Progress',  -- Penugasan sedang berjalan
    'Closed'        -- Penugasan selesai
);

-- ── TABLE: penugasan.individual_audit_plans ───────────────────
CREATE TABLE penugasan.individual_audit_plans (
    id                   UUID                            PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_penugasan       VARCHAR(50)                     NOT NULL,      -- Nomor Surat Tugas
    annual_plan_id       UUID                            NOT NULL
                             REFERENCES pkpt.annual_audit_plans(id) ON DELETE RESTRICT,
    risk_id              UUID                            REFERENCES pkpt.risk_data(id) ON DELETE SET NULL,
    judul_penugasan      VARCHAR(300)                    NOT NULL,
    tujuan_penugasan     TEXT                            NOT NULL,
    penanggung_jawab_id  UUID                            NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    pengendali_teknis_id UUID                            NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    ketua_tim_id         UUID                            NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    -- Lokasi / objek audit
    divisi_id            UUID                            REFERENCES master.divisi(id)     ON DELETE SET NULL,
    departemen_id        UUID                            REFERENCES master.departemen(id) ON DELETE SET NULL,
    status_penugasan     penugasan.status_penugasan_enum NOT NULL DEFAULT 'Draft',
    deskripsi            TEXT,
    lampiran_url         TEXT,
    approved_by          UUID                            REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    created_by           UUID                            NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_by           UUID                            REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT uq_kode_penugasan UNIQUE (kode_penugasan)
);

COMMENT ON TABLE  penugasan.individual_audit_plans IS 'Surat Tugas per program PKPT — koneksi Modul 1 → Modul 2';
COMMENT ON COLUMN penugasan.individual_audit_plans.annual_plan_id    IS 'FK ke pkpt.annual_audit_plans';
COMMENT ON COLUMN penugasan.individual_audit_plans.risk_id           IS 'Risiko spesifik dari PKPT yang menjadi dasar penugasan ini';
COMMENT ON COLUMN penugasan.individual_audit_plans.kode_penugasan    IS 'Format: ST/SPI/YYYY/NNN';
COMMENT ON COLUMN penugasan.individual_audit_plans.divisi_id        IS 'Unit/divisi yang menjadi objek audit';
COMMENT ON COLUMN penugasan.individual_audit_plans.departemen_id    IS 'Departemen spesifik yang menjadi objek audit';

CREATE TRIGGER trg_iap_updated_at
    BEFORE UPDATE ON penugasan.individual_audit_plans
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_iap_annual   ON penugasan.individual_audit_plans(annual_plan_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_iap_status   ON penugasan.individual_audit_plans(status_penugasan)    WHERE deleted_at IS NULL;
CREATE INDEX idx_iap_pj       ON penugasan.individual_audit_plans(penanggung_jawab_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_iap_risk     ON penugasan.individual_audit_plans(risk_id)             WHERE deleted_at IS NULL;
CREATE INDEX idx_iap_divisi   ON penugasan.individual_audit_plans(divisi_id)           WHERE deleted_at IS NULL;

-- ── TABLE: penugasan.audit_team_members ───────────────────────
CREATE TABLE penugasan.audit_team_members (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_plan_id UUID        NOT NULL REFERENCES penugasan.individual_audit_plans(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,
    CONSTRAINT uq_team_member UNIQUE (audit_plan_id, user_id)
);
COMMENT ON TABLE penugasan.audit_team_members IS 'Anggota tim per Surat Tugas (pivot many-to-many)';

CREATE TRIGGER trg_atm_updated_at
    BEFORE UPDATE ON penugasan.audit_team_members
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_atm_plan ON penugasan.audit_team_members(audit_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_atm_user ON penugasan.audit_team_members(user_id)       WHERE deleted_at IS NULL;

-- ============================================================
--  MODUL 3: KERTAS KERJA AUDIT (KKA)
-- ============================================================

CREATE TYPE audit.status_kka_enum AS ENUM (
    'Sesuai',        -- Tidak ada temuan signifikan
    'Tidak Sesuai',  -- Ada temuan — wajib isi temuan_catatan
    'Catatan'        -- Perlu perhatian, bukan temuan signifikan
);

-- ── TABLE: audit.audit_workpapers ────────────────────────────
CREATE TABLE audit.audit_workpapers (
    id                UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_plan_id     UUID                   NOT NULL
                          REFERENCES penugasan.individual_audit_plans(id) ON DELETE RESTRICT,
    prosedur_audit    VARCHAR(500)           NOT NULL,
    tujuan_prosedur   VARCHAR(500)           NOT NULL,
    periode_mulai     DATE                   NOT NULL,
    periode_selesai   DATE                   NOT NULL,
    -- Auditee departemen (sekarang FK ke master.departemen — bukan master.departments lama)
    auditee_dept_id   UUID                   REFERENCES master.departemen(id) ON DELETE SET NULL,
    auditee_divisi_id UUID                   REFERENCES master.divisi(id)     ON DELETE SET NULL,
    auditee_pic_id    UUID                   REFERENCES auth.users(id)        ON DELETE SET NULL,
    -- Klasifikasi
    jenis_temuan_id   INTEGER                REFERENCES master.jenis_temuan(id) ON DELETE SET NULL,
    -- Hasil pengujian
    status_pengujian  audit.status_kka_enum  NOT NULL DEFAULT 'Sesuai',
    temuan_catatan    TEXT,       -- Wajib jika status = 'Tidak Sesuai'
    lampiran_evidence TEXT,       -- URL atau path file evidence
    -- Review
    reviewed_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    catatan_reviewer  TEXT,
    -- Audit trail
    created_by        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chk_aw_periode CHECK (periode_selesai >= periode_mulai),
    CONSTRAINT chk_aw_temuan  CHECK (
        status_pengujian <> 'Tidak Sesuai' OR temuan_catatan IS NOT NULL
    )
);

COMMENT ON TABLE  audit.audit_workpapers                  IS 'Kertas Kerja Audit (KKA) per prosedur pengujian';
COMMENT ON COLUMN audit.audit_workpapers.status_pengujian IS 'Sesuai | Tidak Sesuai (wajib isi temuan) | Catatan';
COMMENT ON COLUMN audit.audit_workpapers.temuan_catatan   IS 'Deskripsi temuan — wajib jika status = Tidak Sesuai';
COMMENT ON COLUMN audit.audit_workpapers.jenis_temuan_id  IS 'FK ke master.jenis_temuan untuk klasifikasi standar';

CREATE TRIGGER trg_aw_updated_at
    BEFORE UPDATE ON audit.audit_workpapers
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_aw_plan    ON audit.audit_workpapers(audit_plan_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_aw_status  ON audit.audit_workpapers(status_pengujian) WHERE deleted_at IS NULL;
CREATE INDEX idx_aw_dept    ON audit.audit_workpapers(auditee_dept_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_aw_periode ON audit.audit_workpapers(periode_mulai, periode_selesai);
CREATE INDEX idx_aw_temuan  ON audit.audit_workpapers(jenis_temuan_id)  WHERE deleted_at IS NULL;
