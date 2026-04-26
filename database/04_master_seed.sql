-- ============================================================
--  SATRIA — Seed Master Data (COMPATIBILITY FILE)
--  File   : 04_master_seed.sql
--  Urutan : 5 dari N (setelah 03_pkpt.sql)
--
--  CATATAN:
--    File ini sebelumnya men-DELETE & reseed dimensi organisasi
--    dengan kode yang berbeda (DIR-OPS, DIR-FIN, dll).
--    Sekarang sudah DINETRALKAN — semua data dimensi sudah
--    di-seed di 01_master.sql dengan kode resmi Transjakarta:
--      DIR-UTM, DIR-KSU, DIR-BPA, DIR-OOK, DIR-TIP
--
--    JANGAN JALANKAN DELETE di sini; cukup biarkan 01_master.sql
--    yang menangani seluruh data dimensi.
-- ============================================================

-- Verifikasi bahwa data dimensi sudah ada
DO $$
DECLARE
  v_dir_count INT;
  v_div_count INT;
  v_dep_count INT;
BEGIN
  SELECT COUNT(*) INTO v_dir_count FROM master.direktorat WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_div_count FROM master.divisi      WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_dep_count FROM master.departemen  WHERE deleted_at IS NULL;

  IF v_dir_count = 0 THEN
    RAISE EXCEPTION 'Tabel master.direktorat kosong. Jalankan 01_master.sql terlebih dahulu.';
  END IF;

  RAISE NOTICE '04_master_seed.sql: Dimensi sudah tersedia — % direktorat, % divisi, % departemen.',
    v_dir_count, v_div_count, v_dep_count;
END $$;
