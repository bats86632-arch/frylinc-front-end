import { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePanels } from "../hooks/usePanels";
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
    name: "Admin Settings",
    mobileName: "Settings",
    href: "/admin",
    icon: Settings,
    roles: ["super_admin", "head_office", "system_integrator"],
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
        : location.pathname.startsWith("/panel")
          ? "Panel Details"
          : "Fire Alarm Panels";

  const mobilePageTitle =
    location.pathname === "/admin"
      ? "Settings"
      : location.pathname === "/profile"
        ? "Your Profile"
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
        .filter((panel) => panel && panel.alarm)
        .map((panel) => ({
          id: panel.serial,
          title: panel.name || "Unknown Panel",
          message: `Alarm active on ${panel.serial || "unknown"}`,
        })),
    [panels],
  );
  const notificationCount = notifications.length;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="theme-scope min-h-screen console-bg relative text-[var(--text-primary)]">
      {/* Ambient background glow for dashboard */}
      <div className="pointer-events-none fixed top-0 left-[260px] right-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_rgba(99,57,198,0.08)_0%,_transparent_70%)]" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-[var(--border-subtle)] bg-[#141412] transition-transform duration-300 ease-smooth lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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
              className="h-10 w-10 rounded-[10px] object-cover ring-1 ring-[var(--border-subtle)]"
            />
            <div>
              <span className="block font-display text-[1.05rem] font-medium leading-none tracking-tight text-[var(--text-primary)]">
                Fyrlinc
              </span>
              <span className="mt-1 block text-[11px] font-medium text-[var(--text-quaternary)] tracking-wide">
                by AGNi
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-default)] hover:text-[var(--text-primary)] lg:hidden"
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
                    ? "border-l-2 border-[#e53d3d] bg-[var(--surface-overlay)] text-[var(--text-primary)]"
                    : "border-l-2 border-transparent text-[var(--text-secondary)] opacity-40 hover:bg-[var(--surface-overlay)] hover:opacity-80"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span
                  className={
                    active
                      ? "text-[13px] font-semibold"
                      : "text-[12px] font-medium"
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
      <div className="lg:pl-[260px] relative z-10">
        {/* Header - Waitlister frosted glass style */}
        <header
          className={`sticky top-0 z-30 flex h-[72px] items-center justify-between border-b bg-[var(--surface-base)]/80 px-4 backdrop-blur-xl transition-colors duration-300 sm:px-6 lg:px-8 ${
            notificationCount > 0
              ? "border-[rgba(229,61,61,0.20)]"
              : "border-[var(--border-subtle)]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] lg:hidden inset-highlight"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="font-display truncate text-[1.1rem] font-bold tracking-tight text-[var(--text-primary)]">
                <span className="sm:hidden">{mobilePageTitle}</span>
                <span className="hidden sm:inline">{pageTitle}</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#4ade80]">
                <span className="relative flex h-[6px] w-[6px]">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
                  <span className="relative h-full w-full rounded-full bg-[#4ade80]" />
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
                onClick={() => setNotificationOpen((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] inset-highlight shadow-sm"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span
                  className={`absolute -right-1.5 -top-1.5 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-[2.5px] border-[#080810] bg-[#e8173a] px-1 text-[9px] font-bold text-[var(--text-primary)] shadow-sm ${
                    notificationCount > 0 ? "animate-pulse" : ""
                  }`}
                >
                  {notificationCount}
                </span>
              </button>

              {notificationOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationOpen(false)}
                  />
                  <div className="surface-panel fixed top-[72px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 z-50 mt-3 sm:w-80 rounded-[16px] p-4 animate-scale-in origin-top sm:origin-top-right">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5 mb-3">
                      <div>
                        <p className="text-[15px] font-bold text-[var(--text-primary)]">
                          Notifications
                        </p>
                        <p className="mt-0.5 text-[12px] font-medium text-[var(--text-quaternary)]">
                          Live panel alerts
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[var(--text-secondary)] inset-highlight">
                        {notificationCount}
                      </span>
                    </div>

                    {notificationCount === 0 ? (
                      <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-6 text-center inset-highlight">
                        <Bell className="mx-auto mb-3 h-8 w-8 text-[var(--text-quaternary)]" />
                        <p className="text-[14px] font-bold text-[var(--text-primary)]">
                          All clear
                        </p>
                        <p className="mt-1.5 text-[13px] font-medium text-[var(--text-quaternary)]">
                          You'll see active alarms here when panels report them.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="animate-pulse rounded-[12px] border border-[rgba(232,23,58,0.25)] bg-gradient-to-br from-[rgba(232,23,58,0.12)] to-[rgba(232,23,58,0.05)] p-4 inset-highlight"
                          >
                            <p className="text-[14px] font-bold text-[var(--text-primary)]">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-[13px] font-medium text-[var(--text-tertiary)]">
                              {notification.message}
                            </p>
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
                className="flex items-center gap-2.5 rounded-pill border border-[var(--border-default)] bg-[var(--surface-raised)] py-1.5 pl-1.5 pr-4 text-[var(--text-primary)]/80 transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] inset-highlight shadow-sm"
              >
                {displayPhotoURL ? (
                  <img
                    src={displayPhotoURL}
                    alt={userData?.displayName || "User avatar"}
                    className="h-8 w-8 rounded-full object-cover shadow-sm ring-1 ring-[var(--border-subtle)]"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-[13px] font-bold text-[var(--text-primary)] shadow-sm inset-highlight">
                    {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[130px] truncate text-[13px] font-bold text-[var(--text-primary)] leading-tight drop-shadow-sm">
                    {userData?.displayName}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-quaternary)] leading-tight mt-0.5">
                    {roleLabel}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-[var(--text-quaternary)] ml-0.5" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="surface-panel fixed top-[72px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 z-50 mt-3 sm:w-64 rounded-[16px] p-2 animate-scale-in origin-top sm:origin-top-right">
                    <div className="border-b border-[var(--border-subtle)] p-4 mb-1">
                      <div className="flex items-center gap-3">
                        {displayPhotoURL ? (
                          <img
                            src={displayPhotoURL}
                            alt="User"
                            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-[var(--border-subtle)]"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-[15px] font-bold text-[var(--text-primary)] shadow-sm inset-highlight">
                            {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-[var(--text-primary)] drop-shadow-sm">
                            {userData?.displayName}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--text-tertiary)]">
                            {userData?.email}
                          </p>
                        </div>
                      </div>
                      <span className="mt-4 inline-flex rounded-full border border-[var(--border-default)] bg-[var(--surface-hover)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] inset-highlight shadow-sm">
                        {roleLabel}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)]/80 transition-all duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                    >
                      <UserIcon className="h-[18px] w-[18px]" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-4 py-3 text-[14px] font-bold text-[#ff8099] transition-all duration-150 hover:bg-[rgba(232,23,58,0.10)]"
                    >
                      <LogOut className="h-[18px] w-[18px]" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)] px-4 py-8 sm:px-6 lg:px-8">
          {!isOnline && (
            <div className="mb-6 rounded-[12px] border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.05)] p-4 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(245,158,11,0.2)] text-[#f59e0b]">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#f59e0b]">
                  You are currently offline
                </p>
                <p className="text-[13px] text-[#f59e0b]/80">
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
