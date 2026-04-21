-- ============================================================
--  SATRIA — Master & Dimension Tables
--  File   : 01_master.sql
--  Urutan : 2 dari 7 (setelah 00_setup.sql)
--
--  Isi    : Semua tabel master dan dimensi
--
--  HIERARKI ORGANISASI (3 Level):
--    master.direktorat   → Level 1 (Direktorat Utama, dst.)
--    master.divisi       → Level 2 (Divisi per Direktorat)
--    master.departemen   → Level 3 (Departemen per Divisi)
--
--  DIMENSI REFERENSI:
--    master.kategori_risiko → Kategori risiko standar (Best Practice IIA)
--    master.jenis_temuan    → Jenis temuan audit
--    master.trust_connections → Konfigurasi koneksi ke sistem TRUST
--    master.app_config      → Konfigurasi aplikasi (key-value)
-- ============================================================

-- ── RESET (urutan harus benar: child → parent) ────────────────
DROP TRIGGER IF EXISTS trg_departemen_updated_at   ON master.departemen;
DROP TRIGGER IF EXISTS trg_divisi_updated_at       ON master.divisi;
DROP TRIGGER IF EXISTS trg_direktorat_updated_at   ON master.direktorat;
DROP TRIGGER IF EXISTS trg_kategori_risiko_updated ON master.kategori_risiko;
DROP TRIGGER IF EXISTS trg_jenis_temuan_updated    ON master.jenis_temuan;
DROP TRIGGER IF EXISTS trg_trust_conn_updated_at   ON master.trust_connections;
DROP TABLE IF EXISTS master.app_config             CASCADE;
DROP TABLE IF EXISTS master.trust_connections      CASCADE;
DROP TABLE IF EXISTS master.jenis_temuan           CASCADE;
DROP TABLE IF EXISTS master.kategori_risiko        CASCADE;
DROP TABLE IF EXISTS master.departemen             CASCADE;
DROP TABLE IF EXISTS master.divisi                 CASCADE;
DROP TABLE IF EXISTS master.direktorat             CASCADE;

-- ============================================================
--  DIMENSI ORGANISASI
-- ============================================================

-- ── TABLE: master.direktorat (Level 1) ───────────────────────
CREATE TABLE master.direktorat (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode        VARCHAR(30)  NOT NULL,
    nama        VARCHAR(200) NOT NULL,
    deskripsi   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT uq_direktorat_kode UNIQUE (kode)
);
COMMENT ON TABLE  master.direktorat      IS 'Level 1 organisasi: Direktorat Utama Transjakarta';
COMMENT ON COLUMN master.direktorat.kode IS 'Kode unik direktorat (contoh: UTAMA, KEUANGAN_SDM)';

CREATE TRIGGER trg_direktorat_updated_at
    BEFORE UPDATE ON master.direktorat
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_direktorat_kode   ON master.direktorat(kode);
CREATE INDEX idx_direktorat_active ON master.direktorat(is_active) WHERE deleted_at IS NULL;

-- ── TABLE: master.divisi (Level 2) ───────────────────────────
CREATE TABLE master.divisi (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    direktorat_id UUID         NOT NULL REFERENCES master.direktorat(id) ON DELETE CASCADE,
    kode          VARCHAR(30)  NOT NULL,
    nama          VARCHAR(200) NOT NULL,
    deskripsi     TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,
    CONSTRAINT uq_divisi_kode UNIQUE (direktorat_id, kode)
);
COMMENT ON TABLE  master.divisi              IS 'Level 2 organisasi: Divisi di bawah Direktorat';
COMMENT ON COLUMN master.divisi.direktorat_id IS 'FK ke direktorat induk';
COMMENT ON COLUMN master.divisi.kode          IS 'Kode divisi (unik per direktorat)';

CREATE TRIGGER trg_divisi_updated_at
    BEFORE UPDATE ON master.divisi
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_divisi_direktorat ON master.divisi(direktorat_id);
CREATE INDEX idx_divisi_kode       ON master.divisi(kode);
CREATE INDEX idx_divisi_active     ON master.divisi(is_active) WHERE deleted_at IS NULL;

