-- ============================================================
--  SATRIA — Seed Data RCSA (15 Sample Risks)
--  File   : 05_rcsa_seed.sql
--  Urutan : Setelah 04_master_seed.sql (compatibility), sebelum 06_seed_dummy.sql
--
--  Sumber : Report RCSA Transjakarta (Top 15 by Inherent Score)
--  Tahun  : 2026
--
--  Kode Org mengikuti 01_master.sql:
--    Direktorat : DIR-UTM, DIR-KSU, DIR-BPA, DIR-OOK, DIR-TIP
--    Divisi     : DIV-OOB, DIV-KAP, DIV-STI, DIV-SDM, dll.
--    Departemen : DEP-OOB-01, DEP-KAP-01, DEP-STI-03, DEP-SDM-02, dll.
--    Sasaran    : SK-01..SK-15 (sesuai KPI Transjakarta)
-- ============================================================

-- Bersihkan risk_data yang mungkin sudah ada (idempotent)
DELETE FROM pkpt.annual_plan_risks
WHERE risk_id IN (SELECT id FROM pkpt.risk_data WHERE tahun = 2026);

DELETE FROM pkpt.risk_data WHERE tahun = 2026;

DO $$
DECLARE
  v_admin_id    UUID;
  v_tahun       SMALLINT := 2026;

  -- ── Direktorat ──────────────────────────────────────────────
  v_dir_ook     UUID;   -- Operasional dan Keselamatan
  v_dir_ksu     UUID;   -- Keuangan, SDM, dan Umum
  v_dir_tip     UUID;   -- Teknologi Informasi dan Pelayanan
  v_dir_bpa     UUID;   -- Bisnis dan Pemanfaatan Aset

  -- ── Divisi ──────────────────────────────────────────────────
  v_div_oob     UUID;   -- Operasional Bus
  v_div_kap     UUID;   -- Keuangan, Akuntansi, Perpajakan
  v_div_sti     UUID;   -- Sistem Teknologi Informasi
  v_div_sdm     UUID;   -- Sumber Daya Manusia
  v_div_kkk     UUID;   -- Keselamatan dan Keamanan

  -- ── Departemen ──────────────────────────────────────────────
  v_dep_oob01   UUID;   -- Operasional BRT
  v_dep_kap01   UUID;   -- Akuntansi
  v_dep_sti03   UUID;   -- Infrastruktur & Operasional STI
  v_dep_sdm02   UUID;   -- Manajemen Talenta
  v_dep_kkk02   UUID;   -- Keselamatan

  -- ── Sasaran Korporat (SK-01..SK-15) ─────────────────────────
  v_sk_03       UUID;   -- Indeks Keselamatan Transportasi
  v_sk_06       UUID;   -- Rasio Pelanggan per KM
  v_sk_07       UUID;   -- Rata-Rata Jumlah Pelanggan per Hari
  v_sk_08       UUID;   -- Skor Maturitas IT
  v_sk_09       UUID;   -- Skor Tingkat Kesehatan Keuangan
  v_sk_12       UUID;   -- % Pencapaian SPM
  v_sk_13       UUID;   -- Skor Maturitas SDM
  v_sk_15       UUID;   -- Net Promoter Score (NPS)
