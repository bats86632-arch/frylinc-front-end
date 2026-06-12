import { useState } from "react";
import { Link } from "react-router-dom";
import { usePanels } from "../hooks/usePanels";
import { PanelCard } from "../components/PanelCard";
import { Activity, Flame, Search, ShieldAlert, Users, LayoutDashboard } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type FilterStatus = "all" | "alarm" | "online" | "offline";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  alert,
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendLabel?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`surface-panel p-6 ${
        alert ? "border-[rgba(232,23,58,0.30)] bg-gradient-to-br from-[rgba(232,23,58,0.08)] to-transparent" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-semibold text-white/50 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-3 font-display text-[2rem] font-bold leading-none tracking-tight text-white drop-shadow-sm">
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-[12px] shadow-sm inset-highlight ring-1 ring-white/10 ${
            alert
              ? "bg-[rgba(232,23,58,0.15)] text-[#ff8099] border border-[rgba(232,23,58,0.3)]"
              : "bg-white/[0.04] text-white/60 border border-white/[0.08]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(trend || trendLabel) && (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium">
          {trend && (
            <span
              className={
                trend.startsWith("+") ? "text-emerald-400" : "text-[#ff8099]"
              }
            >
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-white/40">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { panels, loading, error } = usePanels();
  const { userData, hasRole } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeAlarms = (panels || []).filter((p) => p && p.alarm).length;
  const onlinePanels = (panels || []).filter((p) => p && p.status === "online").length;
  const offlinePanels = (panels || []).filter((p) => p && p.status === "offline").length;

  const filteredPanels = (panels || []).filter((panel) => {
    if (!panel) return false;
    const matchesSearch =
      (panel.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (panel.serial || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filter === "all" ||
      (filter === "alarm" && panel.alarm) ||
      (filter === "online" && panel.status === "online" && !panel.alarm) ||
      (filter === "offline" && panel.status === "offline");

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
        <p className="mt-2 text-sm text-[#ff8099]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active Alarms"
          value={activeAlarms}
          icon={Flame}
          alert={activeAlarms > 0}
          trend={activeAlarms > 0 ? "+2 from last hour" : undefined}
          trendLabel={activeAlarms === 0 ? "All clear" : undefined}
        />
        <StatCard
          title="Online Panels"
          value={onlinePanels}
          icon={Activity}
          trend="+100%"
          trendLabel="uptime"
        />
        <StatCard
          title="Total Devices"
          value={(panels || []).length}
          icon={LayoutDashboard}
        />
      </div>

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="surface-muted flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between inset-highlight backdrop-blur-md sticky top-[80px] z-20">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setFilter("all")}
            className={`whitespace-nowrap rounded-pill px-4 py-2.5 text-[13px] font-bold transition-all duration-150 ${
              filter === "all"
                ? "bg-white/[0.08] text-white inset-highlight shadow-sm border border-white/[0.12]"
                : "text-white/50 border border-transparent hover:bg-white/[0.04] hover:text-white/90"
            }`}
          >
            All Panels
          </button>
          <button
            onClick={() => setFilter("alarm")}
            className={`whitespace-nowrap rounded-pill px-4 py-2.5 text-[13px] font-bold transition-all duration-150 ${
              filter === "alarm"
                ? "bg-[rgba(232,23,58,0.12)] text-[#ff8099] inset-highlight shadow-sm border border-[rgba(232,23,58,0.25)]"
                : "text-white/50 border border-transparent hover:bg-[rgba(232,23,58,0.08)] hover:text-[#ffb3c0]"
            }`}
          >
            Alarms
            {activeAlarms > 0 && (
              <span className="ml-2 rounded-full bg-[#e8173a] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                {activeAlarms}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("online")}
            className={`whitespace-nowrap rounded-pill px-4 py-2.5 text-[13px] font-bold transition-all duration-150 ${
              filter === "online"
                ? "bg-[rgba(52,211,153,0.12)] text-emerald-400 inset-highlight shadow-sm border border-[rgba(52,211,153,0.25)]"
                : "text-white/50 border border-transparent hover:bg-[rgba(52,211,153,0.08)] hover:text-emerald-300"
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setFilter("offline")}
            className={`whitespace-nowrap rounded-pill px-4 py-2.5 text-[13px] font-bold transition-all duration-150 ${
              filter === "offline"
                ? "bg-white/[0.08] text-white/80 inset-highlight shadow-sm border border-white/[0.12]"
                : "text-white/50 border border-transparent hover:bg-white/[0.04] hover:text-white/90"
            }`}
          >
            Offline
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 z-10" />
          <input
            type="text"
            placeholder="Search panels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="control-field w-full pl-10 sm:w-72"
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {filteredPanels.length === 0 ? (
        <div className="surface-panel py-20 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-[16px] font-bold text-white drop-shadow-sm">No panels found</p>
          <p className="mt-2 text-sm font-medium text-white/40">
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
