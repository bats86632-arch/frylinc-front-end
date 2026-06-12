import { useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePanels } from "../hooks/usePanels";
import { Role } from "../types";

const navigation: Array<{
  name: string;
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
    href: "/admin",
    icon: Settings,
    roles: ["super_admin", "head_office", "system_integrator"],
  },
  {
    name: "Profile",
    href: "/profile",
    icon: UserIcon,
    roles: ["super_admin", "head_office", "system_integrator", "end_user"],
  },
];

export function MainDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { userData, logout, hasRole } = useAuth();
  const { panels } = usePanels();
  const location = useLocation();
  const navigate = useNavigate();

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

  const roleLabel =
    userData?.role
      ?.split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "End User";

  const filteredNav = navigation.filter((item) => hasRole(item.roles));
  const notifications = useMemo(
    () =>
      panels
        .filter((panel) => panel.alarm)
        .map((panel) => ({
          id: panel.serial,
          title: panel.name,
          message: `Alarm active on ${panel.serial}`,
        })),
    [panels],
  );
  const notificationCount = notifications.length;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen console-bg text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-white/[0.08] bg-[#0a0a0a] transition-transform duration-300 ease-smooth lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[68px] items-center justify-between border-b border-white/[0.08] px-5">
          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-md ring-1 ring-white/10">
              <Flame className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="block font-display text-[1rem] font-bold leading-none tracking-tight text-white">
                Fyrlinc
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-white/30 tracking-wide">
                Command Console
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-white/[0.08] text-white/50 transition-all duration-150 hover:border-white/[0.15] hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNav.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-[7px] border transition-all duration-150 ${
                    active
                      ? "border-[rgba(232,23,58,0.30)] bg-[rgba(232,23,58,0.12)] text-[#e8173a]"
                      : "border-white/[0.08] bg-white/[0.03] text-white/40 group-hover:border-white/[0.12] group-hover:text-white/70"
                  }`}
                >
                  <item.icon className="h-[16px] w-[16px]" />
                </span>
                <span>{item.name}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e8173a]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-white/[0.08] px-3 py-4">
          <div className="flex items-center gap-3 rounded-[9px] px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-xs font-bold text-white shadow-sm">
              {userData?.displayName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/90">{userData?.displayName}</p>
              <p className="truncate text-[11px] text-white/35">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="lg:pl-[260px]">
        {/* Header */}
        <header
          className={`sticky top-0 z-30 flex h-[68px] items-center justify-between border-b bg-[#0a0a0a]/95 px-4 backdrop-blur-xl transition-colors duration-300 sm:px-6 lg:px-8 ${
            notificationCount > 0 ? "border-[rgba(232,23,58,0.18)]" : "border-white/[0.08]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/[0.10] text-white/60 transition-all duration-150 hover:border-white/[0.18] hover:text-white lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>

            <div className="min-w-0">
              <p className="font-display truncate text-[1rem] font-bold tracking-tight text-white sm:text-[1.05rem]">
                {pageTitle}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-white/35">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span>Live monitoring</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/[0.10] text-white/60 transition-all duration-150 hover:border-white/[0.18] hover:text-white"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
              >
                <Bell className="h-[17px] w-[17px]" />
                <span
                  className={`absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-[#e8173a] px-1 text-[9px] font-bold text-white ${
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
                  <div className="surface-panel absolute right-0 z-50 mt-2 w-80 rounded-[12px] p-3.5 shadow-elevation-3 animate-scale-in">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Notifications</p>
                        <p className="mt-0.5 text-[11px] font-medium text-white/35">
                          Live panel alerts
                        </p>
                      </div>
                      <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/60">
                        {notificationCount}
                      </span>
                    </div>

                    {notificationCount === 0 ? (
                      <div className="mt-3 rounded-[9px] border border-white/[0.07] bg-white/[0.02] p-5 text-center">
                        <Bell className="mx-auto mb-3 h-7 w-7 text-white/25" />
                        <p className="text-sm font-semibold text-white">All clear</p>
                        <p className="mt-1 text-[12px] text-white/35">
                          You'll see active alarms here when panels report them.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-3">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="animate-pulse rounded-[9px] border border-[rgba(232,23,58,0.22)] bg-[rgba(232,23,58,0.08)] p-3.5"
                          >
                            <p className="text-sm font-semibold text-white">{notification.title}</p>
                            <p className="mt-1 text-[12px] text-white/50">{notification.message}</p>
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
                className="flex items-center gap-2 rounded-[9px] border border-white/[0.10] bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-white/80 transition-all duration-150 hover:border-white/[0.18] hover:bg-white/[0.05]"
              >
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-xs font-bold text-white shadow-sm">
                  {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[130px] truncate text-sm font-semibold text-white leading-tight">
                    {userData?.displayName}
                  </p>
                  <p className="text-[11px] capitalize text-white/35">{roleLabel}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-white/30" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="surface-panel absolute right-0 z-50 mt-2 w-60 rounded-[12px] p-2 shadow-elevation-3 animate-scale-in">
                    <div className="border-b border-white/[0.08] p-3.5">
                      <p className="truncate text-sm font-semibold text-white">
                        {userData?.displayName}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-white/35">
                        {userData?.email}
                      </p>
                      <span className="mt-3 inline-flex rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold capitalize text-white/60">
                        {roleLabel}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="mt-1.5 flex w-full items-center gap-2 rounded-[8px] px-3.5 py-2.5 text-sm font-medium text-[#ff8099] transition-all duration-150 hover:bg-[rgba(232,23,58,0.08)]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-68px)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
