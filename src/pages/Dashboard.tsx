import { useState } from "react";
import { Link } from "react-router-dom";
import { usePanels } from "../hooks/usePanels";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { PanelCard } from "../components/PanelCard";
import {
  Activity,
  Flame,
  Search,
  ShieldAlert,
  ArrowLeft,
  Building2,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type FilterStatus = "all" | "alarm" | "online";

export function Dashboard() {
  const { userData } = useAuth();
  const { panels, loading: panelsLoading, error } = usePanels();
  const { companies, loading: companiesLoading } = useCompanies();
  const { branches, loading: branchesLoading } = useBranches();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // ── Role flags ──────────────────────────────────────────────────────────
  const role = userData?.role;
  const isSuperAdmin = role === "super_admin";
  const isHoOrSi = role === "head_office" || role === "system_integrator";
  const isEndUser = role === "end_user";

  // ── View calculation ────────────────────────────────────────────────────
  const showCompanyView = isSuperAdmin && !selectedCompanyId;
  const showBranchView =
    (isSuperAdmin && !!selectedCompanyId && !selectedBranchId) ||
    (isHoOrSi && !selectedBranchId);
  const showPanelView = isEndUser || !!selectedBranchId;

  // ── Company stats ───────────────────────────────────────────────────────
  const getCompanyStats = (companyId: string) => {
    const compPanels = (panels || []).filter((p) => p.companyId === companyId);
    const alarms = compPanels.filter((p) => p.alarm).length;
    return {
      total: compPanels.length,
      alarms,
      online: compPanels.length - alarms,
    };
  };

  // ── Branch stats ────────────────────────────────────────────────────────
  const getBranchStats = (branchId: string) => {
    const branchPanels = (panels || []).filter((p) => p.branchId === branchId);
    const alarmCount = branchPanels.filter((p) => p.alarm).length;
    return {
      total: branchPanels.length,
      alarms: alarmCount,
      online: branchPanels.length - alarmCount,
    };
  };

  // ── Panel filtering ─────────────────────────────────────────────────────
  let activePanels = panels || [];
  if (isSuperAdmin && selectedCompanyId) {
    activePanels = activePanels.filter(
      (p) => p.companyId === selectedCompanyId,
    );
  }
  if (selectedBranchId) {
    activePanels = activePanels.filter((p) => p.branchId === selectedBranchId);
  }

  const activeAlarms = activePanels.filter((p) => p && p.alarm).length;
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

  // ── Company filtering ───────────────────────────────────────────────────
  const filteredCompanies = (companies || []).filter(
    (c) =>
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Branch filtering ────────────────────────────────────────────────────
  const viewBranches = isSuperAdmin
    ? (branches || []).filter((b) => b.companyId === selectedCompanyId)
    : branches || [];

  const filteredBranches = viewBranches.filter((b) =>
    (b.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Branch view summary stats ───────────────────────────────────────────
  const branchAlarmCount = viewBranches.reduce(
    (acc, b) => acc + getBranchStats(b.id).alarms,
    0,
  );

  // ── Company view summary stats ──────────────────────────────────────────
  const systemAlarmCount = (companies || []).reduce(
    (acc, c) => acc + getCompanyStats(c.id).alarms,
    0,
  );

  // ── Loading ─────────────────────────────────────────────────────────────
  const loading =
    panelsLoading ||
    (isSuperAdmin && companiesLoading && showCompanyView) ||
    (showBranchView && branchesLoading);

  // ── Breadcrumb helpers ──────────────────────────────────────────────────
  const selectedCompanyName = (companies || []).find(
    (c) => c.id === selectedCompanyId,
  )?.name;
  const selectedBranchName = (branches || []).find(
    (b) => b.id === selectedBranchId,
  )?.name;

  // ── Loading skeleton ────────────────────────────────────────────────────
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
        <p className="text-[15px] font-bold text-white drop-shadow-sm">
          System Error
        </p>
        <p className="mt-2 text-[13px] text-[#ff8099]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-[32px] space-y-8">
      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6">
        {/* Breadcrumb / Back button */}
        {showBranchView && (
          <div className="flex items-center gap-3 animate-fade-in-up">
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setSelectedCompanyId(null);
                  setSelectedBranchId(null);
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#7a7773] transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
              {isSuperAdmin ? (
                <>
                  <Building2 className="h-4 w-4 text-[#7a7773]" />
                  {selectedCompanyName || "Branches"}
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-[#7a7773]" />
                  Branches
                </>
              )}
            </h2>
          </div>
        )}

        {showPanelView && !isEndUser && (
          <div className="flex items-center gap-3 animate-fade-in-up">
            <button
              onClick={() => {
                setSelectedBranchId(null);
                setSearchQuery("");
                setFilter("all");
              }}
              className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#7a7773] transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
              {isSuperAdmin && selectedCompanyName && (
                <>
                  <Building2 className="h-4 w-4 text-[#7a7773]" />
                  <span className="text-[#7a7773] font-medium">
                    {selectedCompanyName}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#7a7773]" />
                </>
              )}
              <MapPin className="h-4 w-4 text-[#7a7773]" />
              {selectedBranchName || "Branch"}
            </h2>
          </div>
        )}

        {/* Stats cards */}
        <div className="flex flex-col sm:flex-row gap-6">
          {showCompanyView && (
            <>
              <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[#e53d3d] rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  System Alarms
                </p>
                <p
                  className={`mt-0.5 font-display text-[28px] font-bold leading-none tabular-nums ${
                    systemAlarmCount > 0 ? "text-[#e53d3d]" : "text-[#f0ede8]"
                  }`}
                >
                  {systemAlarmCount}
                </p>
              </div>
              <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-white/10 rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  Total Companies
                </p>
                <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
                  {(companies || []).length}
                </p>
              </div>
            </>
          )}

          {showBranchView && (
            <>
              <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[#e53d3d] rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  Branch Alarms
                </p>
                <p
                  className={`mt-0.5 font-display text-[28px] font-bold leading-none tabular-nums ${
                    branchAlarmCount > 0 ? "text-[#e53d3d]" : "text-[#f0ede8]"
                  }`}
                >
                  {branchAlarmCount}
                </p>
              </div>
              <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-white/10 rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  Total Branches
                </p>
                <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
                  {viewBranches.length}
                </p>
              </div>
            </>
          )}

          {showPanelView && (
            <>
              <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[#e53d3d] rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  Active Alarms
                </p>
                <p
                  className={`mt-0.5 font-display text-[28px] font-bold leading-none tabular-nums ${
                    activeAlarms > 0 ? "text-[#e53d3d]" : "text-[#f0ede8]"
                  }`}
                >
                  {activeAlarms}
                </p>
              </div>
              <div className="flex-1 surface-panel relative overflow-hidden px-5 py-3 pb-4 border-t-2 border-[#34d399] rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  Online Panels
                </p>
                <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
                  {onlinePanels}
                </p>
                <div className="absolute bottom-0 left-0 right-0 flex h-[3px] w-full gap-[1px]">
                  {[...Array(30)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 ${i < 29 ? "bg-[#34d399]" : "bg-[#e53d3d]"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-white/10 rounded-[14px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
                  Total Devices
                </p>
                <p className="mt-0.5 font-display text-[24px] font-bold leading-none tabular-nums text-[#f0ede8]">
                  {activePanels.length}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.06] pb-0 sticky top-[72px] z-20 bg-[#0f0f0e]/90 backdrop-blur-xl pt-4">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {showCompanyView && (
            <div className="whitespace-nowrap pb-3 text-[13px] font-medium border-b-2 border-transparent text-[#f0ede8]">
              Companies Directory
            </div>
          )}
          {showBranchView && (
            <div className="whitespace-nowrap pb-3 text-[13px] font-medium border-b-2 border-transparent text-[#f0ede8]">
              Branches
            </div>
          )}
          {showPanelView && (
            <>
              <button
                onClick={() => setFilter("all")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "all"
                    ? "border-[#e53d3d] text-[#f0ede8]"
                    : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
                }`}
              >
                All Panels{" "}
                <span className="ml-1.5 rounded bg-white/5 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {activePanels.length}
                </span>
              </button>
              <button
                onClick={() => setFilter("alarm")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "alarm"
                    ? "border-[#e53d3d] text-[#f0ede8]"
                    : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
                }`}
              >
                Alarms{" "}
                <span className="ml-1.5 rounded bg-[#e53d3d]/10 text-[#e53d3d] px-1.5 py-0.5 text-[10px] tabular-nums">
                  {activeAlarms}
                </span>
              </button>
              <button
                onClick={() => setFilter("online")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "online"
                    ? "border-[#e53d3d] text-[#f0ede8]"
                    : "border-transparent text-[#7a7773] hover:text-[#f0ede8]"
                }`}
              >
                Online{" "}
                <span className="ml-1.5 rounded bg-[#34d399]/10 text-[#34d399] px-1.5 py-0.5 text-[10px] tabular-nums">
                  {onlinePanels}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="relative mb-[11px] w-full sm:w-72">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7773] z-10" />
          <input
            type="text"
            placeholder={
              showCompanyView
                ? "Search companies..."
                : showBranchView
                  ? "Search branches..."
                  : "Search by panel ID or name..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-7 pb-1 text-[13px] text-[#f0ede8] placeholder-[#7a7773] border-b border-white/[0.06] focus:border-white/20 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {showCompanyView ? (
        // ── COMPANY VIEW ────────────────────────────────────────────────────
        filteredCompanies.length === 0 ? (
          <div className="surface-panel py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <p className="text-[16px] font-bold text-white drop-shadow-sm">
              No companies found
            </p>
            <p className="mt-2 text-[13px] font-medium text-white/40">
              {searchQuery
                ? "Try adjusting your search query."
                : "No companies available."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company, idx) => {
              const stats = getCompanyStats(company.id);
              return (
                <button
                  key={company.id}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setSearchQuery("");
                  }}
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
                          {stats.alarms} ALARM{stats.alarms > 1 ? "S" : ""}
                        </div>
                      )}
                    </div>
                    <h3 className="text-[16px] font-bold text-[#f0ede8]">
                      {company.name}
                    </h3>
                    <p className="mt-1 text-[13px] text-[#7a7773] line-clamp-1">
                      {company.description || "No description provided"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.01] px-5 py-3 w-full">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">
                          Alarms
                        </p>
                        <p className={`text-[13px] font-bold ${stats.alarms > 0 ? "text-[#e53d3d]" : "text-[#f0ede8]"}`}>
                          {stats.alarms}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">
                          Online
                        </p>
                        <p className="text-[13px] font-bold text-[#34d399]">
                          {stats.online}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#7a7773] transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : showBranchView ? (
        // ── BRANCH VIEW ─────────────────────────────────────────────────────
        filteredBranches.length === 0 ? (
          <div className="surface-panel py-20 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <p className="text-[16px] font-bold text-white drop-shadow-sm">
              No branches found
            </p>
            <p className="mt-2 text-[13px] font-medium text-white/40">
              {searchQuery
                ? "Try adjusting your search query."
                : "No branches available."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBranches.map((branch, idx) => {
              const stats = getBranchStats(branch.id);
              return (
                <button
                  key={branch.id}
                  onClick={() => {
                    setSelectedBranchId(branch.id);
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="surface-panel group flex flex-col text-left transition-all hover:border-white/10 hover:bg-white/[0.03] animate-fade-in-up rounded-[14px] overflow-hidden"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="p-5 flex-1 w-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-[#f0ede8] ring-1 ring-white/10 group-hover:bg-white/10 transition-colors">
                        <MapPin className="h-5 w-5 opacity-70" />
                      </div>
                      {stats.alarms > 0 && (
                        <div className="flex items-center gap-1.5 rounded bg-[#e53d3d]/10 px-2 py-1 text-[11px] font-bold tracking-wide text-[#e53d3d]">
                          <Flame className="h-3 w-3" />
                          {stats.alarms} ALARM{stats.alarms > 1 ? "S" : ""}
                        </div>
                      )}
                    </div>
                    <h3 className="text-[16px] font-bold text-[#f0ede8]">
                      {branch.name}
                    </h3>
                    <p className="mt-1 text-[13px] text-[#7a7773] line-clamp-1">
                      {branch.address || "No address provided"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.01] px-5 py-3 w-full">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">
                          Alarms
                        </p>
                        <p className={`text-[13px] font-bold ${stats.alarms > 0 ? "text-[#e53d3d]" : "text-[#f0ede8]"}`}>
                          {stats.alarms}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a7773]">
                          Online
                        </p>
                        <p className="text-[13px] font-bold text-[#34d399]">
                          {stats.online}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#7a7773] transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : // ── PANEL VIEW ──────────────────────────────────────────────────────
      filteredPanels.length === 0 ? (
        <div className="surface-panel py-20 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-[16px] font-bold text-white drop-shadow-sm">
            No panels found
          </p>
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
              <Link
                to={`/panel/${panel.serial}`}
                className="block h-full group"
              >
                <PanelCard panel={panel} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
