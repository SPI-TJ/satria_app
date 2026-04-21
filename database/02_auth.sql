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
--    nik            → Nomor Induk Karyawan (ganti nip)
--    module_access  → Array modul yang bisa diakses user
--    direktorat_id / divisi_id / departemen_id → Posisi di org
--    kontak_email   → Email kontak alternatif (beda dari email login)
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
    nik             VARCHAR(30)         NOT NULL,              -- Nomor Induk Karyawan
    nama_lengkap    VARCHAR(150)        NOT NULL,
    email           VARCHAR(150)        NOT NULL,              -- Email login (SSO ready)
    kontak_email    VARCHAR(150),                              -- Email kontak alternatif / notifikasi
    password_hash   TEXT                NOT NULL,
    role            auth.user_role_enum NOT NULL DEFAULT 'anggota_tim',
    jabatan         VARCHAR(100),
    -- Posisi organisasi (opsional — Auditee wajib, auditor opsional)
    direktorat_id   UUID                REFERENCES master.direktorat(id)  ON DELETE SET NULL,
    divisi_id       UUID                REFERENCES master.divisi(id)       ON DELETE SET NULL,
    departemen_id   UUID                REFERENCES master.departemen(id)   ON DELETE SET NULL,
    -- Kontrol akses modul (array modul ID: 'pkpt','pelaksanaan',dst.)
    module_access   TEXT[]              NOT NULL DEFAULT ARRAY['pkpt'],
    -- Status & audit trail
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_users_nik   UNIQUE (nik),
    CONSTRAINT uq_users_email UNIQUE (email)
);

COMMENT ON TABLE  auth.users               IS 'Akun pengguna SATRIA — semua modul';
COMMENT ON COLUMN auth.users.nik           IS 'Nomor Induk Karyawan (NIK) Transjakarta';
COMMENT ON COLUMN auth.users.kontak_email  IS 'Email alternatif untuk notifikasi (boleh beda dari email login)';
COMMENT ON COLUMN auth.users.module_access IS 'Array modul yang dapat diakses: pkpt, pelaksanaan, pelaporan, sintesis, pemantauan, ca-cm';
COMMENT ON COLUMN auth.users.direktorat_id IS 'FK ke master.direktorat — posisi organisasi user';
COMMENT ON COLUMN auth.users.divisi_id     IS 'FK ke master.divisi — posisi organisasi user';
COMMENT ON COLUMN auth.users.departemen_id IS 'FK ke master.departemen — posisi organisasi user';

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_users_nik        ON auth.users(nik)          WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email      ON auth.users(email)        WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role       ON auth.users(role)         WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active     ON auth.users(is_active)    WHERE deleted_at IS NULL;
CREATE INDEX idx_users_direktorat ON auth.users(direktorat_id);
CREATE INDEX idx_users_divisi     ON auth.users(divisi_id);
CREATE INDEX idx_users_departemen ON auth.users(departemen_id);

-- Setelah auth.users ada, tambahkan FK ke master.trust_connections.created_by
ALTER TABLE master.trust_connections
    ADD CONSTRAINT fk_trust_conn_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE master.app_config
    ADD CONSTRAINT fk_app_config_updated_by
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

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
COMMENT ON TABLE auth.permissions IS 'Daftar permission granular per modul (contoh: pkpt.create, pkpt.finalize)';

-- ── TABLE: auth.role_permissions ──────────────────────────────
CREATE TABLE auth.role_permissions (
    role          auth.user_role_enum NOT NULL,
    permission_id INTEGER             NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);
COMMENT ON TABLE auth.role_permissions IS 'Mapping role → kumpulan permissions (RBAC)';

