-- ============================================================
--  SATRIA — Seed Data Lengkap
--  File   : 99_seed.sql
--  Urutan : 7 dari 7 (jalankan terakhir setelah semua schema)
--
--  Isi    :
--    1. master.direktorat  → 5 Direktorat Transjakarta
--    2. master.divisi      → 17 Divisi (sesuai struktur org TJ)
--    3. master.departemen  → Departemen per divisi
--    4. auth.users         → Update posisi org user seed
--    5. Contoh notifikasi
--
--  CATATAN:
--    - Users awal sudah di-seed di 02_auth.sql
--    - Kategori risiko & jenis temuan sudah di-seed di 01_master.sql
--    - App config sudah di-seed di 01_master.sql
--    - File ini fokus pada data organisasi & contoh data operasional
-- ============================================================

-- ============================================================
--  BAGIAN 1: DIMENSI ORGANISASI TRANSJAKARTA
-- ============================================================

-- ── Direktorat (Level 1) ─────────────────────────────────────
INSERT INTO master.direktorat (kode, nama, deskripsi) VALUES
('UTAMA',        'Direktorat Utama',                              'Direktorat Utama dan Fungsi Strategis Perusahaan'),
('KEUANGAN_SDM', 'Direktorat Keuangan, SDM, dan Umum',           'Direktorat Keuangan, Sumber Daya Manusia, dan Umum'),
('OPERASIONAL',  'Direktorat Operasional dan Keselamatan',       'Direktorat Operasional Layanan dan Keselamatan'),
('BISNIS',       'Direktorat Bisnis dan Pemanfaatan Aset',       'Direktorat Bisnis, Komersial, dan Pemanfaatan Aset'),
('STI',          'Direktorat Sistem Teknologi Informasi dan Pelayanan', 'Direktorat STI dan Pelayanan Pelanggan')
ON CONFLICT (kode) DO NOTHING;

-- ── Divisi (Level 2) ─────────────────────────────────────────
-- Direktorat UTAMA
INSERT INTO master.divisi (direktorat_id, kode, nama, deskripsi)
SELECT d.id, v.kode, v.nama, v.deskripsi FROM master.direktorat d
JOIN (VALUES
    ('SEKPUBHUMAS',      'Sekretaris Perusahaan dan Hubungan Masyarakat', 'Divisi Sekretaris Perusahaan dan Humas'),
    ('PERENCANAAN_RISIKO','Perencanaan Perusahaan dan Manajemen Risiko',  'Divisi Perencanaan & Manajemen Risiko'),
    ('LEGAL_KEPATUHAN',  'Legal dan Kepatuhan',                          'Divisi Legal dan Kepatuhan Perusahaan')
) AS v(kode, nama, deskripsi) ON TRUE
WHERE d.kode = 'UTAMA'
ON CONFLICT (direktorat_id, kode) DO NOTHING;

-- Direktorat KEUANGAN_SDM
INSERT INTO master.divisi (direktorat_id, kode, nama, deskripsi)
SELECT d.id, v.kode, v.nama, v.deskripsi FROM master.direktorat d
JOIN (VALUES
    ('AKUNTANSI_PAJAK', 'Akuntansi dan Pajak',              'Divisi Akuntansi dan Pajak'),
    ('SDM_UMUM',        'Sumber Daya Manusia dan Umum',     'Divisi SDM dan Umum'),
    ('KEUANGAN',        'Keuangan',                         'Divisi Keuangan dan Treasury'),
    ('TJACADEMY',       'Unit Bisnis TJ Academy',           'Unit Bisnis TJ Academy')
) AS v(kode, nama, deskripsi) ON TRUE
WHERE d.kode = 'KEUANGAN_SDM'
ON CONFLICT (direktorat_id, kode) DO NOTHING;

-- Direktorat OPERASIONAL
INSERT INTO master.divisi (direktorat_id, kode, nama, deskripsi)
SELECT d.id, v.kode, v.nama, v.deskripsi FROM master.direktorat d
JOIN (VALUES
    ('PERENCANAAN_OPS', 'Perencanaan Operasional dan Manajemen Operator', 'Divisi Perencanaan Operasional'),
    ('KESELAMATAN',     'Keselamatan dan Pengawasan Operasional',         'Divisi Keselamatan dan Pengawasan Ops'),
    ('OPERASIONAL_BUS', 'Operasional Bus',                                'Divisi Operasional Bus'),
    ('SWAKELOLA',       'Swakelola',                                      'Divisi Swakelola')
) AS v(kode, nama, deskripsi) ON TRUE
WHERE d.kode = 'OPERASIONAL'
ON CONFLICT (direktorat_id, kode) DO NOTHING;

