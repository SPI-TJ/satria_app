-- ============================================================
--  SATRIA — Database Setup
--  File   : 00_setup.sql
--  Urutan : 1 dari 7 (jalankan pertama)
--
--  Isi    : CREATE DATABASE, Extensions, Schemas, Shared Functions
--
--  ARSITEKTUR (1 Database + 6 Schema):
--  ┌──────────────────────────────────────────────────────────┐
--  │  DATABASE: satria                                         │
--  │                                                           │
--  │  schema: master    → Tabel master & dimensi organisasi   │
--  │  schema: auth      → Users, roles, permissions, log      │
--  │  schema: pkpt      → Modul 1: Perencanaan Tahunan        │
--  │  schema: penugasan → Modul 2: Penugasan Individual       │
--  │  schema: audit     → Modul 3: Kertas Kerja Audit (KKA)   │
--  │  schema: pelaporan → Modul 4+: Laporan, Temuan, Notif    │
--  └──────────────────────────────────────────────────────────┘
--
--  MENGAPA 1 DATABASE + BANYAK SCHEMA?
--  ✅ JOIN lintas schema tetap bisa (satu connection pool)
--  ✅ Transaksi ACID lintas modul
--  ✅ Backup & restore satu perintah (pg_dump satria)
--  ✅ Permission granular per schema
--  ✅ Isolasi logik antar modul tetap terjaga
-- ============================================================

-- ── Step 1: Buat database (jalankan dari psql sebagai superuser)
-- CREATE DATABASE satria
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'en_US.UTF-8'
--     LC_CTYPE = 'en_US.UTF-8'
--     TEMPLATE = template0;

-- ── Step 2: Sambungkan ke database satria, lalu jalankan sisanya
-- \c satria

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Fast ILIKE / fulltext search
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- bcrypt password hashing

-- ── Schemas ───────────────────────────────────────────────────
-- Urutan: master → auth → pkpt → penugasan → audit → pelaporan
-- (master harus ada sebelum auth karena auth.users punya FK ke master)

CREATE SCHEMA IF NOT EXISTS master;
COMMENT ON SCHEMA master IS 'Tabel master & dimensi: direktorat, divisi, departemen, trust_connections, konfigurasi';

CREATE SCHEMA IF NOT EXISTS auth;
COMMENT ON SCHEMA auth IS 'Users, roles, permissions, activity_log';

CREATE SCHEMA IF NOT EXISTS pkpt;
COMMENT ON SCHEMA pkpt IS 'Modul 1: Perencanaan Pengawasan Tahunan — risk_data, annual_audit_plans';

CREATE SCHEMA IF NOT EXISTS penugasan;
COMMENT ON SCHEMA penugasan IS 'Modul 2: Penugasan Individual — Surat Tugas, tim audit';

CREATE SCHEMA IF NOT EXISTS audit;
COMMENT ON SCHEMA audit IS 'Modul 3: Kertas Kerja Audit (KKA), evidence, pengujian';

CREATE SCHEMA IF NOT EXISTS pelaporan;
COMMENT ON SCHEMA pelaporan IS 'Modul 4+: Laporan, temuan, notifikasi, tindak lanjut, penilaian';

-- ── Search path default ───────────────────────────────────────
ALTER DATABASE satria
    SET search_path TO master, auth, pkpt, penugasan, audit, pelaporan, public;

-- ── Shared trigger function (dipakai semua tabel) ─────────────
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_set_updated_at IS
    'Trigger function: otomatis update kolom updated_at saat baris diubah';
