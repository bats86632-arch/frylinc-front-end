import { Panel } from "../types";
import { Activity, RadioTower, AlertTriangle, MapPin, Hash, ShieldCheck, Zap } from "lucide-react";

interface PanelCardProps {
  panel: Panel;
}

export function PanelCard({ panel }: PanelCardProps) {
  return (
    <div className={`h-full flex flex-col ${panel.alarm ? "surface-alarm" : "surface-panel"} group`}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b border-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-[42px] w-[42px] items-center justify-center rounded-[12px] shadow-sm inset-highlight ring-1 ring-white/10 transition-colors duration-300 ${
              panel.alarm
                ? "bg-[rgba(232,23,58,0.15)] text-[#e8173a] border border-[rgba(232,23,58,0.3)]"
                : panel.status === "online"
                  ? "bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-white"
                  : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
            }`}
          >
            {panel.alarm ? (
              <AlertTriangle className="h-5 w-5 drop-shadow-sm" />
            ) : panel.status === "online" ? (
              <ShieldCheck className="h-5 w-5 drop-shadow-sm" />
            ) : (
              <Activity className="h-5 w-5" />
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
        ) : panel.status === "online" ? (
          <span className="badge-online">
            <span className="status-dot bg-[#34d399]" />
            Online
          </span>
        ) : (
          <span className="badge-offline">
            <span className="status-dot bg-white/20" />
            Offline
          </span>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/30">Location</p>
            <div className="flex items-center gap-2 text-[13.5px] font-medium text-white/80">
              <MapPin className="h-3.5 w-3.5 text-white/40" />
              <span className="truncate">{panel.location}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/30">Model</p>
            <div className="flex items-center gap-2 text-[13.5px] font-medium text-white/80">
              <RadioTower className="h-3.5 w-3.5 text-white/40" />
              <span>{panel.model}</span>
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
              {panel.zones.length} zones
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(panel.zones || []).filter(Boolean).slice(0, 8).map((zone) => (
              <div
                key={zone.id}
                title={zone.name}
                className={`relative flex h-10 flex-col items-center justify-center rounded-[8px] border transition-all duration-200 ${
                  zone.status === "alarm"
                    ? "zone-alarm shadow-sm z-10"
                    : zone.status === "fault"
                      ? "border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.08)] text-amber-300 inset-highlight"
                      : "zone-normal group-hover:border-white/[0.10] group-hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-[12px] font-bold">
                  {zone.name ? zone.name.split(" ")[1] : ""}
                  {!zone.name && zone.id ? `Z${zone.id.split("-")[1]}` : ""}
                </span>
              </div>
            ))}
            {(panel.zones || []).length > 8 && (
              <div className="flex h-10 items-center justify-center rounded-[8px] border border-dashed border-white/[0.10] text-[11px] font-bold text-white/30">
                +{(panel.zones || []).length - 8}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between border-t border-white/[0.04] bg-white/[0.01] px-5 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-white/30" />
          <span className="text-[12px] font-medium text-white/40">
            Last ping: <span className="text-white/60">2m ago</span>
          </span>
        </div>
        <span className="text-[12px] font-bold text-[#e8173a] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View details &rarr;
        </span>
      </div>
    </div>
  );
}
