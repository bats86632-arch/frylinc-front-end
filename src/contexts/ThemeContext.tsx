import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getInitialTheme, ThemeContext, THEME_STORAGE_KEY } from "./themeCore";
import { configureStatusBar } from "../platform/status-bar";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    // Sync meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#111214' : '#f4f5f7');
    }
    // Sync native status bar colour with the current theme
    configureStatusBar(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    // Apply transition class for smooth visual transition
    document.documentElement.classList.add("theme-transition");
    
    setTheme((current) => (current === "dark" ? "light" : "dark"));
    
    // Remove the transition class after it completes so hover states are not affected
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 300); // 300ms matches the transition duration in CSS
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
