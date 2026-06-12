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
      {/* Waitlister-inspired starfield / dot grid */}
      <div className="absolute inset-0 console-grid opacity-30" />
      
      {/* Waitlister-inspired deep purple ambient glow behind the hero */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(99,57,198,0.18)_0%,_transparent_60%)]" />

      {/* Top hairline - waitlister style thin white */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.04]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_500px]">

        {/* ── Left info panel ────────────────────────────────────────────── */}
        <section className="relative hidden h-screen flex-col overflow-y-auto border-r border-white/[0.06] px-10 py-12 lg:flex xl:px-16">

          {/* Brand lock-up */}
          <div className="flex shrink-0 items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-lg inset-highlight ring-1 ring-white/10">
              <Flame className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="font-display text-[1.1rem] font-bold tracking-tight text-white leading-none">Fyrlinc</p>
              <p className="mt-1 text-[12px] text-white/40 tracking-wide font-medium">Fire Alarm Panel Monitoring</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-center py-12">
            <h1 className="font-display max-w-xl text-[3rem] font-bold leading-[1.05] tracking-tight text-white text-balance xl:text-[3.5rem] drop-shadow-sm">
              High-trust monitoring for every connected fire panel.
            </h1>
            <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-white/50 font-medium">
              Real-time alarm visibility, role-based access, panel controls, and
              event history — in one secure operations console.
            </p>

            {/* Status rows — Waitlister premium card style with inset highlight */}
            <div className="mt-12 grid max-w-lg gap-3 w-full">
              {signalRows.map((row, idx) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-[14px] border px-5 py-4 animate-fade-in-up inset-highlight backdrop-blur-md"
                  style={{
                    background: row.accentBg,
                    borderColor: row.accentBorder,
                    animationDelay: `${idx * 90}ms`,
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[9px] shadow-sm"
                      style={{ background: row.accentBg, border: `1px solid ${row.accentBorder}` }}
                    >
                      <row.icon className={`h-[18px] w-[18px] ${row.tone}`} />
                    </div>
                    <span className="text-sm font-semibold text-white/80">{row.label}</span>
                  </div>
                  <span className={`text-sm font-bold tracking-wide ${row.tone}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Zone telemetry demo card — flat surface */}
            <div
              className="mt-8 max-w-lg w-full rounded-[16px] border border-white/[0.08] bg-[#0f0f18]/80 p-6 animate-fade-in-up inset-highlight backdrop-blur-xl shadow-panel"
              style={{ animationDelay: "300ms" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">Zone telemetry</span>
                <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-[10px] font-bold text-white/40 tracking-wider uppercase">8 zones</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, index) => {
                  const active = [2, 5].includes(index);
                  return (
                    <div
                      key={index}
                      className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] text-xs font-semibold border transition-all duration-200 ${
                        active
                          ? "zone-alarm animate-pulse-shadow shadow-sm"
                          : "zone-normal"
                      }`}
                    >
                      <span className={active ? "text-white" : "text-white/50"}>Z{index + 1}</span>
                      {active && (
                        <span className="text-[8px] font-bold tracking-widest opacity-90 mt-0.5">
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
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/[0.04]" />
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main className="flex min-h-screen items-center justify-center bg-[#0b0b14]/50 backdrop-blur-2xl px-6 py-12 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12 relative z-10 border-l border-white/[0.02]">
          {/* Subtle glow specifically for the login form */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
          
          <div className="w-full max-w-md animate-fade-in-up relative z-10">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-lg inset-highlight ring-1 ring-white/10">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-display text-[1.25rem] font-bold tracking-tight text-white leading-none">Fyrlinc</p>
                <p className="mt-1 text-sm text-white/40 font-medium">Fire Alarm Panel Monitoring</p>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
