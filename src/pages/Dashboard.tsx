import { useState, useMemo } from "react";
import { usePanels } from "../hooks/usePanels";
import { PanelCard } from "../components/PanelCard";
import {
  AlertTriangle,
  Filter,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
} from "lucide-react";

type ViewMode = "grid" | "list";
type FilterMode = "all" | "alarms";

interface StatCardProps {
  label: string;
  value: number;
  caption: string;
  icon: typeof LayoutGrid;
  tone: "neutral" | "alarm" | "success";
  delay?: string;
}

// Accent colours per tone — flat, no glow
const statToneIcon: Record<StatCardProps["tone"], string> = {
  neutral: "border-white/[0.10] bg-white/[0.04] text-white/60",
  success: "border-emerald-400/[0.22] bg-emerald-400/[0.08] text-emerald-300",
  alarm:   "border-[rgba(232,23,58,0.25)] bg-[rgba(232,23,58,0.09)] text-[#ff8099]",
};

const statAccentBar: Record<StatCardProps["tone"], string> = {
  neutral: "bg-white/[0.12]",
  success: "bg-emerald-400/50",
  alarm:   "bg-[#e8173a]",
};

function StatCard({ label, value, caption, icon: Icon, tone, delay }: StatCardProps) {
  return (
    <div
      className="surface-panel relative overflow-hidden rounded-[12px] p-5 animate-fade-in-up"
      style={{ animationDelay: delay }}
    >
      {/* Bottom accent rail */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${statAccentBar[tone]}`} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-white/40 uppercase tracking-wide">{label}</p>
          <p className="mt-3 text-4xl font-bold leading-none text-white tabular-nums font-display">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-[9px] border ${statToneIcon[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-white/[0.07] pt-3">
        {tone === "alarm" && value > 0 && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#e8173a]" />
        )}
        <p className="text-[12px] font-medium text-white/35">{caption}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { panels, loading, error } = usePanels();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const filteredPanels = useMemo(() => {
    let result = [...panels];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (panel) =>
          panel.name.toLowerCase().includes(query) ||
          panel.serial.toLowerCase().includes(query),
      );
    }

    switch (filterMode) {
      case "alarms":
        result = result.filter((panel) => panel.alarm);
        break;
    }

    result.sort((a, b) => {
      if (a.alarm && !b.alarm) return -1;
      if (!a.alarm && b.alarm) return 1;
      if (!a.mqttConnected && b.mqttConnected) return 1;
      if (a.mqttConnected && !b.mqttConnected) return -1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [panels, searchQuery, filterMode]);

  const stats = useMemo(
    () => ({
      total: panels.length,
      activePanels: panels.filter((p) => !p.manuallyMarkedOffline).length,
      alarms: panels.filter((p) => p.alarm).length,
    }),
    [panels],
  );

  const filters: Array<{ value: FilterMode; label: string; count: number }> = [
    { value: "all",    label: "All Panels", count: stats.total },
    { value: "alarms", label: "Alarms",     count: stats.alarms },
  ];

  // ── Skeleton loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton hero */}
        <div className="surface-panel animate-pulse rounded-[12px] p-6">
          <div className="mb-3 h-4 w-24 rounded-full bg-white/[0.06]" />
          <div className="h-8 w-56 rounded-lg bg-white/[0.06]" />
          <div className="mt-3 h-4 w-80 max-w-full rounded-lg bg-white/[0.06]" />
        </div>

        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-panel animate-pulse relative overflow-hidden rounded-[12px] p-5">
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="h-3 w-20 rounded bg-white/[0.06]" />
                  <div className="mt-3 h-8 w-12 rounded bg-white/[0.06]" />
                </div>
                <div className="h-10 w-10 rounded-[9px] bg-white/[0.06]" />
              </div>
              <div className="mt-4 h-3 w-36 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>

        {/* Skeleton filter bar */}
        <div className="surface-muted animate-pulse rounded-[12px] p-3">
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-full bg-white/[0.06]" />
            <div className="h-9 w-24 rounded-full bg-white/[0.06]" />
          </div>
        </div>

        {/* Skeleton panel cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-panel animate-pulse rounded-[12px] p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="h-5 w-36 rounded bg-white/[0.06]" />
                  <div className="mt-2 h-3 w-20 rounded bg-white/[0.06]" />
                </div>
                <div className="h-6 w-18 rounded-full bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="h-[10px] rounded-[3px] bg-white/[0.06]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel max-w-md rounded-[12px] p-8 text-center animate-fade-in">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[12px] border border-[rgba(232,23,58,0.22)] bg-[rgba(232,23,58,0.09)] text-[#ff8099]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="font-display text-title font-bold text-white text-balance">
            Error Loading Panels
          </h3>
          <p className="mt-2.5 text-sm leading-6 text-white/45">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6 px-5 py-2.5 text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <section className="surface-panel relative overflow-hidden rounded-[12px] p-6">
        {stats.alarms > 0 && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(232,23,58,0.04)] to-transparent" />
        )}

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {/* Live badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/[0.20] bg-emerald-400/[0.07] px-3 py-1.5 text-[11px] font-semibold text-emerald-300 tracking-wide uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live telemetry
            </div>
            <h1 className="font-display text-display-lg font-bold leading-tight text-white text-balance">
              Fire Alarm Panels
            </h1>
            <p className="mt-2 max-w-2xl text-body leading-relaxed text-white/45">
              Real-time monitoring of all connected panels
            </p>
          </div>

          <div className="flex items-center text-sm">
            <div className="rounded-[9px] border border-white/[0.09] bg-white/[0.03] px-5 py-3">
              <p className="text-[11px] font-medium text-white/35 uppercase tracking-wide">Total Panels</p>
              <p className="mt-1 font-bold text-white tabular-nums font-display">
                {stats.total} panels
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Panels"
          value={stats.total}
          caption="All provisioned panels"
          icon={ShieldCheck}
          tone="neutral"
          delay="0ms"
        />
        <StatCard
          label="Active Panels"
          value={stats.activePanels}
          caption="Online & monitored"
          icon={ShieldCheck}
          tone="success"
          delay="60ms"
        />
        <StatCard
          label="Active Alarms"
          value={stats.alarms}
          caption={stats.alarms > 0 ? "Needs immediate review" : "No active alarms"}
          icon={AlertTriangle}
          tone="alarm"
          delay="120ms"
        />
      </div>

      {/* ── Filter / search bar ──────────────────────────────────────────────── */}
      <section className="surface-muted rounded-[12px] p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = filterMode === filter.value;
              const isAlarmFilter = filter.value === "alarms";
              const alarmHint = isAlarmFilter && !active && stats.alarms > 0;

              return (
                <button
                  key={filter.value}
                  onClick={() => setFilterMode(filter.value)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                    active
                      ? "bg-[#e8173a] text-white border border-transparent"
                      : alarmHint
                        ? "border border-[rgba(232,23,58,0.25)] bg-[rgba(232,23,58,0.06)] text-[#ff8099] hover:bg-[rgba(232,23,58,0.12)]"
                        : "border border-white/[0.10] bg-transparent text-white/50 hover:border-white/[0.18] hover:text-white/80"
                  }`}
                >
                  {filter.label}
                  {active ? (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                      {filter.count}
                    </span>
                  ) : (
                    <span className="opacity-50 tabular-nums">({filter.count})</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search panels…"
                className="control-field w-full rounded-[9px] py-2.5 pl-10 pr-4 text-sm"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-full border border-white/[0.10] bg-black/20 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                  viewMode === "grid"
                    ? "bg-white text-black shadow-sm"
                    : "text-white/40 hover:text-white/70"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-[15px] w-[15px]" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                  viewMode === "list"
                    ? "bg-white text-black shadow-sm"
                    : "text-white/40 hover:text-white/70"
                }`}
                aria-label="List view"
              >
                <List className="h-[15px] w-[15px]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Panel grid / list ────────────────────────────────────────────────── */}
      {filteredPanels.length === 0 ? (
        <div className="surface-panel rounded-[12px] py-20 text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03]">
            <Filter className="h-8 w-8 text-white/25" />
          </div>
          <h3 className="font-display text-title font-bold text-white text-balance">No panels found</h3>
          <p className="mt-2.5 text-sm text-white/40">
            {searchQuery
              ? `No panels matching "${searchQuery}"`
              : "No panels match the current filter"}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn-secondary mt-5 px-5 py-2.5 text-sm font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
              : "space-y-3"
          }
        >
          {filteredPanels.map((panel) => (
            <PanelCard key={panel.serial} panel={panel} viewMode={viewMode} />
          ))}
        </div>
      )}

      {/* ── Floating alarm toast ─────────────────────────────────────────────── */}
      {stats.alarms > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-[rgba(232,23,58,0.30)] bg-[#e8173a] px-6 py-3.5 text-white shadow-[0_8px_32px_rgba(0,0,0,0.6),_0_0_20px_rgba(232,23,58,0.35)] animate-bounce-subtle">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-bold tabular-nums">
              {stats.alarms} Active Alarm{stats.alarms > 1 ? "s" : ""}
            </span>
            <span className="text-white/50" aria-hidden="true">·</span>
            <button
              onClick={() => setFilterMode("alarms")}
              className="text-sm font-semibold underline-offset-2 hover:underline"
            >
              View All →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
