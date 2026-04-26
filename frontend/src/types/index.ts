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
  role: UserRole;
  jabatan?: string;
  direktorat_id?: string;
  divisi_id?: string;
  departemen_id?: string;
  module_access?: ModuleId[];
}

export type NotificationType = 'Risk' | 'Program' | 'System' | 'Evaluation';
export interface Notification {
  id: string; title: string; message: string;
  type: NotificationType; is_read: boolean;
  entity_id?: string; entity_type?: string;
  link_url?: string | null;
  created_at: string;
}

// ── Risk (RCSA structure) ────────────────────────────────────
export type RiskLevelKode = 'E' | 'T' | 'MT' | 'M' | 'RM' | 'R';
export type RiskSource    = 'TRUST' | 'Manual' | 'Import';

export interface RiskData {
  id: string;
  id_risiko: string;       // e.g. RR-KTP-2025-002
  tahun: number;

  // Org (resolved from FK or text fallback)
  direktorat: string;
  divisi: string;
  departemen: string;
  direktorat_id?: string;
  divisi_id?: string;
  departemen_id?: string;

  // Sasaran
  sasaran_korporat?: string;
  sasaran_korporat_id?: string;
  sasaran_bidang?: string;

  // House of Strategy
  hos_kategori_id?: string;
  hos_kategori_kode?: string;
  hos_kategori_nama?: string;          // nama_perspektif
  sasaran_strategis_id?: string;
  sasaran_strategis_kode?: string;
  sasaran_strategis_nama?: string;

  // Identitas risiko
  nama_risiko: string;
  parameter_kemungkinan?: string;

  // Inherent
  tingkat_risiko_inherent?: string;  // "54 (E)"
  skor_inherent?: number;
  level_inherent?: RiskLevelKode;
  label_inherent?: string;
  warna_inherent?: string;
  bg_inherent?: string;
  text_inherent?: string;

  // Target
  tingkat_risiko_target?: string;
  skor_target?: number;
  level_target?: RiskLevelKode;
  label_target?: string;
  warna_target?: string;
  bg_target?: string;
  text_target?: string;

  // Mitigasi
  pelaksanaan_mitigasi?: string;

  // Realisasi
  realisasi_tingkat_risiko?: string;
  skor_realisasi?: number;
  level_realisasi?: RiskLevelKode;
  label_realisasi?: string;
  warna_realisasi?: string;
  bg_realisasi?: string;
  text_realisasi?: string;

  // Penyebab
  penyebab_internal?: string;
  penyebab_eksternal?: string;

  source: RiskSource;
  imported_by_id?: string;
  imported_by_nama?: string;
  created_at: string;
  updated_at?: string;
}

// ── Risk Level Reference ─────────────────────────────────────
export interface RiskLevelRef {
  kode: RiskLevelKode;
  label: string;
  warna_hex: string;
  warna_bg: string;
  warna_text: string;
  skor_min: number;
  skor_max: number;
  urutan: number;
}

// ── Annual Audit Plans ────────────────────────────────────────
export type StatusPKPT      = 'Open' | 'On Progress' | 'Closed';
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
  completed_at?: string | null;
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
  // Finansial & tipe penugasan (Fase 5)
  tipe_penugasan_id?: string | null;
  tipe_penugasan_kode?: string | null;
  tipe_penugasan_nama?: string | null;
  anggaran?: number | null;
  realisasi_anggaran?: number | null;
  kategori_anggaran?: 'Subsidi' | 'Non Subsidi' | null;
  man_days_estimasi?: number | null;
  man_days_terpakai?: number | null;
  persen_pagu_terpakai?: number | null;
}

export interface ProgramTeamMember {
  id: string;
  user_id: string;
  nama_lengkap: string;
  role: UserRole;
  jabatan?: string;
  role_tim: 'Penanggung Jawab' | 'Pengendali Teknis' | 'Ketua Tim' | 'Anggota Tim';
  hari_alokasi?: number | null;     // hari kerja aktual untuk anggota ini (null = pakai estimasi_hari)
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

// ── Dimensi Organisasi (Dropdown) ───────────────────────────
export interface Direktorat {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active: boolean;
}

export interface Divisi {
  id: string;
  direktorat_id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active: boolean;
}

export interface Departemen {
  id: string;
  divisi_id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active: boolean;
}

export interface SasaranKorporat {
  id: string;
  kode: string;
  nama: string;
  is_active: boolean;
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

// ── Workload (Beban Kerja Auditor — monthly heatmap) ─────────
export interface WorkloadProgram {
  id: string;
  judul_program: string;
  jenis_program: JenisProgram;
  status_pkpt: StatusPKPT;
  role_tim: 'Penanggung Jawab' | 'Pengendali Teknis' | 'Ketua Tim' | 'Anggota Tim';
  tanggal_mulai: string;
  tanggal_selesai: string;
  bobot: number;
}

export interface WorkloadAuditor {
  user_id: string;
  nik: string;
  nama_lengkap: string;
  role: UserRole;
  jabatan: string | null;
  monthly_load: Record<string, number>; // "1" .. "12" → load value
  avg_load: number;
  max_load: number;
  overwork_months: number;
  programs: WorkloadProgram[];
}

export interface WorkloadSummary {
  total_auditor: number;
  avg_load: number;
  overwork: number;   // auditor dengan max_load > 1.0
  idle: number;       // auditor tanpa penugasan
  tahun: number;
}

export interface WorkloadResponse {
  success: boolean;
  data: WorkloadAuditor[];
  summary: WorkloadSummary;
}

// ── Penilaian Auditor ────────────────────────────────────────
export interface PendingEvaluatee {
  user_id: string;
  nama_lengkap: string;
  role_tim: 'Ketua Tim' | 'Anggota Tim';
  already_evaluated: boolean;
  blocked: boolean; // Kepala SPI harus nunggu PT selesai
}
export interface PendingEvaluationPlan {
  plan_id: string;
  judul_program: string;
  completed_at: string;
  evaluatees: PendingEvaluatee[];
}
export interface EvaluationSummaryRow {
  user_id: string;
  nik: string;
  nama_lengkap: string;
  role: UserRole;
  jabatan: string | null;
  total_program: number;
  avg_kompetensi: number;
  avg_komunikasi: number;
  avg_hasil_kerja: number;
  avg_overall: number;
  improvement_areas: string[];
}
export interface EvaluationDetailRow {
  plan_id: string;
  judul_program: string;
  completed_at: string;
  stage: 'pengendali_teknis' | 'kepala_spi';
  role_tim_evaluatee: string;
  kompetensi_teknis: number;
  komunikasi: number;
  hasil_kerja: number;
  catatan: string | null;
  evaluator_nama: string;
  evaluator_role: UserRole;
  created_at: string;
}
export interface SubmitEvaluationPayload {
  annual_plan_id: string;
  evaluatee_id: string;
  role_tim_evaluatee: 'Ketua Tim' | 'Anggota Tim';
  kompetensi_teknis: number;
  komunikasi: number;
  hasil_kerja: number;
  catatan?: string;
}

// Simulasi overwork saat assign ke program baru
export interface SimulateWorkloadRow {
  user_id: string;
  current: Record<string, number>;
  after: Record<string, number>;
  overwork_months: number[];
  is_overwork: boolean;
}
export interface SimulateWorkloadResponse {
  success: boolean;
  data: SimulateWorkloadRow[];
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
