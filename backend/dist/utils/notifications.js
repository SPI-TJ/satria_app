"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyWelcomeUser = notifyWelcomeUser;
exports.notifyTeamAssigned = notifyTeamAssigned;
exports.notifyProgramCreated = notifyProgramCreated;
exports.notifyProgramOnProgress = notifyProgramOnProgress;
exports.notifyProgramClosed = notifyProgramClosed;
exports.notifyHighRiskAdded = notifyHighRiskAdded;
exports.notifyProgramCompleted = notifyProgramCompleted;
exports.notifyDeadlineApproaching = notifyDeadlineApproaching;
exports.notifyProgramOverdue = notifyProgramOverdue;
exports.scanDeadlineNotifications = scanDeadlineNotifications;
/**
 * Utility untuk mengirim notifikasi ke user tertentu.
 * Notifikasi disimpan di pelaporan.notifications dan muncul di panel Header.
 */
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("./logger"));
async function createNotification(p) {
    try {
        await (0, database_1.query)(`INSERT INTO pelaporan.notifications
         (user_id, title, message, notification_type, entity_id, entity_type, link_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [p.user_id, p.title, p.message, p.type ?? 'System',
            p.entity_id ?? null, p.entity_type ?? null, p.link_url ?? null]);
    }
    catch (err) {
        // Log eksplisit supaya ketahuan kalau ada schema mismatch
        logger_1.default.error(`[NOTIF] createNotification FAILED: ${err.message}`, {
            user_id: p.user_id, title: p.title, type: p.type,
        });
        throw err;
    }
}
// ════════════════════════════════════════════════════════════════
//  ONBOARDING — user baru
// ════════════════════════════════════════════════════════════════
/**
 * 2 notifikasi untuk user baru: Selamat datang + Lengkapi identitas.
 * Dipanggil setelah admin membuat akun di UserManagementPage.
 */
async function notifyWelcomeUser(userId, namaLengkap) {
    try {
        await createNotification({
            user_id: userId,
            title: 'Selamat Datang di SATRIA',
            message: `Halo ${namaLengkap}, akun Anda sudah aktif. Silakan eksplorasi fitur SATRIA sesuai peran Anda. Password default: 3 digit terakhir NIK + "_" + nama belakang (lowercase).`,
            type: 'System',
            link_url: '/',
        });
        await createNotification({
            user_id: userId,
            title: 'Lengkapi Identitas Anda',
            message: 'Mohon periksa dan lengkapi data profil Anda (email, jabatan, unit kerja). Ubah juga password default Anda demi keamanan.',
            type: 'System',
            link_url: '/profil',
        });
        logger_1.default.info('[NOTIF] notifyWelcomeUser sent', { userId });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyWelcomeUser failed: ${err.message}`, { userId });
    }
}
// ════════════════════════════════════════════════════════════════
//  PROGRAM KERJA — lifecycle notifikasi
// ════════════════════════════════════════════════════════════════
async function getPlanTeam(planId) {
    const r = await (0, database_1.query)(`SELECT user_id, role_tim FROM pkpt.annual_plan_team WHERE annual_plan_id = $1`, [planId]);
    return r.rows;
}
async function getKepalaSpiIds() {
    const r = await (0, database_1.query)(`SELECT id FROM auth.users
      WHERE role = 'kepala_spi' AND is_active = TRUE AND deleted_at IS NULL`);
    return r.rows.map((x) => x.id);
}
/**
 * Notifikasi saat user di-assign ke tim sebuah program.
 * Dipanggil tiap kali INSERT ke pkpt.annual_plan_team (create/update plan).
 */
