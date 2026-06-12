import { useState } from "react";
import { Panel } from "../types";
import { Activity, RadioTower, AlertTriangle, MapPin, Hash, Zap, XCircle, CheckCircle } from "lucide-react";
import { PanelService } from "../api/PanelService";

interface PanelCardProps {
  panel: Panel;
}

export function PanelCard({ panel }: PanelCardProps) {
  const [resolvingZone, setResolvingZone] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Ensure we always have exactly 8 zones (or zoneCount) to render
  const targetCount = panel.zoneCount || 8;
  const zonesArray = Array.from({ length: targetCount }, (_, i) => {
    return panel.zones && i < panel.zones.length ? Boolean(panel.zones[i]) : false;
  });

  const handleResolveZone = async () => {
    if (resolvingZone === null) return;
    setIsResolving(true);
    try {
      await PanelService.resolveZoneAlarm(panel.serial, resolvingZone);
    } catch (err) {
      console.error("Failed to resolve zone alarm:", err);
    } finally {
      setIsResolving(false);
      setResolvingZone(null);
    }
  };

  return (
    <>
      <div className={`h-full flex flex-col ${panel.alarm ? "surface-alarm" : "surface-panel"} group`}>
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-[12px] shadow-sm inset-highlight ring-1 ring-white/10 transition-colors duration-300 ${
                panel.alarm
                  ? "bg-[rgba(232,23,58,0.15)] text-[#e8173a] border border-[rgba(232,23,58,0.3)]"
                  : "bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-white"
              }`}
            >
              {panel.alarm ? (
                <AlertTriangle className="h-5 w-5 drop-shadow-sm" />
              ) : (
                <Activity className="h-5 w-5 drop-shadow-sm" />
              )}
            </div>
            <div>
              <h3 className="font-display text-[1.1rem] font-bold leading-tight tracking-tight text-white drop-shadow-sm group-hover:text-white/90">
                {panel.name}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-white/40">
                <Hash className="h-3 w-3" />
                <span>{panel.serial}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {panel.alarm ? (
            <span className="badge-alarm">
              <span className="relative flex h-[6px] w-[6px]">
                <span className="absolute h-full w-full animate-ping rounded-full bg-[#ff8099] opacity-70" />
                <span className="relative h-full w-full rounded-full bg-[#ff8099]" />
              </span>
              Alarm
            </span>
          ) : (
            <span className="badge-online">
              <span className="status-dot bg-[#34d399]" />
              Online
            </span>
          )}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/30">Branch ID</p>
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-white/80">
                <MapPin className="h-3.5 w-3.5 text-white/40" />
                <span className="truncate" title={panel.branchId || "Unknown"}>
                  {panel.branchId || "Unknown"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/30">Company ID</p>
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-white/80">
                <RadioTower className="h-3.5 w-3.5 text-white/40" />
                <span className="truncate" title={panel.companyId || "Unknown"}>
                  {panel.companyId || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Zones Area ────────────────────────────────────────────────────── */}
          <div className="mt-6 rounded-[12px] border border-white/[0.04] bg-white/[0.02] p-4 inset-highlight">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Zone Status
              </span>
              <span className="text-[12px] font-semibold text-white/30">
                {targetCount} zones
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {zonesArray.map((isAlarm, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isAlarm) setResolvingZone(index);
                  }}
                  className={`relative flex h-10 flex-col items-center justify-center rounded-[8px] border transition-all duration-200 ${
                    isAlarm
                      ? "zone-alarm shadow-sm z-10 cursor-pointer hover:scale-[1.02]"
                      : "zone-normal group-hover:border-white/[0.10] group-hover:bg-white/[0.03] cursor-default"
                  }`}
                  disabled={!isAlarm}
                  aria-label={`Zone ${index + 1} status`}
                  title={`Zone ${index + 1}`}
                >
                  <span className="text-[12px] font-bold">
                    Z{index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="mt-auto flex items-center justify-end border-t border-white/[0.04] bg-white/[0.01] px-5 py-3">
          <span className="text-[12px] font-bold text-[#e8173a] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            View details &rarr;
          </span>
        </div>
      </div>

      {/* Resolution Modal */}
      {resolvingZone !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setResolvingZone(null)}
          />
          <div className="animate-slide-up relative w-full max-w-sm overflow-hidden rounded-[16px] bg-[#1a1c23] shadow-2xl ring-1 ring-white/10">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-[#e8173a]" />
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Resolve Zone Alarm</h3>
              <p className="mt-2 text-sm text-slate-400">
                Zone {resolvingZone + 1} is currently in an alarm state. Have you inspected and resolved the physical issue for this zone?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setResolvingZone(null)}
                  disabled={isResolving}
                  className="rounded-[10px] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveZone}
                  disabled={isResolving}
                  className="flex items-center gap-2 rounded-[10px] bg-[#e8173a] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-500 disabled:opacity-50"
                >
                  {isResolving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Yes, Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
