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
}

const statToneClasses: Record<StatCardProps["tone"], string> = {
  neutral: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  alarm: "border-red-400/30 bg-red-500/10 text-red-200",
};

// Accent bar at the bottom of each stat card, keyed by tone
const statAccentClass: Record<StatCardProps["tone"], string> = {
  neutral: "bg-cyan-400/40",
  success: "bg-emerald-400/40",
  alarm: "bg-red-500/50",
};

function StatCard({ label, value, caption, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="surface-panel relative overflow-hidden rounded-lg p-4">
      {/* Colored bottom accent bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${statAccentClass[tone]}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-4xl font-semibold leading-none text-white">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${statToneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3">
        {tone === "alarm" && value > 0 && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        )}
        <p className="text-xs text-slate-500">{caption}</p>
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
    { value: "all", label: "All Panels", count: stats.total },
    { value: "alarms", label: "Alarms", count: stats.alarms },
  ];

  // ── Skeleton loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton hero */}
        <div className="surface-panel animate-pulse rounded-lg p-5">
          <div className="mb-3 h-5 w-32 rounded-full bg-white/[0.06]" />
          <div className="h-8 w-64 rounded-lg bg-white/[0.06]" />
          <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-white/[0.06]" />
        </div>

        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="surface-panel animate-pulse relative overflow-hidden rounded-lg p-4"
            >
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="h-3.5 w-24 rounded bg-white/[0.06]" />
                  <div className="mt-3 h-9 w-14 rounded bg-white/[0.06]" />
                </div>
                <div className="h-10 w-10 rounded-lg bg-white/[0.06]" />
              </div>
              <div className="mt-4 h-3 w-40 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>

        {/* Skeleton filter bar */}
        <div className="surface-muted animate-pulse rounded-lg p-3">
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-lg bg-white/[0.06]" />
            <div className="h-10 w-24 rounded-lg bg-white/[0.06]" />
          </div>
        </div>

        {/* Skeleton panel cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-panel animate-pulse rounded-lg p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="h-5 w-40 rounded bg-white/[0.06]" />
                  <div className="mt-2 h-3 w-24 rounded bg-white/[0.06]" />
                </div>
                <div className="h-7 w-20 rounded-full bg-white/[0.06]" />
              </div>
              <div className="mb-4 h-3 w-20 rounded bg-white/[0.06]" />
              <div className="mb-2 flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-white/[0.06]" />
                <div className="h-3 w-12 rounded bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="h-2.5 rounded-sm bg-white/[0.06]" />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <div className="h-3 w-16 rounded bg-white/[0.06]" />
                  <div className="mt-1.5 h-4 w-28 rounded bg-white/[0.06]" />
                </div>
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
        <div className="surface-panel max-w-md rounded-lg p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Error Loading Panels
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <section className="surface-panel relative overflow-hidden rounded-lg p-5">
        {/* Subtle ambient red glow bleeds in from the right when alarms are active */}
        {stats.alarms > 0 && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-red-950/20" />
        )}

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live panel telemetry
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-white">
              Fire Alarm Panels
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Real-time monitoring of all connected panels
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:items-center">
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Filtered</p>
              <p className="mt-1 font-semibold text-white">
                {filteredPanels.length} panels
              </p>
            </div>
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Alarm load</p>
              <p
                className={`mt-1 font-semibold ${stats.alarms > 0 ? "text-red-200" : "text-emerald-200"}`}
              >
                {stats.alarms} active
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
        />
        <StatCard
          label="Active Panels"
          value={stats.activePanels}
          caption="Online & monitored"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Active Alarms"
          value={stats.alarms}
          caption={
            stats.alarms > 0 ? "Needs immediate review" : "No active alarms"
          }
          icon={AlertTriangle}
          tone="alarm"
        />
      </div>

      {/* ── Filter / search bar ─────────────────────────────────────────────── */}
      <section className="surface-muted rounded-lg p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {filters.map((filter) => {
              const active = filterMode === filter.value;
              const isAlarmFilter = filter.value === "alarms";
              const alarmHint = isAlarmFilter && !active && stats.alarms > 0;

              return (
                <button
                  key={filter.value}
                  onClick={() => setFilterMode(filter.value)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-red-500 text-white shadow-lg shadow-red-950/30"
                      : alarmHint
                        ? "border border-red-400/20 bg-white/[0.03] text-red-300 hover:bg-red-500/10 hover:text-red-200"
                        : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {filter.label}
                  {/* Badge inside button when active, plain count when inactive */}
                  {active ? (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                      {filter.count}
                    </span>
                  ) : (
                    <span className="opacity-60">({filter.count})</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search panels by name or serial..."
                className="control-field w-full rounded-lg py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
                  viewMode === "grid"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
                  viewMode === "list"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Panel grid / list ────────────────────────────────────────────────── */}
      {filteredPanels.length === 0 ? (
        <div className="surface-panel rounded-lg py-16 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Filter className="h-10 w-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">No panels found</h3>
          <p className="mt-2 text-sm text-slate-400">
            {searchQuery
              ? `No panels matching "${searchQuery}"`
              : "No panels match the current filter"}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn-secondary mt-4 rounded-lg px-4 py-2 text-sm font-medium"
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
          <div className="flex items-center gap-3 rounded-full border border-red-300/30 bg-red-500 px-5 py-3 text-white shadow-[0_20px_40px_rgba(0,0,0,0.4),_0_0_24px_rgba(239,68,68,0.5)] animate-bounce-subtle">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">
              {stats.alarms} Active Alarm{stats.alarms > 1 ? "s" : ""}
            </span>
            <span className="text-red-300" aria-hidden="true">
              •
            </span>
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
