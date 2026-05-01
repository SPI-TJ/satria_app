# SATRIA — Database

Sistem Akuntabilitas Internal Audit — PT Transportasi Jakarta

## Arsitektur: 1 Database, 6 Schema

```
PostgreSQL: satria
├── master     → Dimensi organisasi, konfigurasi, kategori risiko
├── auth       → Users, roles, session, activity log
├── pkpt       → Modul 1: PKPT, program kerja, CEO Letter, risiko
├── penugasan  → Modul 2: Penugasan individual per auditor
├── audit      → Modul 3: Kertas Kerja Audit (KKA)
└── pelaporan  → Modul 4+: Laporan, temuan, notifikasi
```

---

## Struktur Folder

```
database/
├── README.md                    ← Dokumen ini
├── erd_description.md           ← Deskripsi ERD antar tabel
│
├── schema/                      ← DDL utama — jalankan berurutan
│   ├── 00_setup.sql             ← Extensions, schemas, shared functions
│   ├── 01_master.sql            ← Dimensi organisasi + referensi risiko
│   ├── 02_auth.sql              ← Users, permissions, activity log
│   ├── 03_pkpt.sql              ← Modul 1: PKPT, risk data, CEO Letter
│   ├── 04_operasional.sql       ← Modul 2 & 3: Penugasan & KKA
│   └── 05_pelaporan.sql         ← Modul 4+: Pelaporan & notifikasi
│
├── seeds/                       ← Data awal — jalankan setelah schema selesai
│   ├── 01_master_seed.sql       ← Data master: direktorat, divisi, departemen
│   ├── 02_rcsa_seed.sql         ← Data referensi RCSA / kategori risiko
│   └── 03_app_seed.sql          ← Users awal, konfigurasi, notifikasi
│
└── migrations/                  ← Perubahan incremental (setelah launch)
    ├── 2026-04-24_notifications_schema_fix.sql
    ├── 2026-04-24_rename_status_pkpt.sql
    ├── 2026-04-24_reset_passwords_to_default.sql
    ├── 2026-04-25_modul1_foundation.sql
    ├── 2026-04-25_modul1_program_anggaran.sql
    ├── 2026-04-25_modul1_risk_hos.sql
    ├── 2026-04-26_modul1_jabatan_update.sql
    ├── 2026-04-26_modul1_kategori_anggaran.sql
    ├── 2026-04-26_modul1_kelompok_penugasan.sql
    ├── 2026-04-26_modul1_team_hari_alokasi.sql
    └── 2026-04-30_ceo_letter_multi_target.sql
```

---

## Setup Fresh Install

```bash
# 1. Buat database (psql / pgAdmin sebagai user postgres)
CREATE DATABASE satria ENCODING='UTF8' TEMPLATE=template0;

# 2. Jalankan schema berurutan
psql -U postgres -d satria -f schema/00_setup.sql
psql -U postgres -d satria -f schema/01_master.sql
psql -U postgres -d satria -f schema/02_auth.sql
psql -U postgres -d satria -f schema/03_pkpt.sql
psql -U postgres -d satria -f schema/04_operasional.sql
psql -U postgres -d satria -f schema/05_pelaporan.sql

# 3. Jalankan seed data berurutan
psql -U postgres -d satria -f seeds/01_master_seed.sql
psql -U postgres -d satria -f seeds/02_rcsa_seed.sql
psql -U postgres -d satria -f seeds/03_app_seed.sql

# 4. Jika ada versi lama yang sudah punya data, apply migrations
psql -U postgres -d satria -f migrations/2026-04-24_notifications_schema_fix.sql
psql -U postgres -d satria -f migrations/2026-04-24_rename_status_pkpt.sql
psql -U postgres -d satria -f migrations/2026-04-25_modul1_foundation.sql
psql -U postgres -d satria -f migrations/2026-04-25_modul1_program_anggaran.sql
psql -U postgres -d satria -f migrations/2026-04-25_modul1_risk_hos.sql
psql -U postgres -d satria -f migrations/2026-04-26_modul1_jabatan_update.sql
psql -U postgres -d satria -f migrations/2026-04-26_modul1_kategori_anggaran.sql
psql -U postgres -d satria -f migrations/2026-04-26_modul1_kelompok_penugasan.sql
psql -U postgres -d satria -f migrations/2026-04-26_modul1_team_hari_alokasi.sql
psql -U postgres -d satria -f migrations/2026-04-30_ceo_letter_multi_target.sql
```

---

## Hierarki Organisasi

```
master.direktorat  (5 Direktorat)
  └── master.divisi  (17 Divisi)
        └── master.departemen  (~30 Departemen)
```

## Alur Antar Modul

```
[M1] pkpt.annual_audit_plans
        │ annual_plan_id
        ▼
[M2] penugasan.individual_audit_plans
        │ audit_plan_id
        ▼
[M3] audit.audit_workpapers
        │ workpaper_id
        ▼
[M4] pelaporan.notifikasi_temuan / tanggapan_temuan
```

---

## Akun Seed (Default)

| Nama             | NIK    | Role               | Password Default  |
|------------------|--------|--------------------|-------------------|
| Admin IT         | 000001 | it_admin           | `001_it`          |
| Admin SPI        | 000002 | admin_spi          | `002_spi`         |
| Budi Santoso     | 199001 | kepala_spi         | `001_santoso`     |
| Siti Rahayu      | 199205 | pengendali_teknis  | `205_rahayu`      |
| Andi Pratama     | 199508 | anggota_tim        | `508_pratama`     |
| Dewi Auditee     | 199612 | auditee            | `612_auditee`     |

> **Pola password default:** `{3 digit terakhir NIK}_{nama belakang lowercase}`
> Fungsi DB: `auth.default_password(nik, nama_lengkap)`

---

## Konfigurasi Backend (.env)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=satria
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## Tabel Master Penting

| Tabel                        | Isi                                      |
|------------------------------|------------------------------------------|
| `master.direktorat`          | 5 Direktorat Transjakarta                |
| `master.divisi`              | 17 Divisi                                |
| `master.departemen`          | ~30 Departemen                           |
| `master.bobot_peran`         | Bobot per role tim untuk hitung man-days |
| `master.kelompok_penugasan`  | Kategori, Sifat Program, Kat. Anggaran   |
| `master.app_config`          | Konfigurasi key-value (tahun aktif, dll) |
| `pkpt.kalender_kerja`        | Hari kerja & pagu HP per tahun           |
| `pkpt.ceo_letter`            | CEO/Direksi letter per tahun             |
