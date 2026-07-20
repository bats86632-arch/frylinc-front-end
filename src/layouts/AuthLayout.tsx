import { Outlet } from "react-router-dom";
import { useRef } from "react";
import { useAdaptiveTextColor } from "../hooks/useAdaptiveTextColor";
import { Clock, Bell, BarChart2 } from "lucide-react";

export function AuthLayout() {
  const bgRef = useRef<HTMLImageElement>(null);

  const desktopTitleRef = useRef<HTMLParagraphElement>(null);
  const desktopSubtitleRef = useRef<HTMLParagraphElement>(null);
  const mobileTitleRef = useRef<HTMLParagraphElement>(null);
  const mobileSubtitleRef = useRef<HTMLParagraphElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);

  useAdaptiveTextColor(desktopTitleRef, bgRef);
  useAdaptiveTextColor(desktopSubtitleRef, bgRef);
  useAdaptiveTextColor(mobileTitleRef, bgRef);
  useAdaptiveTextColor(mobileSubtitleRef, bgRef);
  useAdaptiveTextColor(heroTitleRef, bgRef);

  return (
    <div className="auth-screen relative min-h-screen overflow-hidden text-white">
      {/* Background Image — desktop: cmp.png centered; mobile: cmp-phone.png object-[center_30%] to show AGNi sign */}
      <picture className="absolute inset-0 z-0 h-full w-full">
        <source media="(max-width: 1023px)" srcSet="/cmp-phone.png" />
        <source media="(min-width: 1024px)" srcSet="/cmp.png" />
        <img
          ref={bgRef}
          src="/cmp.png"
          alt="Background"
          className="h-full w-full object-cover object-[center_30%] lg:object-center"
        />
      </picture>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* ── Left info panel (desktop only) ──────────────────────────────── */}
        <section className="relative hidden h-screen flex-col overflow-hidden px-12 py-12 lg:flex xl:px-20 justify-center">
          {/* Brand lock-up */}
          <div className="absolute top-12 left-12 xl:left-20 flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-white">
              <img
                src="/fyrlinc-logo.png"
                alt="Fyrlinc"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div>
              <p className="font-sans text-[15px] font-medium tracking-wide text-white leading-none">
                Fyrlinc
              </p>
              <p className="mt-1 text-[11px] text-white/60 tracking-wider">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          {/* Hero + feature cards */}
          <div className="animate-fade-in flex flex-col items-start justify-center w-full mt-10">
            <div className="w-full">
              <h1 className="font-sans text-[2.75rem] font-light leading-tight tracking-tight text-white xl:text-[3.25rem]">
                Your fire safety,<br />
                always monitored.
              </h1>

              <p className="mt-5 text-[14px] leading-relaxed text-white/70 font-light max-w-sm">
                Fyrlinc keeps you connected to every fire alarm panel —
                so you can respond faster when it matters most.
              </p>

              {/* Feature cards */}
              <div className="mt-12 space-y-6 w-full max-w-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/5 bg-white/5 backdrop-blur-sm">
                    <Clock className="h-4 w-4 text-white/70" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white/90 leading-none">24/7 Monitoring</p>
                    <p className="mt-1.5 text-[12px] text-white/50 font-light">Round-the-clock visibility into every panel.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/5 bg-white/5 backdrop-blur-sm">
                    <Bell className="h-4 w-4 text-white/70" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white/90 leading-none">Instant Alerts</p>
                    <p className="mt-1.5 text-[12px] text-white/50 font-light">Get notified the moment something needs attention.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/5 bg-white/5 backdrop-blur-sm">
                    <BarChart2 className="h-4 w-4 text-white/70" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white/90 leading-none">Live Status</p>
                    <p className="mt-1.5 text-[12px] text-white/50 font-light">Real-time updates on all your connected panels.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center">
            <p className="text-[11px] text-white/40 font-light tracking-wide">
              © {new Date().getFullYear()} Fyrlinc · All rights reserved
            </p>
          </div>
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main
          className="relative z-10 flex min-h-screen flex-col justify-between px-6 sm:px-8 lg:h-screen lg:min-h-0 lg:flex-row lg:items-center lg:justify-center lg:px-12 lg:py-12"
          style={{
            paddingTop: 'calc(4rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
          }}
        >
          {/* Mobile brand - pushed to top with glassmorphism */}
          <div className="mt-4 flex w-full max-w-sm flex-col items-center justify-center rounded-[24px] border border-white/10 bg-black/30 p-6 backdrop-blur-md shadow-2xl lg:hidden mx-auto">
            <div className="flex items-center justify-center gap-3">
              <img
                src="/fyrlinc-logo.png"
                alt="Fyrlinc"
                className="h-10 w-10 rounded-[8px] object-cover border border-[var(--border-subtle)] shadow-sm"
              />
              <h1 className="font-sans text-[2.75rem] font-bold tracking-tight text-white leading-none drop-shadow-md">
                Fyrlinc
              </h1>
            </div>
            <p className="mt-3 text-[11px] text-white/90 font-bold tracking-[0.2em] uppercase drop-shadow-md text-center">
              Fire Alarm Panel Monitoring
            </p>
          </div>

          <div className="relative z-10 w-full max-w-md animate-fade-in-up lg:max-w-[460px] pb-8 lg:pb-0">
            <Outlet context={{ bgRef }} />
          </div>
        </main>
      </div>
    </div>
  );
}
