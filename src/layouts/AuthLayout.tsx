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
        <source media="(max-width: 1023px)" srcSet="/cmp-phone.png?v=2" />
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
        <section className="relative hidden h-screen flex-col overflow-hidden px-12 py-12 lg:flex xl:px-20 justify-center bg-gradient-to-r from-black/95 from-10% via-black/60 via-40% to-transparent to-60%">
          {/* Hero + feature cards */}
          <div className="animate-fade-in flex flex-col items-start justify-center w-full mt-[-4rem]">
            <div className="w-full">
              <h1 className="font-serif text-[3.25rem] font-normal leading-[1.1] tracking-tight text-white xl:text-[4rem] drop-shadow-lg">
                Your fire safety,<br />
                always monitored.
              </h1>

              {/* Feature cards */}
              <div className="mt-14 space-y-7 w-full max-w-sm">
                <div className="flex items-start gap-5">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-white/70 stroke-[1.5]" />
                  <div>
                    <p className="text-[14px] font-medium text-white/90 leading-none">24/7 Monitoring</p>
                    <p className="mt-1.5 text-[13px] text-white/50 font-light">Round-the-clock visibility into every panel.</p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <Bell className="mt-0.5 h-5 w-5 shrink-0 text-white/70 stroke-[1.5]" />
                  <div>
                    <p className="text-[14px] font-medium text-white/90 leading-none">Instant Alerts</p>
                    <p className="mt-1.5 text-[13px] text-white/50 font-light">Get notified the moment something needs attention.</p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <BarChart2 className="mt-0.5 h-5 w-5 shrink-0 text-white/70 stroke-[1.5]" />
                  <div>
                    <p className="text-[14px] font-medium text-white/90 leading-none">Live Status</p>
                    <p className="mt-1.5 text-[13px] text-white/50 font-light">Real-time updates on all your connected panels.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer lockup */}
          <div className="absolute bottom-12 left-12 xl:left-20 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white">
                <img
                  src="/fyrlinc-logo.png"
                  alt="Fyrlinc"
                  className="h-5 w-5 object-contain"
                />
              </div>
              <p className="font-sans text-[15px] font-medium tracking-wide text-white leading-none">
                Fyrlinc
              </p>
            </div>
            <p className="text-[11px] text-white/40 font-light tracking-wide pt-0.5">
              © {new Date().getFullYear()} Fyrlinc · All rights reserved
            </p>
          </div>
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main
          className="relative z-10 flex min-h-screen flex-col justify-between px-6 sm:px-8 lg:h-screen lg:min-h-0 lg:flex-row lg:items-center lg:justify-center lg:px-12 lg:py-12"
          style={{
            paddingTop: 'calc(4rem + var(--safe-top))',
            paddingBottom: 'calc(2rem + var(--safe-bottom))',
          }}
        >
          {/* Mobile brand - pushed to top with glassmorphism */}
          <div className="mt-4 flex w-full max-w-sm flex-col items-center justify-center rounded-[24px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl shadow-2xl lg:hidden mx-auto">
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
