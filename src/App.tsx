import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import { MainDashboardLayout } from './layouts/MainDashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PanelDetail } from './pages/PanelDetail';
import { AdminSettings } from './pages/AdminSettings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
