import axios from 'axios';
import {
  ApiResponse, AnnualAuditPlan, AnnualAuditPlanDetail,
  Auditor, DashboardStats, Notification, RiskData, WorkloadResponse,
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
      localStorage.removeItem('satria_token');
      localStorage.removeItem('satria_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login:          (email: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: unknown }>>('/auth/login', { email, password }),
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
    api.get<ApiResponse<RiskData[]>>('/risks', { params }),
  getById: (id: string) =>
    api.get<ApiResponse<RiskData>>(`/risks/${id}`),
  create: (data: {
    risk_code: string; divisi?: string; department_name: string;
    risk_description: string; risk_level: string; status?: string; tahun: number;
  }) => api.post<ApiResponse<{ id: string }>>('/risks', data),
  update: (id: string, data: Partial<{
    risk_code: string; divisi: string; department_name: string;
    risk_description: string; risk_level: string; status: string;
  }>) => api.patch<ApiResponse<null>>(`/risks/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/risks/${id}`),
  importFromTrust: (tahun: number, connection_id?: string) =>
    api.post<ApiResponse<{ imported: number }>>('/risks/import/trust', { tahun, connection_id }),
  importFromFile: (file: File, tahun: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('tahun', String(tahun));
    return api.post<ApiResponse<{ imported: number; errors: string[] }>>('/risks/import/file', form);
  },
  getTrustStatus: () => api.get('/risks/trust/status'),
  getDivisiList:  (tahun?: number) =>
    api.get<ApiResponse<string[]>>('/risks/divisi-list', { params: { tahun } }),
};

// ── Annual Plans (Modul 1) ────────────────────────────────────
export interface CreatePlanPayload {
  jenis_program: string;
  kategori_program?: string;
  judul_program: string;
  status_program?: string;
  auditee?: string;
  deskripsi?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  pengendali_teknis_id?: string;
  ketua_tim_id?: string;
  anggota_ids?: string[];
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
};

// ── Auditors ─────────────────────────────────────────────────
export const auditorsApi = {
  getAll: () => api.get<ApiResponse<Auditor[]>>('/auditors'),
};

// ── Workload (Beban Kerja Auditor) ────────────────────────────
export const workloadApi = {
  get: (tahun: number, hari_kerja?: number) =>
    api.get<WorkloadResponse>('/workload', {
      params: { tahun, ...(hari_kerja ? { hari_kerja } : {}) },
    }),
};

// ── Organisasi (Direktorat / Divisi / Departemen) ─────────────
export const organisasiApi = {
  getDirektorats: () =>
    api.get<ApiResponse<{ id: string; kode: string; nama: string }[]>>('/direktorat', { params: { limit: 100 } }),
  getDivisis: (direktorat_id?: string) =>
    api.get<ApiResponse<{ id: string; kode: string; nama: string; direktorat_id: string }[]>>(
      '/divisi', { params: { limit: 100, ...(direktorat_id ? { direktorat_id } : {}) } },
    ),
  getDepartemens: (divisi_id?: string) =>
    api.get<ApiResponse<{ id: string; kode: string; nama: string; divisi_id: string }[]>>(
      '/departemen', { params: { limit: 100, ...(divisi_id ? { divisi_id } : {}) } },
    ),
};

// ── User Stats ────────────────────────────────────────────────
export const userStatsApi = {
  get: () => api.get<ApiResponse<{ total: number; aktif: number; non_aktif: number }>>('/users/stats'),
};

// ── Jabatan (jabatan struktural — static list) ─────────────────
export const JABATAN_OPTIONS = [
  'Kepala Divisi',
  'Kepala Departemen',
  'Senior Spesialis',
  'Kepala Seksi',
  'Analis',
  'Staf',
] as const;

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
  kontak_email?: string;
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
  kontak_email?: string;
  role: string;
  jabatan?: string;
  direktorat_id?: string | null;
  divisi_id?: string | null;
  departemen_id?: string | null;
}
