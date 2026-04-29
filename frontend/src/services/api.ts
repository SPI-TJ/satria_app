import axios from 'axios';
import {
  ApiResponse, AnnualAuditPlan, AnnualAuditPlanDetail,
  Auditor, DashboardStats, Notification, RiskData, RiskLevelRef,
  WorkloadResponse, SimulateWorkloadResponse,
  PendingEvaluationPlan, EvaluationSummaryRow, EvaluationDetailRow, SubmitEvaluationPayload,
  Direktorat, Divisi, Departemen, SasaranKorporat,
} from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('satria_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Jangan auto-redirect jika:
      //  (a) request-nya sendiri adalah endpoint login (biarkan handler lokal
      //      menampilkan pesan error inline tanpa reload form), atau
      //  (b) user memang sudah berada di halaman /login (cegah loop).
      const reqUrl = (err.config?.url ?? '') as string;
      const isLoginCall = reqUrl.includes('/auth/login');
      const onLoginPage = typeof window !== 'undefined'
        && window.location.pathname.startsWith('/login');

      if (!isLoginCall && !onLoginPage) {
        localStorage.removeItem('satria_token');
        localStorage.removeItem('satria_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login:          (nik: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: unknown }>>('/auth/login', { nik, password }),
  me:             () => api.get<ApiResponse<unknown>>('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    api.put<ApiResponse<null>>('/auth/change-password', { old_password, new_password }),
};

// ── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  getAll:      (type?: string, unread_only?: boolean) =>
    api.get<ApiResponse<Notification[]>>('/notifications', { params: { type, unread_only } }),
  markAsRead:  (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete:      (id: string) => api.delete(`/notifications/${id}`),
};

// ── Risks ─────────────────────────────────────────────────────
export const risksApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<{ data: RiskData[]; meta: { total: number; page: number; limit: number; totalPages: number } }>>('/risks', { params }),
  getById: (id: string) =>
    api.get<ApiResponse<RiskData>>(`/risks/${id}`),
  getTop: (params?: { tahun?: number; n?: number }) =>
    api.get<ApiResponse<RiskData[]>>('/risks/top', { params }),
  getLevelRef: () =>
    api.get<ApiResponse<RiskLevelRef[]>>('/risks/level-ref'),
  getSasaranKorporat: () =>
    api.get<ApiResponse<SasaranKorporat[]>>('/risks/sasaran-korporat'),
  getStats: (tahun?: number) =>
    api.get<ApiResponse<{ total: number; byLevel: Record<string, number>; topDirektorat: Array<{direktorat: string; count: number}> }>>('/risks/stats', { params: { tahun } }),
  create: (data: Partial<RiskData>) =>
    api.post<ApiResponse<RiskData>>('/risks', data),
  update: (id: string, data: Partial<RiskData>) =>
    api.patch<ApiResponse<RiskData>>(`/risks/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/risks/${id}`),
  downloadTemplate: () =>
    api.get('/risks/template', { responseType: 'blob' }),
};

// ── Annual Plans (Modul 1) ────────────────────────────────────
export interface CreatePlanPayload {
  tahun_perencanaan?: string;
  jenis_program: string;
  kategori_program?: string;
  judul_program: string;
  status_program?: string;
  auditee?: string;
  deskripsi?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  // Finansial (Fase 5)
  anggaran?: number | null;
  realisasi_anggaran?: number | null;
  kategori_anggaran?: string | null;
  man_days_estimasi?: number | null;
  pengendali_teknis_id?: string;
  pengendali_teknis_ids?: string[];
  ketua_tim_id?: string;
  ketua_tim_ids?: string[];
  anggota_ids?: string[];
  team_alokasi?: Record<string, number>;  // user_id -> hari_alokasi
  risk_ids?: string[];
}

export const annualPlansApi = {
  getAll:   (params?: Record<string, unknown>) =>
    api.get<ApiResponse<AnnualAuditPlan[]>>('/annual-plans', { params }),
  getById:  (id: string) =>
    api.get<ApiResponse<AnnualAuditPlanDetail>>(`/annual-plans/${id}`),
  create:   (data: CreatePlanPayload) =>
    api.post<ApiResponse<{ id: string; estimasi_hari: number }>>('/annual-plans', data),
  update:   (id: string, data: Partial<CreatePlanPayload>) =>
    api.patch<ApiResponse<{ estimasi_hari: number }>>(`/annual-plans/${id}`, data),
  delete:   (id: string) =>
    api.delete<ApiResponse<null>>(`/annual-plans/${id}`),
  finalize: (id: string) =>
    api.patch<ApiResponse<null>>(`/annual-plans/${id}/finalize`),
  markCompleted: (id: string) =>
    api.patch<ApiResponse<null>>(`/annual-plans/${id}/mark-completed`),
};

// ── Auditors ─────────────────────────────────────────────────
export const auditorsApi = {
  getAll: () => api.get<ApiResponse<Auditor[]>>('/auditors'),
};

// ── Workload (Beban Kerja Auditor) ────────────────────────────
export const workloadApi = {
  get: (tahun: number, user_id?: string) =>
    api.get<WorkloadResponse>('/workload', {
      params: { tahun, ...(user_id ? { user_id } : {}) },
    }),
  simulate: (payload: {
    user_ids: string[];
    tanggal_mulai: string;
    tanggal_selesai: string;
    role_tim: string;
    hari_alokasi?: number;
  }) => api.post<SimulateWorkloadResponse>('/workload/simulate', payload),
};

// ── Penilaian Auditor ──────────────────────────────────────────
export const evaluationsApi = {
  getPending: () =>
    api.get<ApiResponse<PendingEvaluationPlan[]> & { stage?: string }>('/evaluations/pending'),
  submit: (payload: SubmitEvaluationPayload) =>
    api.post<ApiResponse<null>>('/evaluations', payload),
  getSummary: (tahun: number) =>
    api.get<ApiResponse<EvaluationSummaryRow[]>>('/evaluations/summary', { params: { tahun } }),
  getAuditorDetail: (userId: string, tahun: number) =>
    api.get<ApiResponse<EvaluationDetailRow[]>>(`/evaluations/auditor/${userId}`, { params: { tahun } }),
};

// ── Organisasi (Direktorat / Divisi / Departemen) – Dropdown ───
export const organisasiApi = {
  // Dropdown endpoints (simple list without pagination)
  getDirektorats: () =>
    api.get<ApiResponse<Direktorat[]>>('/dropdown/direktorat'),
  getDivisis: (direktorat_id?: string) =>
    api.get<ApiResponse<Divisi[]>>('/dropdown/divisi', 
      { params: { ...(direktorat_id ? { direktorat_id } : {}) } }),
  getDepartemens: (divisi_id?: string) =>
    api.get<ApiResponse<Departemen[]>>('/dropdown/departemen', 
      { params: { ...(divisi_id ? { divisi_id } : {}) } }),
  getSasaranKorporat: () =>
    api.get<ApiResponse<SasaranKorporat[]>>('/dropdown/sasaran-korporat'),
};

// ── User Stats ────────────────────────────────────────────────
export const userStatsApi = {
  get: () => api.get<ApiResponse<{ total: number; aktif: number; non_aktif: number }>>('/users/stats'),
};

// ── Jabatan (jabatan struktural — static list) ─────────────────
// Jabatan struktural auditor SPI (urutan = senioritas)
export const JABATAN_OPTIONS = [
  'Kepala Divisi',
  'Kepala Departemen',
  'Senior Spesialis',
  'Kepala Seksi',
  'Analis',
  'Staff SPI',
  'Adjunct Auditor',
] as const;

// ── Kalender Kerja / Man-Days ─────────────────────────────────
export interface KalenderHeader {
  id: string;
  tahun: number;
  jumlah_auditor_snapshot: number;
  total_hari_efektif: number;
  hari_pemeriksaan_tersedia: number;
  locked_at: string | null;
  locked_by: string | null;
  locked_by_nama?: string | null;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
}

export interface KalenderBulan {
  id?: string;
  kalender_id?: string;
  bulan: number;            // 1..12
  jumlah_hari: number;
  jumlah_libur: number;
  hari_efektif: number;
  catatan: string | null;
}

export interface KalenderResponse {
  header: KalenderHeader | null;
  bulan: KalenderBulan[];
  auditor_count_now: number;
}

export const kalenderKerjaApi = {
  get: (tahun?: number) =>
    api.get<ApiResponse<KalenderResponse> & { meta?: { tahun: number; exists: boolean } }>(
      '/kalender-kerja', { params: { tahun } },
    ),
  upsert: (payload: {
    tahun: number;
    keterangan?: string | null;
    bulan: Array<Pick<KalenderBulan, 'bulan' | 'jumlah_hari' | 'jumlah_libur' | 'catatan'>>;
  }) => api.put<ApiResponse<KalenderResponse>>('/kalender-kerja', payload),
  lock:   (id: string) => api.post<ApiResponse<KalenderHeader>>(`/kalender-kerja/${id}/lock`),
  unlock: (id: string) => api.post<ApiResponse<KalenderHeader>>(`/kalender-kerja/${id}/unlock`),
};

// ── CEO Letter (Surat Arahan Direksi) ─────────────────────────
export interface CeoLetterHeader {
  id: string;
  tahun: number;
  nomor_surat: string | null;
  judul: string;
  tanggal_terbit: string | null;
  isi_ringkasan: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_by_nama?: string | null;
  created_at: string;
  updated_at: string;
}

export type AreaPrioritas = 'Tinggi' | 'Sedang' | 'Rendah';

export interface CeoLetterArea {
  id?: string;
  ceo_letter_id?: string;
  parameter: string;
  deskripsi: string | null;
  prioritas: AreaPrioritas;
  urutan: number;
}

export interface CeoLetterResponse {
  header: CeoLetterHeader | null;
  areas: CeoLetterArea[];
}

export const ceoLetterApi = {
  get: (tahun?: number) =>
    api.get<ApiResponse<CeoLetterResponse> & { meta?: { tahun: number; exists: boolean } }>(
      '/ceo-letter', { params: { tahun } },
    ),
  /**
   * Upsert + (optional) attach PDF.
   * `payload.file` opsional. `payload.areas` di-stringify JSON ke FormData.
   */
  upsert: (payload: {
    tahun: number;
    nomor_surat?: string | null;
    judul: string;
    tanggal_terbit?: string | null;
    isi_ringkasan?: string | null;
    areas: Array<Pick<CeoLetterArea, 'parameter' | 'deskripsi' | 'prioritas' | 'urutan'>>;
    file?: File | null;
  }) => {
    const fd = new FormData();
    fd.append('tahun', String(payload.tahun));
    if (payload.nomor_surat   != null) fd.append('nomor_surat',   payload.nomor_surat);
    fd.append('judul', payload.judul);
    if (payload.tanggal_terbit) fd.append('tanggal_terbit', payload.tanggal_terbit);
    if (payload.isi_ringkasan != null) fd.append('isi_ringkasan', payload.isi_ringkasan);
    fd.append('areas', JSON.stringify(payload.areas ?? []));
    if (payload.file) fd.append('file', payload.file);
    return api.put<ApiResponse<CeoLetterResponse>>('/ceo-letter', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<ApiResponse<CeoLetterHeader>>(`/ceo-letter/${id}/file`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteFile: (id: string) => api.delete<ApiResponse<CeoLetterHeader>>(`/ceo-letter/${id}/file`),
  remove:     (id: string) => api.delete<ApiResponse<null>>(`/ceo-letter/${id}`),
};

// ── Pengaturan Sistem (Master HoS, Sasaran, Bobot, Tipe) ──────
export interface HosKategori {
  id: string;
  tahun: number;
  kode: string;
  nama_perspektif: string;
  deskripsi: string | null;
  urutan: number;
  created_at: string;
  updated_at: string;
}

export interface SasaranStrategis {
  id: string;
  kategori_id: string;
  tahun: number;
  kode: string | null;
  nama: string;
  deskripsi: string | null;
  created_by: string | null;
  created_by_nama?: string | null;
  kategori_kode?: string | null;
  kategori_nama?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BobotPeran {
  id: string;
  tahun: number;
  peran: 'Penanggung Jawab' | 'Pengendali Teknis' | 'Ketua Tim' | 'Anggota Tim';
  bobot: number;
  max_bobot_per_bulan: number;
  keterangan: string | null;
}

export interface KelompokPenugasan {
  id: string;
  tipe: string;     // 'Kategori' | 'Sifat Program' | 'Kategori Anggaran' | (custom)
  nilai: string;
  urutan: number;
  is_active: boolean;
}

export const settingsApi = {
  // House of Strategy — Kategori
  getHosKategoris: (tahun?: number) =>
    api.get<ApiResponse<HosKategori[]>>('/settings/hos-kategori', { params: { tahun } }),
  createHosKategori: (data: Partial<HosKategori>) =>
    api.post<ApiResponse<HosKategori>>('/settings/hos-kategori', data),
  updateHosKategori: (id: string, data: Partial<HosKategori>) =>
    api.patch<ApiResponse<HosKategori>>(`/settings/hos-kategori/${id}`, data),
  deleteHosKategori: (id: string) =>
    api.delete<ApiResponse<null>>(`/settings/hos-kategori/${id}`),

  // Sasaran Strategis
  getSasaranStrategis: (params?: { tahun?: number; kategori_id?: string; search?: string }) =>
    api.get<ApiResponse<SasaranStrategis[]>>('/settings/sasaran-strategis', { params }),
  createSasaranStrategis: (data: Partial<SasaranStrategis>) =>
    api.post<ApiResponse<SasaranStrategis>>('/settings/sasaran-strategis', data),
  updateSasaranStrategis: (id: string, data: Partial<SasaranStrategis>) =>
    api.patch<ApiResponse<SasaranStrategis>>(`/settings/sasaran-strategis/${id}`, data),
  deleteSasaranStrategis: (id: string) =>
    api.delete<ApiResponse<null>>(`/settings/sasaran-strategis/${id}`),

  // Bobot Peran
  getBobotPeran: (tahun?: number) =>
    api.get<ApiResponse<BobotPeran[]>>('/settings/bobot-peran', { params: { tahun } }),
  upsertBobotPeran: (tahun: number, items: Partial<BobotPeran>[]) =>
    api.put<ApiResponse<BobotPeran[]>>('/settings/bobot-peran', { tahun, items }),

  // Kelompok Penugasan (master generik: Kategori / Sifat Program / Kategori Anggaran / dll)
  getKelompokPenugasan: (tipe?: string) =>
    api.get<ApiResponse<KelompokPenugasan[]>>('/settings/kelompok-penugasan', { params: { tipe } }),
  createKelompokPenugasan: (data: Partial<KelompokPenugasan>) =>
    api.post<ApiResponse<KelompokPenugasan>>('/settings/kelompok-penugasan', data),
  updateKelompokPenugasan: (id: string, data: Partial<KelompokPenugasan>) =>
    api.patch<ApiResponse<KelompokPenugasan>>(`/settings/kelompok-penugasan/${id}`, data),
  deleteKelompokPenugasan: (id: string) =>
    api.delete<ApiResponse<null>>(`/settings/kelompok-penugasan/${id}`),
};

// ── User Management (Admin SPI) ───────────────────────────────
export const usersApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<UserRow[]>>('/users', { params }),
  getById: (id: string) =>
    api.get<ApiResponse<UserRow>>(`/users/${id}`),
  create: (data: CreateUserPayload) =>
    api.post<ApiResponse<{ id: string; default_password: string; hint: string }>>('/users', data),
  update: (id: string, data: Partial<CreateUserPayload>) =>
    api.patch<ApiResponse<null>>(`/users/${id}`, data),
  updateModuleAccess: (id: string, module_access: string[]) =>
    api.patch<ApiResponse<null>>(`/users/${id}/module-access`, { module_access }),
  resetPassword: (id: string) =>
    api.post<ApiResponse<{ default_password: string; hint: string }>>(`/users/${id}/reset-password`),
  setPassword: (id: string, new_password: string) =>
    api.post<ApiResponse<null>>(`/users/${id}/set-password`, { new_password }),
  toggleActive: (id: string) =>
    api.patch<ApiResponse<{ is_active: boolean }>>(`/users/${id}/toggle-active`),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/users/${id}`),
};

export interface UserRow {
  id: string;
  nik: string;
  nama_lengkap: string;
  email: string;
  role: string;
  jabatan: string | null;
  is_active: boolean;
  module_access: string[];
  direktorat_id?: string;
  direktorat_nama?: string;
  divisi_id?: string;
  divisi_nama?: string;
  departemen_id?: string;
  departemen_nama?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateUserPayload {
  nik: string;
  nama_lengkap: string;
  email: string;
  role: string;
  jabatan?: string;
  direktorat_id?: string | null;
  divisi_id?: string | null;
  departemen_id?: string | null;
}
