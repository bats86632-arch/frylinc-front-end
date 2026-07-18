import { PanelTypeIcon } from "./PanelTypeIcon";
import { Panel } from "../types";

interface PanelTypeBadgeProps {
  type?: Panel["panelType"];
  className?: string;
  size?: "sm" | "md";
}

export function PanelTypeBadge({ type, className = "", size = "md" }: PanelTypeBadgeProps) {
  if (!type) return null;

  let bgClass = "bg-[var(--surface-raised)] border-[var(--border-subtle)]";
  let textClass = "text-[var(--text-secondary)]";
  let label = type;

  if (type === "Fire Alarm") {
    bgClass = "bg-red-500/10 border-red-500/20";
    textClass = "text-[var(--color-error)]";
    label = "Fire";
  } else if (type === "Security") {
    bgClass = "bg-blue-500/10 border-blue-500/20";
    textClass = "text-blue-500";
    label = "Security";
  } else if (type === "GSM Module") {
    bgClass = "bg-green-500/10 border-green-500/20";
    textClass = "text-[var(--color-success)]";
    label = "GSM";
  }

  const paddingClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${bgClass} ${paddingClass} font-semibold tracking-wide ${className}`}>
      <PanelTypeIcon type={type} className={`${iconSize} ${textClass}`} />
      <span className={textClass}>{label}</span>
    </div>
  );
}