-- ── TABLE: master.departemen (Level 3) ───────────────────────
CREATE TABLE master.departemen (
    id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    divisi_id UUID         NOT NULL REFERENCES master.divisi(id) ON DELETE CASCADE,
    kode      VARCHAR(30)  NOT NULL,
    nama      VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    is_active BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_departemen_kode UNIQUE (divisi_id, kode)
);
COMMENT ON TABLE  master.departemen       IS 'Level 3 organisasi: Departemen di bawah Divisi';
COMMENT ON COLUMN master.departemen.kode  IS 'Kode departemen (unik per divisi)';

CREATE TRIGGER trg_departemen_updated_at
    BEFORE UPDATE ON master.departemen
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_departemen_divisi ON master.departemen(divisi_id);
CREATE INDEX idx_departemen_kode   ON master.departemen(kode);
CREATE INDEX idx_departemen_active ON master.departemen(is_active) WHERE deleted_at IS NULL;

-- ============================================================
--  DIMENSI REFERENSI
-- ============================================================

-- ── TABLE: master.kategori_risiko ─────────────────────────────
-- Digunakan untuk mengklasifikasikan risiko secara standar (IIA / COSO)
CREATE TABLE master.kategori_risiko (
    id          SERIAL       PRIMARY KEY,
    kode        VARCHAR(20)  NOT NULL,
    nama        VARCHAR(100) NOT NULL,
    deskripsi   TEXT,
    warna       VARCHAR(10)  DEFAULT '#6B7280',   -- hex color untuk UI badge
    urutan      SMALLINT     NOT NULL DEFAULT 0,   -- urutan tampil
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_kategori_risiko_kode UNIQUE (kode)
);
COMMENT ON TABLE  master.kategori_risiko IS 'Klasifikasi risiko standar (IIA/COSO): Operasional, Keuangan, dll.';
COMMENT ON COLUMN master.kategori_risiko.warna IS 'Hex color untuk badge di UI, misal #EF4444';

CREATE TRIGGER trg_kategori_risiko_updated
    BEFORE UPDATE ON master.kategori_risiko
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── TABLE: master.jenis_temuan ────────────────────────────────
-- Taksonomi temuan audit (digunakan di Modul 3 KKA dan Modul 4 pelaporan)
CREATE TABLE master.jenis_temuan (
    id          SERIAL       PRIMARY KEY,
    kode        VARCHAR(20)  NOT NULL,
    nama        VARCHAR(100) NOT NULL,
    deskripsi   TEXT,
    urutan      SMALLINT     NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_jenis_temuan_kode UNIQUE (kode)
);
COMMENT ON TABLE master.jenis_temuan IS 'Taksonomi jenis temuan audit (Ketidakpatuhan, Fraud Risk, Inefisiensi, dll.)';

