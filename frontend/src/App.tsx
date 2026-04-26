import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { UserRole } from './types';
import Layout from './components/layout/Layout';

// ── Auth ──────────────────────────────────────────────────────
import Login from './pages/auth/Login';

// ── Core ──────────────────────────────────────────────────────
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';

// ── Admin ─────────────────────────────────────────────────────
import UserManagementPage from './pages/admin/UserManagementPage';
import ActivityLogPage from './pages/admin/ActivityLogPage';

// ── Modul 1: Perencanaan Pengawasan Tahunan ───────────────────
import PKPTPage from './pages/module1/PKPTPage';

// ── Modul 2: Pelaksanaan Audit & Kertas Kerja ─────────────────
import PelaksanaanPage from './pages/module2/PelaksanaanPage';

// ── Modul 3: Pelaporan & Komunikasi Hasil ────────────────────
import PelaporanPage from './pages/module3/PelaporanPage';

// ── Modul 4: Sintesis Hasil Pengawasan ───────────────────────
import SintesisPage from './pages/module4/SintesisPage';

// ── Modul 5: Pemantauan Tindak Lanjut Temuan ─────────────────
import PemantauanPage from './pages/module5/PemantauanPage';

// ── Modul 6: Dashboard CA-CM ──────────────────────────────────
import CACMPage from './pages/module6/CACMPage';

// ── Pengaturan Sistem (Master Data Modul 1) ──────────────────
import PengaturanSistemPage from './pages/settings/PengaturanSistemPage';

// ── Route Guards ──────────────────────────────────────────────

/** Redirect ke /login jika belum autentikasi */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Redirect ke / jika sudah login */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return !token ? <>{children}</> : <Navigate to="/" replace />;
}

/**
 * Guard berbasis role.
 * Jika role user tidak ada dalam `allowed`, tampilkan halaman 403.
 */
function RoleRoute({ children, allowed }: { children: React.ReactNode; allowed: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role as UserRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <span className="text-5xl">🔒</span>
        <p className="font-semibold text-slate-600 text-lg">Akses Ditolak</p>
        <p className="text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Protected — semua dalam Layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>

          {/* Dashboard — semua role yang sudah login */}
          <Route index element={<Dashboard />} />

          {/* Profil User */}
          <Route path="profile" element={<ProfilePage />} />

          {/* ── Admin ────────────────────────────────────────── */}
          <Route path="admin">
            <Route
              path="users"
              element={
                <RoleRoute allowed={['admin_spi', 'it_admin']}>
                  <UserManagementPage />
                </RoleRoute>
              }
            />
            <Route
              path="activity-log"
              element={
                <RoleRoute allowed={['admin_spi', 'it_admin', 'kepala_spi']}>
                  <ActivityLogPage />
                </RoleRoute>
              }
            />
          </Route>

          {/* ── Modul 1: Perencanaan Pengawasan Tahunan ──────── */}
          <Route path="perencanaan">
            <Route index element={<Navigate to="pkpt" replace />} />
            <Route
              path="pkpt"
              element={
                <RoleRoute allowed={['kepala_spi', 'pengendali_teknis', 'anggota_tim', 'admin_spi']}>
                  <PKPTPage />
                </RoleRoute>
              }
            />
            {/* Redirect lama → PKPT tab CEO Letter */}
            <Route path="ceo-letter" element={<Navigate to="/perencanaan/pkpt?tab=ceo-letter" replace />} />
          </Route>

          {/* ── Modul 2: Pelaksanaan Audit & Kertas Kerja ────── */}
          <Route
            path="pelaksanaan"
            element={
              <RoleRoute allowed={['kepala_spi', 'pengendali_teknis', 'anggota_tim', 'admin_spi']}>
                <PelaksanaanPage />
              </RoleRoute>
            }
          />

          {/* ── Modul 3: Pelaporan & Komunikasi Hasil ─────────── */}
          <Route
            path="pelaporan"
            element={
              <RoleRoute allowed={['kepala_spi', 'pengendali_teknis', 'anggota_tim', 'admin_spi']}>
                <PelaporanPage />
              </RoleRoute>
            }
          />

          {/* ── Modul 4: Sintesis Hasil Pengawasan ────────────── */}
          <Route
            path="sintesis"
            element={
              <RoleRoute allowed={['kepala_spi', 'pengendali_teknis', 'admin_spi']}>
                <SintesisPage />
              </RoleRoute>
            }
          />

          {/* ── Modul 5: Pemantauan Tindak Lanjut Temuan ─────── */}
          <Route
            path="pemantauan"
            element={
              <RoleRoute allowed={['kepala_spi', 'pengendali_teknis', 'anggota_tim', 'admin_spi']}>
                <PemantauanPage />
              </RoleRoute>
            }
          />

          {/* ── Modul 6: Dashboard CA-CM ──────────────────────── */}
          <Route
            path="ca-cm"
            element={
              <RoleRoute allowed={['kepala_spi', 'pengendali_teknis', 'anggota_tim', 'admin_spi']}>
                <CACMPage />
              </RoleRoute>
            }
          />

          {/* ── Pengaturan Sistem (Kepala SPI + Admin SPI) ───── */}
          <Route
            path="pengaturan"
            element={
              <RoleRoute allowed={['kepala_spi', 'admin_spi']}>
                <PengaturanSistemPage />
              </RoleRoute>
            }
          />

          {/* Legacy redirects (subpaths yang belum tersedia) */}
          <Route path="perencanaan/individual" element={<Navigate to="/perencanaan/pkpt" replace />} />
          <Route path="audit/*"        element={<Navigate to="/pelaksanaan" replace />} />
          <Route path="tindak-lanjut/*" element={<Navigate to="/pemantauan" replace />} />
          <Route path="kinerja/*"      element={<Navigate to="/" replace />} />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
