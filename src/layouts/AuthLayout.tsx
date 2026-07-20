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
        <section className="relative hidden h-screen flex-col overflow-hidden px-10 py-10 lg:flex xl:px-16">
          {/* Brand lock-up */}
          <div className="flex shrink-0 items-center gap-3.5">
            <img
              src="/fyrlinc-logo.png"
              alt="Fyrlinc"
              className="h-11 w-11 rounded-[8px] object-cover border border-[var(--border-subtle)]"
            />
            <div>
              <p ref={desktopTitleRef} className="font-sans text-[1.1rem] font-semibold tracking-tight text-white leading-none">
                Fyrlinc
              </p>
              <p ref={desktopSubtitleRef} className="mt-1 text-[12px] text-gray-300 tracking-wide font-medium">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          {/* Hero + feature cards pushed to bottom */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-end pb-4 w-full">
            <div className="w-full">
              <h1
                ref={heroTitleRef}
                className="font-sans text-[3rem] font-bold leading-[1.15] tracking-[-0.02em] text-white text-balance xl:text-[4.25rem] drop-shadow-md"
              >
                Your fire safety,
                <br />
                <span className="text-[#4db6d4]">always monitored.</span>
              </h1>

              <p className="mt-4 text-[15px] leading-relaxed text-white/80 font-medium max-w-sm drop-shadow-sm">
                Fyrlinc keeps you connected to every fire alarm panel —
                so you can respond faster when it matters most.
              </p>

              {/* Feature cards */}
              <div className="mt-8 space-y-3 w-full max-w-sm">
                <div className="flex items-start gap-4 rounded-[12px] border border-white/10 bg-black/30 backdrop-blur-sm px-4 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#4db6d4]/15">
                    <Clock className="h-4 w-4 text-[#4db6d4]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-none">24/7 Monitoring</p>
                    <p className="mt-1 text-[12px] text-white/60">Round-the-clock visibility into every panel.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-[12px] border border-white/10 bg-black/30 backdrop-blur-sm px-4 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-amber-400/15">
                    <Bell className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-none">Instant Alerts</p>
                    <p className="mt-1 text-[12px] text-white/60">Get notified the moment something needs attention.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-[12px] border border-white/10 bg-black/30 backdrop-blur-sm px-4 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white/10">
                    <BarChart2 className="h-4 w-4 text-white/70" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-none">Live Status</p>
                    <p className="mt-1 text-[12px] text-white/60">Real-time updates on all your connected panels.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 pt-4">
            <p className="text-[13px] text-white/50 font-medium">
              © {new Date().getFullYear()} Fyrlinc · All rights reserved
            </p>
          </div>
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main
          className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12 lg:py-12"
          style={{
            paddingTop: 'calc(3rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="relative z-10 w-full max-w-md animate-fade-in-up lg:max-w-[460px]">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <img
                src="/fyrlinc-logo.png"
                alt="Fyrlinc"
                className="h-12 w-12 rounded-[8px] object-cover border border-[var(--border-subtle)]"
              />
              <div>
                <p ref={mobileTitleRef} className="font-sans text-[1.25rem] font-semibold tracking-tight text-white leading-none">
                  Fyrlinc
                </p>
                <p ref={mobileSubtitleRef} className="mt-1 text-[13px] text-gray-300 font-medium">
                  Fire Alarm Panel Monitoring
                </p>
              </div>
            </div>
            <Outlet context={{ bgRef }} />
          </div>
        </main>
      </div>
    </div>
  );
}
