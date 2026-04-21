# ERD - Relasi Antar Tabel SATRIA

## Diagram Relasi

```
users ──────────────────────────────────────────────────────┐
  │                                                          │
  │ koordinator_tim_id (1)                                   │
  ├──────────────────────────────────────────────────────►  │
  │                                                          │
  │             perencanaan_pengawasan_tahunan (PPT)         │
  │                         │                                │
  │  (M)  ppt_anggota_tim   │ id (1)                        │
  └──────◄──────────────────┤                               │
  users(M)                  │                               │
                            │ ppt_id (FK)                   │
                            ▼                               │
              perencanaan_pengawasan_individual (PPI)        │
                  │    │    │    │                          │
       pj_id (FK)┘    │    │    └── ketua_tim_id (FK)      │
  pengendali_id (FK)──┘    │         └──────────────────►  │
                           │  ppi_anggota_tim (M:M)        │
                      users│◄──────────────────────────────┘
                           │
                           │ ppi_id (FK)
                           ▼
                   pelaksanaan_audit (KKA)
                       │        │
           dept_id (FK)┘        └── auditee_pic_id (FK)
                ▼                         ▼
           departments                  users
```

## Penjelasan Relasi

| Relasi | Tipe | Keterangan |
|--------|------|------------|
| PPT → users (koordinator) | Many-to-One | Satu PPT punya satu koordinator |
| PPT ↔ users (anggota) | Many-to-Many | Via `ppt_anggota_tim` |
| PPI → PPT | Many-to-One | Banyak penugasan bisa dari satu PPT |
| PPI → users (PJ, Pengendali, Ketua) | Many-to-One | 3 role fix per penugasan |
| PPI ↔ users (anggota) | Many-to-Many | Via `ppi_anggota_tim` |
| KKA → PPI | Many-to-One | Banyak KKA bisa dari satu penugasan |
| KKA → departments | Many-to-One | Auditee adalah departemen |
| KKA → users (PIC Auditee) | Many-to-One | PIC dari sisi auditee |
| departments → departments | Self-referencing | Hierarki unit (parent_id) |
