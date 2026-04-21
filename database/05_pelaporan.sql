-- ============================================================
--  SATRIA — Modul 4+: Pelaporan, Temuan, Notifikasi, Penilaian
--  File   : 05_pelaporan.sql
--  Urutan : 6 dari 7 (setelah 04_operasional.sql)
--
--  Isi    :
--    - pelaporan.notifications     → Notifikasi in-app per user
--    - pelaporan.notifikasi_temuan → Pengiriman temuan ke auditee
--    - pelaporan.tanggapan_temuan  → Balasan auditee atas temuan
--    - pelaporan.penilaian_individu → Penilaian kinerja anggota tim per penugasan
--
--  CATATAN DESAIN:
--    - notifications menggunakan VARCHAR bukan ENUM untuk notification_type
--      agar tidak terdampak DROP ENUM jika schema di-re-run
--    - notifikasi_temuan.penerima_dept → FK ke master.departemen (bukan departments lama)
--    - penilaian_individu: skor 1-5 (Sangat Kurang s.d. Sangat Baik)
-- ============================================================

-- ── RESET ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_notif_updated_at     ON pelaporan.notifications;
DROP TRIGGER IF EXISTS trg_notif_temuan_updated ON pelaporan.notifikasi_temuan;
DROP TRIGGER IF EXISTS trg_tanggapan_updated    ON pelaporan.tanggapan_temuan;
DROP TRIGGER IF EXISTS trg_penilaian_updated    ON pelaporan.penilaian_individu;
DROP TABLE IF EXISTS pelaporan.tanggapan_temuan   CASCADE;
DROP TABLE IF EXISTS pelaporan.notifikasi_temuan  CASCADE;
DROP TABLE IF EXISTS pelaporan.penilaian_individu CASCADE;
DROP TABLE IF EXISTS pelaporan.notifications      CASCADE;
DROP TYPE  IF EXISTS pelaporan.status_notif_enum  CASCADE;

-- ── ENUM ─────────────────────────────────────────────────────
CREATE TYPE pelaporan.status_notif_enum AS ENUM (
    'Draft',     -- Temuan sedang disusun
    'Terkirim',  -- Sudah dikirim ke auditee
    'Dibalas',   -- Auditee sudah merespons
    'Selesai'    -- Tindak lanjut selesai, temuan closed
);

-- ── TABLE: pelaporan.notifications ───────────────────────────
-- In-app notification center untuk semua user
-- Menggunakan VARCHAR (bukan ENUM) agar tidak cascade-drop saat re-run schema
CREATE TABLE pelaporan.notifications (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title             VARCHAR(300) NOT NULL,
    message           TEXT         NOT NULL,
    notification_type VARCHAR(20)  NOT NULL DEFAULT 'System'
                          CHECK (notification_type IN ('Risk', 'Program', 'System')),
    is_read           BOOLEAN      NOT NULL DEFAULT FALSE,
    entity_id         UUID,        -- ID entitas terkait (risk_id, plan_id, dst.)
    entity_type       VARCHAR(50), -- Tipe entitas (risk_data, annual_audit_plan, dst.)
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    -- Tidak ada deleted_at — notifikasi bisa di-delete hard
);

COMMENT ON TABLE  pelaporan.notifications                   IS 'Notifikasi in-app per user (badge unread)';
COMMENT ON COLUMN pelaporan.notifications.notification_type IS 'Risk | Program | System';
COMMENT ON COLUMN pelaporan.notifications.entity_id         IS 'UUID entitas terkait notifikasi (opsional)';

CREATE TRIGGER trg_notif_updated_at
    BEFORE UPDATE ON pelaporan.notifications
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_notif_user    ON pelaporan.notifications(user_id, is_read);
CREATE INDEX idx_notif_unread  ON pelaporan.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created ON pelaporan.notifications(created_at DESC);
CREATE INDEX idx_notif_type    ON pelaporan.notifications(notification_type);

