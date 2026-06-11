import { useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePanels } from '../hooks/usePanels';
import { Role } from '../types';

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}> = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['super_admin', 'head_office', 'system_integrator', 'end_user']
  },
  {
    name: 'Admin Settings',
    href: '/admin',
    icon: Settings,
    roles: ['super_admin', 'head_office', 'system_integrator']
  }
];

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

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/panel');
    }

    return location.pathname === path;
  };

  const pageTitle = location.pathname === '/admin'
    ? 'Admin Settings'
    : location.pathname.startsWith('/panel')
    ? 'Panel Details'
    : 'Fire Alarm Panels';

  const roleLabel = userData?.role?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'End User';
  const needsDisplayName = !userData?.displayName || userData.displayName === 'User';
  const filteredNav = navigation.filter((item) => hasRole(item.roles));
  const notifications = useMemo(
    () =>
      panels
        .filter((panel) => panel.alarm)
        .map((panel) => ({
          id: panel.serial,
          title: panel.name,
          message: `Alarm active on ${panel.serial}`
        })),
    [panels]
  );
  const notificationCount = notifications.length;

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

  return (
    <div className="min-h-screen console-bg text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/10 bg-[#070b10]/95 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400 shadow-lg shadow-red-950/40">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="block text-xl font-semibold leading-none text-white">Fyrlinc</span>
              <span className="mt-1 block text-xs text-slate-500">Command Console</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-5">
          {filteredNav.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-red-500/10 text-white shadow-[inset_3px_0_0_rgba(239,68,68,0.95)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                    active
                      ? 'border-red-400/30 bg-red-500/10 text-red-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 group-hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>Secure session</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-xs text-slate-500">Role</span>
            <span className="text-xs font-semibold capitalize text-slate-200">{roleLabel}</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#070b10]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white sm:text-lg">{pageTitle}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
                <span>Live monitoring</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotificationOpen((value) => !value)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#070b10] bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              </button>

              {notificationOpen && (
                <div className="surface-panel absolute right-0 z-50 mt-3 w-80 rounded-lg p-3 shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      <p className="mt-1 text-xs text-slate-500">Live panel alerts</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">
                      {notificationCount}
                    </span>
                  </div>

                  {notificationCount === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
                      <p className="text-sm font-medium text-white">Nothing new here</p>
                      <p className="mt-1 text-xs text-slate-500">You’ll see active alarms here when panels report them.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-3">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="rounded-lg border border-red-300/20 bg-red-500/10 p-3">
                          <p className="text-sm font-semibold text-red-100">{notification.title}</p>
                          <p className="mt-1 text-xs text-red-100/75">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400 text-sm font-semibold text-white">
                  {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[160px] truncate text-sm font-semibold text-white">
                    {userData?.displayName}
                  </p>
                  <p className="text-xs capitalize text-slate-500">{roleLabel}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="surface-panel absolute right-0 z-50 mt-3 w-64 rounded-lg p-2">
                    <div className="border-b border-white/10 p-3">
                      <p className="truncate text-sm font-semibold text-white">{userData?.displayName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{userData?.email}</p>
                      <span className="mt-3 inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium capitalize text-amber-200">
                        {roleLabel}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-200 transition-colors hover:bg-red-500/10"
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

        <main className="min-h-[calc(100vh-5rem)] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {needsDisplayName && (
            <div className="mb-5 rounded-lg border border-amber-300/20 bg-amber-400/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-100">Add your display name</p>
                  <p className="mt-1 text-sm text-amber-100/70">This will be shown in the top right of the dashboard.</p>
                </div>
                <input
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  placeholder="Your name"
                  className="control-field rounded-lg px-4 py-2.5 text-sm text-white sm:w-80"
                />
                <button
                  onClick={handleSaveDisplayName}
                  disabled={savingDisplayName}
                  className="btn-primary rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {savingDisplayName ? 'Saving...' : 'Save name'}
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