CREATE TRIGGER trg_jenis_temuan_updated
    BEFORE UPDATE ON master.jenis_temuan
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── TABLE: master.trust_connections ──────────────────────────
-- Konfigurasi integrasi ke sistem TRUST (Transjakarta Risk & Assurance System)
CREATE TABLE master.trust_connections (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_koneksi    VARCHAR(100) NOT NULL DEFAULT 'TRUST Integration',
    api_url         TEXT         NOT NULL,
    api_key_hash    TEXT         NOT NULL,   -- bcrypt hash dari API key
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_sync_at    TIMESTAMPTZ,
    last_sync_count INTEGER,
    created_by      UUID         NOT NULL,   -- FK ke auth.users di-defer karena auth dibuat setelah ini
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
COMMENT ON TABLE  master.trust_connections              IS 'Konfigurasi koneksi ke sistem TRUST untuk import data risiko';
COMMENT ON COLUMN master.trust_connections.api_key_hash IS 'bcrypt hash dari API key — jangan simpan plain text';

CREATE TRIGGER trg_trust_conn_updated_at
    BEFORE UPDATE ON master.trust_connections
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── TABLE: master.app_config ──────────────────────────────────
-- Key-value store untuk konfigurasi aplikasi yang bisa diubah tanpa deploy
CREATE TABLE master.app_config (
    kunci       VARCHAR(100) PRIMARY KEY,
    nilai       TEXT         NOT NULL,
    tipe        VARCHAR(20)  NOT NULL DEFAULT 'string'
                    CHECK (tipe IN ('string', 'integer', 'boolean', 'json')),
    deskripsi   TEXT,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by  UUID         -- FK ke auth.users (nullable, di-defer)
);
COMMENT ON TABLE  master.app_config IS 'Konfigurasi aplikasi key-value (tanpa restart/deploy)';
COMMENT ON COLUMN master.app_config.tipe IS 'Tipe nilai: string | integer | boolean | json';

-- ── SEED: Kategori Risiko (standar IIA/COSO) ──────────────────
INSERT INTO master.kategori_risiko (kode, nama, deskripsi, warna, urutan) VALUES
('OPERASIONAL',  'Risiko Operasional',       'Risiko terkait proses, sistem, SDM, dan kejadian eksternal',      '#F97316', 1),
('KEUANGAN',     'Risiko Keuangan',          'Risiko terkait pelaporan keuangan, likuiditas, dan fraud',        '#EF4444', 2),
('KEPATUHAN',    'Risiko Kepatuhan',         'Risiko ketidakpatuhan terhadap regulasi, hukum, dan kebijakan',   '#8B5CF6', 3),
('STRATEGIS',    'Risiko Strategis',         'Risiko terkait arah strategis, reputasi, dan keputusan bisnis',   '#3B82F6', 4),
('TEKNOLOGI',    'Risiko Teknologi',         'Risiko terkait sistem TI, keamanan data, dan siber',              '#06B6D4', 5),
('LINGKUNGAN',   'Risiko Lingkungan & K3L',  'Risiko keselamatan kerja, lingkungan hidup, dan K3',             '#22C55E', 6),
('REPUTASI',     'Risiko Reputasi',          'Risiko terhadap citra dan kepercayaan publik',                    '#EC4899', 7)
ON CONFLICT (kode) DO NOTHING;

-- ── SEED: Jenis Temuan Audit ───────────────────────────────────
INSERT INTO master.jenis_temuan (kode, nama, deskripsi, urutan) VALUES
('KETIDAKPATUHAN', 'Ketidakpatuhan',         'Pelanggaran terhadap aturan, regulasi, atau kebijakan yang berlaku', 1),
('INEFISIENSI',    'Inefisiensi',            'Penggunaan sumber daya yang tidak optimal atau pemborosan',           2),
('FRAUD_RISK',     'Risiko Fraud',           'Indikasi potensi kecurangan atau penyalahgunaan wewenang',            3),
('KELEMAHAN_KCI',  'Kelemahan Kontrol',      'Kelemahan pada sistem pengendalian intern (KCI)',                     4),
('TEMUAN_POSITIF', 'Praktik Baik (Positif)', 'Area yang sudah berjalan baik dan layak menjadi best practice',      5),
('REKOMENDASI',    'Rekomendasi Perbaikan',  'Saran perbaikan tanpa temuan signifikan',                            6)
ON CONFLICT (kode) DO NOTHING;

-- ── SEED: App Config ──────────────────────────────────────────
INSERT INTO master.app_config (kunci, nilai, tipe, deskripsi) VALUES
('hari_kerja_ref',    '230',          'integer', 'Referensi hari kerja per tahun untuk perhitungan beban kerja auditor'),
('tahun_aktif',       '2026',         'integer', 'Tahun anggaran / perencanaan yang sedang aktif'),
('max_upload_mb',     '10',           'integer', 'Batas maksimal ukuran file upload (dalam MB)'),
('pkpt_deadline_day', '31',           'integer', 'Tanggal batas pengajuan PKPT (hari di bulan Desember tahun sebelumnya)'),
('app_name',          'SATRIA',       'string',  'Nama aplikasi — Sistem Akuntabilitas Internal Audit'),
('app_version',       '2.0.0',        'string',  'Versi aplikasi saat ini')
ON CONFLICT (kunci) DO NOTHING;
