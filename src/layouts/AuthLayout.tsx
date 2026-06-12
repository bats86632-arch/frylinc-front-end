import { Outlet } from "react-router-dom";
import { Activity, Flame, RadioTower, ShieldCheck } from "lucide-react";

const signalRows = [
  {
    label: "Panel Health",
    value: "Online",
    icon: Activity,
    tone: "text-emerald-400",
    accentBg: "rgba(52,211,153,0.08)",
    accentBorder: "rgba(52,211,153,0.18)",
    dot: "#34d399",
  },
  {
    label: "Alarm Channel",
    value: "Armed",
    icon: RadioTower,
    tone: "text-amber-300",
    accentBg: "rgba(251,191,36,0.08)",
    accentBorder: "rgba(251,191,36,0.18)",
    dot: "#fbbf24",
  },
  {
    label: "Access Layer",
    value: "Protected",
    icon: ShieldCheck,
    tone: "text-slate-200",
    accentBg: "rgba(255,255,255,0.04)",
    accentBorder: "rgba(255,255,255,0.10)",
    dot: "#ffffff",
  },
];

export function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden console-bg text-white">
      {/* Very faint dot grid */}
      <div className="absolute inset-0 console-grid opacity-40" />
      {/* Top hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_500px]">

        {/* ── Left info panel ────────────────────────────────────────────── */}
        <section className="relative hidden h-screen flex-col justify-between overflow-y-auto border-r border-white/[0.08] px-10 py-12 lg:flex xl:px-16">

          {/* Brand lock-up */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-lg ring-1 ring-white/10">
              <Flame className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="font-display text-[1.1rem] font-700 tracking-tight text-white leading-none">Fyrlinc</p>
              <p className="mt-0.5 text-[12px] text-white/40 tracking-wide">Fire Alarm Panel Monitoring</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="animate-fade-in">
            <h1 className="font-display max-w-lg text-[2.6rem] font-bold leading-[1.07] tracking-[-0.03em] text-white text-balance xl:text-[3.2rem]">
              High-trust monitoring for every connected fire panel.
            </h1>
            <p className="mt-6 max-w-md text-body-lg leading-relaxed text-white/50">
              Real-time alarm visibility, role-based access, panel controls, and
              event history — in one secure operations console.
            </p>

            {/* Status rows — flat bordered, no glass */}
            <div className="mt-10 grid max-w-lg gap-2.5">
              {signalRows.map((row, idx) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-[10px] border px-4 py-3.5 animate-fade-in-up"
                  style={{
                    background: row.accentBg,
                    borderColor: row.accentBorder,
                    animationDelay: `${idx * 90}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-[7px]"
                      style={{ background: row.accentBg, border: `1px solid ${row.accentBorder}` }}
                    >
                      <row.icon className={`h-4 w-4 ${row.tone}`} />
                    </div>
                    <span className="text-sm font-medium text-white/70">{row.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${row.tone}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Zone telemetry demo card — flat surface */}
            <div
              className="mt-8 max-w-lg rounded-[12px] border border-white/[0.09] bg-[#111] p-6 animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Zone telemetry</span>
                <span className="text-xs font-medium text-white/35">8 zones</span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }).map((_, index) => {
                  const active = [2, 5].includes(index);
                  return (
                    <div
                      key={index}
                      className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-[8px] text-xs font-semibold border transition-all duration-200 ${
                        active
                          ? "zone-alarm animate-pulse-shadow"
                          : "zone-normal"
                      }`}
                    >
                      <span>Z{index + 1}</span>
                      {active && (
                        <span className="text-[7px] font-bold tracking-widest opacity-80">
                          ALARM
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom hairline */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/[0.06]" />
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-6 py-12 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12">
          <div className="w-full max-w-md animate-fade-in-up">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-lg ring-1 ring-white/10">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-display text-[1.15rem] font-bold tracking-tight text-white leading-none">Fyrlinc</p>
                <p className="mt-0.5 text-sm text-white/40">Fire Alarm Panel Monitoring</p>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
