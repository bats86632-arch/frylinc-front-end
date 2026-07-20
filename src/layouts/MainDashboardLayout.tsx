import { formatPanelName } from '../utils/formatters';
import { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  FileText,
  Flame,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Settings,
  User as UserIcon,
  X,
  Activity,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePanels } from "../hooks/usePanels";
import { PanelService } from "../api/PanelService";
import { ThemeToggle } from "../components/ThemeToggle";
import { Role } from "../types";

const navigation: Array<{
  name: string;
  mobileName?: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}> = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["super_admin", "head_office", "system_integrator", "end_user"],
  },
  {
    name: "Settings",
    href: "/admin",
    icon: Settings,
    roles: ["super_admin", "head_office", "system_integrator"],
  },
  {
    name: "Graphical Monitoring System (GMS)",
    mobileName: "GMS",
    href: "/map-zones",
    icon: Map,
    roles: ["super_admin", "secret_super_admin", "head_office", "system_integrator", "end_user"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    roles: ["super_admin", "head_office", "system_integrator"],
  },
  {
    name: "Health Monitoring System",
    mobileName: "Health",
    href: "/health",
    icon: Activity,
    roles: ["super_admin", "head_office", "system_integrator", "end_user"],
  },
];

export function MainDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { userData, currentUser, logout, hasRole } = useAuth();
  const { panels } = usePanels();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const displayPhotoURL = userData?.photoURL || currentUser?.photoURL;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return (
        location.pathname === "/" || location.pathname.startsWith("/panel")
      );
    }
    return location.pathname === path;
  };

  const pageTitle =
    location.pathname === "/admin"
      ? "Admin Settings"
      : location.pathname === "/profile"
        ? "Your Profile"
        : location.pathname === "/map-zones"
          ? "Graphical Monitoring System (GMS)"
          : location.pathname === "/reports"
            ? "Reports"
            : location.pathname === "/health"
              ? "Health Monitoring System"
              : location.pathname.startsWith("/panel")
                ? "Panel Details"
                : "Fire Alarm Panels";

  const mobilePageTitle =
    location.pathname === "/admin"
      ? "Settings"
      : location.pathname === "/profile"
        ? "Your Profile"
        : location.pathname === "/map-zones"
          ? "GMS"
          : location.pathname === "/reports"
            ? "Reports"
            : location.pathname === "/health"
              ? "Health Monitor"
              : location.pathname.startsWith("/panel")
                ? "Panel Details"
                : "Dashboard";

  const roleLabel =
    userData?.role
      ?.split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "End User";

  const filteredNav = navigation.filter((item) => hasRole(item.roles));
  const notifications = useMemo(
    () =>
      (panels || [])
        .filter((panel) => panel && panel.alarm && !panel.clearedBy?.[userData?.uid || ""])
        .map((panel) => ({
          id: panel.serial,
          title: formatPanelName(panel.name || "Unknown Panel", panel.panelType),
          message: `Alarm active on ${panel.serial || "unknown"}`,
          seen: !!panel.seenBy?.[userData?.uid || ""]
        })),
    [panels, userData?.uid],
  );
  const unseenCount = notifications.filter(n => !n.seen).length;

  const toggleNotifications = () => {
    if (!notificationOpen) {
      const unseenPanels = notifications.filter(n => !n.seen);
      unseenPanels.forEach(p => {
        PanelService.markNotificationSeen(p.id).catch(console.error);
      });
    }
    setNotificationOpen(!notificationOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="theme-scope min-h-screen bg-[var(--surface-base)] relative text-[var(--text-primary)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-overlay)] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        {/* Logo */}
        <div className="flex h-[72px] items-center justify-between border-b border-[var(--border-subtle)] px-5">
          <Link
            to="/"
            className="flex items-center gap-3.5"
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src="/fyrlinc-logo.png"
              alt="Fyrlinc"
              className="h-10 w-10 rounded-[8px] object-cover border border-[var(--border-subtle)]"
            />
            <div>
              <span className="block font-sans text-[1.05rem] font-semibold leading-none tracking-tight text-[var(--text-primary)]">
                Fyrlinc
              </span>
              <span className="mt-1 block text-[11px] font-medium text-[var(--text-quaternary)] tracking-wide">
                by AGNi
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-default)] hover:text-[var(--text-primary)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1.5 py-5">
          {filteredNav.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 px-5 py-2.5 transition-all duration-150 ${
                  active
                    ? "border-l-2 border-[var(--accent)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
                    : "border-l-2 border-transparent text-[var(--text-secondary)] opacity-80 hover:bg-[var(--surface-hover)] hover:opacity-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span
                  className={
                    active
                      ? "text-[13px] font-semibold"
                      : "text-[13px] font-medium"
                  }
                >
                  <span className="lg:hidden">
                    {item.mobileName ?? item.name}
                  </span>
                  <span className="hidden lg:inline">{item.name}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div 
        className="lg:pl-[260px] relative z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header - Solid background with border */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 transition-colors duration-300 sm:px-6 lg:px-8"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            minHeight: 'calc(72px + env(safe-area-inset-top))'
          }}
        >
          <div className="flex min-w-0 items-center gap-4 h-[72px]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="font-sans truncate text-[1.1rem] font-semibold tracking-tight text-[var(--text-primary)]">
                <span className="sm:hidden">{mobilePageTitle}</span>
                <span className="hidden sm:inline">{pageTitle}</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)] border border-[var(--status-success-border)]">
                <span className="relative flex h-[6px] w-[6px]">
                  <span className="relative h-full w-full rounded-full bg-[var(--color-success)]" />
                </span>
                Live telemetry
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="relative flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] shadow-sm"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unseenCount > 0 && (
                  <span
                    className={`absolute -right-1.5 -top-1.5 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-[2px] border-[var(--surface-base)] bg-[var(--color-error)] px-1 text-[9px] font-bold text-white shadow-sm`}
                  >
                    {unseenCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationOpen(false)}
                  />
                  <div className="surface-panel fixed top-[72px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 z-50 mt-3 sm:w-80 rounded-[8px] p-4 animate-scale-in origin-top sm:origin-top-right">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5 mb-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                          Notifications
                        </p>
                        <p className="mt-0.5 text-[12px] font-medium text-[var(--text-secondary)]">
                          Live panel alerts
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-overlay)] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[var(--text-secondary)]">
                        {notifications.length}
                      </span>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-6 text-center">
                        <Bell className="mx-auto mb-3 h-8 w-8 text-[var(--text-quaternary)]" />
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                          All clear
                        </p>
                        <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
                          You'll see active alarms here when panels report them.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="rounded-[6px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                                  {notification.message}
                                </p>
                              </div>
                              <button
                                onClick={() => PanelService.clearNotification(notification.id).catch(console.error)}
                                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
                                aria-label="Clear notification"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] py-1.5 pl-1.5 pr-3 text-[var(--text-primary)] transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] shadow-sm"
              >
                {displayPhotoURL ? (
                  <img
                    src={displayPhotoURL}
                    alt={userData?.displayName || "User avatar"}
                    className="h-7 w-7 rounded-[4px] object-cover ring-1 ring-[var(--border-subtle)]"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[var(--accent)] text-[12px] font-semibold text-white shadow-sm">
                    {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[130px] truncate text-[12px] font-semibold text-[var(--text-primary)] leading-tight">
                    {userData?.displayName}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)] leading-tight mt-0.5">
                    {roleLabel}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-[var(--text-tertiary)] ml-0.5" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="surface-panel fixed top-[72px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 z-50 mt-3 sm:w-64 rounded-[8px] p-2 animate-scale-in origin-top sm:origin-top-right">
                    <div className="border-b border-[var(--border-subtle)] p-4 mb-1">
                      <div className="flex items-center gap-3">
                        {displayPhotoURL ? (
                          <img
                            src={displayPhotoURL}
                            alt="User"
                            className="h-10 w-10 shrink-0 rounded-[6px] object-cover ring-1 ring-[var(--border-subtle)]"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[var(--accent)] text-[15px] font-semibold text-white shadow-sm">
                            {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
                            {userData?.displayName}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                            {userData?.email}
                          </p>
                        </div>
                      </div>
                      <span className="mt-4 inline-flex rounded-full border border-[var(--border-default)] bg-[var(--surface-hover)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] shadow-sm">
                        {roleLabel}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-[13px] font-medium text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--surface-overlay)]"
                    >
                      <UserIcon className="h-[16px] w-[16px] text-[var(--text-secondary)]" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-[13px] font-medium text-[var(--color-error)] transition-all duration-150 hover:bg-[var(--status-danger-bg)] mt-1"
                    >
                      <LogOut className="h-[16px] w-[16px]" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)] px-4 py-8 sm:px-6 lg:px-8 bg-[var(--surface-base)]">
          {!isOnline && (
            <div className="mb-6 rounded-[8px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-warning-bg)] text-[var(--color-warning)]">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-warning)]">
                  You are currently offline
                </p>
                <p className="text-[12px] text-[var(--status-warning-text)]">
                  Data will sync automatically when your connection is restored.
                </p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
