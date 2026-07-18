import { PanelTypeIcon } from "./PanelTypeIcon";
import { Panel } from "../types";

interface PanelTypeBadgeProps {
  type?: Panel["panelType"];
  className?: string;
  size?: "sm" | "md";
}

export function PanelTypeBadge({ type, className = "", size = "md" }: PanelTypeBadgeProps) {
  if (!type) return null;

  type Config = {
    bg: string;
    border: string;
    text: string;
    glow: string;
    label: string;
  };

  const config: Config = (() => {
    if (type === "Fire Alarm") return {
      bg: "bg-gradient-to-r from-red-500/15 to-orange-500/10",
      border: "border-red-500/30",
      text: "text-red-500",
      glow: "shadow-[0_0_8px_rgba(239,68,68,0.2)]",
      label: "Fire",
    };
    if (type === "Security") return {
      bg: "bg-gradient-to-r from-blue-500/15 to-indigo-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      glow: "shadow-[0_0_8px_rgba(96,165,250,0.2)]",
      label: "Security",
    };
    if (type === "GSM Module") return {
      bg: "bg-gradient-to-r from-emerald-500/15 to-teal-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-[0_0_8px_rgba(52,211,153,0.2)]",
      label: "GSM",
    };
    return {
      bg: "bg-[var(--surface-raised)]",
      border: "border-[var(--border-subtle)]",
      text: "text-[var(--text-secondary)]",
      glow: "",
      label: type,
    };
  })();

  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-[10px] gap-1"
    : "px-2.5 py-1 text-[11px] gap-1.5";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div
      className={`inline-flex items-center rounded-full border backdrop-blur-sm font-bold tracking-widest uppercase transition-all duration-200 hover:brightness-110 ${config.bg} ${config.border} ${config.glow} ${sizeClasses} ${className}`}
    >
      <PanelTypeIcon type={type} className={`${iconSize} ${config.text} flex-shrink-0`} />
      <span className={config.text}>{config.label}</span>
    </div>
  );
}
