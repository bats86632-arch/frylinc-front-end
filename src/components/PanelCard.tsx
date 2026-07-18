import { useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "../types";
import { formatPanelName } from "../utils/formatters";
import { Activity, AlertTriangle, Hash, MapPin, RadioTower, Clock, CheckCircle } from "lucide-react";
import { PanelService } from "../api/PanelService";
import { PanelTypeBadge } from "./PanelTypeBadge";

interface PanelCardProps {
  panel: Panel;
}

  export function PanelCard({ panel }: PanelCardProps) {
  const [resolvingZone, setResolvingZone] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Ensure we always have exactly 8 zones (or zoneCount) to render
  const targetCount = panel.zoneCount || 8;
  
  const getZoneState = (isAlarm: boolean) => {
    if (isAlarm) return "alarm";
    return "clear";
  };

  const zonesArray = Array.from({ length: targetCount }, (_, i) => {
    const isAlarm = panel.zones && i < panel.zones.length ? (panel.zones[i] === 2 || panel.zones[i] === true) : false;
    return {
      index: i,
      name: `Zone ${i + 1}`,
      state: getZoneState(isAlarm),
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
      <div className={`h-full flex flex-col surface-panel group transition-colors duration-200 hover:bg-[var(--surface-hover)]`}>
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-[8px] ring-1 ring-[var(--border-subtle)] transition-colors duration-300 ${
                panel.alarm
                  ? "bg-[var(--status-danger-bg)] text-[var(--color-error)] border border-[var(--status-danger-border)]"
                  : "bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
              }`}
            >
              {panel.alarm ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-sans text-[1.1rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
                  {formatPanelName(panel.name, panel.panelType)}
                </h3>
                <PanelTypeBadge type={panel.panelType} size="sm" />
                {/* status dot */}
                {!panel.alarm && (
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                )}
                {panel.alarm && (
                  <span className="relative flex h-2 w-2">
                    <span className="relative h-full w-full rounded-full bg-[var(--color-error)]" />
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[12px] font-medium tracking-wide text-[var(--text-secondary)]">
                <Hash className="h-3 w-3" />
                <span>{panel.serial}</span>
              </div>
            </div>
          </div>

          {/* Alarm Count Chip */}
          {activeAlarmCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--status-danger-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-error)] border border-[var(--status-danger-border)]">
              {activeAlarmCount} Active
            </span>
          )}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">Branch ID</p>
              <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span className="truncate" title={panel.branchId || "Unknown"}>
                  {panel.branchId || "Unknown"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">Organization ID</p>
              <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                <RadioTower className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span className="truncate" title={panel.companyId || "Unknown"}>
                  {panel.companyId || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Mock Connection Data */}
          <div className="flex items-center justify-between rounded-md bg-[var(--surface-overlay)] p-3 border border-[var(--border-subtle)] mb-6">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
              <Clock className="h-3.5 w-3.5" />
              Synced 2s ago
            </div>
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
              RSSI
              <div className="flex items-end gap-[2px] h-3.5">
                <div className="w-1 h-1.5 bg-[var(--color-success)] rounded-[1px]" />
                <div className="w-1 h-2.5 bg-[var(--color-success)] rounded-[1px]" />
                <div className="w-1 h-3.5 bg-[var(--surface-hover)] rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* ── Zones Area ────────────────────────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Zone Status
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
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
                      ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] cursor-pointer hover:bg-[color-mix(in_srgb,var(--status-danger-bg)_80%,transparent)]"
                      : zone.state === "warning"
                      ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] cursor-default"
                      : zone.state === "offline"
                      ? "border-[var(--border-subtle)] border-dashed bg-transparent cursor-default opacity-50"
                      : "border-[var(--border-subtle)] bg-[var(--surface-overlay)] cursor-default group-hover:border-[var(--border-default)]"
                  }`}
                  disabled={zone.state !== "alarm"}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-[11px] font-bold ${zone.state === "alarm" ? "text-[var(--color-error)]" : zone.state === "warning" ? "text-[var(--color-warning)]" : "text-[var(--text-secondary)]"}`}>
                      Z{zone.index + 1}
                    </span>
                    <span className={`truncate text-[12px] font-medium ${
                      zone.state === "alarm" ? "text-[var(--text-primary)]" :
                      zone.state === "warning" ? "text-[var(--text-primary)]" :
                      zone.state === "offline" ? "text-[var(--text-quaternary)] line-through" :
                      "text-[var(--text-secondary)]"
                    }`}>
                      {zone.name}
                    </span>
                  </div>
                  {zone.state === "alarm" && (
                    <span className="relative flex h-[6px] w-[6px] shrink-0">
                      <span className="relative h-full w-full rounded-full bg-[var(--color-error)]" />
                    </span>
                  )}
                  {zone.state === "warning" && (
                    <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-warning)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="mt-auto flex items-center justify-end border-t border-[var(--border-subtle)] px-5 py-3">
          <span className="text-[12px] font-semibold text-[var(--accent)] transition-opacity duration-200 hover:text-[var(--accent-hover)]">
            View details &rarr;
          </span>
        </div>
      </div>

      {/* Resolution Modal */}
      {resolvingZone !== null && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setResolvingZone(null)}
          />
          <div className="animate-slide-up relative w-full max-w-sm overflow-hidden rounded-[16px] bg-[var(--surface-raised)] shadow-2xl ring-1 ring-[var(--border-subtle)]">
            <div className="h-1.5 w-full bg-[var(--color-error)]" />
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--status-danger-bg)] text-[var(--color-error)] ring-1 ring-[var(--status-danger-border)]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[var(--text-primary)]">Resolve Zone Alarm</h3>
              <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                Zone {resolvingZone + 1} is currently in an alarm state. Have you inspected and resolved the physical issue?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setResolvingZone(null)}
                  disabled={isResolving}
                  className="rounded-[6px] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveZone}
                  disabled={isResolving}
                  className="flex items-center gap-2 rounded-[6px] bg-[var(--color-error)] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[color-mix(in_srgb,var(--color-error)_90%,black)] disabled:opacity-50"
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
        </div>,
        document.body
      )}
    </>
  );
}
