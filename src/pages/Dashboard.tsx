import { useState } from "react";
import { Link } from "react-router-dom";
import { usePanels } from "../hooks/usePanels";
import { PanelCard } from "../components/PanelCard";
import { Activity, Flame, Search, ShieldAlert, Users, LayoutDashboard } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type FilterStatus = "all" | "alarm" | "online" | "offline";



export function Dashboard() {
  const { userData, hasRole } = useAuth();
  const { panels, loading, error } = usePanels();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeAlarms = (panels || []).filter((p) => p && p.alarm).length;
  // Assume all panels are online unless they are in alarm
  const onlinePanels = (panels || []).filter((p) => p && !p.alarm).length;

  const filteredPanels = (panels || []).filter((panel) => {
    if (!panel) return false;
    const matchesSearch =
      (panel.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (panel.serial || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filter === "all" ||
      (filter === "alarm" && panel.alarm) ||
      (filter === "online" && !panel.alarm);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
        <div className="skeleton h-20" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel p-8 text-center animate-fade-in-up">
        <ShieldAlert className="mx-auto h-12 w-12 text-[#e8173a] opacity-80 mb-4" />
        <p className="text-[15px] font-bold text-white drop-shadow-sm">System Error</p>
        <p className="mt-2 text-[13px] text-[#ff8099]">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-[32px] space-y-8">
      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6">
        {/* Hero Card */}
        <div className="surface-panel px-5 py-3 border-t-2 border-[#e53d3d] rounded-[14px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">Active Alarms</p>
          <p className={`mt-0.5 font-display text-[28px] font-bold leading-none tabular-nums ${activeAlarms > 0 ? 'text-[#e53d3d]' : 'text-[#f0ede8]'}`}>
            {activeAlarms}
          </p>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="surface-panel relative overflow-hidden px-5 py-3 pb-4 border-t-2 border-[#34d399] rounded-[14px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">Online Panels</p>
            <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
              {onlinePanels}
            </p>
            <div className="absolute bottom-0 left-0 right-0 flex h-[3px] w-full gap-[1px]">
              {[...Array(30)].map((_, i) => (
                <div key={i} className={`h-full flex-1 ${i < 29 ? 'bg-[#34d399]' : 'bg-[#e53d3d]'}`} />
              ))}
            </div>
          </div>

          <div className="surface-panel px-5 py-3 border-t-2 border-white/10 rounded-[14px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">Total Devices</p>
            <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
              {(panels || []).length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.06] pb-0 sticky top-[72px] z-20 bg-[#0f0f0e]/90 backdrop-blur-xl pt-4">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilter("all")}
            className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
              filter === "all"
                ? "border-[#e53d3d] text-[#f0ede8]"
                : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
            }`}
          >
            All Panels <span className="ml-1.5 rounded bg-white/5 px-1.5 py-0.5 text-[10px] tabular-nums">{(panels || []).length}</span>
          </button>
          <button
            onClick={() => setFilter("alarm")}
            className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
              filter === "alarm"
                ? "border-[#e53d3d] text-[#f0ede8]"
                : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
            }`}
          >
            Alarms <span className="ml-1.5 rounded bg-[#e53d3d]/10 text-[#e53d3d] px-1.5 py-0.5 text-[10px] tabular-nums">{activeAlarms}</span>
          </button>
          <button
            onClick={() => setFilter("online")}
            className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
              filter === "online"
                ? "border-[#e53d3d] text-[#f0ede8]"
                : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
            }`}
          >
            Online <span className="ml-1.5 rounded bg-[#34d399]/10 text-[#34d399] px-1.5 py-0.5 text-[10px] tabular-nums">{onlinePanels}</span>
          </button>
        </div>

        <div className="relative mb-[11px] w-full sm:w-72">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7773] z-10" />
          <input
            type="text"
            placeholder="Search by panel ID or location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-7 pb-1 text-[13px] text-[#f0ede8] placeholder-[#7a7773] border-b border-white/[0.06] focus:border-white/20 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {filteredPanels.length === 0 ? (
        <div className="surface-panel py-20 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-[16px] font-bold text-white drop-shadow-sm">No panels found</p>
          <p className="mt-2 text-[13px] font-medium text-white/40">
            {searchQuery
              ? "Try adjusting your search query."
              : "No panels match the current filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPanels.map((panel, idx) => (
            <div
              key={panel.serial || Math.random().toString()}
              className="animate-fade-in-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <Link to={`/panel/${panel.serial}`} className="block h-full group">
                <PanelCard panel={panel} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
