-- ============================================================
--  SATRIA — Authentication & Authorization
--  File   : 02_auth.sql
--  Urutan : 3 dari 7 (setelah 01_master.sql)
--
--  Isi    :
--    - auth.users           → Akun pengguna + org mapping + module access
--    - auth.permissions     → Daftar permission granular per modul
--    - auth.role_permissions → Mapping role → permissions
--    - auth.activity_log    → Audit trail semua aksi penting
--    - auth.default_password() → Fungsi generate password default
--
--  FIELD KUNCI auth.users:
--    nik            → Nomor Induk Karyawan (Digunakan untuk LOGIN)
--    module_access  → Array modul yang bisa diakses user
--    direktorat_id / divisi_id / departemen_id → Posisi di org
-- ============================================================

-- ── RESET ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_updated_at ON auth.users;
DROP TABLE IF EXISTS auth.activity_log      CASCADE;
DROP TABLE IF EXISTS auth.role_permissions  CASCADE;
DROP TABLE IF EXISTS auth.permissions       CASCADE;
DROP TABLE IF EXISTS auth.users             CASCADE;
DROP TYPE  IF EXISTS auth.user_role_enum    CASCADE;

-- ── ENUM: Role pengguna ───────────────────────────────────────
CREATE TYPE auth.user_role_enum AS ENUM (
    'admin_spi',          -- Administrator SPI: kelola user, lihat log
    'kepala_spi',         -- Kepala SPI: approve PKPT, finalisasi, nilai anggota
    'pengendali_teknis',  -- Pengendali Teknis / Ketua Tim lapangan
    'anggota_tim',        -- Anggota Tim Audit: isi KKA
    'auditee',            -- Auditee: terima & balas temuan
    'it_admin'            -- IT Admin: kelola user & konfigurasi sistem
);

-- ── TABLE: auth.users ─────────────────────────────────────────
CREATE TABLE auth.users (
    id              UUID                NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    nik             VARCHAR(6)          NOT NULL CHECK (nik ~ '^[0-9]{6}$'),   -- Nomor Induk Karyawan (6 digit, UNTUK LOGIN)
    nama_lengkap    VARCHAR(150)        NOT NULL,
    email           VARCHAR(150)        NOT NULL,              -- Email untuk notifikasi
    password_hash   TEXT                NOT NULL,
    role            auth.user_role_enum NOT NULL DEFAULT 'anggota_tim',
    jabatan         VARCHAR(100),
    -- Posisi organisasi
    direktorat_id   UUID                REFERENCES master.direktorat(id)  ON DELETE SET NULL,
    divisi_id       UUID                REFERENCES master.divisi(id)       ON DELETE SET NULL,
    departemen_id   UUID                REFERENCES master.departemen(id)   ON DELETE SET NULL,
    -- Kontrol akses modul
    module_access   TEXT[]              NOT NULL DEFAULT ARRAY['pkpt'],
    -- Status & audit trail
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE  auth.users       IS 'Akun pengguna SATRIA — semua modul';
COMMENT ON COLUMN auth.users.nik   IS 'Kredensial utama untuk login';

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE UNIQUE INDEX uq_users_nik_active   ON auth.users(nik)   WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_email_active ON auth.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role       ON auth.users(role)         WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active     ON auth.users(is_active)    WHERE deleted_at IS NULL;
CREATE INDEX idx_users_direktorat ON auth.users(direktorat_id);
CREATE INDEX idx_users_divisi     ON auth.users(divisi_id);
CREATE INDEX idx_users_departemen ON auth.users(departemen_id);

ALTER TABLE master.trust_connections ADD CONSTRAINT fk_trust_conn_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE master.app_config ADD CONSTRAINT fk_app_config_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── TABLE: auth.permissions ───────────────────────────────────
CREATE TABLE auth.permissions (
    id         SERIAL       PRIMARY KEY,
    kode       VARCHAR(80)  NOT NULL,
    nama       VARCHAR(150) NOT NULL,
    modul      VARCHAR(50)  NOT NULL,
    deskripsi  TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permission_kode UNIQUE (kode)
);

-- ── TABLE: auth.role_permissions ──────────────────────────────
CREATE TABLE auth.role_permissions (
    role          auth.user_role_enum NOT NULL,
    permission_id INTEGER             NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);

-- ── TABLE: auth.activity_log ──────────────────────────────────
CREATE TABLE auth.activity_log (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action      VARCHAR(100) NOT NULL,
    modul       VARCHAR(50)  NOT NULL,
    entity_id   TEXT,
    entity_type VARCHAR(50),
    ip_address  INET,
    user_agent  TEXT,
    payload     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_log_user    ON auth.activity_log(user_id);
CREATE INDEX idx_log_modul   ON auth.activity_log(modul);
CREATE INDEX idx_log_action  ON auth.activity_log(action);
CREATE INDEX idx_log_created ON auth.activity_log(created_at DESC);

-- ── FUNGSI: generate password default ─────────────────────────
DROP FUNCTION IF EXISTS auth.default_password(TEXT, TEXT);
CREATE OR REPLACE FUNCTION auth.default_password(p_nik TEXT, p_nama_lengkap TEXT)
RETURNS TEXT AS $$
DECLARE
    last3     TEXT;
    last_name TEXT;
BEGIN
    last3     := RIGHT(TRIM(p_nik), 3);
    last_name := LOWER(SPLIT_PART(TRIM(p_nama_lengkap), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(p_nama_lengkap), ' '), 1)));
    RETURN last3 || '_' || last_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── SEED: Permissions per modul ───────────────────────────────
