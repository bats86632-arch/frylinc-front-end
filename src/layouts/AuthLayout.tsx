import { Outlet } from "react-router-dom";

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
            <div className="mix-blend-difference">
              <p className="font-sans text-[1.1rem] font-semibold tracking-tight text-white leading-none">
                Fyrlinc
              </p>
              <p className="mt-1 text-[12px] text-gray-300 tracking-wide font-medium">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          {/* Hero - warm, non-techy messaging */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-end pb-4 w-full">
            {/* Scrim wrapper for hero text */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 backdrop-blur-md p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full">
              <h1 className="font-sans text-[2.5rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] text-balance xl:text-[3.25rem]">
                Your fire safety,
                <br />
                <span className="text-[var(--accent)]">
                  always monitored.
                </span>
              </h1>
              <p className="mt-5 text-[1rem] leading-[1.6] text-[var(--text-secondary)] font-medium xl:text-[1.1rem] max-w-3xl">
                Fyrlinc keeps you connected to every fire alarm panel - so you can
                respond faster when it matters most.
              </p>
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
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12">
          <div className="relative z-10 w-full max-w-md animate-fade-in-up lg:max-w-[460px]">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <img
                src="/fyrlinc-logo.png"
                alt="Fyrlinc"
                className="h-12 w-12 rounded-[8px] object-cover border border-[var(--border-subtle)]"
              />
              <div className="mix-blend-difference">
                <p className="font-sans text-[1.25rem] font-semibold tracking-tight text-white leading-none">
                  Fyrlinc
                </p>
                <p className="mt-1 text-[13px] text-gray-300 font-medium">
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
