import { Outlet } from "react-router-dom";
import { Activity, Flame, RadioTower, ShieldCheck } from "lucide-react";

const signalRows = [
  {
    label: "Panel Health",
    value: "Online",
    icon: Activity,
    tone: "text-emerald-400",
    accent: "rgba(52,211,153,0.55)",
  },
  {
    label: "Alarm Channel",
    value: "Armed",
    icon: RadioTower,
    tone: "text-amber-300",
    accent: "rgba(252,191,73,0.55)",
  },
  {
    label: "Access Layer",
    value: "Protected",
    icon: ShieldCheck,
    tone: "text-cyan-300",
    accent: "rgba(34,211,238,0.55)",
  },
];

export function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden console-bg text-slate-100">
      <div className="absolute inset-0 console-grid opacity-35" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        {/* Left info panel */}
        <section className="relative hidden h-screen flex-col justify-start gap-y-12 overflow-y-auto border-r border-white/10 px-10 py-9 lg:flex xl:px-14 xl:gap-y-16">
          {/* Warm radial glow behind hero text */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% -10%, rgba(245,158,11,0.10) 0%, rgba(239,68,68,0.05) 40%, transparent 70%)",
            }}
          />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400 shadow-lg shadow-red-950/40">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Fyrlinc</p>
              <p className="text-sm text-slate-400">
                Fire Alarm Panel Monitoring System
              </p>
            </div>
          </div>

          <div className="relative max-w-2xl animate-fade-in">
            <h1 className="max-w-xl text-3xl font-semibold leading-[1.1] text-white xl:text-4xl">
              High-trust monitoring for every connected fire panel.
            </h1>
            <p className="mt-6 max-w-lg text-[13px] leading-6 text-slate-400 xl:text-[15px] xl:leading-7">
              Real-time alarm visibility, role-based access, panel controls, and
              event history in one secure operations console.
            </p>

            {/* Status rows with colored left border accent */}
            <div className="mt-8 grid max-w-xl gap-3">
              {signalRows.map((row) => (
                <div
                  key={row.label}
                  className="surface-muted flex items-center justify-between rounded-lg p-3.5 border-l-2"
                  style={{ borderLeftColor: row.accent }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                      <row.icon className={`h-5 w-5 ${row.tone}`} />
                    </div>
                    <span className="text-sm text-slate-300">{row.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${row.tone}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Zone telemetry demo card */}
            <div className="surface-panel mt-6 max-w-xl rounded-lg p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">
                  Zone telemetry
                </span>
                <span className="text-xs text-slate-500">8 zones</span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }).map((_, index) => {
                  const active = [2, 5].includes(index);
                  return (
                    <div
                      key={index}
                      className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-semibold ${
                        active
                          ? "zone-alarm animate-pulse-shadow"
                          : "zone-normal"
                      }`}
                    >
                      <span>Z{index + 1}</span>
                      {active && (
                        <span className="text-[8px] font-bold tracking-widest opacity-90">
                          ALARM
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom amber line — mirrors the top for visual closure */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
        </section>

        {/* Right auth panel with subtle red radial glow from bottom */}
        <main
          className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:h-screen lg:min-h-0 lg:px-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(239,68,68,0.06), transparent)",
          }}
        >
          <div className="w-full max-w-md animate-fade-in">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Fyrlinc</p>
                <p className="text-sm text-slate-400">
                  Fire Alarm Panel Monitoring System
                </p>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
