import { Outlet } from "react-router-dom";
import { Bell, Clock, Flame, BarChart3 } from "lucide-react";

const trustPoints = [
  {
    label: "24/7 Monitoring",
    description: "Round-the-clock visibility into every panel.",
    icon: Clock,
    accentBg: "rgba(52,211,153,0.07)",
    accentBorder: "rgba(52,211,153,0.16)",
    iconColor: "text-emerald-400",
  },
  {
    label: "Instant Alerts",
    description: "Get notified the moment something needs attention.",
    icon: Bell,
    accentBg: "rgba(251,191,36,0.07)",
    accentBorder: "rgba(251,191,36,0.16)",
    iconColor: "text-amber-300",
  },
  {
    label: "Live Status",
    description: "Real-time updates on all your connected panels.",
    icon: BarChart3,
    accentBg: "rgba(255,255,255,0.035)",
    accentBorder: "rgba(255,255,255,0.09)",
    iconColor: "text-slate-200",
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
        {/* ── Left info panel (desktop only) ──────────────────────────────── */}
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

          {/* Hero — warm, non-techy messaging */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-center">
            <h1 className="font-display max-w-xl text-[3rem] font-bold leading-[1.05] tracking-[-0.04em] text-white text-balance xl:text-[3.75rem] drop-shadow-sm">
              Your fire safety,
              <br />
              <span className="bg-gradient-to-r from-[#ff6b35] to-[#e8173a] bg-clip-text text-transparent">
                always monitored.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-[1rem] leading-[1.75] text-white/50 font-medium xl:text-[1.05rem]">
              Fyrlinc keeps you connected to every fire alarm panel — so you can
              respond faster when it matters most.
            </p>

            {/* Trust points */}
            <div className="mt-10 grid max-w-md gap-3.5 w-full">
              {trustPoints.map((point, idx) => (
                <div
                  key={point.label}
                  className="flex items-start gap-4 rounded-[14px] border px-5 py-4 animate-fade-in-up inset-highlight backdrop-blur-md"
                  style={{
                    background: point.accentBg,
                    borderColor: point.accentBorder,
                    animationDelay: `${idx * 100}ms`,
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] shadow-sm mt-0.5"
                    style={{
                      background: point.accentBg,
                      border: `1px solid ${point.accentBorder}`,
                    }}
                  >
                    <point.icon
                      className={`h-[18px] w-[18px] ${point.iconColor}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white/90">
                      {point.label}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/40 font-medium">
                      {point.description}
                    </p>
                  </div>
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
