import { Outlet } from "react-router-dom";
import { useRef } from "react";
import { useAdaptiveTextColor } from "../hooks/useAdaptiveTextColor";

export function AuthLayout() {
  const bgRef = useRef<HTMLImageElement>(null);
  
  const desktopTitleRef = useRef<HTMLParagraphElement>(null);
  const desktopSubtitleRef = useRef<HTMLParagraphElement>(null);
  const mobileTitleRef = useRef<HTMLParagraphElement>(null);
  const mobileSubtitleRef = useRef<HTMLParagraphElement>(null);
  
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);

  useAdaptiveTextColor(desktopTitleRef, bgRef);
  useAdaptiveTextColor(desktopSubtitleRef, bgRef);
  useAdaptiveTextColor(mobileTitleRef, bgRef);
  useAdaptiveTextColor(mobileSubtitleRef, bgRef);
  useAdaptiveTextColor(heroTitleRef, bgRef);

  return (
    <div className="auth-screen relative min-h-screen overflow-hidden text-white">
      {/* Background Image */}
      <img 
        ref={bgRef}
        src="/agni-building.png"
        alt="Background"
        className="absolute inset-0 z-0 h-full w-full object-cover object-[65%_top] lg:object-center"
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
              <p ref={desktopTitleRef} className="font-sans text-[1.1rem] font-semibold tracking-tight text-white leading-none">
                Fyrlinc
              </p>
              <p ref={desktopSubtitleRef} className="mt-1 text-[12px] text-gray-300 tracking-wide font-medium">
                Fire Alarm Panel Monitoring
              </p>
            </div>
          </div>

          {/* Hero - warm, non-techy messaging */}
          <div className="animate-fade-in flex flex-1 flex-col items-start justify-end pb-4 w-full">
            {/* Hero text */}
            <div className="w-full">
              <h1 ref={heroTitleRef} className="font-sans text-[3rem] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] text-balance xl:text-[4.25rem] transition-colors duration-200 drop-shadow-md">
                Your fire safety,
                <br />
                <span>
                  always monitored.
                </span>
              </h1>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 pt-4">
            <p className="text-[13px] text-black font-medium">
              © {new Date().getFullYear()} Fyrlinc · All rights reserved
            </p>
          </div>
        </section>

        {/* ── Right auth panel ────────────────────────────────────────────── */}
        <main 
          className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12 lg:py-12"
          style={{
            paddingTop: 'calc(3rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))'
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
