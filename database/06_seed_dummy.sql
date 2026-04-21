-- ============================================================
--  SATRIA — Seed Data Dummy (Risiko & PKPT 2026)
--  File   : 06_seed_dummy.sql
--  Urutan : 7 dari 7 (jalankan setelah 05_pelaporan.sql)
--
--  Catatan:
--    - Data risiko menggunakan user Admin SPI (nik=000000002) sebagai imported_by
--    - Annual plans menggunakan user dengan role sesuai (kepala_spi, pengendali_teknis, dll)
--    - Subquery digunakan agar tidak perlu hardcode UUID
-- ============================================================

-- ── Variabel helper (user IDs via subquery) ───────────────────
-- Gunakan WITH (CTE) agar bisa dipakai berulang dalam statement

-- ── 1. SEED: Risiko 2026 ─────────────────────────────────────
INSERT INTO pkpt.risk_data (
    risk_code, tahun, divisi, department_name,
    risk_description, risk_level, status, source, imported_by
)
SELECT
    r.risk_code, 2026, r.divisi, r.dept,
    r.deskripsi,
    r.level::pkpt.risk_level_enum,
    r.status::pkpt.risk_status_enum,
    'Manual'::pkpt.risk_source_enum,
    (SELECT id FROM auth.users WHERE nik = '000000002' AND deleted_at IS NULL LIMIT 1)
FROM (VALUES
  ('R-2026-001', 'Divisi Keuangan',         'Departemen Akuntansi',       'Risiko kesalahan pelaporan keuangan akibat proses rekonsiliasi manual yang tidak terstandarisasi',      'Critical', 'Open'),
  ('R-2026-002', 'Divisi Teknologi Informasi','Departemen Infrastruktur TI','Risiko gangguan layanan IT karena server legacy yang melebihi umur pakai dan belum dimigrasi',        'High',     'Open'),
  ('R-2026-003', 'Divisi SDM',               'Departemen Rekrutmen',       'Risiko ketidaksesuaian kompetensi karyawan baru dengan kebutuhan operasional perusahaan',              'High',     'Open'),
  ('R-2026-004', 'Divisi Operasional',        'Departemen Armada',          'Risiko kerusakan armada bus akibat perawatan preventif yang tidak terjadwal secara konsisten',         'Critical', 'Open'),
  ('R-2026-005', 'Divisi Keuangan',           'Departemen Perpajakan',      'Risiko denda pajak akibat keterlambatan pelaporan SPT dan kelemahan dalam pemantauan kewajiban fiskal','High',     'Open'),
  ('R-2026-006', 'Divisi Bisnis & Komersial', 'Departemen Kemitraan',       'Risiko kerugian finansial dari kontrak kemitraan yang tidak memiliki klausul penalti yang memadai',   'Medium',   'Open'),
  ('R-2026-007', 'Divisi Perencanaan',        'Departemen Manajemen Risiko','Risiko kegagalan identifikasi risiko strategis akibat metodologi penilaian risiko yang usang',         'High',     'Open'),
  ('R-2026-008', 'Divisi Operasional',        'Departemen Halte & Koridor', 'Risiko keselamatan penumpang di halte akibat fasilitas yang tidak terpelihara dan penerangan kurang',  'High',     'Open'),
  ('R-2026-009', 'Divisi Teknologi Informasi','Departemen Keamanan Siber',  'Risiko kebocoran data penumpang akibat sistem keamanan yang belum memenuhi standar ISO 27001',         'Critical', 'Open'),
  ('R-2026-010', 'Divisi SDM',                'Departemen Pengembangan SDM','Risiko penurunan produktivitas akibat program pelatihan yang tidak terukur dan tidak relevan',         'Medium',   'Open'),
  ('R-2026-011', 'Divisi Keuangan',           'Departemen Anggaran',        'Risiko pembengkakan biaya operasional akibat proses penganggaran yang tidak berbasis data aktual',     'High',     'Mitigated'),
  ('R-2026-012', 'Divisi Operasional',        'Departemen Pengemudi',       'Risiko kecelakaan lalu lintas akibat kelelahan pengemudi dan jadwal yang melebihi batas regulasi',     'Critical', 'Open'),
  ('R-2026-013', 'Divisi Bisnis & Komersial', 'Departemen Tiket & Revenue', 'Risiko penurunan pendapatan akibat sistem e-ticketing yang rentan terhadap kecurangan transaksi',     'High',     'Open'),
  ('R-2026-014', 'Divisi Perencanaan',        'Departemen PKPT',            'Risiko ketidakefektifan audit internal akibat ruang lingkup PKPT yang tidak berbasis risiko',          'Medium',   'Open'),
  ('R-2026-015', 'Divisi Teknologi Informasi','Departemen Sistem Informasi', 'Risiko downtime aplikasi inti perusahaan akibat tidak adanya disaster recovery plan yang teruji',    'High',     'Open')
) AS r(risk_code, divisi, dept, deskripsi, level, status)
ON CONFLICT (risk_code, tahun) DO NOTHING;


