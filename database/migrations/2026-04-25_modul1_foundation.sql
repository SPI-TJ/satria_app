-- ============================================================
--  Migration: Modul 1 Enhancement — Foundation (Fase 1)
--  Date     : 2026-04-25
--
--  Berdasarkan rapat user (Notulensi 2026-04):
--    1. Master House of Strategy (kategori + sasaran strategis) per tahun
--    2. Master Bobot Peran (PM/PT/Ketua/Anggota) per tahun + max bobot/bulan
--    3. Master Tipe Penugasan (sub-kategori program: Audit/Review/Evaluasi/dst)
--    4. Kalender Kerja tahunan (12 bulan + jumlah hari + libur → hari efektif)
--    5. CEO Letter per tahun (1 dokumen + list area pengawasan)
--
--  Aman dijalankan berulang (IF NOT EXISTS / DO blocks).
-- ============================================================

-- ============================================================
--  1. MASTER: House of Strategy — Kategori (Perspektif)
-- ============================================================
-- 4 perspektif Balanced Scorecard, configurable per tahun
-- karena strategi perusahaan bisa berubah tahunan
CREATE TABLE IF NOT EXISTS master.house_of_strategy_kategori (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun           SMALLINT     NOT NULL,
    kode            VARCHAR(20)  NOT NULL,           -- e.g. 'F', 'C', 'IBP', 'LG'
    nama_perspektif VARCHAR(100) NOT NULL,           -- e.g. 'Finance', 'Customer'
    deskripsi       TEXT,
    urutan          SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_hos_kategori UNIQUE (tahun, kode)
);

COMMENT ON TABLE  master.house_of_strategy_kategori   IS 'Kategori/perspektif strategi (Balanced Scorecard) per tahun';
COMMENT ON COLUMN master.house_of_strategy_kategori.kode IS 'Kode singkat: F=Finance, C=Customer, IBP=Internal Business Process, LG=Learning & Growth';

DROP TRIGGER IF EXISTS trg_hos_kategori_updated ON master.house_of_strategy_kategori;
CREATE TRIGGER trg_hos_kategori_updated
    BEFORE UPDATE ON master.house_of_strategy_kategori
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_hos_kategori_tahun
    ON master.house_of_strategy_kategori(tahun) WHERE deleted_at IS NULL;

