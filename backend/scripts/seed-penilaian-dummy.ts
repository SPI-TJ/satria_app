/* eslint-disable no-console */
/**
 * Seed dummy: auditor users, program selesai, team, dan evaluasi berjenjang.
 * Jalankan: npx ts-node --transpile-only scripts/seed-penilaian-dummy.ts
 */
import { Pool } from 'pg';
import { hashDefaultPassword } from '../src/utils/password';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'satria',
  user: 'postgres', password: '123',
});

const AUDITORS = [
  { nik: '100001', nama: 'Bambang Kepala', role: 'kepala_spi',        jabatan: 'Kepala SPI' },
  { nik: '100002', nama: 'Siti Pengendali',role: 'pengendali_teknis', jabatan: 'Senior Spesialis' },
  { nik: '100003', nama: 'Dedi Pengendali',role: 'pengendali_teknis', jabatan: 'Senior Spesialis' },
  { nik: '100004', nama: 'Rina Ketua',     role: 'anggota_tim',       jabatan: 'Analis' },
  { nik: '100005', nama: 'Andi Anggota',   role: 'anggota_tim',       jabatan: 'Staf' },
  { nik: '100006', nama: 'Maya Anggota',   role: 'anggota_tim',       jabatan: 'Staf' },
  { nik: '100007', nama: 'Fajar Ketua',    role: 'anggota_tim',       jabatan: 'Analis' },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Upsert auditor users
    const userIds: Record<string, string> = {};
    for (const a of AUDITORS) {
      const hash = await hashDefaultPassword(a.nik, a.nama);
      const email = `${a.nik}@satria.local`;
      const res = await client.query<{ id: string }>(
        `INSERT INTO auth.users (nik, nama_lengkap, email, role, jabatan, password_hash, is_active, module_access)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,ARRAY['pkpt'])
         ON CONFLICT (nik) WHERE deleted_at IS NULL DO UPDATE
           SET nama_lengkap = EXCLUDED.nama_lengkap,
               role         = EXCLUDED.role,
               jabatan      = EXCLUDED.jabatan
         RETURNING id`,
        [a.nik, a.nama, email, a.role, a.jabatan, hash],
      );
      userIds[a.nik] = res.rows[0].id;
      console.log(`✔ User ${a.nik} ${a.nama} (${a.role}) → ${res.rows[0].id}`);
    }

    // 2) Ambil 3 program (dummy "selesai")
    const plans = await client.query<{ id: string; judul_program: string }>(
      `SELECT id, judul_program FROM pkpt.annual_audit_plans
        WHERE deleted_at IS NULL
        ORDER BY created_at LIMIT 3`,
    );
    if (plans.rows.length === 0) {
      throw new Error('Tidak ada annual_audit_plans. Buat programmu dulu.');
    }

    // 3) Tandai selesai + pasang tim (Ketua + 2 Anggota + 1 Pengendali Teknis)
    const kepala    = userIds['100001'];
    const pt1       = userIds['100002'];
    const pt2       = userIds['100003'];
    const ketua1    = userIds['100004'];
    const ketua2    = userIds['100007'];
    const anggotaA  = userIds['100005'];
    const anggotaB  = userIds['100006'];

    const assignments = [
      { plan: plans.rows[0], pt: pt1, ketua: ketua1, anggota: [anggotaA, anggotaB] },
      { plan: plans.rows[1], pt: pt2, ketua: ketua2, anggota: [anggotaA] },
      { plan: plans.rows[2], pt: pt1, ketua: ketua1, anggota: [anggotaB] },
    ];

    for (const a of assignments) {
      // Mark selesai
      await client.query(
        `UPDATE pkpt.annual_audit_plans SET completed_at = NOW() - INTERVAL '5 days' WHERE id = $1`,
        [a.plan.id],
      );

      // Hapus team existing (clean seed)
      await client.query(`DELETE FROM pkpt.annual_plan_team WHERE annual_plan_id = $1`, [a.plan.id]);

      // Insert team
      await client.query(
        `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES ($1,$2,'Pengendali Teknis')`,
        [a.plan.id, a.pt],
      );
      await client.query(
        `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES ($1,$2,'Ketua Tim')`,
        [a.plan.id, a.ketua],
      );
      for (const ang of a.anggota) {
        await client.query(
          `INSERT INTO pkpt.annual_plan_team (annual_plan_id, user_id, role_tim) VALUES ($1,$2,'Anggota Tim')`,
          [a.plan.id, ang],
        );
      }

      console.log(`✔ Program "${a.plan.judul_program}" → selesai, tim terpasang`);
    }

    // 4) Seed evaluasi berjenjang (PT menilai → Kepala SPI menilai)
    await client.query(`DELETE FROM penilaian.auditor_evaluations`);

    function randScore() { return 3 + Math.floor(Math.random() * 3); } // 3..5

    for (const a of assignments) {
      const evaluatees = [
        { id: a.ketua, role: 'Ketua Tim' as const },
        ...a.anggota.map((id) => ({ id, role: 'Anggota Tim' as const })),
      ];

      for (const e of evaluatees) {
        // Stage 1 — Pengendali Teknis menilai
        await client.query(
          `INSERT INTO penilaian.auditor_evaluations
             (annual_plan_id, evaluator_id, evaluatee_id, role_tim_evaluatee, stage,
              kompetensi_teknis, komunikasi, hasil_kerja, catatan)
           VALUES ($1,$2,$3,$4,'pengendali_teknis',$5,$6,$7,$8)`,
          [a.plan.id, a.pt, e.id, e.role, randScore(), randScore(), randScore(),
           `Performa ${e.role} solid. Perlu peningkatan dokumentasi temuan.`],
        );
        // Stage 2 — Kepala SPI menilai
        await client.query(
          `INSERT INTO penilaian.auditor_evaluations
             (annual_plan_id, evaluator_id, evaluatee_id, role_tim_evaluatee, stage,
              kompetensi_teknis, komunikasi, hasil_kerja, catatan)
           VALUES ($1,$2,$3,$4,'kepala_spi',$5,$6,$7,$8)`,
          [a.plan.id, kepala, e.id, e.role, randScore(), randScore(), randScore(),
           `Secara umum baik. Tingkatkan koordinasi dengan auditee.`],
        );
      }
    }
    console.log('✔ Evaluasi berjenjang dummy tersimpan');

    // 5) Generate notifikasi ke Pengendali Teknis + Kepala SPI untuk program selesai
    await client.query(
      `DELETE FROM pelaporan.notifications
        WHERE notification_type = 'Evaluation' AND entity_id = ANY($1::uuid[])`,
      [assignments.map((a) => a.plan.id)],
    );
    for (const a of assignments) {
      const judul = a.plan.judul_program;
      const linkUrl = `/perencanaan/pkpt?tab=evaluation`;
      // Pengendali Teknis
      await client.query(
        `INSERT INTO pelaporan.notifications
           (user_id, title, message, notification_type, entity_id, entity_type, link_url)
         VALUES ($1,$2,$3,'Evaluation',$4,'annual_plan',$5)`,
        [a.pt, 'Penilaian Auditor Tersedia',
         `Program "${judul}" sudah selesai. Silakan nilai Ketua Tim & Anggota Tim di program ini.`,
         a.plan.id, linkUrl],
      );
      // Kepala SPI
      await client.query(
        `INSERT INTO pelaporan.notifications
           (user_id, title, message, notification_type, entity_id, entity_type, link_url)
         VALUES ($1,$2,$3,'Evaluation',$4,'annual_plan',$5)`,
        [kepala, 'Program Selesai — Antrean Penilaian',
         `Program "${judul}" sudah selesai. Penilaian akan tersedia setelah Pengendali Teknis menilai.`,
         a.plan.id, linkUrl],
      );
    }
    console.log('✔ Notifikasi Penilaian dummy tersimpan');

    await client.query('COMMIT');
    console.log('\n🎉 Seed selesai. Default password: 001_kepala / 002_pengendali / dst (3 digit akhir NIK + "_" + last name lowercase).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
