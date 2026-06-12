import { useState } from "react";
import { Panel } from "../types";
import { Activity, RadioTower, AlertTriangle, MapPin, Hash, CheckCircle, Clock } from "lucide-react";
import { PanelService } from "../api/PanelService";

interface PanelCardProps {
  panel: Panel;
}

  export function PanelCard({ panel }: PanelCardProps) {
  const [resolvingZone, setResolvingZone] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Ensure we always have exactly 8 zones (or zoneCount) to render
  const targetCount = panel.zoneCount || 8;
  
  const getZoneState = (isAlarm: boolean, idx: number, serial: string) => {
    if (isAlarm) return "alarm";
    return "clear";
  };

  const zonesArray = Array.from({ length: targetCount }, (_, i) => {
    const isAlarm = panel.zones && i < panel.zones.length ? Boolean(panel.zones[i]) : false;
    return {
      index: i,
      name: `Zone ${i + 1}`,
      state: getZoneState(isAlarm, i, panel.serial || "A"),
    };
  });

  const activeAlarmCount = zonesArray.filter(z => z.state === "alarm").length;

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
      <div className={`h-full flex flex-col surface-panel group transition-colors duration-200 hover:bg-[#222120]`}>
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-[10px] ring-1 ring-white/10 transition-colors duration-300 ${
                panel.alarm
                  ? "bg-[#e53d3d]/10 text-[#e53d3d] border border-[#e53d3d]/20"
                  : "bg-white/[0.03] text-[#f0ede8] border border-white/[0.06]"
              }`}
            >
              {panel.alarm ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[1.1rem] font-bold leading-tight tracking-tight text-[#f0ede8]">
                  {panel.name}
                </h3>
                {/* 8px inline green dot */}
                {!panel.alarm && (
                  <span className="h-2 w-2 rounded-full bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                )}
                {panel.alarm && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-[#e53d3d] opacity-70" />
                    <span className="relative h-full w-full rounded-full bg-[#e53d3d]" />
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] font-medium tracking-wide text-[#7a7773]">
                <Hash className="h-3 w-3" />
                <span>{panel.serial}</span>
              </div>
            </div>
          </div>

          {/* Alarm Count Chip */}
          {activeAlarmCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#e53d3d]/10 px-2.5 py-1 text-[11px] font-bold text-[#e53d3d] border border-[#e53d3d]/20">
              {activeAlarmCount} Active
            </span>
          )}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">Branch ID</p>
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#f0ede8]">
                <MapPin className="h-3.5 w-3.5 text-[#7a7773]" />
                <span className="truncate" title={panel.branchId || "Unknown"}>
                  {panel.branchId || "Unknown"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">Company ID</p>
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#f0ede8]">
                <RadioTower className="h-3.5 w-3.5 text-[#7a7773]" />
                <span className="truncate" title={panel.companyId || "Unknown"}>
                  {panel.companyId || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Mock Connection Data */}
          <div className="flex items-center justify-between rounded-md bg-white/[0.02] p-3 border border-white/[0.04] mb-6">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#7a7773]">
              <Clock className="h-3.5 w-3.5" />
              Synced 2s ago
            </div>
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#7a7773]">
              RSSI
              <div className="flex items-end gap-[2px] h-3.5">
                <div className="w-1 h-1.5 bg-[#34d399] rounded-[1px]" />
                <div className="w-1 h-2.5 bg-[#34d399] rounded-[1px]" />
                <div className="w-1 h-3.5 bg-white/10 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* ── Zones Area ────────────────────────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">
                Zone Status
              </span>
              <span className="text-[11px] font-medium text-[#7a7773]">
                {targetCount} zones
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {zonesArray.map((zone) => (
                <button
                  key={zone.index}
                  onClick={(e) => {
                    e.preventDefault();
                    if (zone.state === "alarm") setResolvingZone(zone.index);
                  }}
                  className={`relative flex items-center justify-between rounded-[6px] border px-3 py-2 transition-all duration-200 text-left ${
                    zone.state === "alarm"
                      ? "border-[#e53d3d]/30 bg-[#e53d3d]/10 cursor-pointer hover:bg-[#e53d3d]/20"
                      : zone.state === "warning"
                      ? "border-amber-400/20 bg-amber-400/10 cursor-default"
                      : zone.state === "offline"
                      ? "border-white/5 border-dashed bg-transparent cursor-default opacity-50"
                      : "border-white/[0.04] bg-[#222120] cursor-default group-hover:border-white/[0.08]"
                  }`}
                  disabled={zone.state !== "alarm"}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-[11px] font-bold ${zone.state === "alarm" ? "text-[#e53d3d]" : zone.state === "warning" ? "text-amber-400" : "text-[#7a7773]"}`}>
                      Z{zone.index + 1}
                    </span>
                    <span className={`truncate text-[12px] font-medium ${
                      zone.state === "alarm" ? "text-[#f0ede8]" :
                      zone.state === "warning" ? "text-[#f0ede8]" :
                      zone.state === "offline" ? "text-white/40 line-through" :
                      "text-[#7a7773]"
                    }`}>
                      {zone.name}
                    </span>
                  </div>
                  {zone.state === "alarm" && (
                    <span className="relative flex h-[6px] w-[6px] shrink-0">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-[#e53d3d] opacity-70" />
                      <span className="relative h-full w-full rounded-full bg-[#e53d3d]" />
                    </span>
                  )}
                  {zone.state === "warning" && (
                    <span className="h-[6px] w-[6px] rounded-full bg-amber-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="mt-auto flex items-center justify-end border-t border-white/[0.04] px-5 py-3">
          <span className="text-[12px] font-semibold text-[#e53d3d] transition-opacity duration-200 hover:text-[#ff4f4f]">
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
          <div className="animate-slide-up relative w-full max-w-sm overflow-hidden rounded-[16px] bg-[#1a1917] shadow-2xl ring-1 ring-white/10">
            <div className="h-1.5 w-full bg-[#e53d3d]" />
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#e53d3d]/10 text-[#e53d3d] ring-1 ring-[#e53d3d]/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#f0ede8]">Resolve Zone Alarm</h3>
              <p className="mt-2 text-[13px] text-[#7a7773]">
                Zone {resolvingZone + 1} is currently in an alarm state. Have you inspected and resolved the physical issue?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setResolvingZone(null)}
                  disabled={isResolving}
                  className="rounded-[8px] px-4 py-2 text-[13px] font-medium text-[#7a7773] transition-colors hover:bg-white/5 hover:text-[#f0ede8] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveZone}
                  disabled={isResolving}
                  className="flex items-center gap-2 rounded-[8px] bg-[#e53d3d] px-5 py-2 text-[13px] font-medium text-[#f0ede8] transition-colors hover:bg-[#ff4f4f] disabled:opacity-50"
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