BEGIN

  -- Admin user
  SELECT id INTO v_admin_id
  FROM auth.users WHERE nik = '000002' AND deleted_at IS NULL LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin SPI (nik=000002) tidak ditemukan. Jalankan 02_auth.sql terlebih dahulu.';
  END IF;

  -- ── Lookup Direktorat ────────────────────────────────────────
  SELECT id INTO v_dir_ook FROM master.direktorat WHERE kode = 'DIR-OOK' LIMIT 1;
  SELECT id INTO v_dir_ksu FROM master.direktorat WHERE kode = 'DIR-KSU' LIMIT 1;
  SELECT id INTO v_dir_tip FROM master.direktorat WHERE kode = 'DIR-TIP' LIMIT 1;
  SELECT id INTO v_dir_bpa FROM master.direktorat WHERE kode = 'DIR-BPA' LIMIT 1;

  IF v_dir_ook IS NULL THEN
    RAISE EXCEPTION 'Direktorat DIR-OOK tidak ditemukan. Jalankan 01_master.sql terlebih dahulu.';
  END IF;

  -- ── Lookup Divisi ────────────────────────────────────────────
  SELECT id INTO v_div_oob FROM master.divisi WHERE kode = 'DIV-OOB' LIMIT 1;
  SELECT id INTO v_div_kap FROM master.divisi WHERE kode = 'DIV-KAP' LIMIT 1;
  SELECT id INTO v_div_sti FROM master.divisi WHERE kode = 'DIV-STI' LIMIT 1;
  SELECT id INTO v_div_sdm FROM master.divisi WHERE kode = 'DIV-SDM' LIMIT 1;
  SELECT id INTO v_div_kkk FROM master.divisi WHERE kode = 'DIV-KKK' LIMIT 1;

  -- ── Lookup Departemen ────────────────────────────────────────
  SELECT id INTO v_dep_oob01 FROM master.departemen WHERE kode = 'DEP-OOB-01' LIMIT 1;
  SELECT id INTO v_dep_kap01 FROM master.departemen WHERE kode = 'DEP-KAP-01' LIMIT 1;
  SELECT id INTO v_dep_sti03 FROM master.departemen WHERE kode = 'DEP-STI-03' LIMIT 1;
  SELECT id INTO v_dep_sdm02 FROM master.departemen WHERE kode = 'DEP-SDM-02' LIMIT 1;
  SELECT id INTO v_dep_kkk02 FROM master.departemen WHERE kode = 'DEP-KKK-02' LIMIT 1;

  -- ── Lookup Sasaran Korporat ──────────────────────────────────
  SELECT id INTO v_sk_03 FROM master.sasaran_korporat WHERE kode = 'SK-03' LIMIT 1;
  SELECT id INTO v_sk_06 FROM master.sasaran_korporat WHERE kode = 'SK-06' LIMIT 1;
  SELECT id INTO v_sk_07 FROM master.sasaran_korporat WHERE kode = 'SK-07' LIMIT 1;
  SELECT id INTO v_sk_08 FROM master.sasaran_korporat WHERE kode = 'SK-08' LIMIT 1;
  SELECT id INTO v_sk_09 FROM master.sasaran_korporat WHERE kode = 'SK-09' LIMIT 1;
  SELECT id INTO v_sk_12 FROM master.sasaran_korporat WHERE kode = 'SK-12' LIMIT 1;
  SELECT id INTO v_sk_13 FROM master.sasaran_korporat WHERE kode = 'SK-13' LIMIT 1;
  SELECT id INTO v_sk_15 FROM master.sasaran_korporat WHERE kode = 'SK-15' LIMIT 1;

  -- ══════════════════════════════════════════════════════════════
  --  15 SAMPLE RISKS (sorted by skor_inherent DESC)
  -- ══════════════════════════════════════════════════════════════

  -- 1. EXTREME (54) — Keselamatan Penumpang
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-OOK-2026-001', v_tahun,
    v_dir_ook, v_div_oob, v_dep_oob01,
    'Direktorat Operasional dan Keselamatan', 'Operasional Bus', 'Operasional Bus Rapid Transit (BRT)',
    v_sk_03, 'Indeks Keselamatan Transportasi', 'Operasional Armada',
    'Keselamatan Penumpang: Kecelakaan Kendaraan Bermotor Umum (Bus BRT)', 'Tinggi (Frekuensi 5)',
    '54 (E)', 54, 'E',
    '24 (M)', 24, 'M',
    'Program Safety First: Driver Training Berkelanjutan, Maintenance Preventif, Instalasi ADAS, Monitoring GPS Real-time, Emergency Response Team',
    '35 (T)', 35, 'T',
    'Human Error Driver, Kondisi Jalan Buruk, Cuaca Ekstrem, Maintenance Terlambat, Pengetahuan Driver Kurang',
    'Arus Lalu Lintas Tinggi, Perilaku Pengemudi Lain Tidak Tertib, Infrastruktur Jalan Tidak Layak',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 2. EXTREME (50) — Gangguan Sistem IT
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-TIP-2026-001', v_tahun,
    v_dir_tip, v_div_sti, v_dep_sti03,
    'Direktorat Sistem Teknologi Informasi dan Pelayanan', 'Sistem Teknologi Informasi', 'Infrastruktur dan Operasional Sistem Teknologi Informasi',
    v_sk_08, 'Skor Maturitas IT', 'Infrastruktur IT',
    'Gangguan Layanan Sistem Informasi: Downtime Database/Server Kritis', 'Tinggi (Frekuensi 5)',
    '50 (E)', 50, 'E',
    '20 (M)', 20, 'M',
    'Disaster Recovery Plan, Redundansi Server, Backup Otomatis Harian, Monitoring 24/7, SLA Vendor External',
    '28 (MT)', 28, 'MT',
    'Kapasitas Server Terbatas, Konfigurasi Tidak Optimal, Patch Management Tertunda, Human Error Operator',
    'Cyber Attack, Kondisi Cuaca (Lightning), Isu Vendor',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 3. EXTREME (48) — Fraud/Manipulasi Data Finansial
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-KSU-2026-001', v_tahun,
    v_dir_ksu, v_div_kap, v_dep_kap01,
    'Direktorat Keuangan, SDM, dan Umum', 'Keuangan, Akuntansi, dan Perpajakan', 'Akuntansi',
    v_sk_09, 'Skor Tingkat Kesehatan (Aspek Kinerja Keuangan)', 'Manajemen Keuangan',
    'Fraud/Manipulasi Data Finansial: Penyalahgunaan Aset & Revenue Skimming', 'Tinggi (Frekuensi 4)',
    '48 (E)', 48, 'E',
    '16 (M)', 16, 'M',
    'Segregasi Tugas Ketat, Internal Control Audit Rutin, Whistleblower System, System Authorization Review',
    '30 (MT)', 30, 'MT',
    'Kontrol Internal Lemah, Korupsi Karyawan, Proses Manual Terlalu Banyak, Monitoring Tidak Ketat',
    'Kolusi Eksternal, Tekanan Finansial Personal Karyawan',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 4. EXTREME (45) — Kurangnya Talenta & High Turnover
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-KSU-2026-002', v_tahun,
    v_dir_ksu, v_div_sdm, v_dep_sdm02,
    'Direktorat Keuangan, SDM, dan Umum', 'Sumber Daya Manusia', 'Manajemen Talenta',
    v_sk_13, 'Skor Maturitas SDM', 'Pengembangan SDM',
    'Kurangnya Talenta Kritis & High Turnover: Loss of Critical Skills', 'Tinggi (Frekuensi 5)',
    '45 (E)', 45, 'E',
    '15 (M)', 15, 'M',
    'Succession Planning Program, Career Development Path Jelas, Competitive Compensation, Engagement Survey',
    '24 (M)', 24, 'M',
    'Kompensasi Kurang Kompetitif, Lingkungan Kerja Kurang Mendukung, Minim Pengembangan Karir',
    'Kompetitor Merekrut Talenta Kita, Perubahan Industri Transportasi, Regulasi PPNPN',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 5. TINGGI (44) — Cyber Security & Data Breach
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-TIP-2026-002', v_tahun,
    v_dir_tip, v_div_sti, v_dep_sti03,
    'Direktorat Sistem Teknologi Informasi dan Pelayanan', 'Sistem Teknologi Informasi', 'Infrastruktur dan Operasional Sistem Teknologi Informasi',
    v_sk_08, 'Skor Maturitas IT', 'Keamanan Informasi',
    'Cyber Security: Ransomware, Malware, Data Breach Data Pelanggan', 'Tinggi (Frekuensi 4)',
    '44 (T)', 44, 'T',
    '15 (M)', 15, 'M',
    'Multi-factor Authentication, Penetration Testing Berkala, Endpoint Security, SOC 24/7, Incident Response Plan',
    '26 (MT)', 26, 'MT',
    'Awareness Karyawan Rendah, Patch Delay, Legacy System, Outsourcing Security',
    'APT Groups Menargetkan Transit, Ransomware Campaigns Industri, Perubahan Threat Landscape',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 6. TINGGI (42) — Disruption Model Bisnis
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-BPA-2026-001', v_tahun,
    v_dir_bpa, v_div_oob, v_dep_oob01,
    'Direktorat Bisnis dan Pemanfaatan Aset', 'Operasional Bus', 'Operasional Bus Rapid Transit (BRT)',
    v_sk_07, 'Rata-Rata Jumlah Pelanggan per Hari', 'Strategi Bisnis',
    'Disruption Model Bisnis: Kompetitor Transportasi Online (Go-Jek, Grab)', 'Sedang (Frekuensi 3)',
    '42 (T)', 42, 'T',
    '18 (M)', 18, 'M',
    'Innovation Strategy, Digital Transformation, Partnership Ecosystem, Competitive Pricing, Customer Experience',
    '28 (MT)', 28, 'MT',
    'Respons Inovasi Lambat, Keterbatasan Budget, Mindset Tradisional',
    'Ekspansi Kompetitor, Perubahan Preferensi Konsumen, Regulasi Persaingan',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 7. TINGGI (40) — Ketidaksesuaian Regulasi Perpajakan
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-KSU-2026-003', v_tahun,
    v_dir_ksu, v_div_kap, v_dep_kap01,
    'Direktorat Keuangan, SDM, dan Umum', 'Keuangan, Akuntansi, dan Perpajakan', 'Akuntansi',
    v_sk_09, 'Skor Tingkat Kesehatan (Aspek Kinerja Keuangan)', 'Compliance Perpajakan',
    'Ketidaksesuaian Regulasi Perpajakan & BLU: Non-Compliance Peraturan', 'Sedang (Frekuensi 4)',
    '40 (T)', 40, 'T',
    '12 (RM)', 12, 'RM',
    'Legal Review Rutin, Tax Planning Agresif, Compliance Monitoring System, Training Compliance Karyawan',
    '20 (M)', 20, 'M',
    'Interpretasi Regulasi Berbeda, Dokumentasi Incomplete, Update Regulasi Tertinggal',
    'Perubahan Regulasi Mendadak, Kebijakan Pajak Baru, Pemeriksaan Fiskal',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 8. TINGGI (39) — Krisis Reputasi
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-OOK-2026-002', v_tahun,
    v_dir_ook, v_div_oob, v_dep_oob01,
    'Direktorat Operasional dan Keselamatan', 'Operasional Bus', 'Operasional Bus Rapid Transit (BRT)',
    v_sk_15, 'Net Promoter Score (NPS)', 'Reputasi',
    'Krisis Reputasi: Pemberitaan Negatif Accident & Pelayanan Buruk di Media', 'Sedang (Frekuensi 3)',
    '39 (T)', 39, 'T',
    '14 (RM)', 14, 'RM',
    'Crisis Management Plan, Media Relation, Service Quality Improvement, Social Media Monitoring',
    '22 (M)', 22, 'M',
    'Service Quality Inconsistent, Safety Incident Management Lemah, Komunikasi Tidak Efektif',
    'Social Media Amplification, Influencer Negatif, Competitor Smear Campaign',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 9. TINGGI (36) — Kondisi Armada Aging
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-OOK-2026-003', v_tahun,
    v_dir_ook, v_div_oob, v_dep_oob01,
    'Direktorat Operasional dan Keselamatan', 'Operasional Bus', 'Operasional Bus Rapid Transit (BRT)',
    v_sk_06, 'Rasio Pelanggan per KM', 'Operasional Armada',
    'Kondisi Armada Aging: Efisiensi Turun, Emisi Tinggi, Biaya Maintenance Mahal', 'Sedang (Frekuensi 3)',
    '36 (T)', 36, 'T',
    '15 (M)', 15, 'M',
    'Fleet Renewal Program, Maintenance Predictive, Upgrade Engine Emission Standard, Leasing Strategy',
    '21 (M)', 21, 'M',
    'Budget Terbatas, Maintenance Schedule Tidak Konsisten, Spare Part Supply Chain Terganggu',
    'Depresiasi Alat Cepat, Regulasi Emisi Ketat, Perubahan Harga Spare Part Global',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 10. MEDIUM TINGGI (32) — Supply Chain Disruption Spare Part
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-OOK-2026-004', v_tahun,
    v_dir_ook, v_div_oob, v_dep_oob01,
    'Direktorat Operasional dan Keselamatan', 'Operasional Bus', 'Operasional Bus Rapid Transit (BRT)',
    v_sk_06, 'Rasio Pelanggan per KM', 'Supply Chain',
    'Supply Chain Disruption: Ketersediaan Spare Part Bus Terganggu', 'Sedang (Frekuensi 4)',
    '32 (MT)', 32, 'MT',
    '12 (RM)', 12, 'RM',
    'Vendor Diversification, Safety Stock Policy, Supplier Relationship Management, Forecast Akurat',
    '18 (M)', 18, 'M',
    'Vendor Tunggal, Forecasting Tidak Akurat, Inventory Management Lemah',
    'Masalah Logistik Global, Geopolitical Tension, Kondisi Supplier',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 11. MEDIUM TINGGI (30) — Keluhan Pelanggan Tidak Tertangani
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-BPA-2026-002', v_tahun,
    v_dir_bpa, v_div_oob, v_dep_oob01,
    'Direktorat Bisnis dan Pemanfaatan Aset', 'Operasional Bus', 'Operasional Bus Rapid Transit (BRT)',
    v_sk_15, 'Net Promoter Score (NPS)', 'Customer Experience',
    'Keluhan Pelanggan Tidak Tertangani Dengan Baik: Low NPS Score', 'Sedang (Frekuensi 3)',
    '30 (MT)', 30, 'MT',
    '12 (RM)', 12, 'RM',
    'Customer Service Training, CRM System Implementation, Response Time SLA, Satisfaction Survey Regular',
    '16 (M)', 16, 'M',
    'Customer Service Training Minimal, CRM System Tidak Optimal, Response Time Lambat',
    'Customer Expectation Tinggi, Social Media Amplification, Kompetitor Service Lebih Baik',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 12. MEDIUM TINGGI (25) — Human Error Payroll
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-KSU-2026-004', v_tahun,
    v_dir_ksu, v_div_sdm, v_dep_sdm02,
    'Direktorat Keuangan, SDM, dan Umum', 'Sumber Daya Manusia', 'Manajemen Talenta',
    v_sk_13, 'Skor Maturitas SDM', 'Payroll & Benefit',
    'Human Error dalam Data Entry Payroll: Duplikasi, Kesalahan Kalkulasi Gaji', 'Tinggi (Frekuensi 5)',
    '25 (MT)', 25, 'MT',
    '9 (RM)', 9, 'RM',
    'Automated Payroll System, Validation Rules, Double Approval Process, Monthly Audit, Training Operator',
    '12 (RM)', 12, 'RM',
    'Manual Entry Masih Dominan, Operator Tidak Terlatih, Dokumentasi Tidak Jelas',
    'Kompleksitas Regulasi Upah, Frekuensi Perubahan Regulasi Sering',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 13. MEDIUM (20) — Data Duplikasi Master File
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-TIP-2026-003', v_tahun,
    v_dir_tip, v_div_sti, v_dep_sti03,
    'Direktorat Sistem Teknologi Informasi dan Pelayanan', 'Sistem Teknologi Informasi', 'Infrastruktur dan Operasional Sistem Teknologi Informasi',
    v_sk_08, 'Skor Maturitas IT', 'Data Quality',
    'Data Duplikasi dan Inconsistency di Master File: NUPK, Supplier, Customer', 'Sedang (Frekuensi 4)',
    '20 (M)', 20, 'M',
    '8 (R)', 8, 'R',
    'Data Cleansing Program, Master Data Governance, Deduplication Rules, System Uniqueness Constraint',
    '10 (RM)', 10, 'RM',
    'Multiple Data Source Tidak Sync, Validasi Master Lemah, Legacy System Multiple',
    'Integrasi Sistem Terbatas, Vendor Support Kurang',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 14. MEDIUM (16) — Underutilization Aset
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-KSU-2026-005', v_tahun,
    v_dir_ksu, v_div_kap, v_dep_kap01,
    'Direktorat Keuangan, SDM, dan Umum', 'Keuangan, Akuntansi, dan Perpajakan', 'Akuntansi',
    v_sk_09, 'Skor Tingkat Kesehatan (Aspek Kinerja Keuangan)', 'Asset Management',
    'Underutilization Aset: Biaya Operasional Tinggi, ROI Aset Rendah', 'Sedang (Frekuensi 4)',
    '16 (M)', 16, 'M',
    '8 (R)', 8, 'R',
    'Asset Optimization Study, Utilization Monitoring Dashboard, Right-sizing Review, Disposal Planning',
    '10 (RM)', 10, 'RM',
    'Forecasting Demand Tidak Akurat, Keputusan Procurement Tergesa-gesa',
    'Perubahan Kebutuhan Bisnis Dinamis, Kompleksitas Disposal Aset',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- 15. RENDAH MEDIUM (14) — Backup Facility Tidak Terawat
  INSERT INTO pkpt.risk_data (
    id_risiko, tahun, direktorat_id, divisi_id, departemen_id,
    direktorat_nama, divisi_nama, departemen_nama,
    sasaran_korporat_id, sasaran_korporat_nama, sasaran_bidang,
    nama_risiko, parameter_kemungkinan,
    tingkat_risiko_inherent, skor_inherent, level_inherent,
    tingkat_risiko_target,   skor_target,   level_target,
    pelaksanaan_mitigasi,
    realisasi_tingkat_risiko, skor_realisasi, level_realisasi,
    penyebab_internal, penyebab_eksternal,
    source, imported_by
  ) VALUES (
    'RR-TIP-2026-004', v_tahun,
    v_dir_tip, v_div_sti, v_dep_sti03,
    'Direktorat Sistem Teknologi Informasi dan Pelayanan', 'Sistem Teknologi Informasi', 'Infrastruktur dan Operasional Sistem Teknologi Informasi',
    v_sk_08, 'Skor Maturitas IT', 'Disaster Recovery',
    'Backup Facility Tidak Terawat: Backup Data Tidak Berfungsi di DR Site', 'Jarang (Frekuensi 2)',
    '14 (RM)', 14, 'RM',
    '6 (R)', 6, 'R',
    'DR Site Maintenance Schedule, Regular DR Drill, Monitoring Infrastructure, Vendor SLA Review',
    '8 (R)', 8, 'R',
    'Maintenance Schedule Terlambat, Monitoring Tidak Kontinyu, Budget Terbatas',
    'Kompleksitas Teknologi DR, Vendor Support Terbatas',
    'Import', v_admin_id
  ) ON CONFLICT (id_risiko, tahun) DO UPDATE SET
    skor_inherent = EXCLUDED.skor_inherent, level_inherent = EXCLUDED.level_inherent,
    updated_at = NOW();

  -- ══════════════════════════════════════════════════════════════
  --  VALIDASI
  -- ══════════════════════════════════════════════════════════════
  RAISE NOTICE 'RCSA Seed 2026 Selesai:';
  RAISE NOTICE '  Total: % risiko', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND deleted_at IS NULL);
  RAISE NOTICE '  E  (Extreme):       %', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND level_inherent = 'E'  AND deleted_at IS NULL);
  RAISE NOTICE '  T  (Tinggi):        %', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND level_inherent = 'T'  AND deleted_at IS NULL);
  RAISE NOTICE '  MT (Medium Tinggi): %', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND level_inherent = 'MT' AND deleted_at IS NULL);
  RAISE NOTICE '  M  (Medium):        %', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND level_inherent = 'M'  AND deleted_at IS NULL);
  RAISE NOTICE '  RM (Rendah Medium): %', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND level_inherent = 'RM' AND deleted_at IS NULL);
  RAISE NOTICE '  R  (Rendah):        %', (SELECT COUNT(*) FROM pkpt.risk_data WHERE tahun = v_tahun AND level_inherent = 'R'  AND deleted_at IS NULL);

END $$;

-- ─────────────────────────────────────────────────────────────
--  Verifikasi Top 15
-- ─────────────────────────────────────────────────────────────
SELECT
  ROW_NUMBER() OVER (ORDER BY rd.skor_inherent DESC) AS ranking,
  rd.id_risiko,
  rd.nama_risiko,
  rd.divisi_nama  AS divisi,
  rd.skor_inherent AS skor,
  rd.level_inherent AS level
FROM pkpt.risk_data rd
WHERE rd.tahun = 2026 AND rd.deleted_at IS NULL
ORDER BY rd.skor_inherent DESC
LIMIT 15;