-- Direktorat BISNIS
INSERT INTO master.divisi (direktorat_id, kode, nama, deskripsi)
SELECT d.id, v.kode, v.nama, v.deskripsi FROM master.direktorat d
JOIN (VALUES
    ('PEMASARAN',        'Pemasaran',                                'Divisi Pemasaran dan Komunikasi'),
    ('PRASARANA_DEVELOP','Pengembangan dan Pengelolaan Prasarana',   'Divisi Pengembangan Prasarana'),
    ('PENJUALAN',        'Penjualan',                                'Divisi Penjualan dan Distribusi')
) AS v(kode, nama, deskripsi) ON TRUE
WHERE d.kode = 'BISNIS'
ON CONFLICT (direktorat_id, kode) DO NOTHING;

-- Direktorat STI
INSERT INTO master.divisi (direktorat_id, kode, nama, deskripsi)
SELECT d.id, v.kode, v.nama, v.deskripsi FROM master.direktorat d
JOIN (VALUES
    ('PELAYANAN',         'Pelayanan',                                               'Divisi Pelayanan Pelanggan'),
    ('INFRASTRUKTUR_TI',  'Infrastruktur dan Operasional Teknologi Informasi',       'Divisi Infrastruktur TI'),
    ('PENGEMBANGAN_TI',   'Pengembangan Sistem dan Inovasi Teknologi Informasi',     'Divisi Pengembangan Sistem TI')
) AS v(kode, nama, deskripsi) ON TRUE
WHERE d.kode = 'STI'
ON CONFLICT (direktorat_id, kode) DO NOTHING;

-- ── Departemen (Level 3) ─────────────────────────────────────
-- Departemen per divisi (representasi umum — bisa dikembangkan)
INSERT INTO master.departemen (divisi_id, kode, nama, deskripsi)
SELECT dv.id, dp.kode, dp.nama, dp.deskripsi
FROM master.divisi dv
JOIN (VALUES
    -- SEKPUBHUMAS
    ('SEKPUBHUMAS',       'HUBMASYARAKAT',      'Departemen Hubungan Masyarakat dan CSR',          'Dept. Humas dan CSR'),
    ('SEKPUBHUMAS',       'PROTOKOL',           'Departemen Protokol dan Kesekretariatan',          'Dept. Protokol'),
    -- PERENCANAAN_RISIKO
    ('PERENCANAAN_RISIKO','MANAJEMEN_RISIKO',   'Departemen Manajemen Risiko',                     'Dept. Manajemen Risiko'),
    ('PERENCANAAN_RISIKO','PERENCANAAN_KORP',   'Departemen Perencanaan Korporat',                 'Dept. Perencanaan Korporat'),
    -- LEGAL_KEPATUHAN
    ('LEGAL_KEPATUHAN',   'LEGAL_PERUSAHAAN',   'Departemen Legal Perusahaan dan Kepatuhan',       'Dept. Legal'),
    -- AKUNTANSI_PAJAK
    ('AKUNTANSI_PAJAK',   'AKUNTANSI',          'Departemen Akuntansi',                            'Dept. Akuntansi'),
    ('AKUNTANSI_PAJAK',   'PERPAJAKAN',         'Departemen Perpajakan',                           'Dept. Pajak'),
    ('AKUNTANSI_PAJAK',   'PENGADAAN',          'Departemen Pengadaan',                            'Dept. Pengadaan'),
    -- SDM_UMUM
    ('SDM_UMUM',          'PENGEMBANGAN_SDM',   'Departemen Pengembangan SDM dan Talenta',         'Dept. Pengembangan SDM'),
    ('SDM_UMUM',          'HUBUNGAN_KARYAWAN',  'Departemen Hubungan Karyawan',                    'Dept. Hub. Karyawan'),
    ('SDM_UMUM',          'UMUM',               'Departemen Umum dan Fasilitas',                   'Dept. Umum'),
    -- KEUANGAN
    ('KEUANGAN',          'PENGELOLAAN_UTANG',  'Departemen Pengelolaan Utang Usaha dan Kas',      'Dept. Utang & Kas'),
    ('KEUANGAN',          'ANGGARAN',           'Departemen Anggaran dan Pengendalian',            'Dept. Anggaran'),
    -- TJACADEMY
    ('TJACADEMY',         'PENGELOLAAN_USAHA',  'Departemen Pengelolaan Usaha TJ Academy',         'Dept. Usaha Academy'),
    -- PERENCANAAN_OPS
    ('PERENCANAAN_OPS',   'STANDAR_KONTRAK',    'Departemen Standardisasi dan Kontrak Operator',   'Dept. Standar & Kontrak'),
    -- KESELAMATAN
    ('KESELAMATAN',       'KESELAMATAN_K3L',    'Departemen Keselamatan dan K3L',                  'Dept. K3L'),
    -- OPERASIONAL_BUS
    ('OPERASIONAL_BUS',   'OPS_BUS_BESAR',      'Departemen Operasional Bus Besar',                'Dept. Ops Bus Besar'),
    ('OPERASIONAL_BUS',   'OPS_BUS_KECIL',      'Departemen Operasional Bus Kecil',                'Dept. Ops Bus Kecil'),
    -- SWAKELOLA
    ('SWAKELOLA',         'BENGKEL_SWAKELOLA',  'Departemen Bengkel Swakelola',                    'Dept. Bengkel'),
    -- PEMASARAN
    ('PEMASARAN',         'PENGEMBANGAN_BISNIS','Departemen Pengembangan Bisnis',                  'Dept. Dev Bisnis'),
    ('PEMASARAN',         'KOMUNIKASI',         'Departemen Komunikasi dan Brand',                  'Dept. Komunikasi'),
    -- PRASARANA_DEVELOP
    ('PRASARANA_DEVELOP', 'KELOLA_PRASARANA',   'Departemen Pengelolaan Prasarana',                'Dept. Kelola Prasarana'),
    -- PENJUALAN
    ('PENJUALAN',         'TICKETING_ADMIN',    'Departemen Bisnis Ticketing dan Administrasi',    'Dept. Ticketing'),
    -- PELAYANAN
    ('PELAYANAN',         'OPS_LAYANAN_WIL1',  'Departemen Operasional Layanan Wilayah I',         'Dept. Layanan Wil. I'),
    ('PELAYANAN',         'OPS_LAYANAN_WIL2',  'Departemen Operasional Layanan Wilayah II',        'Dept. Layanan Wil. II'),
    -- INFRASTRUKTUR_TI
    ('INFRASTRUKTUR_TI',  'OPS_TI',             'Departemen Operasional Teknologi Informasi',      'Dept. Ops TI'),
    ('INFRASTRUKTUR_TI',  'KEAMANAN_TI',        'Departemen Keamanan Informasi dan Siber',         'Dept. Keamanan TI'),
    -- PENGEMBANGAN_TI
    ('PENGEMBANGAN_TI',   'PERENCANAAN_INOVASI','Departemen Perencanaan dan Inovasi TI',           'Dept. Inovasi TI'),
    ('PENGEMBANGAN_TI',   'PENGEMBANGAN_APP',   'Departemen Pengembangan Aplikasi',                'Dept. Dev App')
) AS dp(divisi_kode, kode, nama, deskripsi)
ON dv.kode = dp.divisi_kode
ON CONFLICT (divisi_id, kode) DO NOTHING;