-- ── TABLE: auth.activity_log ──────────────────────────────────
CREATE TABLE auth.activity_log (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action      VARCHAR(100) NOT NULL,   -- contoh: CREATE_RISK, FINALIZE_PKPT
    modul       VARCHAR(50)  NOT NULL,   -- contoh: pkpt, penugasan
    entity_id   TEXT,                    -- UUID entity yang diubah
    entity_type VARCHAR(50),             -- contoh: risk_data, annual_audit_plan
    ip_address  INET,
    user_agent  TEXT,
    payload     JSONB,                   -- before/after snapshot (opsional)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE auth.activity_log IS 'Audit trail semua aksi penting — tidak bisa di-delete';

CREATE INDEX idx_log_user    ON auth.activity_log(user_id);
CREATE INDEX idx_log_modul   ON auth.activity_log(modul);
CREATE INDEX idx_log_action  ON auth.activity_log(action);
CREATE INDEX idx_log_created ON auth.activity_log(created_at DESC);

-- ── FUNGSI: generate password default ─────────────────────────
-- Pola: 3 digit terakhir NIK + '_' + nama belakang (lowercase, tanpa spasi)
-- Contoh: NIK=120199, Nama='Hafiizh Taufiqul Hakim' → '199_hakim'
-- DROP dulu agar PostgreSQL tidak error jika nama parameter berubah (nip → p_nik)
DROP FUNCTION IF EXISTS auth.default_password(TEXT, TEXT);
CREATE OR REPLACE FUNCTION auth.default_password(p_nik TEXT, p_nama_lengkap TEXT)
RETURNS TEXT AS $$
DECLARE
    last3     TEXT;
    last_name TEXT;
BEGIN
    last3     := RIGHT(TRIM(p_nik), 3);
    last_name := LOWER(
        SPLIT_PART(
            TRIM(p_nama_lengkap), ' ',
            ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(p_nama_lengkap), ' '), 1)
        )
    );
    RETURN last3 || '_' || last_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION auth.default_password IS
    'Password default: 3 digit terakhir NIK + "_" + nama belakang lowercase. '
    'Contoh: NIK=120199, Nama=Hafiizh Taufiqul Hakim → 199_hakim';

-- ── SEED: Permissions per modul ───────────────────────────────
INSERT INTO auth.permissions (kode, nama, modul) VALUES
-- PKPT (Modul 1)
('pkpt.view',         'Lihat Data PKPT',           'pkpt'),
('pkpt.create',       'Buat Program Kerja',         'pkpt'),
('pkpt.edit',         'Edit Program Kerja',          'pkpt'),
('pkpt.delete',       'Hapus Program Kerja',         'pkpt'),
('pkpt.finalize',     'Finalisasi PKPT',            'pkpt'),
('pkpt.import_risk',  'Import Data Risiko',         'pkpt'),
-- Penugasan (Modul 2)
('penugasan.view',    'Lihat Penugasan',            'penugasan'),
('penugasan.create',  'Buat Surat Tugas',           'penugasan'),
('penugasan.approve', 'Setujui Surat Tugas',        'penugasan'),
-- Audit / KKA (Modul 3)
('audit.view',        'Lihat KKA',                  'audit'),
('audit.create',      'Buat KKA',                   'audit'),
('audit.review',      'Review KKA',                 'audit'),
-- Pelaporan (Modul 4+)
('pelaporan.view',    'Lihat Laporan & Temuan',     'pelaporan'),
('pelaporan.create',  'Buat Notifikasi Temuan',     'pelaporan'),
('pelaporan.reply',   'Balas Temuan (Auditee)',      'pelaporan'),
-- Admin
('users.manage',      'Kelola User',                'admin'),
('users.view_log',    'Lihat Activity Log',         'admin')
ON CONFLICT (kode) DO NOTHING;