-- ── TABLE: pelaporan.notifikasi_temuan ────────────────────────
-- Pengiriman formal temuan audit dari tim SPI ke auditee
CREATE TABLE pelaporan.notifikasi_temuan (
    id               UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    workpaper_id     UUID                        NOT NULL
                         REFERENCES audit.audit_workpapers(id) ON DELETE RESTRICT,
    pengirim_id      UUID                        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    -- Penerima: departemen (FK ke master.departemen — bukan master.departments lama)
    penerima_dept_id UUID                        REFERENCES master.departemen(id)  ON DELETE SET NULL,
    penerima_divisi_id UUID                      REFERENCES master.divisi(id)      ON DELETE SET NULL,
    -- Konten temuan
    judul            VARCHAR(300)                NOT NULL,
    isi_temuan       TEXT                        NOT NULL,
    rekomendasi      TEXT,         -- Rekomendasi tindak lanjut
    batas_waktu      DATE,         -- Deadline tindak lanjut auditee
    -- Referensi dimensi
    jenis_temuan_id  INTEGER       REFERENCES master.jenis_temuan(id) ON DELETE SET NULL,
    status           pelaporan.status_notif_enum NOT NULL DEFAULT 'Draft',
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

COMMENT ON TABLE  pelaporan.notifikasi_temuan              IS 'Notifikasi formal temuan audit — dari SPI ke auditee';
COMMENT ON COLUMN pelaporan.notifikasi_temuan.rekomendasi  IS 'Rekomendasi perbaikan dari tim audit';
COMMENT ON COLUMN pelaporan.notifikasi_temuan.batas_waktu  IS 'Deadline auditee merespons / menindaklanjuti temuan';

CREATE TRIGGER trg_notif_temuan_updated
    BEFORE UPDATE ON pelaporan.notifikasi_temuan
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_nt_workpaper ON pelaporan.notifikasi_temuan(workpaper_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_nt_status    ON pelaporan.notifikasi_temuan(status)             WHERE deleted_at IS NULL;
CREATE INDEX idx_nt_penerima  ON pelaporan.notifikasi_temuan(penerima_dept_id)  WHERE deleted_at IS NULL;

-- ── TABLE: pelaporan.tanggapan_temuan ─────────────────────────
-- Thread balasan auditee (bisa multi-putaran)
CREATE TABLE pelaporan.tanggapan_temuan (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    notifikasi_id  UUID        NOT NULL REFERENCES pelaporan.notifikasi_temuan(id) ON DELETE CASCADE,
    pengirim_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    isi_tanggapan  TEXT        NOT NULL,
    lampiran_url   TEXT,       -- URL dokumen tindak lanjut / bukti
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
COMMENT ON TABLE pelaporan.tanggapan_temuan IS 'Balasan auditee / tim SPI atas notifikasi temuan (thread)';

CREATE TRIGGER trg_tanggapan_updated
    BEFORE UPDATE ON pelaporan.tanggapan_temuan
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_tt_notifikasi ON pelaporan.tanggapan_temuan(notifikasi_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tt_pengirim   ON pelaporan.tanggapan_temuan(pengirim_id)   WHERE deleted_at IS NULL;

-- ── TABLE: pelaporan.penilaian_individu ───────────────────────
-- Penilaian kinerja anggota tim per penugasan (oleh pengendali teknis / kepala SPI)
CREATE TABLE pelaporan.penilaian_individu (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_plan_id UUID        NOT NULL REFERENCES penugasan.individual_audit_plans(id) ON DELETE RESTRICT,
    user_dinilai  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    penilai_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    skor          SMALLINT    NOT NULL CHECK (skor BETWEEN 1 AND 5),
    catatan       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,
    CONSTRAINT uq_penilaian UNIQUE (audit_plan_id, user_dinilai)
);

COMMENT ON TABLE  pelaporan.penilaian_individu      IS 'Penilaian kinerja anggota tim per penugasan';
COMMENT ON COLUMN pelaporan.penilaian_individu.skor IS '1=Sangat Kurang, 2=Kurang, 3=Cukup, 4=Baik, 5=Sangat Baik';

CREATE TRIGGER trg_penilaian_updated
    BEFORE UPDATE ON pelaporan.penilaian_individu
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_pi_plan ON pelaporan.penilaian_individu(audit_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pi_user ON pelaporan.penilaian_individu(user_dinilai)  WHERE deleted_at IS NULL;
