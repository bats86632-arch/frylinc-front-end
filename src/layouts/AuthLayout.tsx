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
      <div className="absolute inset-0 console-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

      {/* Floating ember particles — CSS only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[20%] h-1.5 w-1.5 rounded-full bg-amber-400/40 animate-ember-float" style={{ animationDelay: "0s" }} />
        <div className="absolute left-[35%] top-[60%] h-1 w-1 rounded-full bg-red-400/30 animate-ember-float" style={{ animationDelay: "2s" }} />
        <div className="absolute left-[55%] top-[35%] h-1.5 w-1.5 rounded-full bg-orange-400/35 animate-ember-float" style={{ animationDelay: "4s" }} />
        <div className="absolute left-[25%] top-[75%] h-1 w-1 rounded-full bg-amber-300/25 animate-ember-float" style={{ animationDelay: "1s" }} />
        <div className="absolute left-[45%] top-[45%] h-2 w-2 rounded-full bg-red-500/20 animate-ember-float" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        {/* Left info panel */}
        <section className="relative hidden h-screen flex-col justify-start gap-y-14 overflow-y-auto border-r border-white/[0.08] px-10 py-10 lg:flex xl:px-16 xl:gap-y-16">
          {/* Warm radial glow behind hero text */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% -10%, rgba(245,158,11,0.12) 0%, rgba(239,68,68,0.06) 40%, transparent 70%)",
            }}
          />

          {/* Brand lock-up */}
          <div className="relative flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-red-500 to-amber-400 shadow-lg shadow-red-950/50 ring-1 ring-white/10">
              <Flame className="h-6 w-6 text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-white tracking-tight">Fyrlinc</p>
              <p className="text-[13px] text-slate-400 tracking-wide">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          <div className="relative max-w-2xl animate-fade-in">
            <h1 className="font-display max-w-xl text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-white text-balance xl:text-[2.75rem]">
              High-trust monitoring for every connected fire panel.
            </h1>
            <p className="mt-7 max-w-lg text-body-lg leading-relaxed text-slate-400">
              Real-time alarm visibility, role-based access, panel controls, and
              event history in one secure operations console.
            </p>

            {/* Status rows with colored left border accent */}
            <div className="mt-10 grid max-w-xl gap-3">
              {signalRows.map((row, idx) => (
                <div
                  key={row.label}
                  className="surface-muted flex items-center justify-between rounded-[12px] p-4 border-l-[3px] animate-fade-in-up"
                  style={{ borderLeftColor: row.accent, animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03]">
                      <row.icon className={`h-5 w-5 ${row.tone}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-300">{row.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${row.tone}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Zone telemetry demo card */}
            <div className="surface-panel mt-8 max-w-xl rounded-[14px] p-6 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  Zone telemetry
                </span>
                <span className="text-xs font-medium text-slate-500">8 zones</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, index) => {
                  const active = [2, 5].includes(index);
                  return (
                    <div
                      key={index}
                      className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] text-xs font-semibold transition-all duration-200 ${
                        active
                          ? "zone-alarm animate-pulse-shadow"
                          : "zone-normal hover:bg-slate-600/40"
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

          {/* Bottom amber line */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/25 to-transparent" />
        </section>

        {/* Right auth panel with subtle red radial glow from bottom */}
        <main
          className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(239,68,68,0.05), transparent)",
          }}
        >
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-red-500 to-amber-400 shadow-lg shadow-red-950/50">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-white tracking-tight">Fyrlinc</p>
                <p className="text-sm text-slate-400">
                  Fire Alarm Panel Monitoring
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
