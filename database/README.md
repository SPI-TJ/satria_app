# SATRIA — Database Schema

Sistem Akuntabilitas Internal Audit — PT Transportasi Jakarta

## Arsitektur: 1 Database + 6 Schema

```
pgAdmin
└── Server: "spi_app"
    └── Database: satria
        ├── Schema: master     → Dimensi organisasi, kategori, konfigurasi
        ├── Schema: auth       → Users, roles, permissions, activity log
        ├── Schema: pkpt       → Modul 1: PKPT & data risiko
        ├── Schema: penugasan  → Modul 2: Penugasan individual
        ├── Schema: audit      → Modul 3: Kertas Kerja Audit (KKA)
        └── Schema: pelaporan  → Modul 4+: Laporan, temuan, notifikasi
```

> **Mengapa 1 DB + banyak schema?**
> ✅ JOIN lintas modul tetap bisa | ✅ Transaksi ACID penuh | ✅ Backup 1 perintah

## Urutan Eksekusi

```bash
# 1. Buat database (dari psql/pgAdmin dengan user postgres)
CREATE DATABASE satria ENCODING='UTF8' TEMPLATE=template0;

# 2. Sambungkan ke satria, lalu jalankan berurutan:
psql -U postgres -d satria -f 00_setup.sql       # Extensions, schemas, shared fn
psql -U postgres -d satria -f 01_master.sql      # Dimensi organisasi + tabel referensi
psql -U postgres -d satria -f 02_auth.sql        # Users, permissions, activity log
psql -U postgres -d satria -f 03_pkpt.sql        # Modul 1: PKPT & risk data
psql -U postgres -d satria -f 04_operasional.sql # Modul 2 & 3: Penugasan & KKA
psql -U postgres -d satria -f 05_pelaporan.sql   # Modul 4+: Pelaporan & notifikasi
psql -U postgres -d satria -f 99_seed.sql        # Data awal: org + users + notifikasi
```

## Hierarki Organisasi (3 Level)

```
master.direktorat  (Level 1) — 5 Direktorat Transjakarta
  └── master.divisi     (Level 2) — 17 Divisi
        └── master.departemen  (Level 3) — ~30 Departemen
```

## Alur Koneksi Antar Modul

```
[Modul 1 — PKPT]
  pkpt.risk_data
  pkpt.annual_audit_plans
        │
        ▼  annual_plan_id
[Modul 2 — Penugasan]
  penugasan.individual_audit_plans
        │
        ▼  audit_plan_id
[Modul 3 — KKA]
  audit.audit_workpapers
        │
        ▼  workpaper_id
[Modul 4 — Pelaporan]
  pelaporan.notifikasi_temuan
  pelaporan.tanggapan_temuan
```

## Tabel Dimensi & Master

| Tabel | Isi | Digunakan di |
|---|---|---|
| `master.direktorat` | 5 Direktorat Transjakarta | auth.users, penugasan |
| `master.divisi` | 17 Divisi | auth.users, pkpt.risk_data, penugasan, audit |
| `master.departemen` | ~30 Departemen | auth.users, audit.audit_workpapers, pelaporan |
| `master.kategori_risiko` | 7 kategori IIA/COSO | pkpt.risk_data |
| `master.jenis_temuan` | 6 jenis temuan audit | audit.audit_workpapers, pelaporan.notifikasi_temuan |
| `master.trust_connections` | Koneksi ke sistem TRUST | pkpt.risk_data |
| `master.app_config` | Konfigurasi key-value (hari kerja, tahun aktif) | Backend |

## Akun Seed

| Nama | NIK | Role | Password Default |
|---|---|---|---|
| Admin IT | 000001 | it_admin | `001_it` |
| Admin SPI | 000002 | admin_spi | `002_spi` |
| Budi Santoso | 199001 | kepala_spi | `001_santoso` |
| Siti Rahayu | 199205 | pengendali_teknis | `205_rahayu` |
| Andi Pratama | 199508 | anggota_tim | `508_pratama` |
| Dewi Auditee | 199612 | auditee | `612_auditee` |

> **NIK:** tepat 6 digit angka. Divalidasi di DB (`CHECK (nik ~ '^[0-9]{6}$')`) dan di form frontend.

> **Pola password default:** `{3 digit terakhir NIK}_{nama belakang lowercase}`
> Fungsi: `auth.default_password(nik, nama_lengkap)`

## .env Backend

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=satria
DB_USER=postgres
DB_PASSWORD=your_password
```
