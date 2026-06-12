import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PanelsProvider } from './contexts/PanelsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { MainDashboardLayout } from './layouts/MainDashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PanelDetail } from './pages/PanelDetail';
import { AdminSettings } from './pages/AdminSettings';
import { Profile } from './pages/Profile';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PanelsProvider>
          <Routes>
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Public Legal routes (Play Store requirement) */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/panel/:serial" element={<PanelDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'head_office', 'system_integrator']}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PanelsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
