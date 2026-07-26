import { formatPanelName } from '../utils/formatters';
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { usePanels } from "../hooks/usePanels";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { BranchService } from "../api/BranchService";
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
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { CopyButton } from "../components/CopyButton";

type FilterStatus = "all" | "alarm" | "online";

export function Dashboard() {
  const { userData } = useAuth();
  const { panels, loading: panelsLoading, error } = usePanels();
  const { companies, loading: companiesLoading } = useCompanies();
  const { branches, loading: branchesLoading } = useBranches();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(
    () => sessionStorage.getItem("dashboard_company_id")
  );
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(
    () => sessionStorage.getItem("dashboard_branch_id")
  );

  const setSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) sessionStorage.setItem("dashboard_company_id", id);
    else sessionStorage.removeItem("dashboard_company_id");
  };

  const setSelectedBranchId = (id: string | null) => {
    setSelectedBranchIdState(id);
    if (id) sessionStorage.setItem("dashboard_branch_id", id);
    else sessionStorage.removeItem("dashboard_branch_id");
  };

  const { reloadBranches } = useBranches();

  // ── Role flags ──────────────────────────────────────────────────────────
  const role = userData?.role;
  const isSuperAdmin = role === "super_admin";
  const isSystemIntegrator = role === "system_integrator";
  const isHoOrSi = role === "head_office" || isSystemIntegrator;
  const isEndUser = role === "end_user";

  const canViewCompanies = isSuperAdmin || isSystemIntegrator;

  // ── View calculation ────────────────────────────────────────────────────
  const viewBranches = canViewCompanies
    ? (branches || []).filter((b) => b.companyId === selectedCompanyId)
    : branches || [];
  
  const hasBranches = viewBranches.length > 0;

  const showCompanyView = canViewCompanies && !selectedCompanyId;
  const showBranchView =
    hasBranches &&
    ((canViewCompanies && !!selectedCompanyId && selectedCompanyId !== "unassigned" && !selectedBranchId) ||
    (isHoOrSi && !canViewCompanies && !selectedBranchId));
  const showPanelView = !showCompanyView && !showBranchView;

  // ── Company stats ───────────────────────────────────────────────────────
  const getCompanyStats = (companyId: string) => {
    const compPanels = companyId === "unassigned"
      ? (panels || []).filter((p) => !p.companyId)
      : (panels || []).filter((p) => p.companyId === companyId);
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
  if (canViewCompanies && selectedCompanyId) {
    if (selectedCompanyId === "unassigned") {
      activePanels = activePanels.filter((p) => !p.companyId);
    } else {
      activePanels = activePanels.filter((p) => p.companyId === selectedCompanyId);
    }
  }
  if (selectedBranchId) {
    activePanels = activePanels.filter((p) => p.branchId === selectedBranchId);
  }

  const activeAlarms = activePanels.filter((p) => p && p.alarm).length;
  const onlinePanels = activePanels.filter((p) => p && !p.alarm).length;

  const filteredPanels = activePanels.filter((panel) => {
    if (!panel) return false;
    const matchesSearch =
      formatPanelName(panel.name || "", panel.panelType).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (panel.serial || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filter === "all" ||
      (filter === "alarm" && panel.alarm) ||
      (filter === "online" && !panel.alarm);
    return matchesSearch && matchesStatus;
  });

  // ── Company filtering ───────────────────────────────────────────────────
  const unassignedCompany = {
    id: "unassigned",
    name: "Unassigned",
    description: "Panels without an organization",
    logoUrl: "",
    createdAt: "",
    updatedAt: ""
  } as any;
  const allCompanies = isSuperAdmin ? [...(companies || []), unassignedCompany] : (companies || []);

  const filteredCompanies = allCompanies.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Branch filtering ────────────────────────────────────────────────────
  const filteredBranches = viewBranches.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      (b.bsrCode || "").toLowerCase().includes(q) ||
      [b.addressLine1, b.addressLine2, b.city, b.state, b.zipCode].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  });

  // ── Branch view summary stats ───────────────────────────────────────────
  const branchAlarmCount = viewBranches.reduce(
    (acc, b) => acc + getBranchStats(b.id).alarms,
    0,
  );

  // ── Company view summary stats ──────────────────────────────────────────
  const systemAlarmCount = allCompanies.reduce(
    (acc, c) => acc + getCompanyStats(c.id).alarms,
    0,
  );

  // ── Loading ─────────────────────────────────────────────────────────────
  const loading =
    panelsLoading ||
    (canViewCompanies && companiesLoading && showCompanyView) ||
    (showBranchView && branchesLoading);

  // ── Breadcrumb helpers ──────────────────────────────────────────────────
  const selectedCompanyName = allCompanies.find(
    (c) => c.id === selectedCompanyId,
  )?.name;
  const selectedBranch = (branches || []).find(
    (b) => b.id === selectedBranchId,
  );
  const selectedBranchName = selectedBranch?.name;
  const selectedBranchBsr = selectedBranch?.bsrCode;

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
        <ShieldAlert className="mx-auto h-12 w-12 text-[var(--color-error)] opacity-80 mb-4" />
        <p className="text-[15px] font-bold text-[var(--text-primary)]">
          System Error
        </p>
        <p className="mt-2 text-[13px] text-[var(--color-error)]">{error.message}</p>
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
            {canViewCompanies && (
              <button
                onClick={() => {
                  setSelectedCompanyId(null);
                  setSelectedBranchId(null);
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="group flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              {canViewCompanies ? (
                <>
                  <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                  {selectedCompanyName || "Branches"}
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
                  Branches
                </>
              )}
            </h2>
          </div>
        )}

        {showPanelView && !isEndUser && (
          <div className="flex items-center gap-3 animate-fade-in-up">
            {(canViewCompanies || selectedBranchId) && (
              <button
                onClick={() => {
                  if (selectedBranchId) {
                    setSelectedBranchId(null);
                  } else if (canViewCompanies) {
                    setSelectedCompanyId(null);
                  }
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="group flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              {canViewCompanies && selectedCompanyName && (
                <>
                  <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)] font-medium">
                    {selectedCompanyName}
                  </span>
                  {selectedBranchId && (
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  )}
                </>
              )}
              {selectedBranchId ? (
                <>
                  <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
                  {selectedBranchName ? (
                    <>
                      {selectedBranchName}
                      {selectedBranchBsr && (
                        <span className="text-[var(--text-secondary)] font-normal text-[14px]">
                          ({selectedBranchBsr})
                        </span>
                      )}
                    </>
                  ) : (
                    "Branch"
                  )}
                </>
              ) : !isSuperAdmin ? (
                <>
                  <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span>All Panels</span>
                </>
              ) : null}
            </h2>
          </div>
        )}

        {/* Stats cards */}
        <div className="flex flex-col sm:flex-row gap-6">
          {showCompanyView && (
            <>
              <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[var(--color-error)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  System Alarms
                </p>
                <p
                  className={`mt-0.5 font-sans text-[28px] font-bold leading-none tabular-nums ${
                    systemAlarmCount > 0 ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {systemAlarmCount}
                </p>
              </div>
              <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-[var(--border-default)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Total Organizations
                </p>
                <p className="mt-0.5 font-sans text-[24px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                  {allCompanies.length}
                </p>
              </div>
            </>
          )}

          {showBranchView && (
            <>
              <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[var(--color-error)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Branch Alarms
                </p>
                <p
                  className={`mt-0.5 font-sans text-[28px] font-bold leading-none tabular-nums ${
                    branchAlarmCount > 0 ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {branchAlarmCount}
                </p>
              </div>
              <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-[var(--border-default)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Total Branches
                </p>
                <p className="mt-0.5 font-sans text-[24px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                  {viewBranches.length}
                </p>
              </div>
            </>
          )}

          {showPanelView && (
            <>
              <div className="surface-panel flex-1 px-5 py-3 border-t-2 border-[var(--color-error)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Active Alarms
                </p>
                <p
                  className={`mt-0.5 font-sans text-[28px] font-bold leading-none tabular-nums ${
                    activeAlarms > 0 ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {activeAlarms}
                </p>
              </div>
              <div className="flex-1 surface-panel relative overflow-hidden px-5 py-3 pb-4 border-t-2 border-[var(--color-success)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Online Panels
                </p>
                <p className="mt-0.5 font-sans text-[24px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                  {onlinePanels}
                </p>
                <div className="absolute bottom-0 left-0 right-0 flex h-[3px] w-full gap-[1px]">
                  {[...Array(30)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 ${i < 29 ? "bg-[var(--color-success)]" : "bg-[var(--color-error)]"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 surface-panel px-5 py-3 border-t-2 border-[var(--border-default)] rounded-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Total Devices
                </p>
                <p className="mt-0.5 font-sans text-[24px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                  {activePanels.length}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border-subtle)] pb-0 sticky top-[72px] z-20 bg-[var(--surface-base)]/90 backdrop-blur-xl pt-4">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {showCompanyView && (
            <div className="whitespace-nowrap pb-3 text-[13px] font-medium border-b-2 border-transparent text-[var(--text-primary)]">
              Organizations Directory
            </div>
          )}
          {showBranchView && (
            <div className="whitespace-nowrap pb-3 text-[13px] font-medium border-b-2 border-transparent text-[var(--text-primary)]">
              Branches
            </div>
          )}
          {showPanelView && (
            <>
              <button
                onClick={() => setFilter("all")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "all"
                    ? "border-[var(--color-error)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                All Panels{" "}
                <span className="ml-1.5 rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] tabular-nums">
                  {activePanels.length}
                </span>
              </button>
              <button
                onClick={() => setFilter("alarm")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "alarm"
                    ? "border-[var(--color-error)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Alarms{" "}
                <span className="ml-1.5 rounded bg-[var(--status-danger-bg)] text-[var(--color-error)] px-1.5 py-0.5 text-[10px] tabular-nums">
                  {activeAlarms}
                </span>
              </button>
              <button
                onClick={() => setFilter("online")}
                className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-all duration-150 border-b-2 ${
                  filter === "online"
                    ? "border-[var(--color-error)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Online{" "}
                <span className="ml-1.5 rounded bg-[var(--status-success-bg)] text-[var(--color-success)] px-1.5 py-0.5 text-[10px] tabular-nums">
                  {onlinePanels}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mb-[11px]">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)] z-10" />
            <input
              type="text"
              placeholder={
                showCompanyView
                  ? "Search organizations..."
                  : showBranchView
                    ? "Search branches..."
                    : "Search by panel ID or name..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-7 pb-1 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-secondary)] border-b border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {showCompanyView ? (
        // ── COMPANY VIEW ────────────────────────────────────────────────────
        filteredCompanies.length === 0 ? (
          <div className="surface-panel py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-[var(--text-quaternary)]" />
            <p className="text-[16px] font-bold text-[var(--text-primary)]">
              No organizations found
            </p>
            <p className="mt-2 text-[13px] font-medium text-[var(--text-quaternary)]">
              {searchQuery
                ? "Try adjusting your search query."
                : "No organizations available."}
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
                  className="surface-panel group flex flex-col text-left transition-all hover:border-[var(--border-default)] hover:bg-[var(--surface-raised)] animate-fade-in-up rounded-[12px] overflow-hidden"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="p-5 flex-1 w-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] group-hover:bg-[var(--surface-hover)] transition-colors overflow-hidden">
                        {company.logoUrl ? (
                          <img src={company.logoUrl} alt={`${company.name} logo`} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 opacity-70" />
                        )}
                      </div>
                      {stats.alarms > 0 && (
                        <div className="flex items-center gap-1.5 rounded bg-[var(--status-danger-bg)] px-2 py-1 text-[11px] font-bold tracking-wide text-[var(--color-error)]">
                          {stats.alarms} ALARM{stats.alarms > 1 ? "S" : ""}
                        </div>
                      )}
                    </div>
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                      {company.name}
                    </h3>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)] line-clamp-1">
                      {company.description || "No description provided"}
                    </p>
                  </div>
                  <div className="flex flex-col border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] w-full">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            Alarms
                          </p>
                          <p className={`text-[13px] font-bold ${stats.alarms > 0 ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"}`}>
                            {stats.alarms}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            Total Panels
                          </p>
                          <p className="text-[13px] font-bold text-[var(--text-primary)]">
                            {stats.total}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="flex items-center justify-between px-5 py-2.5 bg-[var(--surface-overlay)]">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] shrink-0 font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                          ID
                        </span>
                        <span className="font-mono truncate text-[11px] text-[var(--text-primary)]">
                          {company.id}
                        </span>
                      </div>
                      <CopyButton textToCopy={company.id} title="Copy ID" />
                    </div>
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
            <MapPin className="mx-auto mb-4 h-12 w-12 text-[var(--text-quaternary)]" />
            <p className="text-[16px] font-bold text-[var(--text-primary)]">
              No branches found
            </p>
            <p className="mt-2 text-[13px] font-medium text-[var(--text-quaternary)]">
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
                  className="surface-panel group flex flex-col text-left transition-all hover:border-[var(--border-default)] hover:bg-[var(--surface-raised)] animate-fade-in-up rounded-[12px] overflow-hidden"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="p-5 flex-1 w-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] group-hover:bg-[var(--surface-hover)] transition-colors">
                        <MapPin className="h-5 w-5 opacity-70" />
                      </div>
                      {stats.alarms > 0 && (
                        <div className="flex items-center gap-1.5 rounded bg-[var(--status-danger-bg)] px-2 py-1 text-[11px] font-bold tracking-wide text-[var(--color-error)]">
                          {stats.alarms} ALARM{stats.alarms > 1 ? "S" : ""}
                        </div>
                      )}
                    </div>
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                      {branch.name} {branch.bsrCode && <span className="text-[var(--text-secondary)] font-normal">({branch.bsrCode})</span>}
                    </h3>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)] line-clamp-1">
                      {[branch.addressLine1, branch.addressLine2, branch.city, branch.state, branch.zipCode].filter(Boolean).length > 0 ? [branch.addressLine1, branch.addressLine2, branch.city, branch.state, branch.zipCode].filter(Boolean).join(', ') : "No address provided"}
                    </p>
                  </div>
                  <div className="flex flex-col border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] w-full">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            Alarms
                          </p>
                          <p className={`text-[13px] font-bold ${stats.alarms > 0 ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"}`}>
                            {stats.alarms}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            Online
                          </p>
                          <p className="text-[13px] font-bold text-[var(--color-success)]">
                            {stats.online}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="flex items-center justify-between px-5 py-2.5 bg-[var(--surface-overlay)]">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] shrink-0 font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                          ID
                        </span>
                        <span className="font-mono truncate text-[11px] text-[var(--text-primary)]">
                          {branch.id}
                        </span>
                      </div>
                      <CopyButton textToCopy={branch.id} title="Copy ID" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : // ── PANEL VIEW ──────────────────────────────────────────────────────
      filteredPanels.length === 0 ? (
        <div className="surface-panel py-20 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-[var(--text-quaternary)]" />
          <p className="text-[16px] font-bold text-[var(--text-primary)]">
            No panels found
          </p>
          <p className="mt-2 text-[13px] font-medium text-[var(--text-quaternary)]">
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
