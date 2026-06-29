import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { PanelsProvider } from "./contexts/PanelsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthLayout } from "./layouts/AuthLayout";
import { MainDashboardLayout } from "./layouts/MainDashboardLayout";
import { PageLoader } from "./components/PageLoader";
import { ThemeProvider } from "./contexts/ThemeContext";

const Login = lazy(() =>
  import("./pages/Login").then((m) => ({ default: m.Login })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const PanelDetail = lazy(() =>
  import("./pages/PanelDetail").then((m) => ({ default: m.PanelDetail })),
);
const AdminSettings = lazy(() =>
  import("./pages/AdminSettings").then((m) => ({ default: m.AdminSettings })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile })),
);
const PrivacyPolicy = lazy(() =>
  import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })),
);
const TermsOfService = lazy(() =>
  import("./pages/TermsOfService").then((m) => ({ default: m.TermsOfService })),
);
const MapZones = lazy(() =>
  import("./pages/MapZones").then((m) => ({ default: m.MapZones })),
);

function App() {
  // Fire-and-forget prefetch for the most likely route chunks.
  // These dynamic imports prime the browser's module cache so when the router
  // resolves after auth, the chunks are either already cached or mid-download.
  // On repeat visits the service worker serves them instantly anyway.
  useEffect(() => {
    void import("./pages/Dashboard");
    void import("./pages/Login");
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PanelsProvider>
            <Suspense fallback={<PageLoader />}>
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
                  <Route path="/map-zones" element={<MapZones />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          "super_admin",
                          "head_office",
                          "system_integrator",
                        ]}
                      >
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </PanelsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