async function notifyTeamAssigned(planId, userId, roleTim) {
    try {
        const plan = await (0, database_1.query)(`SELECT judul_program, tanggal_mulai, tanggal_selesai
         FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        if (!plan.rows[0])
            return;
        const p = plan.rows[0];
        const periode = `${new Date(p.tanggal_mulai).toLocaleDateString('id-ID')} – ${new Date(p.tanggal_selesai).toLocaleDateString('id-ID')}`;
        await createNotification({
            user_id: userId,
            title: 'Anda Ditugaskan ke Program Kerja',
            message: `Anda ditugaskan sebagai ${roleTim} pada program "${p.judul_program}" (periode ${periode}).`,
            type: 'Program',
            entity_id: planId,
            entity_type: 'annual_plan',
            link_url: '/perencanaan/pkpt?tab=program',
        });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyTeamAssigned failed: ${err.message}`, { planId, userId });
    }
}
/**
 * Notifikasi saat program baru dibuat → kirim ke seluruh tim.
 */
async function notifyProgramCreated(planId) {
    try {
        const plan = await (0, database_1.query)(`SELECT judul_program FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        if (!plan.rows[0])
            return;
        const team = await getPlanTeam(planId);
        for (const m of team) {
            await createNotification({
                user_id: m.user_id,
                title: 'Program Kerja Baru',
                message: `Program "${plan.rows[0].judul_program}" telah dibuat. Anda terlibat sebagai ${m.role_tim}.`,
                type: 'Program',
                entity_id: planId,
                entity_type: 'annual_plan',
                link_url: '/perencanaan/pkpt?tab=program',
            });
        }
        logger_1.default.info('[NOTIF] notifyProgramCreated sent', { planId, recipients: team.length });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyProgramCreated failed: ${err.message}`, { planId });
    }
}
/**
 * Notifikasi saat status program berubah ke On Progress.
 */
async function notifyProgramOnProgress(planId) {
    try {
        const plan = await (0, database_1.query)(`SELECT judul_program FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        if (!plan.rows[0])
            return;
        const audience = new Set([
            ...(await getPlanTeam(planId)).map((m) => m.user_id),
            ...(await getKepalaSpiIds()),
        ]);
        for (const uid of audience) {
            await createNotification({
                user_id: uid,
                title: 'Program Masuk On Progress',
                message: `Program "${plan.rows[0].judul_program}" mulai dikerjakan auditor (status: On Progress).`,
                type: 'Program',
                entity_id: planId,
                entity_type: 'annual_plan',
                link_url: '/perencanaan/pkpt?tab=program',
            });
        }
        logger_1.default.info('[NOTIF] notifyProgramOnProgress sent', { planId, recipients: audience.size });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyProgramOnProgress failed: ${err.message}`, { planId });
    }
}
/**
 * Notifikasi saat program ditutup (Closed / finalize).
 */
async function notifyProgramClosed(planId) {
    try {
        const plan = await (0, database_1.query)(`SELECT judul_program FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        if (!plan.rows[0])
            return;
        const audience = new Set([
            ...(await getPlanTeam(planId)).map((m) => m.user_id),
            ...(await getKepalaSpiIds()),
        ]);
        for (const uid of audience) {
            await createNotification({
                user_id: uid,
                title: 'Program Ditutup (Closed)',
                message: `Program "${plan.rows[0].judul_program}" telah ditutup/final.`,
                type: 'Program',
                entity_id: planId,
                entity_type: 'annual_plan',
                link_url: '/perencanaan/pkpt?tab=program',
            });
        }
        logger_1.default.info('[NOTIF] notifyProgramClosed sent', { planId, recipients: audience.size });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyProgramClosed failed: ${err.message}`, { planId });
    }
}
// ════════════════════════════════════════════════════════════════
//  RISK — notifikasi saat input/update risiko kritikal
// ════════════════════════════════════════════════════════════════
/**
 * Notifikasi risiko high/critical baru di-input → kirim ke Kepala SPI.
 */
