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
    <div className="auth-screen relative min-h-screen overflow-hidden bg-[#08080d] text-white lg:bg-[#050507]">
      {/* Mobile keeps the existing dark app lock-screen feel. */}
      <div className="absolute inset-0 console-grid opacity-30 lg:opacity-20" />

      {/* Desktop ambient lighting */}
      <div className="pointer-events-none absolute -left-32 top-[-20%] hidden h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle,_rgba(232,23,58,0.24)_0%,_transparent_62%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute right-[-18%] top-1/2 hidden h-[860px] w-[860px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(99,57,198,0.22)_0%,_transparent_64%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(99,57,198,0.18)_0%,_transparent_60%)] lg:bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.06)_0%,_transparent_64%)]" />

      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* ── Left info panel ────────────────────────────────────────────── */}
        <section className="relative hidden h-screen flex-col overflow-hidden border-r border-white/[0.08] px-10 py-10 lg:flex xl:px-16">
          {/* Brand lock-up */}
          <div className="flex shrink-0 items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-lg inset-highlight ring-1 ring-white/10">
              <Flame className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="font-display text-[1.1rem] font-bold tracking-tight text-white leading-none">
                Fyrlinc
              </p>
              <p className="mt-1 text-[12px] text-white/40 tracking-wide font-medium">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          {/* Hero copy — vertically centered */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 inset-highlight">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_14px_rgba(52,211,153,0.75)]" />
              Secure operations console
            </div>
            <h1 className="font-display max-w-xl text-[3rem] font-bold leading-[0.98] tracking-[-0.055em] text-white text-balance xl:text-[4rem] drop-shadow-sm">
              Command fire alarm telemetry with confidence.
            </h1>
            <p className="mt-7 max-w-md text-[1rem] leading-8 text-white/58 font-medium xl:text-[1.08rem]">
              Fyrlinc brings panel status, alarms, controls, and contact routing
              into one high-trust desktop command center.
            </p>

            {/* Status rows */}
            <div className="mt-10 grid max-w-md gap-3 w-full">
              {signalRows.map((row, idx) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-[14px] border px-5 py-3.5 animate-fade-in-up inset-highlight backdrop-blur-md"
                  style={{
                    background: row.accentBg,
                    borderColor: row.accentBorder,
                    animationDelay: `${idx * 90}ms`,
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[9px] shadow-sm"
                      style={{
                        background: row.accentBg,
                        border: `1px solid ${row.accentBorder}`,
                      }}
                    >
                      <row.icon className={`h-[18px] w-[18px] ${row.tone}`} />
                    </div>
                    <span className="text-[13px] font-semibold text-white/80">
                      {row.label}
                    </span>
                  </div>
                  <span
                    className={`text-[13px] font-bold tracking-wide ${row.tone}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 pt-4">
            <p className="text-[12px] text-white/25 font-medium">
              © {new Date().getFullYear()} Fyrlinc · All rights reserved
            </p>
          </div>
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#0b0b14]/50 px-6 py-12 backdrop-blur-2xl sm:px-8 lg:h-screen lg:min-h-0 lg:border-l lg:border-white/[0.06] lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] lg:px-12">
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,_rgba(255,255,255,0.045)_0%,_transparent_70%)]" />
          <div className="pointer-events-none absolute inset-x-8 bottom-10 hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent lg:block" />

          <div className="relative z-10 w-full max-w-md animate-fade-in-up lg:max-w-[460px]">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#e8173a] to-[#ff6b35] shadow-lg inset-highlight ring-1 ring-white/10">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-display text-[1.25rem] font-bold tracking-tight text-white leading-none">
                  Fyrlinc
                </p>
                <p className="mt-1 text-[13px] text-white/40 font-medium">
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
