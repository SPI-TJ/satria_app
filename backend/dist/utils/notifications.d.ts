export interface NotifyPayload {
    user_id: string;
    title: string;
    message: string;
    type?: 'Risk' | 'Program' | 'System' | 'Evaluation';
    entity_id?: string | null;
    entity_type?: string | null;
    link_url?: string | null;
}
export declare function createNotification(p: NotifyPayload): Promise<void>;
/**
 * 2 notifikasi untuk user baru: Selamat datang + Lengkapi identitas.
 * Dipanggil setelah admin membuat akun di UserManagementPage.
 */
export declare function notifyWelcomeUser(userId: string, namaLengkap: string): Promise<void>;
/**
 * Notifikasi saat user di-assign ke tim sebuah program.
 * Dipanggil tiap kali INSERT ke pkpt.annual_plan_team (create/update plan).
 */
export declare function notifyTeamAssigned(planId: string, userId: string, roleTim: string): Promise<void>;
/**
 * Notifikasi saat program baru dibuat → kirim ke seluruh tim.
 */
export declare function notifyProgramCreated(planId: string): Promise<void>;
/**
 * Notifikasi saat status program berubah ke On Progress.
 */
export declare function notifyProgramOnProgress(planId: string): Promise<void>;
/**
 * Notifikasi saat program ditutup (Closed / finalize).
 */
export declare function notifyProgramClosed(planId: string): Promise<void>;
/**
 * Notifikasi risiko high/critical baru di-input → kirim ke Kepala SPI.
 */
export declare function notifyHighRiskAdded(riskId: string, namaRisiko: string, level: string): Promise<void>;
/**
 * Kirim notifikasi penilaian saat program selesai:
 * - Pengendali Teknis program tsb → mulai Stage 1
 * - Semua Kepala SPI aktif          → tunggu Stage 1 beres (tetap diberitahu)
 */
export declare function notifyProgramCompleted(planId: string): Promise<void>;
/**
 * Notifikasi "Mendekati Deadline" — H-7 sebelum tanggal_selesai.
 * Dikirim ke seluruh anggota tim + Kepala SPI (dedup via existence-check).
 */
export declare function notifyDeadlineApproaching(planId: string): Promise<void>;
/**
 * Notifikasi "Program Overdue" — tanggal_selesai sudah lewat & belum completed_at.
 * Dikirim ke seluruh anggota tim + Kepala SPI (dedup via existence-check).
 */
export declare function notifyProgramOverdue(planId: string): Promise<void>;
/**
 * Scan semua program aktif (belum completed, belum Closed, belum ter-delete)
 * → trigger notifikasi sesuai kondisi (near_deadline / overdue).
 * Return statistik jumlah program yg diproses per kategori.
 */
export declare function scanDeadlineNotifications(): Promise<{
    nearDeadline: number;
    overdue: number;
}>;
//# sourceMappingURL=notifications.d.ts.map