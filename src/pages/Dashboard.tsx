import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import * as xlsx from "xlsx";
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
  Upload,
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // ── Bulk Upload State ───────────────────────────────────────────────────
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkUploadResults, setBulkUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const { reloadBranches } = useBranches();

  // ── Bulk Upload Logic ───────────────────────────────────────────────────
  const downloadBranchTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      {
        "Branch Name": "Mumbai South Branch",
        "BSR Code": "MUM-01",
        "Address Line 1": "Nariman Point",
        "Address Line 2": "",
        "City": "Mumbai",
        "State": "Maharashtra",
        "Zip Code": "400021",
        "Supervisor Name": "John Doe",
        "Contact Number": "9876543210",
        "Email Address": "mumbai.south@example.com",
      },
      {
        "Branch Name": "Delhi North Branch",
        "BSR Code": "DEL-02",
        "Address Line 1": "Connaught Place",
        "Address Line 2": "",
        "City": "Delhi",
        "State": "Delhi",
        "Zip Code": "110001",
        "Supervisor Name": "Jane Smith",
        "Contact Number": "9876543211",
        "Email Address": "delhi.north@example.com",
      },
      {
        "Branch Name": "Bangalore Tech Park",
        "BSR Code": "BLR-03",
        "Address Line 1": "Whitefield",
        "Address Line 2": "",
        "City": "Bangalore",
        "State": "Karnataka",
        "Zip Code": "560066",
        "Supervisor Name": "Alice Johnson",
        "Contact Number": "9876543212",
        "Email Address": "blr.tech@example.com",
      },
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Branches");
    xlsx.writeFile(wb, "branch_bulk_template.xlsx");
  };

  const handleBranchBulkUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkUploadResults(null);
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      const targetCompanyId = isSuperAdmin ? selectedCompanyId : userData?.companyId;
      if (!targetCompanyId) {
        throw new Error("No company selected or assigned.");
      }

      const data = await file.arrayBuffer();
      const wb = xlsx.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json<any>(ws);

      if (rows.length === 0) {
        throw new Error("The uploaded file is empty.");
      }

      for (const [index, row] of rows.entries()) {
        const rowNum = index + 2;
        try {
          const branchName = row["Branch Name"]?.toString().trim();
          if (!branchName) {
            throw new Error("Branch Name is required.");
          }

          await BranchService.createBranch({
            name: branchName,
            companyId: targetCompanyId,
            bsrCode: row["BSR Code"]?.toString(),
            addressLine1: row["Address Line 1"]?.toString(),
            addressLine2: row["Address Line 2"]?.toString(),
            city: row["City"]?.toString(),
            state: row["State"]?.toString(),
            zipCode: row["Zip Code"]?.toString(),
            supervisorName: row["Supervisor Name"]?.toString(),
            contactNumber: row["Contact Number"]?.toString(),
            emailAddress: row["Email Address"]?.toString(),
          });

          successCount++;
        } catch (err: any) {
          failedCount++;
          errors.push(
            `Row ${rowNum} (${row["Branch Name"] || "Unknown"}): ${err.response?.data?.error || err.message}`
          );
        }
      }

      await reloadBranches();
      setBulkUploadResults({ success: successCount, failed: failedCount, errors });
    } catch (err: any) {
      errors.push(`Upload failed: ${err.message}`);
      setBulkUploadResults({ success: 0, failed: 1, errors });
    } finally {
      setBulkUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ── Role flags ──────────────────────────────────────────────────────────
  const role = userData?.role;
  const isSuperAdmin = role === "super_admin";
  const isHoOrSi = role === "head_office" || role === "system_integrator";
  const isEndUser = role === "end_user";

  // ── View calculation ────────────────────────────────────────────────────
  const showCompanyView = isSuperAdmin && !selectedCompanyId;
  const showBranchView =
    (isSuperAdmin && !!selectedCompanyId && selectedCompanyId !== "unassigned" && !selectedBranchId) ||
    (isHoOrSi && !selectedBranchId);
  const showPanelView = isEndUser || !!selectedBranchId || selectedCompanyId === "unassigned";

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
  if (isSuperAdmin && selectedCompanyId) {
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
      (panel.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
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
  const viewBranches = isSuperAdmin
    ? (branches || []).filter((b) => b.companyId === selectedCompanyId)
    : branches || [];

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
    (isSuperAdmin && companiesLoading && showCompanyView) ||
    (showBranchView && branchesLoading);

  // ── Breadcrumb helpers ──────────────────────────────────────────────────
  const selectedCompanyName = allCompanies.find(
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
            {isSuperAdmin && (
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
              {isSuperAdmin ? (
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
            <button
              onClick={() => {
                if (selectedCompanyId === "unassigned") {
                  setSelectedCompanyId(null);
                } else {
                  setSelectedBranchId(null);
                }
                setSearchQuery("");
                setFilter("all");
              }}
              className="group flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              {isSuperAdmin && selectedCompanyName && (
                <>
                  <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)] font-medium">
                    {selectedCompanyName}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                </>
              )}
              <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
              {selectedBranchName || "Branch"}
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
          {showBranchView && !isEndUser && role !== "system_integrator" && (
            <button
              onClick={() => setBulkUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--surface-raised)] px-4 py-2 text-[13px] font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
            >
              <FileText className="h-4 w-4" />
              Use Excel
            </button>
          )}

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
                          <Flame className="h-3 w-3" />
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
                          <Flame className="h-3 w-3" />
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

      {/* ── Bulk Upload Modal ────────────────────────────────────────────────── */}
      {bulkUploadModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => {
                if (!bulkUploading) {
                  setBulkUploadModalOpen(false);
                  setBulkUploadResults(null);
                }
              }}
            />
            <div className="relative w-full max-w-lg rounded-[16px] bg-[var(--surface-base)] shadow-2xl overflow-hidden animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 bg-[var(--surface-overlay)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--surface-raised)] ring-1 ring-[var(--border-subtle)]">
                    <FileText className="h-5 w-5 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
                      Bulk Upload Branches
                    </h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">
                      Add multiple branches via Excel
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!bulkUploading) {
                      setBulkUploadModalOpen(false);
                      setBulkUploadResults(null);
                    }
                  }}
                  className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                  disabled={bulkUploading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {!bulkUploadResults ? (
                  <>
                    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-4 text-[13px] text-[var(--text-secondary)]">
                      <p className="mb-2">
                        1. Download the Excel template.
                      </p>
                      <p className="mb-4">
                        2. Fill in your branch details. <strong>Branch Name</strong> is required.
                      </p>
                      <button
                        onClick={downloadBranchTemplate}
                        className="flex items-center gap-2 rounded-lg bg-[var(--surface-raised)] px-4 py-2 text-[13px] font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                      >
                        <FileText className="h-4 w-4" />
                        Download Template
                      </button>
                    </div>

                    <div className="relative flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[var(--border-subtle)] p-8 text-center bg-[var(--surface-overlay)] hover:bg-[var(--surface-raised)] transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleBranchBulkUpload}
                        disabled={bulkUploading}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      {bulkUploading ? (
                        <>
                          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--text-primary)]" />
                          <p className="text-[14px] font-medium text-[var(--text-primary)]">
                            Processing upload...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="mb-3 h-8 w-8 text-[var(--text-secondary)]" />
                          <p className="text-[14px] font-medium text-[var(--text-primary)]">
                            Click or drag to upload completed Excel file
                          </p>
                          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                            .xlsx or .xls files only
                          </p>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-[12px] border border-[var(--color-success)] bg-[var(--status-success-bg)] p-4">
                      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                      <div>
                        <p className="text-[14px] font-bold text-[var(--color-success)]">
                          Upload Complete
                        </p>
                        <p className="text-[13px] text-[var(--color-success)] opacity-90">
                          Successfully created {bulkUploadResults.success}{" "}
                          branches.
                        </p>
                      </div>
                    </div>

                    {bulkUploadResults.failed > 0 && (
                      <div className="rounded-[12px] border border-[var(--color-error)] bg-[var(--status-danger-bg)] p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />
                          <p className="text-[14px] font-bold text-[var(--color-error)]">
                            {bulkUploadResults.failed} rows failed
                          </p>
                        </div>
                        <ul className="list-disc pl-8 text-[12px] text-[var(--color-error)] space-y-1 max-h-32 overflow-y-auto">
                          {bulkUploadResults.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
