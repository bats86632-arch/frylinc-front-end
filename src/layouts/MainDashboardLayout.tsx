import { useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  Flame, 
  X, 
  LayoutDashboard, 
  Settings, 
  ShieldCheck, 
  Menu, 
  Bell, 
  BellOff, 
  AlertTriangle, 
  LogOut, 
  User 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePanels } from '../hooks/usePanels';
import { Role } from '../types';

/* ------------------------------------------------------------------ */
/*  Navigation config                                                  */
/* ------------------------------------------------------------------ */
const navigation: Array<{
  name: string;
  href: string;
  icon: any;          // Lucide component
  roles: Role[];
}> = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['super_admin', 'head_office', 'system_integrator', 'end_user'],
  },
  {
    name: 'Admin Settings',
    href: '/admin',
    icon: Settings,
    roles: ['super_admin', 'head_office', 'system_integrator'],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function MainDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  const { userData, logout, hasRole, saveDisplayName } = useAuth();
  const { panels } = usePanels();
  const location = useLocation();
  const navigate = useNavigate();

  /* ---- derived state ---- */
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/panel');
    }
    return location.pathname === path;
  };

  const pageTitle =
    location.pathname === '/admin'
      ? 'Admin Settings'
      : location.pathname.startsWith('/panel')
        ? 'Panel Details'
        : 'Fire Alarm Panels';

  const roleLabel = userData?.role?.replace(/_/g, ' ') || 'Operator';
  const needsDisplayName =
    !userData?.displayName || userData.displayName === 'User';
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

  /* ---- handlers ---- */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveDisplayName = async () => {
    const nextValue = displayNameDraft.trim();
    if (!nextValue) return;
    setSavingDisplayName(true);
    try {
      await saveDisplayName(nextValue);
      setDisplayNameDraft('');
    } finally {
      setSavingDisplayName(false);
    }
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface">
      {/* ---------------------------------------------------------- */}
      {/*  Mobile backdrop overlay                                    */}
      {/* ---------------------------------------------------------- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Sidebar                                                    */}
      {/* ---------------------------------------------------------- */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-outline-variant bg-surface-dim transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* -- Logo area -- */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-outline-variant px-5">
          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fire to-amber-500 shadow-lg shadow-fire/20">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="block font-display text-lg font-semibold leading-none tracking-tight text-white">
                Fyrlinc
              </span>
              <span className="mt-1 block text-[11px] font-medium tracking-wide text-on-surface-variant">
                Monitoring Station
              </span>
            </div>
          </Link>

          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* -- Navigation links -- */}
        <nav className="flex-1 space-y-1 px-3 py-5">
          {filteredNav.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'border-l-[3px] border-l-primary bg-primary/[0.08] pl-[9px] text-white'
                    : 'text-on-surface-variant hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? 'bg-primary/[0.12] text-primary'
                      : 'bg-white/[0.03] text-on-surface-variant group-hover:bg-white/[0.06] group-hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* -- Bottom secure session badge -- */}
        <div className="mx-3 mb-4 rounded-xl border border-outline-variant bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-on-surface">
            <ShieldCheck className="h-5 w-5 text-secondary" />
            <span className="font-medium">Secure session</span>
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant pt-3">
            <span className="text-xs text-on-surface-variant">Role</span>
            <span className="text-xs font-semibold capitalize text-on-surface">
              {roleLabel}
            </span>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------- */}
      {/*  Main wrapper (offset by sidebar on desktop)                */}
      {/* ---------------------------------------------------------- */}
      <div className="lg:pl-[280px]">
        {/* -------------------------------------------------------- */}
        {/*  Top header bar                                           */}
        {/* -------------------------------------------------------- */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-dim/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          {/* Left cluster */}
          <div className="flex min-w-0 items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-white/[0.03] text-on-surface-variant transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-semibold text-white sm:text-lg">
                {pageTitle}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                <span>Live monitoring</span>
              </div>
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* -- Notifications bell -- */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationOpen((v) => !v);
                  setUserMenuOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-white/[0.03] text-on-surface-variant transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fire px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface-dim">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notificationOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-80 animate-fade-in rounded-xl border border-outline-variant bg-surface-container p-3 shadow-2xl shadow-black/50">
                    <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Notifications
                        </p>
                        <p className="mt-0.5 text-[11px] text-on-surface-variant">
                          Live panel alerts
                        </p>
                      </div>
                      <span className="rounded-full border border-outline-variant bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                        {notificationCount}
                      </span>
                    </div>

                    {notificationCount === 0 ? (
                      <div className="mt-3 rounded-lg border border-outline-variant bg-white/[0.02] p-4 text-center">
                        <BellOff className="mb-2 h-7 w-7 text-on-surface-variant" />
                        <p className="text-sm font-medium text-on-surface">
                          All clear
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Active alarms will appear here when panels report
                          them.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className="rounded-lg border border-fire/20 bg-fire/[0.08] p-3"
                          >
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 text-fire" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-fire/90">
                                  {n.title}
                                </p>
                                <p className="mt-0.5 text-xs text-on-surface-variant">
                                  {n.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* -- User menu -- */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setNotificationOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-lg border border-outline-variant bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-400 text-sm font-bold text-white">
                  {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[140px] truncate text-sm font-semibold leading-tight text-white">
                    {userData?.displayName}
                  </p>
                  <p className="text-[11px] capitalize text-on-surface-variant">
                    {roleLabel}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-64 animate-fade-in rounded-xl border border-outline-variant bg-surface-container p-1 shadow-2xl shadow-black/50">
                    {/* User info header */}
                    <div className="rounded-lg p-3">
                      <p className="truncate text-sm font-semibold text-white">
                        {userData?.displayName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {userData?.email}
                      </p>
                      <span className="mt-2.5 inline-flex items-center rounded-md border border-primary/20 bg-primary/[0.08] px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">
                        {roleLabel}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="mx-2 border-t border-outline-variant" />

                    {/* Sign out */}
                    <button
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-fire/[0.08] hover:text-fire"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* -------------------------------------------------------- */}
        {/*  Main content area                                        */}
        {/* -------------------------------------------------------- */}
        <main className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {/* Display‑name prompt bar */}
          {needsDisplayName && (
            <div className="mb-5 animate-slide-up rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <User className="mt-0.5 h-6 w-6 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-100">
                      Set your display name
                    </p>
                    <p className="mt-0.5 text-sm text-amber-100/60">
                      This will be shown across the dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={displayNameDraft}
                    onChange={(e) => setDisplayNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDisplayName();
                    }}
                    placeholder="Your name"
                    className="control-field h-9 rounded-lg px-3 text-sm sm:w-64"
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={savingDisplayName || !displayNameDraft.trim()}
                    className="btn-primary h-9 rounded-lg px-4 text-sm font-semibold"
                  >
                    {savingDisplayName ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}
