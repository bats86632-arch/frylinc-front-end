import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/themeCore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle flex h-10 w-10 items-center justify-center rounded-[10px] border text-[var(--text-secondary)] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:text-[var(--text-primary)]"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