-- ── SEED: Role → Permissions ──────────────────────────────────
INSERT INTO auth.role_permissions (role, permission_id)
SELECT r.role::auth.user_role_enum, p.id FROM (VALUES
    -- kepala_spi: full access
    ('kepala_spi',       'pkpt.view'),
    ('kepala_spi',       'pkpt.create'),
    ('kepala_spi',       'pkpt.edit'),
    ('kepala_spi',       'pkpt.delete'),
    ('kepala_spi',       'pkpt.finalize'),
    ('kepala_spi',       'pkpt.import_risk'),
    ('kepala_spi',       'penugasan.view'),
    ('kepala_spi',       'penugasan.create'),
    ('kepala_spi',       'penugasan.approve'),
    ('kepala_spi',       'audit.view'),
    ('kepala_spi',       'audit.review'),
    ('kepala_spi',       'pelaporan.view'),
    ('kepala_spi',       'pelaporan.create'),
    -- pengendali_teknis: create & manage, no finalize
    ('pengendali_teknis','pkpt.view'),
    ('pengendali_teknis','pkpt.create'),
    ('pengendali_teknis','pkpt.edit'),
    ('pengendali_teknis','pkpt.import_risk'),
    ('pengendali_teknis','penugasan.view'),
    ('pengendali_teknis','penugasan.create'),
    ('pengendali_teknis','audit.view'),
    ('pengendali_teknis','audit.create'),
    ('pengendali_teknis','audit.review'),
    ('pengendali_teknis','pelaporan.view'),
    ('pengendali_teknis','pelaporan.create'),
    -- anggota_tim: view + isi KKA
    ('anggota_tim',      'pkpt.view'),
    ('anggota_tim',      'penugasan.view'),
    ('anggota_tim',      'audit.view'),
    ('anggota_tim',      'audit.create'),
    ('anggota_tim',      'pelaporan.view'),
    -- auditee: hanya lihat dan balas temuan
    ('auditee',          'pelaporan.view'),
    ('auditee',          'pelaporan.reply'),
    -- admin_spi: user management + full view
    ('admin_spi',        'pkpt.view'),
    ('admin_spi',        'penugasan.view'),
    ('admin_spi',        'pelaporan.view'),
    ('admin_spi',        'users.manage'),
    ('admin_spi',        'users.view_log'),
    -- it_admin: hanya user management
    ('it_admin',         'users.manage'),
    ('it_admin',         'users.view_log')
) AS r(role, perm_kode)
JOIN auth.permissions p ON p.kode = r.perm_kode
ON CONFLICT DO NOTHING;

-- ── SEED: Users awal ──────────────────────────────────────────
--
--  Password default = 3 digit terakhir NIK + '_' + nama belakang
--
--  | Nama                    | NIK       | Password Default      |
--  |-------------------------|-----------|-----------------------|
--  | IT Administrator        | 000000001 | 001_administrator     |
--  | Admin SPI               | 000000002 | 002_spi               |
--  | Budi Santoso (Kepala)   | 199001001 | 001_santoso           |
--  | Siti Rahayu (Peng.Tek)  | 199205002 | 002_rahayu            |
--  | Andi Pratama (Anggota)  | 199508003 | 003_pratama           |
--  | Dewi Auditee            | 199612004 | 004_auditee           |

INSERT INTO auth.users (nik, nama_lengkap, email, password_hash, role, jabatan, module_access)
VALUES
(
    '000000001', 'IT Administrator', 'it.admin@satria.app',
    crypt(auth.default_password('000000001', 'IT Administrator'), gen_salt('bf', 12)),
    'it_admin', 'Admin Sistem',
    ARRAY['pkpt','pelaksanaan','pelaporan','sintesis','pemantauan','ca-cm']
),
(
    '000000002', 'Admin SPI', 'admin.spi@satria.app',
    crypt(auth.default_password('000000002', 'Admin SPI'), gen_salt('bf', 12)),
    'admin_spi', 'Administrator SPI',
    ARRAY['pkpt','pelaksanaan','pelaporan','sintesis','pemantauan','ca-cm']
),
(
    '199001001', 'Budi Santoso', 'budi@satria.app',
    crypt(auth.default_password('199001001', 'Budi Santoso'), gen_salt('bf', 12)),
    'kepala_spi', 'Kepala SPI',
    ARRAY['pkpt','pelaksanaan','pelaporan','sintesis','pemantauan','ca-cm']
),
(
    '199205002', 'Siti Rahayu', 'siti@satria.app',
    crypt(auth.default_password('199205002', 'Siti Rahayu'), gen_salt('bf', 12)),
    'pengendali_teknis', 'Pengendali Teknis',
    ARRAY['pkpt','pelaksanaan','pelaporan']
),
(
    '199508003', 'Andi Pratama', 'andi@satria.app',
    crypt(auth.default_password('199508003', 'Andi Pratama'), gen_salt('bf', 12)),
    'anggota_tim', 'Auditor',
    ARRAY['pkpt','pelaksanaan']
),
(
    '199612004', 'Dewi Auditee', 'dewi@satria.app',
    crypt(auth.default_password('199612004', 'Dewi Auditee'), gen_salt('bf', 12)),
    'auditee', 'Manajer Keuangan',
    ARRAY['pelaporan']
)
ON CONFLICT (nik) DO NOTHING;
