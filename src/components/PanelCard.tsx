import { Link } from "react-router-dom";
import { Panel } from "../types";
import { AlertTriangle, ExternalLink, Wifi, WifiOff } from "lucide-react";

interface PanelCardProps {
  panel: Panel;
  viewMode?: "grid" | "list";
}

export function PanelCard({ panel, viewMode = "grid" }: PanelCardProps) {
  const hasAlarm = panel.alarm;
  const isOnline = panel.manuallyMarkedOffline !== true;
  const alarmZones = panel.zones.filter(Boolean).length;
  // Show up to 16 zones in the map
  const visibleZones = Math.min(panel.zoneCount, 16);
  // groupId is not yet on the Panel type; rendered only once the field exists
  const groupId: string | undefined = (panel as any).groupId;

  const statusLabel = hasAlarm ? "ALARM" : isOnline ? "Online" : "Offline";
  const stateClasses = hasAlarm
    ? "border-red-400/50 bg-red-500/10 text-red-100"
    : isOnline
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : "border-slate-400/20 bg-slate-500/10 text-slate-300";
  const railClass = hasAlarm
    ? "bg-red-500"
    : isOnline
      ? "bg-emerald-400"
      : "bg-slate-500";

  return (
    <Link
      to={`/panel/${panel.serial}`}
      className={`group relative block overflow-hidden rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/30 hover:shadow-2xl hover:shadow-black/30 ${
        hasAlarm
          ? "border-red-400/50 bg-red-950/20 animate-pulse-shadow shadow-[0_0_32px_rgba(239,68,68,0.12)] hover:bg-red-950/30"
          : isOnline
            ? "border-white/10 bg-slate-950/40 hover:bg-slate-900/70"
            : "border-white/10 bg-slate-950/40 opacity-70 hover:bg-slate-900/70"
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${railClass}`} />

      <div
        className={
          viewMode === "list"
            ? "grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:items-center"
            : "p-5"
        }
      >
        {/* ── Primary info ── */}
        <div className="min-w-0">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-white">
                  {panel.name}
                </h3>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-amber-200" />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {panel.serial}
              </p>
              {groupId && (
                <span className="mt-1 block font-mono text-[11px] text-slate-600">
                  {groupId}
                </span>
              )}
            </div>

            {/* Status badge — larger + bolder for alarm state */}
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${stateClasses}`}
            >
              {hasAlarm ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : isOnline ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span>{panel.zoneCount} Zones</span>
            {panel.ipAddress && (
              <span className="font-mono text-xs">{panel.ipAddress}</span>
            )}
            {hasAlarm && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                </span>
                {alarmZones} zone{alarmZones === 1 ? "" : "s"} active
              </span>
            )}
          </div>
        </div>

        {/* ── Zone map ── */}
        <div className={viewMode === "list" ? "sm:px-2" : "mt-5"}>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Zone map</span>
            <span>{visibleZones} shown</span>
          </div>
          {/* 8-column grid makes each zone pip larger and more legible */}
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: visibleZones }).map((_, idx) => {
              const zoneAlarm = panel.zones[idx] || false;

              return (
                <div
                  key={idx}
                  className={`h-2.5 rounded-sm ${
                    zoneAlarm
                      ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.75)]"
                      : isOnline
                        ? "bg-slate-700/90"
                        : "bg-slate-800"
                  }`}
                  title={`Zone ${idx + 1}: ${zoneAlarm ? "ALARM" : "Normal"}`}
                />
              );
            })}
          </div>
        </div>

        {/* ── Connection footer ── */}
        <div
          className={
            viewMode === "list"
              ? "flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 sm:block"
              : "mt-5 flex items-center justify-between border-t border-white/10 pt-4"
          }
        >
          <div>
            <p className="text-xs text-slate-500">Connection</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                isOnline ? "text-emerald-200" : "text-slate-400"
              }`}
            >
              {isOnline ? "MQTT connected" : "Awaiting signal"}
            </p>
          </div>
          {/* Always faintly visible, fully visible on hover */}
          <span className="text-xs font-medium text-amber-200 opacity-30 transition-opacity duration-150 group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
