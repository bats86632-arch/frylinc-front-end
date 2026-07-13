import { useState, useEffect } from "react";
import { Activity, Shield, Flame, Smartphone, DoorOpen, Video, Info } from "lucide-react";

const SYSTEMS = [
  { id: "fire", name: "Fire Alarm Systems", icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "security", name: "Security Panels", icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "gsm", name: "GSM Dialers", icon: Smartphone, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "access", name: "Access Control", icon: DoorOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "cctv", name: "CCTV Network", icon: Video, color: "text-amber-500", bg: "bg-amber-500/10" },
];

export const HealthMonitor = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="animate-fade-in p-[32px] space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Activity className="h-8 w-8 text-[var(--accent)]" />
            Health Monitoring System
          </h1>
          <p className="text-[var(--text-secondary)]">
            Universal uptime and connectivity tracking for all branch systems.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-400">
          <Info className="h-4 w-4" />
          Preview Mode — Coming Soon
        </div>
      </div>

      {/* Hero Banner for Coming Soon */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface-base)] p-8 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Data Integration Pending</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              This dashboard will soon provide live heartbeat monitoring and 24-hour timeline charts for your top 5 infrastructure categories. The user interface below is a live preview of the upcoming design. Real-time data integration is currently being finalized.
            </p>
          </div>
          <div className="shrink-0 flex gap-2">
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500 animate-pulse">
               <Activity className="h-6 w-6" />
             </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)] blur-[100px] opacity-10 pointer-events-none" />
      </div>

      {/* Systems Grid (Preview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SYSTEMS.map((sys, idx) => (
          <div 
            key={sys.id}
            className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm hover:shadow-lg transition-all"
            style={{ opacity: 0.7 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${sys.bg} ${sys.color}`}>
                  <sys.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)]">{sys.name}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full bg-green-500 ${idx % 2 === 0 ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-green-500">Demo</span>
              </div>
            </div>

            {/* Mock Timeline */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>24h Timeline</span>
                <span className="text-[var(--text-primary)] font-bold">99.{idx}% Uptime</span>
              </div>
              <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--surface-overlay)]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-full flex-1 ${Math.random() > 0.1 ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ opacity: i > 20 ? 0.3 : 1 }}
                  />
                ))}
              </div>
            </div>
            
            {/* Disabled overlay to clearly show it's a preview */}
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-base)]/10 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity rounded-2xl cursor-not-allowed">
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white shadow-xl backdrop-blur-md">
                Coming Soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
