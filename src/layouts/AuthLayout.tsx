import { Outlet } from 'react-router-dom';
import { Activity, Flame, RadioTower, ShieldCheck } from 'lucide-react';

const signalRows = [
  { label: 'Panel Health', value: 'Online', icon: Activity, tone: 'text-emerald-400' },
  { label: 'Alarm Channel', value: 'Armed', icon: RadioTower, tone: 'text-amber-300' },
  { label: 'Access Layer', value: 'Protected', icon: ShieldCheck, tone: 'text-cyan-300' },
];

export function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden console-bg text-slate-100">
      <div className="absolute inset-0 console-grid opacity-35" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        <section className="hidden h-screen flex-col justify-between overflow-hidden border-r border-white/10 px-10 py-9 lg:flex xl:px-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400 shadow-lg shadow-red-950/40">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Fyrlinc</p>
              <p className="text-sm text-slate-400">Fire Alarm Panel Monitoring System</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
              All systems normal
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] text-white xl:text-5xl">
              High-trust monitoring for every connected fire panel.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400 xl:text-base xl:leading-7">
              Real-time alarm visibility, role-based access, panel controls, and event history in one secure operations console.
            </p>

            <div className="mt-8 grid max-w-xl gap-3">
              {signalRows.map((row) => (
                <div key={row.label} className="surface-muted flex items-center justify-between rounded-lg p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                      <row.icon className={`h-5 w-5 ${row.tone}`} />
                    </div>
                    <span className="text-sm text-slate-300">{row.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${row.tone}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel max-w-2xl rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Zone telemetry</span>
              <span className="text-xs text-slate-500">64 zone matrix</span>
            </div>
            <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
              {Array.from({ length: 64 }).map((_, index) => {
                const active = [3, 8, 19].includes(index);
                return (
                  <div
                    key={index}
                    className={`h-2.5 rounded-[2px] ${
                      active
                        ? 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.7)]'
                        : index % 7 === 0
                        ? 'bg-amber-400/70'
                        : 'bg-slate-700/70'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:h-screen lg:min-h-0 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Fyrlinc</p>
                <p className="text-sm text-slate-400">Fire Alarm Panel Monitoring System</p>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
