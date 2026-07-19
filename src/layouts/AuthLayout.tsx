import { Outlet } from "react-router-dom";
import { Bell, Clock, BarChart3 } from "lucide-react";

const trustPoints = [
  {
    label: "24/7 Monitoring",
    description: "Round-the-clock visibility into every panel.",
    icon: Clock,
    accentBg: "var(--status-success-bg)",
    accentBorder: "var(--status-success-border)",
    iconColor: "text-[var(--color-success)]",
  },
  {
    label: "Instant Alerts",
    description: "Get notified the moment something needs attention.",
    icon: Bell,
    accentBg: "var(--status-warning-bg)",
    accentBorder: "var(--status-warning-border)",
    iconColor: "text-[var(--color-warning)]",
  },
  {
    label: "Live Status",
    description: "Real-time updates on all your connected panels.",
    icon: BarChart3,
    accentBg: "var(--surface-raised)",
    accentBorder: "var(--border-default)",
    iconColor: "text-[var(--text-secondary)]",
  },
];

export function AuthLayout() {
  return (
    <div className="auth-screen relative min-h-screen overflow-hidden text-white">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/agni-building.jpeg')" }}
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* ── Left info panel (desktop only) ──────────────────────────────── */}
        <section className="relative hidden h-screen flex-col overflow-hidden px-10 py-10 lg:flex xl:px-16">
          {/* Brand lock-up */}
          <div className="flex shrink-0 items-center gap-3.5">
            <img
              src="/fyrlinc-logo.png"
              alt="Fyrlinc"
              className="h-11 w-11 rounded-[8px] object-cover border border-[var(--border-subtle)]"
            />
            <div>
              <p className="font-sans text-[1.1rem] font-semibold tracking-tight text-[var(--text-primary)] leading-none">
                Fyrlinc
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-secondary)] tracking-wide font-medium">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          {/* Hero - warm, non-techy messaging */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-end pb-12 xl:pb-20">
            <h1 className="font-sans max-w-xl text-[3rem] font-bold leading-[1.05] tracking-[-0.04em] text-[var(--text-primary)] text-balance xl:text-[3.75rem]">
              Your fire safety,
              <br />
              <span className="text-[var(--accent)]">
                always monitored.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-[1rem] leading-[1.75] text-[var(--text-secondary)] font-medium xl:text-[1.05rem]">
              Fyrlinc keeps you connected to every fire alarm panel - so you can
              respond faster when it matters most.
            </p>

            {/* Trust points */}
            <div className="mt-10 grid max-w-md gap-3.5 w-full">
              {trustPoints.map((point, idx) => (
               <div
                  key={point.label}
                  className="flex items-start gap-4 rounded-[8px] border px-5 py-4 animate-fade-in-up bg-[var(--surface-raised)]"
                  style={{
                    borderColor: point.accentBorder,
                    animationDelay: `${idx * 100}ms`,
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] shadow-sm mt-0.5"
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
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {point.label}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)] font-medium">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 pt-4">
            <p className="text-[12px] text-[var(--text-secondary)] font-medium">
              © {new Date().getFullYear()} Fyrlinc · All rights reserved
            </p>
          </div>
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12 lg:items-end lg:pb-12 xl:pb-20">
          <div className="relative z-10 w-full max-w-md animate-fade-in-up lg:max-w-[460px]">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <img
                src="/fyrlinc-logo.png"
                alt="Fyrlinc"
                className="h-12 w-12 rounded-[8px] object-cover border border-[var(--border-subtle)]"
              />
              <div>
                <p className="font-sans text-[1.25rem] font-semibold tracking-tight text-[var(--text-primary)] leading-none">
                  Fyrlinc
                </p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)] font-medium">
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