-- ============================================================
--  2. MASTER: Sasaran Strategis (anak dari kategori HoS)
-- ============================================================
-- Contoh: kategori IBP → sasaran "LG.1.1 % Implementasi GRC"
-- Diisi oleh seluruh user SPI (free-input + reusable)
CREATE TABLE IF NOT EXISTS master.sasaran_strategis (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori_id     UUID         NOT NULL
                        REFERENCES master.house_of_strategy_kategori(id) ON DELETE CASCADE,
    tahun           SMALLINT     NOT NULL,             -- denormalized for fast filter
    kode            VARCHAR(50),                        -- e.g. 'LG.1.1' (opsional)
    nama            VARCHAR(500) NOT NULL,              -- e.g. '% Implementasi GRC'
    deskripsi       TEXT,
    created_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE  master.sasaran_strategis      IS 'Sasaran strategis per kategori HoS (free-input oleh user SPI)';
COMMENT ON COLUMN master.sasaran_strategis.kode IS 'Kode opsional, contoh: LG.1.1, F.2.3';

DROP TRIGGER IF EXISTS trg_sasaran_strategis_updated ON master.sasaran_strategis;
CREATE TRIGGER trg_sasaran_strategis_updated
    BEFORE UPDATE ON master.sasaran_strategis
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sasaran_kategori
    ON master.sasaran_strategis(kategori_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sasaran_tahun
    ON master.sasaran_strategis(tahun) WHERE deleted_at IS NULL;

-- ============================================================
--  3. MASTER: Bobot Peran Audit (per tahun, configurable)
-- ============================================================
-- Bobot dipakai untuk hitung Man-Days = HP × bobot peran
-- Default: PM=1, PT=1, Ketua=1, Anggota=0.5 (sesuai role_tim_enum)
CREATE TABLE IF NOT EXISTS master.bobot_peran (
    id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun                 SMALLINT      NOT NULL,
    peran                 VARCHAR(50)   NOT NULL,    -- match role_tim_enum text
    bobot                 NUMERIC(4,2)  NOT NULL CHECK (bobot >= 0 AND bobot <= 5),
    max_bobot_per_bulan   NUMERIC(4,2)  NOT NULL DEFAULT 2.5
                              CHECK (max_bobot_per_bulan > 0 AND max_bobot_per_bulan <= 31),
    keterangan            TEXT,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT uq_bobot_peran UNIQUE (tahun, peran)
);

COMMENT ON TABLE  master.bobot_peran                     IS 'Bobot peran audit per tahun untuk perhitungan Man-Days';
COMMENT ON COLUMN master.bobot_peran.peran                IS 'Penanggung Jawab | Pengendali Teknis | Ketua Tim | Anggota Tim';
COMMENT ON COLUMN master.bobot_peran.bobot                IS 'Multiplier man-days per hari penugasan';
COMMENT ON COLUMN master.bobot_peran.max_bobot_per_bulan  IS 'Pagu maksimum akumulasi bobot per orang per bulan';

DROP TRIGGER IF EXISTS trg_bobot_peran_updated ON master.bobot_peran;
CREATE TRIGGER trg_bobot_peran_updated
    BEFORE UPDATE ON master.bobot_peran
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_bobot_peran_tahun
    ON master.bobot_peran(tahun) WHERE deleted_at IS NULL;

-- ============================================================
--  4. MASTER: Tipe Penugasan (sub-kategori program)
-- ============================================================
-- Hierarchical: parent = kategori_program_enum (Assurance/Non Assurance/dst)
-- child = Audit/Review/Evaluasi/Pemantauan (untuk Assurance)
--         Advisory/Investigasi/Lainnya  (untuk Non Assurance)
CREATE TABLE IF NOT EXISTS master.tipe_penugasan (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori_program  VARCHAR(50)  NOT NULL,           -- match kategori_program_enum
    kode              VARCHAR(20)  NOT NULL,
    nama              VARCHAR(100) NOT NULL,
    deskripsi         TEXT,
    default_hari      SMALLINT,                        -- default HP usulan
    urutan            SMALLINT     NOT NULL DEFAULT 0,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT uq_tipe_penugasan UNIQUE (kategori_program, kode)
);

COMMENT ON TABLE  master.tipe_penugasan                  IS 'Sub-tipe penugasan per kategori program (Audit/Review/Evaluasi/dst)';
COMMENT ON COLUMN master.tipe_penugasan.kategori_program IS 'Assurance | Non Assurance | Pemantauan Risiko | Evaluasi';

DROP TRIGGER IF EXISTS trg_tipe_penugasan_updated ON master.tipe_penugasan;
CREATE TRIGGER trg_tipe_penugasan_updated
    BEFORE UPDATE ON master.tipe_penugasan
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tipe_penugasan_kategori
    ON master.tipe_penugasan(kategori_program) WHERE deleted_at IS NULL;

-- ============================================================
--  5. PKPT: Kalender Kerja Tahunan
-- ============================================================
-- Header tahunan: total agregat hari kerja efektif + pagu pemeriksaan
CREATE TABLE IF NOT EXISTS pkpt.kalender_kerja (
    id                          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun                       SMALLINT      NOT NULL UNIQUE,
    -- Snapshot agar historical akurat meskipun jumlah auditor berubah kemudian
    jumlah_auditor_snapshot     SMALLINT      NOT NULL DEFAULT 0,
    -- Auto-computed dari sum(kalender_kerja_bulan.hari_efektif)
    total_hari_efektif          INTEGER       NOT NULL DEFAULT 0,
    -- = total_hari_efektif × jumlah_auditor_snapshot
    hari_pemeriksaan_tersedia   INTEGER       NOT NULL DEFAULT 0,
    -- Lock: setelah dikunci, tidak boleh diubah
    locked_at                   TIMESTAMPTZ,
    locked_by                   UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    keterangan                  TEXT,
    created_by                  UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

COMMENT ON TABLE  pkpt.kalender_kerja                          IS 'Kalender kerja tahunan SPI — basis perhitungan pagu Man-Days';
COMMENT ON COLUMN pkpt.kalender_kerja.jumlah_auditor_snapshot  IS 'Snapshot jumlah auditor SPI aktif saat kalender dibuat';
COMMENT ON COLUMN pkpt.kalender_kerja.hari_pemeriksaan_tersedia IS 'Pagu total Man-Days = total_hari_efektif × jumlah_auditor_snapshot';
COMMENT ON COLUMN pkpt.kalender_kerja.locked_at                IS 'Setelah locked, kalender tidak bisa diubah (lock pagu)';

DROP TRIGGER IF EXISTS trg_kalender_kerja_updated ON pkpt.kalender_kerja;
CREATE TRIGGER trg_kalender_kerja_updated
    BEFORE UPDATE ON pkpt.kalender_kerja
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kalender_kerja_tahun
    ON pkpt.kalender_kerja(tahun) WHERE deleted_at IS NULL;

-- ============================================================
--  6. PKPT: Kalender Kerja Bulan (12 baris per kalender)
-- ============================================================
CREATE TABLE IF NOT EXISTS pkpt.kalender_kerja_bulan (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    kalender_id     UUID         NOT NULL
                        REFERENCES pkpt.kalender_kerja(id) ON DELETE CASCADE,
    bulan           SMALLINT     NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    jumlah_hari     SMALLINT     NOT NULL DEFAULT 0
                        CHECK (jumlah_hari BETWEEN 0 AND 31),
    jumlah_libur    SMALLINT     NOT NULL DEFAULT 0
                        CHECK (jumlah_libur BETWEEN 0 AND 31),
    -- Auto-computed via trigger atau manual; default = jumlah_hari − jumlah_libur
    hari_efektif    SMALLINT     NOT NULL DEFAULT 0,
    catatan         TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_kalender_bulan UNIQUE (kalender_id, bulan),
    CONSTRAINT chk_libur_le_hari CHECK (jumlah_libur <= jumlah_hari)
);

COMMENT ON TABLE  pkpt.kalender_kerja_bulan IS 'Detail per bulan: jumlah hari, libur, dan hari efektif';

-- Trigger: auto-compute hari_efektif
CREATE OR REPLACE FUNCTION pkpt.fn_compute_hari_efektif()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hari_efektif := GREATEST(NEW.jumlah_hari - NEW.jumlah_libur, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kalender_bulan_compute ON pkpt.kalender_kerja_bulan;
CREATE TRIGGER trg_kalender_bulan_compute
    BEFORE INSERT OR UPDATE OF jumlah_hari, jumlah_libur ON pkpt.kalender_kerja_bulan
    FOR EACH ROW EXECUTE FUNCTION pkpt.fn_compute_hari_efektif();

DROP TRIGGER IF EXISTS trg_kalender_bulan_updated ON pkpt.kalender_kerja_bulan;
CREATE TRIGGER trg_kalender_bulan_updated
    BEFORE UPDATE ON pkpt.kalender_kerja_bulan
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kalender_bulan_kalender
    ON pkpt.kalender_kerja_bulan(kalender_id);

-- ============================================================
--  7. PKPT: CEO Letter (1 dokumen per tahun)
-- ============================================================
CREATE TABLE IF NOT EXISTS pkpt.ceo_letter (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun           SMALLINT     NOT NULL UNIQUE,         -- 1 letter per tahun
    nomor_surat     VARCHAR(100),
    judul           VARCHAR(500) NOT NULL,
    tanggal_terbit  DATE,
    isi_ringkasan   TEXT,                                  -- ringkasan arahan utama
    file_url        VARCHAR(500),                          -- URL PDF lampiran
    file_name       VARCHAR(255),
    file_size       INTEGER,
    uploaded_by     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE  pkpt.ceo_letter           IS 'Surat arahan Direksi (CEO Letter) — 1 dokumen per tahun';
COMMENT ON COLUMN pkpt.ceo_letter.file_url  IS 'Path/URL ke PDF lampiran';

DROP TRIGGER IF EXISTS trg_ceo_letter_updated ON pkpt.ceo_letter;
CREATE TRIGGER trg_ceo_letter_updated
    BEFORE UPDATE ON pkpt.ceo_letter
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ceo_letter_tahun
    ON pkpt.ceo_letter(tahun) WHERE deleted_at IS NULL;

-- ============================================================
--  8. PKPT: CEO Letter Area Pengawasan (child rows)
-- ============================================================
-- Poin-poin parameter dari CEO Letter (rute, efisiensi, pengeluaran, dst)
CREATE TABLE IF NOT EXISTS pkpt.ceo_letter_area (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    ceo_letter_id   UUID         NOT NULL
                        REFERENCES pkpt.ceo_letter(id) ON DELETE CASCADE,
    parameter       VARCHAR(200) NOT NULL,         -- e.g. 'Rute', 'Efisiensi', 'Pengeluaran'
    deskripsi       TEXT,
    prioritas       VARCHAR(20)  NOT NULL DEFAULT 'Sedang'
                        CHECK (prioritas IN ('Tinggi','Sedang','Rendah')),
    urutan          SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE  pkpt.ceo_letter_area           IS 'Area/parameter pengawasan yang diekstrak dari CEO Letter';
COMMENT ON COLUMN pkpt.ceo_letter_area.parameter IS 'Nama parameter, contoh: Rute, Efisiensi, Pengeluaran';

DROP TRIGGER IF EXISTS trg_ceo_letter_area_updated ON pkpt.ceo_letter_area;
CREATE TRIGGER trg_ceo_letter_area_updated
    BEFORE UPDATE ON pkpt.ceo_letter_area
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ceo_letter_area_letter
    ON pkpt.ceo_letter_area(ceo_letter_id) WHERE deleted_at IS NULL;

-- ============================================================
--  9. SEED: Default data untuk tahun berjalan
-- ============================================================
DO $$
DECLARE
    v_tahun SMALLINT := EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;
    v_kategori_id UUID;
BEGIN
    -- 9a. House of Strategy default 4 perspektif (Balanced Scorecard)
    INSERT INTO master.house_of_strategy_kategori (tahun, kode, nama_perspektif, urutan)
    VALUES
        (v_tahun, 'F',   'Finance',                    1),
        (v_tahun, 'C',   'Customer',                   2),
        (v_tahun, 'IBP', 'Internal Business Process',  3),
        (v_tahun, 'LG',  'Learning & Growth',          4)
    ON CONFLICT (tahun, kode) DO NOTHING;

    -- 9b. Bobot peran default
    INSERT INTO master.bobot_peran (tahun, peran, bobot, max_bobot_per_bulan)
    VALUES
        (v_tahun, 'Penanggung Jawab',  1.00, 2.50),
        (v_tahun, 'Pengendali Teknis', 1.00, 2.50),
        (v_tahun, 'Ketua Tim',         1.00, 2.50),
        (v_tahun, 'Anggota Tim',       0.50, 2.50)
    ON CONFLICT (tahun, peran) DO NOTHING;

    -- 9c. Tipe Penugasan default (sesuai template Excel PKPT)
    -- Assurance
    INSERT INTO master.tipe_penugasan (kategori_program, kode, nama, urutan, default_hari) VALUES
        ('Assurance', 'AUDIT',     'Audit',     1, 30),
        ('Assurance', 'REVIEW',    'Review',    2, 30),
        ('Assurance', 'EVALUASI',  'Evaluasi',  3, 30),
        ('Assurance', 'PEMANTAUAN','Pemantauan',4, 20)
    ON CONFLICT (kategori_program, kode) DO NOTHING;

    -- Non Assurance (Konsultansi)
    INSERT INTO master.tipe_penugasan (kategori_program, kode, nama, urutan, default_hari) VALUES
        ('Non Assurance', 'ADVISORY',     'Advisory',          1, 15),
        ('Non Assurance', 'INVESTIGASI',  'Audit Investigasi', 2, 30),
        ('Non Assurance', 'LAINNYA',      'Lainnya',           3, 10)
    ON CONFLICT (kategori_program, kode) DO NOTHING;

    -- Pemantauan Risiko
    INSERT INTO master.tipe_penugasan (kategori_program, kode, nama, urutan, default_hari) VALUES
        ('Pemantauan Risiko', 'PEMANTAUAN_RISIKO', 'Pemantauan Risiko', 1, 15)
    ON CONFLICT (kategori_program, kode) DO NOTHING;

    -- Evaluasi
    INSERT INTO master.tipe_penugasan (kategori_program, kode, nama, urutan, default_hari) VALUES
        ('Evaluasi', 'SELF_ASSESSMENT', 'Self-Assessment', 1, 15),
        ('Evaluasi', 'EVALUASI_UMUM',   'Evaluasi Umum',   2, 20)
    ON CONFLICT (kategori_program, kode) DO NOTHING;
END $$;

-- ============================================================
--  10. VERIFIKASI
-- ============================================================
SELECT
    'master.house_of_strategy_kategori' AS tabel, COUNT(*) AS rows FROM master.house_of_strategy_kategori
UNION ALL SELECT 'master.sasaran_strategis',     COUNT(*) FROM master.sasaran_strategis
UNION ALL SELECT 'master.bobot_peran',           COUNT(*) FROM master.bobot_peran
UNION ALL SELECT 'master.tipe_penugasan',        COUNT(*) FROM master.tipe_penugasan
UNION ALL SELECT 'pkpt.kalender_kerja',          COUNT(*) FROM pkpt.kalender_kerja
UNION ALL SELECT 'pkpt.kalender_kerja_bulan',    COUNT(*) FROM pkpt.kalender_kerja_bulan
UNION ALL SELECT 'pkpt.ceo_letter',              COUNT(*) FROM pkpt.ceo_letter
UNION ALL SELECT 'pkpt.ceo_letter_area',         COUNT(*) FROM pkpt.ceo_letter_area;

SELECT '✔ Modul 1 Foundation migration selesai — 8 tabel + seed default siap dipakai' AS status;
