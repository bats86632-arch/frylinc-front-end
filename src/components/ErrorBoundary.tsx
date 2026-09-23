import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[360px] p-6 text-center animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--color-error)] mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">
            {this.props.fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-[13px] text-[var(--text-secondary)] max-w-md mb-5">
            {this.state.error?.message || "An unexpected error occurred while loading this view."}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
