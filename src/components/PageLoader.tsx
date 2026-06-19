import { Loader2 } from "lucide-react";

export const PageLoader = () => {
  return (
    <div className="theme-scope flex min-h-screen items-center justify-center console-bg">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--status-warning-text)]" />
    </div>
  );
};