-- ============================================================
--  BAGIAN 2: PETAKAN POSISI ORG USER SEED
-- ============================================================
-- Update user Andi Pratama (anggota_tim) → Divisi Infrastruktur TI
UPDATE auth.users u
SET divisi_id = dv.id
FROM master.divisi dv
WHERE u.nik = '199508003'
  AND dv.kode = 'INFRASTRUKTUR_TI';

-- Update user Siti Rahayu (pengendali_teknis) → Divisi Perencanaan Risiko
UPDATE auth.users u
SET divisi_id = dv.id
FROM master.divisi dv
WHERE u.nik = '199205002'
  AND dv.kode = 'PERENCANAAN_RISIKO';

-- Update user Dewi Auditee → Divisi Keuangan
UPDATE auth.users u
SET divisi_id    = dv.id,
    direktorat_id = dr.id
FROM master.divisi dv
JOIN master.direktorat dr ON dr.id = dv.direktorat_id
WHERE u.nik = '199612004'
  AND dv.kode = 'KEUANGAN';

-- ============================================================
--  BAGIAN 3: CONTOH NOTIFIKASI
-- ============================================================
INSERT INTO pelaporan.notifications (user_id, title, message, notification_type, is_read)
SELECT u.id,
    'Selamat Datang di SATRIA',
    'Sistem Akuntabilitas Internal Audit Transjakarta telah siap digunakan. Silakan mulai dengan mengimpor data risiko dari TRUST.',
    'System', FALSE
FROM auth.users u
WHERE u.role IN ('kepala_spi', 'admin_spi')
  AND u.deleted_at IS NULL;

INSERT INTO pelaporan.notifications (user_id, title, message, notification_type, is_read)
SELECT u.id,
    'Pengingat: Penyusunan PKPT 2026',
    'Batas waktu pengajuan PKPT adalah 31 Desember 2025. Segera susun program kerja audit tahunan.',
    'Program', FALSE
FROM auth.users u
WHERE u.role = 'kepala_spi'
  AND u.deleted_at IS NULL;

-- ============================================================
--  VERIFIKASI AKHIR
-- ============================================================
SELECT 'master.direktorat'  AS tabel, COUNT(*) AS jumlah FROM master.direktorat  WHERE deleted_at IS NULL
UNION ALL
SELECT 'master.divisi',     COUNT(*) FROM master.divisi      WHERE deleted_at IS NULL
UNION ALL
SELECT 'master.departemen', COUNT(*) FROM master.departemen  WHERE deleted_at IS NULL
UNION ALL
SELECT 'auth.users',        COUNT(*) FROM auth.users         WHERE deleted_at IS NULL
ORDER BY tabel;
