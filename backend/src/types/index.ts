// ============================================================
//  SATRIA — Shared TypeScript Types (Backend)
// ============================================================

export type UserRole =
  | 'admin_spi'
  | 'kepala_spi'
  | 'pengendali_teknis'
  | 'anggota_tim'
  | 'auditee'
  | 'it_admin';

// Module IDs that can be assigned to users
export type ModuleId = 'pkpt' | 'pelaksanaan' | 'pelaporan' | 'sintesis' | 'pemantauan' | 'ca-cm';

export interface JwtPayload {
  id:           string;
  nik:          string;
  nama:         string;
  email:        string;
  kontak_email?: string;
  role:         UserRole;
  module_access: ModuleId[];
  direktorat_id?: string;
  divisi_id?: string;
  departemen_id?: string;
  iat?:         number;
  exp?:         number;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?:    T;
  meta?:    PaginationMeta;
}

export interface PaginationMeta {
  total:    number;
  page:     number;
  limit:    number;
  totalPages: number;
}

export interface PaginationQuery {
  page?:  string;
  limit?: string;
}

// ── Risk Data ────────────────────────────────────────────────
export type RiskLevel  = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';
export type RiskSource = 'TRUST' | 'Manual';

export interface RiskData {
  id:               string;
  risk_code:        string;
  department_id?:   string;
  department_name:  string;
  risk_description: string;
  risk_level:       RiskLevel;
  status:           RiskStatus;
  source:           RiskSource;
  tahun:            number;
  imported_by:      string;
  created_at:       string;
}

// ── Notifications ────────────────────────────────────────────
export type NotificationType = 'Risk' | 'Program' | 'System';

export interface Notification {
  id:           string;
  user_id:      string;
  title:        string;
  message:      string;
  type:         NotificationType;
  is_read:      boolean;
  entity_id?:   string;
  entity_type?: string;
  created_at:   string;
}

// ── Annual Audit Plans ───────────────────────────────────────
export type StatusPKPT     = 'Draft' | 'Final';
export type JenisProgram   = 'PKPT' | 'Non PKPT';
export type KategoriProgram = 'Assurance' | 'Non Assurance' | 'Pemantauan Risiko' | 'Evaluasi';
export type StatusProgram  = 'Mandatory' | 'Strategis' | 'Emerging Risk';

export interface AnnualAuditPlan {
  id:                string;
  tahun_perencanaan: string;
  jenis_program:     JenisProgram;
  kategori_program:  KategoriProgram;
  judul_program:     string;
  status_program:    StatusProgram;
  koordinator_id:    string;
  nama_tim?:         string;
  estimasi_hari:     number;
  tanggal_mulai:     string;
  tanggal_selesai:   string;
  deskripsi:         string;
  status_pkpt:       StatusPKPT;
  created_by:        string;
  created_at:        string;
  updated_at:        string;
}

// User type (backend)
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

// Express augmentation
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