-- ── 2. SEED: Annual Audit Plans 2026 ─────────────────────────
-- Gunakan DO $$ block agar bisa referensi user IDs dan insert relasi tim+risiko

DO $$
DECLARE
  v_admin_id      UUID;
  v_kepala_id     UUID;
  v_peng_tek_id   UUID;
  v_anggota_id    UUID;
  v_plan_id       UUID;
  v_risk_id1      UUID;
  v_risk_id2      UUID;
  v_risk_id3      UUID;
BEGIN

  -- Ambil user IDs
  SELECT id INTO v_admin_id    FROM auth.users WHERE nik = '000000002' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_kepala_id   FROM auth.users WHERE role = 'kepala_spi'         AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_peng_tek_id FROM auth.users WHERE role = 'pengendali_teknis'  AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_anggota_id  FROM auth.users WHERE role = 'anggota_tim'        AND deleted_at IS NULL LIMIT 1;

  -- Fallback jika user tidak ada (gunakan admin)
  IF v_kepala_id   IS NULL THEN v_kepala_id   := v_admin_id; END IF;
  IF v_peng_tek_id IS NULL THEN v_peng_tek_id := v_admin_id; END IF;
  IF v_anggota_id  IS NULL THEN v_anggota_id  := v_admin_id; END IF;

  -- ── Plan 1: Audit Keuangan & Perpajakan (Final) ────────────
  SELECT id INTO v_risk_id1 FROM pkpt.risk_data WHERE risk_code = 'R-2026-001' AND tahun = 2026 LIMIT 1;
  SELECT id INTO v_risk_id2 FROM pkpt.risk_data WHERE risk_code = 'R-2026-005' AND tahun = 2026 LIMIT 1;

  INSERT INTO pkpt.annual_audit_plans (
    tahun_perencanaan, jenis_program, kategori_program, judul_program,
    status_program, auditee, deskripsi, estimasi_hari,
    tanggal_mulai, tanggal_selesai, status_pkpt, created_by, updated_by,
    finalized_by, finalized_at
  )
  VALUES (
    '2026-01-01', 'PKPT', 'Assurance', 'Audit Keuangan & Kepatuhan Perpajakan Tahun 2025',
    'Mandatory', 'Divisi Keuangan',
    'Pemeriksaan atas pengelolaan keuangan, rekonsiliasi, dan kepatuhan kewajiban perpajakan perusahaan tahun 2025.',
    45, '2026-02-02', '2026-03-28', 'Final',
    v_admin_id, v_admin_id, v_kepala_id, NOW() - INTERVAL '15 days'
  )
  RETURNING id INTO v_plan_id;

  -- Tim
  INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES
    (v_plan_id, v_kepala_id,   'Penanggung Jawab'),
    (v_plan_id, v_peng_tek_id, 'Pengendali Teknis'),
    (v_plan_id, v_anggota_id,  'Anggota Tim')
  ON CONFLICT (annual_plan_id, user_id) DO NOTHING;

  -- Risiko
  IF v_risk_id1 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id1, 1) ON CONFLICT DO NOTHING;
  END IF;
  IF v_risk_id2 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id2, 2) ON CONFLICT DO NOTHING;
  END IF;


  -- ── Plan 2: Audit Keamanan Siber (Draft) ───────────────────
  SELECT id INTO v_risk_id1 FROM pkpt.risk_data WHERE risk_code = 'R-2026-009' AND tahun = 2026 LIMIT 1;
  SELECT id INTO v_risk_id2 FROM pkpt.risk_data WHERE risk_code = 'R-2026-002' AND tahun = 2026 LIMIT 1;

  INSERT INTO pkpt.annual_audit_plans (
    tahun_perencanaan, jenis_program, kategori_program, judul_program,
    status_program, auditee, deskripsi, estimasi_hari,
    tanggal_mulai, tanggal_selesai, status_pkpt, created_by
  )
  VALUES (
    '2026-01-01', 'PKPT', 'Assurance', 'Audit Keamanan Sistem Informasi & Infrastruktur TI',
    'Mandatory', 'Divisi Teknologi Informasi',
    'Evaluasi kesesuaian sistem keamanan informasi dengan standar ISO 27001 dan ketahanan infrastruktur IT kritis.',
    30, '2026-04-06', '2026-05-16', 'Draft',
    v_admin_id
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES
    (v_plan_id, v_kepala_id,   'Penanggung Jawab'),
    (v_plan_id, v_peng_tek_id, 'Pengendali Teknis'),
    (v_plan_id, v_anggota_id,  'Anggota Tim')
  ON CONFLICT (annual_plan_id, user_id) DO NOTHING;

  IF v_risk_id1 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id1, 1) ON CONFLICT DO NOTHING;
  END IF;
  IF v_risk_id2 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id2, 2) ON CONFLICT DO NOTHING;
  END IF;


  -- ── Plan 3: Audit Operasional Armada (Draft) ───────────────
  SELECT id INTO v_risk_id1 FROM pkpt.risk_data WHERE risk_code = 'R-2026-004' AND tahun = 2026 LIMIT 1;
  SELECT id INTO v_risk_id2 FROM pkpt.risk_data WHERE risk_code = 'R-2026-012' AND tahun = 2026 LIMIT 1;

  INSERT INTO pkpt.annual_audit_plans (
    tahun_perencanaan, jenis_program, kategori_program, judul_program,
    status_program, auditee, deskripsi, estimasi_hari,
    tanggal_mulai, tanggal_selesai, status_pkpt, created_by
  )
  VALUES (
    '2026-01-01', 'PKPT', 'Assurance', 'Audit Operasional Armada & Keselamatan Pengemudi',
    'Mandatory', 'Divisi Operasional',
    'Pemeriksaan prosedur perawatan armada bus, jadwal pengemudi, dan kepatuhan terhadap regulasi keselamatan lalu lintas.',
    35, '2026-05-04', '2026-06-19', 'Draft',
    v_admin_id
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES
    (v_plan_id, v_kepala_id,   'Penanggung Jawab'),
    (v_plan_id, v_peng_tek_id, 'Pengendali Teknis')
  ON CONFLICT (annual_plan_id, user_id) DO NOTHING;

  IF v_risk_id1 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id1, 1) ON CONFLICT DO NOTHING;
  END IF;
  IF v_risk_id2 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id2, 2) ON CONFLICT DO NOTHING;
  END IF;


  -- ── Plan 4: Audit SDM & Kompetensi (Draft) ─────────────────
  SELECT id INTO v_risk_id1 FROM pkpt.risk_data WHERE risk_code = 'R-2026-003' AND tahun = 2026 LIMIT 1;
  SELECT id INTO v_risk_id2 FROM pkpt.risk_data WHERE risk_code = 'R-2026-010' AND tahun = 2026 LIMIT 1;

  INSERT INTO pkpt.annual_audit_plans (
    tahun_perencanaan, jenis_program, kategori_program, judul_program,
    status_program, auditee, deskripsi, estimasi_hari,
    tanggal_mulai, tanggal_selesai, status_pkpt, created_by
  )
  VALUES (
    '2026-01-01', 'PKPT', 'Assurance', 'Audit Pengelolaan SDM & Pengembangan Kompetensi',
    'Strategis', 'Divisi SDM',
    'Evaluasi proses rekrutmen, program pengembangan kompetensi, dan efektivitas pelatihan karyawan.',
    25, '2026-07-06', '2026-08-07', 'Draft',
    v_admin_id
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES
    (v_plan_id, v_kepala_id,   'Penanggung Jawab'),
    (v_plan_id, v_peng_tek_id, 'Pengendali Teknis'),
    (v_plan_id, v_anggota_id,  'Anggota Tim')
  ON CONFLICT (annual_plan_id, user_id) DO NOTHING;

  IF v_risk_id1 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id1, 1) ON CONFLICT DO NOTHING;
  END IF;
  IF v_risk_id2 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id2, 2) ON CONFLICT DO NOTHING;
  END IF;


  -- ── Plan 5: Evaluasi Revenue & Tiket (Draft) ───────────────
  SELECT id INTO v_risk_id1 FROM pkpt.risk_data WHERE risk_code = 'R-2026-013' AND tahun = 2026 LIMIT 1;
  SELECT id INTO v_risk_id2 FROM pkpt.risk_data WHERE risk_code = 'R-2026-006' AND tahun = 2026 LIMIT 1;

  INSERT INTO pkpt.annual_audit_plans (
    tahun_perencanaan, jenis_program, kategori_program, judul_program,
    status_program, auditee, deskripsi, estimasi_hari,
    tanggal_mulai, tanggal_selesai, status_pkpt, created_by
  )
  VALUES (
    '2026-01-01', 'PKPT', 'Evaluasi', 'Evaluasi Sistem E-Ticketing & Pengelolaan Pendapatan',
    'Emerging Risk', 'Divisi Bisnis & Komersial',
    'Evaluasi kecukupan kontrol atas sistem e-ticketing, pencegahan kecurangan, dan pengelolaan pendapatan tiket.',
    20, '2026-08-31', '2026-09-25', 'Draft',
    v_admin_id
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES
    (v_plan_id, v_kepala_id,   'Penanggung Jawab'),
    (v_plan_id, v_peng_tek_id, 'Pengendali Teknis')
  ON CONFLICT (annual_plan_id, user_id) DO NOTHING;

  IF v_risk_id1 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id1, 1) ON CONFLICT DO NOTHING;
  END IF;
  IF v_risk_id2 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id2, 2) ON CONFLICT DO NOTHING;
  END IF;


  -- ── Plan 6: Non-PKPT — Pemantauan Risiko TI (Draft) ────────
  SELECT id INTO v_risk_id1 FROM pkpt.risk_data WHERE risk_code = 'R-2026-015' AND tahun = 2026 LIMIT 1;

  INSERT INTO pkpt.annual_audit_plans (
    tahun_perencanaan, jenis_program, kategori_program, judul_program,
    status_program, auditee, deskripsi, estimasi_hari,
    tanggal_mulai, tanggal_selesai, status_pkpt, created_by
  )
  VALUES (
    '2026-01-01', 'Non PKPT', 'Pemantauan Risiko', 'Pemantauan Disaster Recovery Plan Aplikasi Inti',
    'Mandatory', 'Divisi Teknologi Informasi',
    'Pemantauan atas kesiapan dan pengujian Disaster Recovery Plan untuk sistem aplikasi inti perusahaan.',
    15, '2026-10-05', '2026-10-23', 'Draft',
    v_admin_id
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES
    (v_plan_id, v_peng_tek_id, 'Pengendali Teknis'),
    (v_plan_id, v_anggota_id,  'Anggota Tim')
  ON CONFLICT (annual_plan_id, user_id) DO NOTHING;

  IF v_risk_id1 IS NOT NULL THEN
    INSERT INTO pkpt.annual_plan_risks (annual_plan_id, risk_id, prioritas) VALUES (v_plan_id, v_risk_id1, 1) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Seed dummy PKPT & Risiko 2026 berhasil dimasukkan.';

END $$;
