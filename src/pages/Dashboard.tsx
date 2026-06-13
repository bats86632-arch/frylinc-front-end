import { useState } from "react";
import { Link } from "react-router-dom";
import { usePanels } from "../hooks/usePanels";
import { useCompanies } from "../hooks/useCompanies";
import { PanelCard } from "../components/PanelCard";
import { Activity, Flame, Search, ShieldAlert, Users, LayoutDashboard, ArrowLeft, Building2, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type FilterStatus = "all" | "alarm" | "online" | "offline";

export function Dashboard() {
  const { userData, hasRole } = useAuth();
  const { panels, loading: panelsLoading, error } = usePanels();
  const { companies, loading: companiesLoading } = useCompanies();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const isSuperAdmin = hasRole(["super_admin"]);
  const showCompanyView = isSuperAdmin && !selectedCompanyId;

  // Derive stats for Super Admin Company View
  const getCompanyStats = (companyId: string) => {
    const compPanels = (panels || []).filter(p => p.companyId === companyId);
    const alarms = compPanels.filter(p => p.alarm).length;
    return { total: compPanels.length, alarms, online: compPanels.length - alarms };
  };

  const activePanels = (panels || []).filter(
    (p) => !isSuperAdmin || !selectedCompanyId || p.companyId === selectedCompanyId
  );

  const activeAlarms = activePanels.filter((p) => p && p.alarm).length;
  // Assume all panels are online unless they are in alarm
  const onlinePanels = activePanels.filter((p) => p && !p.alarm).length;

  const filteredPanels = activePanels.filter((panel) => {
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

  const filteredCompanies = (companies || []).filter(c => 
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loading = panelsLoading || (isSuperAdmin && companiesLoading);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in p-[32px]">
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
      <div className="surface-panel p-8 text-center animate-fade-in-up m-[32px]">
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
        {/* Header / Back Button if nested inside a company */}
        {isSuperAdmin && selectedCompanyId && (
          <div className="flex items-center gap-3 animate-fade-in-up">
            <button
              onClick={() => {
                setSelectedCompanyId(null);
                setSearchQuery("");
                setFilter("all");
              }}
              className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#7a7773] transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#7a7773]" />
              {companies.find(c => c.id === selectedCompanyId)?.name || 'Unknown Company'}
            </h2>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Hero Card */}
          <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[#e53d3d] rounded-[14px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
              {showCompanyView ? "System Alarms" : "Active Alarms"}
            </p>
            <p className={`mt-0.5 font-display text-[28px] font-bold leading-none tabular-nums ${activeAlarms > 0 ? 'text-[#e53d3d]' : 'text-[#f0ede8]'}`}>
              {activeAlarms}
            </p>
          </div>

          {/* Secondary Stats */}
          <div className="flex-1 surface-panel relative overflow-hidden px-5 py-3 pb-4 border-t-2 border-[#34d399] rounded-[14px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
              {showCompanyView ? "System Online" : "Online Panels"}
            </p>
            <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
              {onlinePanels}
            </p>
            <div className="absolute bottom-0 left-0 right-0 flex h-[3px] w-full gap-[1px]">
              {[...Array(30)].map((_, i) => (
                <div key={i} className={`h-full flex-1 ${i < 29 ? 'bg-[#34d399]' : 'bg-[#e53d3d]'}`} />
              ))}
            </div>
          </div>

          <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-white/10 rounded-[14px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
              {showCompanyView ? "Total Companies" : "Total Devices"}
            </p>
            <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
              {showCompanyView ? (companies || []).length : activePanels.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.06] pb-0 sticky top-[72px] z-20 bg-[#0f0f0e]/90 backdrop-blur-xl pt-4">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {!showCompanyView ? (
            <>
              <button
                onClick={() => setFilter("all")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "all"
                    ? "border-[#e53d3d] text-[#f0ede8]"
                    : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
                }`}
              >
                All Panels <span className="ml-1.5 rounded bg-white/5 px-1.5 py-0.5 text-[10px] tabular-nums">{activePanels.length}</span>
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
            </>
          ) : (
            <div className="whitespace-nowrap pb-3 text-[13px] font-medium border-b-2 border-transparent text-[#f0ede8]">
              Companies Directory
            </div>
          )}
        </div>

        <div className="relative mb-[11px] w-full sm:w-72">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7773] z-10" />
          <input
            type="text"
            placeholder={showCompanyView ? "Search companies..." : "Search by panel ID or name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-7 pb-1 text-[13px] text-[#f0ede8] placeholder-[#7a7773] border-b border-white/[0.06] focus:border-white/20 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {showCompanyView ? (
        // COMPANY VIEW GRID
        filteredCompanies.length === 0 ? (
          <div className="surface-panel py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <p className="text-[16px] font-bold text-white drop-shadow-sm">No companies found</p>
            <p className="mt-2 text-[13px] font-medium text-white/40">
              {searchQuery ? "Try adjusting your search query." : "No companies available."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company, idx) => {
              const stats = getCompanyStats(company.id);
              return (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className="surface-panel group flex flex-col text-left transition-all hover:border-white/10 hover:bg-white/[0.03] animate-fade-in-up rounded-[14px] overflow-hidden"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="p-5 flex-1 w-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-[#f0ede8] ring-1 ring-white/10 group-hover:bg-white/10 transition-colors">
                        <Building2 className="h-5 w-5 opacity-70" />
                      </div>
                      {stats.alarms > 0 && (
                        <div className="flex items-center gap-1.5 rounded bg-[#e53d3d]/10 px-2 py-1 text-[11px] font-bold tracking-wide text-[#e53d3d]">
                          <Flame className="h-3 w-3" />
                          {stats.alarms} ALARMS
                        </div>
                      )}
                    </div>
                    <h3 className="text-[16px] font-bold text-[#f0ede8]">{company.name}</h3>
                    <p className="mt-1 text-[13px] text-[#7a7773] line-clamp-1">
                      {company.description || "No description provided"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.01] px-5 py-3 w-full">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">Panels</p>
                        <p className="text-[13px] font-bold text-[#f0ede8]">{stats.total}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">Online</p>
                        <p className="text-[13px] font-bold text-[#34d399]">{stats.online}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#7a7773] transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        // PANELS GRID
        filteredPanels.length === 0 ? (
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
        )
      )}
    </div>
  );
}
