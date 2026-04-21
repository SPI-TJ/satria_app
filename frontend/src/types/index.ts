export type UserRole =
  | 'admin_spi' | 'kepala_spi' | 'pengendali_teknis'
  | 'anggota_tim' | 'auditee' | 'it_admin';

// Module IDs that can be assigned to users
export type ModuleId = 'pkpt' | 'pelaksanaan' | 'pelaporan' | 'sintesis' | 'pemantauan' | 'ca-cm';

export interface User {
  id: string;
  nik: string;
  nama: string;
  email: string;
  kontak_email?: string;
  role: UserRole;
  jabatan?: string;
  direktorat_id?: string;
  divisi_id?: string;
  departemen_id?: string;
  module_access?: ModuleId[];
}

export type NotificationType = 'Risk' | 'Program' | 'System';
export interface Notification {
  id: string; title: string; message: string;
  type: NotificationType; is_read: boolean;
  entity_id?: string; entity_type?: string; created_at: string;
}

// ── Risk ─────────────────────────────────────────────────────
export type RiskLevel  = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';
export type RiskSource = 'TRUST' | 'Manual';

export interface RiskData {
  id: string;
  risk_code: string;
  tahun: number;
  divisi?: string;
  department_name: string;
  risk_description: string;
  risk_level: RiskLevel;
  status: RiskStatus;
  source: RiskSource;
  imported_by_nama?: string;
  created_at: string;
  updated_at?: string;
}

// ── Annual Audit Plans ────────────────────────────────────────
export type StatusPKPT      = 'Draft' | 'Final';
export type JenisProgram    = 'PKPT' | 'Non PKPT';
export type KategoriProgram = 'Assurance' | 'Non Assurance' | 'Pemantauan Risiko' | 'Evaluasi';
export type StatusProgram   = 'Mandatory' | 'Strategis' | 'Emerging Risk';

export interface AnnualAuditPlan {
  id: string;
  tahun: number;
  tahun_perencanaan: string;
  jenis_program: JenisProgram;
  kategori_program: KategoriProgram;
  judul_program: string;
  status_program: StatusProgram;
  status_pkpt: StatusPKPT;
  auditee?: string;
  estimasi_hari: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  deskripsi?: string;
  created_at: string;
  // SDM aggregates dari JOIN
  jumlah_personil: number;
  nama_auditor?: string;
  pengendali_teknis_nama?: string;
  pengendali_teknis_id?: string;
  ketua_nama?: string;
  ketua_id?: string;
  anggota_names?: string;
  // Risiko
  jumlah_risiko?: number;
}

export interface ProgramTeamMember {
  id: string;
  user_id: string;
  nama_lengkap: string;
  role: UserRole;
  jabatan?: string;
  role_tim: 'Penanggung Jawab' | 'Pengendali Teknis' | 'Ketua Tim' | 'Anggota Tim';
}

export interface AnnualAuditPlanDetail extends AnnualAuditPlan {
  team: ProgramTeamMember[];
  risks: RiskData[];
}

// ── Auditor (untuk penugasan tim) ────────────────────────────
export interface Auditor {
  id: string;
  nik: string;
  nama_lengkap: string;
  role: UserRole;
  jabatan?: string;
}
// Dimensi Organisasi
export interface Direktorat {
  id: string;
  nama: string;
}

export interface Divisi {
  id: string;
  nama: string;
  direktorat_id: string;
}

export interface Departemen {
  id: string;
  nama: string;
  divisi_id: string;
}

// ── Workload (Beban Kerja Auditor) ───────────────────────────
export interface WorkloadProgram {
  id: string;
  judul_program: string;
  jenis_program: JenisProgram;
  status_pkpt: StatusPKPT;
  role_tim: 'Penanggung Jawab' | 'Pengendali Teknis' | 'Ketua Tim' | 'Anggota Tim';
  estimasi_hari: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
}

export interface WorkloadAuditor {
  user_id: string;
  nik: string;
  nama_lengkap: string;
  role: UserRole;
  jabatan: string | null;
  total_program: number;
  total_hari: number;
  persen_beban: number;
  programs: WorkloadProgram[];
}

export interface WorkloadSummary {
  total_auditor: number;
  avg_beban_persen: number;
  overloaded: number;   // persen_beban > 80%
  idle: number;         // persen_beban === 0
  total_hari_all: number;
  ref_hari_kerja: number;
  tahun: number;
}

export interface WorkloadResponse {
  success: boolean;
  data: WorkloadAuditor[];
  summary: WorkloadSummary;
}

// ── Umum ─────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number; page: number; limit: number; totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean; message?: string; data?: T;
  meta?: PaginationMeta & { unread_count?: number };
}

export interface DashboardStats {
  pkpt_programs:         number;
  program_selesai:       number;
  program_belum_selesai: number;
  total_risks:           number;
  total_auditors:        number;
  tahun:                 number;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin_spi:          'Admin SPI',
  kepala_spi:         'Kepala SPI',
  pengendali_teknis:  'Pengendali Teknis',
  anggota_tim:        'Anggota Tim',
  auditee:            'Auditee',
  it_admin:           'IT Admin',
};
