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
    ? "border-red-400/40 bg-red-500/10 text-red-100"
    : isOnline
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : "border-slate-400/20 bg-slate-500/10 text-slate-300";
  const railClass = hasAlarm
    ? "bg-red-500"
    : isOnline
      ? "bg-emerald-400"
      : "bg-slate-500";

  return (
    <Link
      to={`/panel/${panel.serial}`}
      className={`group relative block overflow-hidden rounded-[14px] border transition-all duration-250 ease-smooth hover:-translate-y-1 hover:border-amber-300/25 hover:shadow-elevation-2 ${
        hasAlarm
          ? "border-red-400/40 bg-red-950/20 animate-pulse-shadow shadow-glow-red hover:bg-red-950/30"
          : isOnline
            ? "border-white/[0.07] bg-slate-950/40 hover:bg-slate-900/60"
            : "border-white/[0.07] bg-slate-950/40 opacity-65 hover:opacity-85 hover:bg-slate-900/60"
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-[14px] ${railClass}`} />

      <div
        className={
          viewMode === "list"
            ? "grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:items-center"
            : "p-5"
        }
      >
        {/* ── Primary info ── */}
        <div className="min-w-0">
          <div className="mb-3.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-white leading-snug">
                  {panel.name}
                </h3>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-all duration-200 group-hover:text-amber-300/70 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500 tracking-wide">
                {panel.serial}
              </p>
              {groupId && (
                <span className="mt-1 block font-mono text-[11px] text-slate-600">
                  {groupId}
                </span>
              )}
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide ${stateClasses}`}
            >
              {hasAlarm ? (
                <AlertTriangle className="h-3 w-3" />
              ) : isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span className="tabular-nums">{panel.zoneCount} Zones</span>
            {panel.ipAddress && (
              <span className="font-mono text-[11px] tracking-wide">{panel.ipAddress}</span>
            )}
            {hasAlarm && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                <span className="tabular-nums">{alarmZones}</span> zone{alarmZones === 1 ? "" : "s"} active
              </span>
            )}
          </div>
        </div>

        {/* ── Zone map ── */}
        <div className={viewMode === "list" ? "sm:px-2" : "mt-5"}>
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Zone map</span>
            <span className="tabular-nums">{visibleZones} shown</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: visibleZones }).map((_, idx) => {
              const zoneAlarm = panel.zones[idx] || false;

              return (
                <div
                  key={idx}
                  className={`h-[10px] rounded-[3px] transition-all duration-200 ${
                    zoneAlarm
                      ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)]"
                      : isOnline
                        ? "bg-slate-700/80 group-hover:bg-slate-600/80"
                        : "bg-slate-800/60"
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
              ? "flex items-center justify-between rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:block"
              : "mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4"
          }
        >
          <div>
            <p className="text-[11px] font-medium text-slate-500">Connection</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                isOnline ? "text-emerald-200" : "text-slate-400"
              }`}
            >
              {isOnline ? "MQTT connected" : "Awaiting signal"}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-amber-300 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