INSERT INTO auth.permissions (kode, nama, modul) VALUES
('pkpt.view',         'Lihat Data PKPT',           'pkpt'),
('pkpt.create',       'Buat Program Kerja',         'pkpt'),
('pkpt.edit',         'Edit Program Kerja',          'pkpt'),
('pkpt.delete',       'Hapus Program Kerja',         'pkpt'),
('pkpt.finalize',     'Finalisasi PKPT',            'pkpt'),
('pkpt.import_risk',  'Import Data Risiko',         'pkpt'),
('penugasan.view',    'Lihat Penugasan',            'penugasan'),
('penugasan.create',  'Buat Surat Tugas',           'penugasan'),
('penugasan.approve', 'Setujui Surat Tugas',        'penugasan'),
('audit.view',        'Lihat KKA',                  'audit'),
('audit.create',      'Buat KKA',                   'audit'),
('audit.review',      'Review KKA',                 'audit'),
('pelaporan.view',    'Lihat Laporan & Temuan',     'pelaporan'),
('pelaporan.create',  'Buat Notifikasi Temuan',     'pelaporan'),
('pelaporan.reply',   'Balas Temuan (Auditee)',      'pelaporan'),
('users.manage',      'Kelola User',                'admin'),
('users.view_log',    'Lihat Activity Log',         'admin')
ON CONFLICT (kode) DO NOTHING;

-- ── SEED: Role → Permissions ──────────────────────────────────
INSERT INTO auth.role_permissions (role, permission_id)
SELECT r.role::auth.user_role_enum, p.id FROM (VALUES
    ('kepala_spi',       'pkpt.view'),('kepala_spi',       'pkpt.create'),('kepala_spi',       'pkpt.edit'),('kepala_spi',       'pkpt.delete'),('kepala_spi',       'pkpt.finalize'),('kepala_spi',       'pkpt.import_risk'),('kepala_spi',       'penugasan.view'),('kepala_spi',       'penugasan.create'),('kepala_spi',       'penugasan.approve'),('kepala_spi',       'audit.view'),('kepala_spi',       'audit.review'),('kepala_spi',       'pelaporan.view'),('kepala_spi',       'pelaporan.create'),
    ('pengendali_teknis','pkpt.view'),('pengendali_teknis','pkpt.create'),('pengendali_teknis','pkpt.edit'),('pengendali_teknis','pkpt.import_risk'),('pengendali_teknis','penugasan.view'),('pengendali_teknis','penugasan.create'),('pengendali_teknis','audit.view'),('pengendali_teknis','audit.create'),('pengendali_teknis','audit.review'),('pengendali_teknis','pelaporan.view'),('pengendali_teknis','pelaporan.create'),
    ('anggota_tim',      'pkpt.view'),('anggota_tim',      'penugasan.view'),('anggota_tim',      'audit.view'),('anggota_tim',      'audit.create'),('anggota_tim',      'pelaporan.view'),
    ('auditee',          'pelaporan.view'),('auditee',          'pelaporan.reply'),
    ('admin_spi',        'pkpt.view'),('admin_spi',        'penugasan.view'),('admin_spi',        'pelaporan.view'),('admin_spi',        'users.manage'),('admin_spi',        'users.view_log'),
    ('it_admin',         'users.manage'),('it_admin',         'users.view_log')
) AS r(role, perm_kode)
JOIN auth.permissions p ON p.kode = r.perm_kode
ON CONFLICT DO NOTHING;

-- ── SEED: Users awal ──────────────────────────────────────────
INSERT INTO auth.users (nik, nama_lengkap, email, password_hash, role, jabatan, module_access)
VALUES
(
    '000001', 'Admin IT', 'it.admin@satria.app',
    crypt(auth.default_password('000001', 'Admin IT'), gen_salt('bf', 12)),
    'it_admin', 'Admin Sistem',
    ARRAY['pkpt','pelaksanaan','pelaporan','sintesis','pemantauan','ca-cm']
),
(
    '000002', 'Admin SPI', 'admin.spi@satria.app',
    crypt(auth.default_password('000002', 'Admin SPI'), gen_salt('bf', 12)),
    'admin_spi', 'Administrator SPI',
    ARRAY['pkpt','pelaksanaan','pelaporan','sintesis','pemantauan','ca-cm']
)
ON CONFLICT (nik) WHERE deleted_at IS NULL DO UPDATE SET
    nama_lengkap  = EXCLUDED.nama_lengkap,
    email         = EXCLUDED.email,
    role          = EXCLUDED.role,
    jabatan       = EXCLUDED.jabatan,
    module_access = EXCLUDED.module_access,
    updated_at    = NOW();