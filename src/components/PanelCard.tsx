import { Link } from "react-router-dom";
import { Panel } from "../types";
import { AlertTriangle, ArrowUpRight, Wifi, WifiOff } from "lucide-react";

interface PanelCardProps {
  panel: Panel;
  viewMode?: "grid" | "list";
}

export function PanelCard({ panel, viewMode = "grid" }: PanelCardProps) {
  const hasAlarm = panel.alarm;
  const isOnline = panel.manuallyMarkedOffline !== true;
  const alarmZones = panel.zones.filter(Boolean).length;
  const visibleZones = Math.min(panel.zoneCount, 16);
  const groupId: string | undefined = (panel as any).groupId;

  const statusLabel = hasAlarm ? "ALARM" : isOnline ? "Online" : "Offline";

  // Status badge colours — flat, no glass
  const badgeClass = hasAlarm
    ? "border-[rgba(232,23,58,0.28)] bg-[rgba(232,23,58,0.10)] text-[#ff8099]"
    : isOnline
      ? "border-emerald-400/[0.22] bg-emerald-400/[0.08] text-emerald-300"
      : "border-white/[0.08] bg-white/[0.04] text-white/35";

  // Left rail colour
  const railClass = hasAlarm
    ? "bg-[#e8173a]"
    : isOnline
      ? "bg-emerald-400"
      : "bg-white/[0.15]";

  // Card border
  const cardBorder = hasAlarm
    ? "border-[rgba(232,23,58,0.22)] bg-[rgba(232,23,58,0.05)]"
    : isOnline
      ? "border-white/[0.09] bg-[#111]"
      : "border-white/[0.06] bg-[#0f0f0f] opacity-60";

  return (
    <Link
      to={`/panel/${panel.serial}`}
      className={`group relative block overflow-hidden rounded-[12px] border transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-white/[0.16] hover:shadow-elevation-2 ${cardBorder} ${
        hasAlarm ? "animate-pulse-shadow" : ""
      }`}
    >
      {/* Left status rail */}
      <div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-[12px] ${railClass}`} />

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
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/20 transition-all duration-150 group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-1 font-mono text-[11px] text-white/30 tracking-wide">
                {panel.serial}
              </p>
              {groupId && (
                <span className="mt-1 block font-mono text-[11px] text-white/20">
                  {groupId}
                </span>
              )}
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase ${badgeClass}`}
            >
              {hasAlarm ? (
                <AlertTriangle className="h-2.5 w-2.5" />
              ) : isOnline ? (
                <Wifi className="h-2.5 w-2.5" />
              ) : (
                <WifiOff className="h-2.5 w-2.5" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/40">
            <span className="tabular-nums text-[13px]">{panel.zoneCount} Zones</span>
            {panel.ipAddress && (
              <span className="font-mono text-[11px] tracking-wide">{panel.ipAddress}</span>
            )}
            {hasAlarm && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff8099]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8173a] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e8173a]" />
                </span>
                <span className="tabular-nums">{alarmZones}</span>{" "}
                zone{alarmZones === 1 ? "" : "s"} active
              </span>
            )}
          </div>
        </div>

        {/* ── Zone map ── */}
        <div className={viewMode === "list" ? "sm:px-2" : "mt-5"}>
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-white/25">
            <span>Zone map</span>
            <span className="tabular-nums">{visibleZones} shown</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: visibleZones }).map((_, idx) => {
              const zoneAlarm = panel.zones[idx] || false;

              return (
                <div
                  key={idx}
                  className={`h-[9px] rounded-[3px] transition-all duration-150 ${
                    zoneAlarm
                      ? "bg-[#e8173a]"
                      : isOnline
                        ? "bg-white/[0.10] group-hover:bg-white/[0.15]"
                        : "bg-white/[0.05]"
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
              ? "flex items-center justify-between rounded-[9px] border border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:block"
              : "mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4"
          }
        >
          <div>
            <p className="text-[11px] font-medium text-white/25 uppercase tracking-wide">Connection</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                isOnline ? "text-emerald-300" : "text-white/35"
              }`}
            >
              {isOnline ? "MQTT connected" : "Awaiting signal"}
            </p>
          </div>
          <span className="text-[12px] font-semibold text-white/30 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:text-white/70">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
