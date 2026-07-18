import { Flame, Shield, Radio, Cpu } from "lucide-react";
import { Panel } from "../types";

interface PanelTypeIconProps {
  type?: Panel["panelType"];
  className?: string;
}

export function PanelTypeIcon({ type, className = "h-4 w-4" }: PanelTypeIconProps) {
  switch (type) {
    case "Fire Alarm":
      return <Flame className={`${className} text-[var(--color-error)]`} />;
    case "Security":
      return <Shield className={`${className} text-blue-500`} />;
    case "GSM Module":
      return <Radio className={`${className} text-[var(--color-success)]`} />;
    default:
      return <Cpu className={`${className} text-[var(--text-secondary)]`} />;
  }
}