async function notifyHighRiskAdded(riskId, namaRisiko, level) {
    try {
        const kepala = await getKepalaSpiIds();
        for (const uid of kepala) {
            await createNotification({
                user_id: uid,
                title: `Risiko ${level} Baru`,
                message: `Risiko "${namaRisiko}" dengan level ${level} baru saja ditambahkan. Mohon ditinjau.`,
                type: 'Risk',
                entity_id: riskId,
                entity_type: 'risk',
                link_url: '/perencanaan/pkpt?tab=risk',
            });
        }
        logger_1.default.info('[NOTIF] notifyHighRiskAdded sent', { riskId, recipients: kepala.length });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyHighRiskAdded failed: ${err.message}`, { riskId });
    }
}
/**
 * Kirim notifikasi penilaian saat program selesai:
 * - Pengendali Teknis program tsb → mulai Stage 1
 * - Semua Kepala SPI aktif          → tunggu Stage 1 beres (tetap diberitahu)
 */
async function notifyProgramCompleted(planId) {
    try {
        const plan = await (0, database_1.query)(`SELECT id, judul_program FROM pkpt.annual_audit_plans WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        if (!plan.rows[0])
            return;
        const judul = plan.rows[0].judul_program;
        const linkUrl = `/perencanaan/pkpt?tab=evaluation`;
        // Pengendali Teknis di program ini
        const pt = await (0, database_1.query)(`SELECT user_id FROM pkpt.annual_plan_team
       WHERE annual_plan_id = $1 AND role_tim = 'Pengendali Teknis'`, [planId]);
        for (const r of pt.rows) {
            await createNotification({
                user_id: r.user_id,
                title: 'Penilaian Auditor Tersedia',
                message: `Program "${judul}" sudah selesai. Silakan nilai Ketua Tim & Anggota Tim di program ini.`,
                type: 'Evaluation',
                entity_id: planId,
                entity_type: 'annual_plan',
                link_url: linkUrl,
            });
        }
        // Kepala SPI aktif
        const kepala = await (0, database_1.query)(`SELECT id FROM auth.users
       WHERE role = 'kepala_spi' AND is_active = TRUE AND deleted_at IS NULL`);
        for (const r of kepala.rows) {
            await createNotification({
                user_id: r.id,
                title: 'Program Selesai — Antrean Penilaian',
                message: `Program "${judul}" sudah selesai. Penilaian akan tersedia setelah Pengendali Teknis menilai.`,
                type: 'Evaluation',
                entity_id: planId,
                entity_type: 'annual_plan',
                link_url: linkUrl,
            });
        }
        logger_1.default.info('[NOTIF] notifyProgramCompleted sent', {
            planId, pt: pt.rows.length, kepala: kepala.rows.length,
        });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyProgramCompleted failed: ${err.message}`, { planId });
    }
}
/**
 * Cek apakah user sudah menerima notifikasi bertipe/title tertentu utk entity_id
 * dalam window waktu (default 20 jam) → mencegah spam bila scanner dijalankan
 * lebih dari sekali per hari.
 */
async function alreadyNotified(opts) {
    const hours = opts.withinHours ?? 20;
    const r = await (0, database_1.query)(`SELECT id FROM pelaporan.notifications
      WHERE user_id = $1
        AND entity_id = $2
        AND title = $3
        AND created_at > NOW() - ($4 || ' hours')::INTERVAL
      LIMIT 1`, [opts.user_id, opts.entity_id, opts.title, String(hours)]);
    return (r.rows.length > 0);
}
/** Daftar user yg perlu dinotifikasi utk deadline suatu program:
 *  semua anggota tim program + semua Kepala SPI aktif (tanpa duplikat). */
async function getDeadlineAudience(planId) {
    const team = await (0, database_1.query)(`SELECT DISTINCT user_id FROM pkpt.annual_plan_team WHERE annual_plan_id = $1`, [planId]);
    const kepala = await (0, database_1.query)(`SELECT id FROM auth.users
      WHERE role = 'kepala_spi' AND is_active = TRUE AND deleted_at IS NULL`);
    const set = new Set([
        ...team.rows.map((r) => r.user_id),
        ...kepala.rows.map((r) => r.id),
    ]);
    return Array.from(set);
}
/**
 * Notifikasi "Mendekati Deadline" — H-7 sebelum tanggal_selesai.
 * Dikirim ke seluruh anggota tim + Kepala SPI (dedup via existence-check).
 */
async function notifyDeadlineApproaching(planId) {
    try {
        const plan = await (0, database_1.query)(`SELECT id, judul_program, tanggal_selesai, completed_at
         FROM pkpt.annual_audit_plans
        WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        const p = plan.rows[0];
        if (!p || p.completed_at)
            return;
        const title = 'Mendekati Deadline Program';
        const tglSelesai = new Date(p.tanggal_selesai).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
        });
        const message = `Program "${p.judul_program}" akan berakhir pada ${tglSelesai}. Harap segera diselesaikan.`;
        const linkUrl = `/perencanaan/pkpt?tab=program`;
        const audience = await getDeadlineAudience(planId);
        let sent = 0;
        for (const userId of audience) {
            if (await alreadyNotified({ user_id: userId, entity_id: planId, title }))
                continue;
            await createNotification({
                user_id: userId, title, message,
                type: 'Program', entity_id: planId, entity_type: 'annual_plan', link_url: linkUrl,
            });
            sent++;
        }
        logger_1.default.info('[NOTIF] notifyDeadlineApproaching sent', { planId, sent, audience: audience.length });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyDeadlineApproaching failed: ${err.message}`, { planId });
    }
}
/**
 * Notifikasi "Program Overdue" — tanggal_selesai sudah lewat & belum completed_at.
 * Dikirim ke seluruh anggota tim + Kepala SPI (dedup via existence-check).
 */
async function notifyProgramOverdue(planId) {
    try {
        const plan = await (0, database_1.query)(`SELECT id, judul_program, tanggal_selesai, completed_at
         FROM pkpt.annual_audit_plans
        WHERE id = $1 AND deleted_at IS NULL`, [planId]);
        const p = plan.rows[0];
        if (!p || p.completed_at)
            return;
        const title = 'Program Overdue';
        const tglSelesai = new Date(p.tanggal_selesai).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
        });
        const message = `Program "${p.judul_program}" melewati tanggal selesai (${tglSelesai}) namun belum ditandai selesai. Mohon tindak lanjut.`;
        const linkUrl = `/perencanaan/pkpt?tab=program`;
        const audience = await getDeadlineAudience(planId);
        let sent = 0;
        for (const userId of audience) {
            if (await alreadyNotified({ user_id: userId, entity_id: planId, title }))
                continue;
            await createNotification({
                user_id: userId, title, message,
                type: 'Program', entity_id: planId, entity_type: 'annual_plan', link_url: linkUrl,
            });
            sent++;
        }
        logger_1.default.info('[NOTIF] notifyProgramOverdue sent', { planId, sent, audience: audience.length });
    }
    catch (err) {
        logger_1.default.error(`[NOTIF] notifyProgramOverdue failed: ${err.message}`, { planId });
    }
}
/**
 * Scan semua program aktif (belum completed, belum Closed, belum ter-delete)
 * → trigger notifikasi sesuai kondisi (near_deadline / overdue).
 * Return statistik jumlah program yg diproses per kategori.
 */
async function scanDeadlineNotifications() {
    const nearRes = await (0, database_1.query)(`SELECT id FROM pkpt.annual_audit_plans
      WHERE deleted_at IS NULL
        AND completed_at IS NULL
        AND status_pkpt <> 'Closed'
        AND tanggal_selesai >= CURRENT_DATE
        AND tanggal_selesai <= CURRENT_DATE + INTERVAL '7 days'`);
    for (const r of nearRes.rows)
        await notifyDeadlineApproaching(r.id);
    const overRes = await (0, database_1.query)(`SELECT id FROM pkpt.annual_audit_plans
      WHERE deleted_at IS NULL
        AND completed_at IS NULL
        AND status_pkpt <> 'Closed'
        AND tanggal_selesai < CURRENT_DATE`);
    for (const r of overRes.rows)
        await notifyProgramOverdue(r.id);
    logger_1.default.info('[NOTIF] scanDeadlineNotifications completed', {
        nearDeadline: nearRes.rows.length, overdue: overRes.rows.length,
    });
    return { nearDeadline: nearRes.rows.length, overdue: overRes.rows.length };
}
//# sourceMappingURL=notifications.js.map