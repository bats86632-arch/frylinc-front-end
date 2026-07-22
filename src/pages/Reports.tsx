import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { formatDateTime, formatZoneLabel } from "../utils/formatters";
import { usePanels } from "../hooks/usePanels";
import { ReportsService, AuditLogFilters } from "../api/ReportsService";
import { AuditLog } from "../types";
import {
  Loader2, Search, FileText, AlertCircle, Building2, MapPin,
  ChevronLeft, ChevronRight, Download, CheckCircle, Clock,
  LayoutGrid, List
} from "lucide-react";
import * as xlsx from "xlsx";


const formatTimestamp = (ts: any) => {
  if (!ts) return 'Unknown';
  if (typeof ts === 'string') return new Date(ts).toLocaleString();
  const seconds = ts._seconds || ts.seconds;
  if (seconds) return new Date(seconds * 1000).toLocaleString();
  return 'Unknown';
};

// Module-level cache for Reports to prevent redundant loading spinners and re-renders
const reportsCache = new Map<string, { logs: AuditLog[], nextPageToken: string | null }>();

const getPanelTypeBadge = (type?: string) => {
  if (type === 'Fire Alarm') return { text: 'FAP', colorClass: 'bg-red-500/10 text-red-500 border-red-500/20' };
  if (type === 'Security') return { text: 'SAP', colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
  if (type === 'GSM Module') return { text: 'GSM', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  return { text: 'UNK', colorClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
};

export function Reports() {
  const { hasRole, userData } = useAuth();
  const { companies } = useCompanies();
  const { branches } = useBranches();
  const { panels, loading: panelsLoading } = usePanels();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [companyId, setCompanyId] = useState<string>(userData?.companyId || "");
  const [branchId, setBranchId] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [viewMode, setViewMode] = useState<"list" | "matrix">("matrix");
  
  // Pagination
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs(true);
  }, [companyId, branchId, dateRange]);

  const fetchLogs = async (resetPagination: boolean = false, token?: string) => {
    try {
      const cacheKey = JSON.stringify({ companyId, branchId, dateRange, token });
      const cached = reportsCache.get(cacheKey);
      
      if (cached) {
        setLogs(cached.logs);
        setPageToken(cached.nextPageToken);
        setLoading(false);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const filters: AuditLogFilters = { limit: 50 };

      if (companyId) filters.companyId = companyId;
      if (branchId) filters.branchId = branchId;

      if (dateRange !== "all") {
        const fromDate = new Date();
        if (dateRange === "24h") fromDate.setHours(fromDate.getHours() - 24);
        if (dateRange === "7d") fromDate.setDate(fromDate.getDate() - 7);
        if (dateRange === "30d") fromDate.setDate(fromDate.getDate() - 30);
        filters.from = fromDate.toISOString();
      }

      if (token) filters.pageToken = token;

      const data = await ReportsService.getAuditLogs(filters);
      
      if (resetPagination) {
        setPageHistory([]);
      } else if (token && !pageHistory.includes(token)) {
        setPageHistory(prev => [...prev, token]);
      }
      
      const isUpdated = !cached || JSON.stringify(cached.logs) !== JSON.stringify(data.logs);
      
      if (isUpdated) {
        reportsCache.set(cacheKey, { logs: data.logs, nextPageToken: data.nextPageToken });
        setLogs(data.logs);
        setPageToken(data.nextPageToken);
      }
      
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => { if (pageToken) fetchLogs(false, pageToken); };
  const handlePrevPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      const prevToken = newHistory.length > 0 ? newHistory[newHistory.length - 1] : undefined;
      setPageHistory(newHistory);
      fetchLogs(false, prevToken);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!action) return true;
    const searchLower = action.toLowerCase();
    return (
      (log.action || "").toLowerCase().includes(searchLower) ||
      (log.command || "").toLowerCase().includes(searchLower) ||
      (log.user || "").toLowerCase().includes(searchLower) ||
      (log.actorEmail || "").toLowerCase().includes(searchLower) ||
      (log.panelSerial || "").toLowerCase().includes(searchLower)
    );
  });

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const exportData = filteredLogs.map(log => {
      let zoneNum = log.zone !== undefined && log.zone !== null ? String(log.zone) : 'N/A';
      let faultType = 'N/A';
      
      const details = log.command || '';
      
      if (details) {
        if (typeof details === 'string') {
          if (details.startsWith('ISO')) {
            zoneNum = details.substring(3);
            faultType = 'Isolate';
          } else if (details.startsWith('RST')) {
            faultType = 'Reset';
          }
        }
        try {
          const parsedDetails = JSON.parse(details);
          if (parsedDetails.zone) zoneNum = String(parsedDetails.zone);
          if (parsedDetails.faultType) faultType = parsedDetails.faultType;
          if (parsedDetails.event) faultType = parsedDetails.event;
        } catch(e) {}
      }

      if (log.action === 'ALARM') faultType = 'Fire';
      if (log.action === 'CLEAR') faultType = 'Normal';

      // Update fault type based on zone and panel type
      if (log.type === 'alarm' || log.action === 'ALARM') {
        const p = panels.find(p => p.serial === log.panelSerial);
        const pType = p?.panelType;
        const z = Number(zoneNum);
        
        if (pType === 'Fire Alarm') {
          if (z === 9) faultType = 'Earth Fault';
          if (z === 10) faultType = 'Evacuate (EVA)';
          if (z === 11) faultType = 'Low Battery';
          if (z === 12) faultType = 'Ideal / Empty';
          if (z === 13) faultType = 'Empty';
        } else if (pType === 'Security') {
          if (z === 9) faultType = 'Tamper';
          if (z === 10) faultType = 'Siren Cut';
          if (z === 11) faultType = 'Evacuate (EVA)';
          if (z === 12) faultType = 'Battery Low';
          if (z === 13) faultType = 'Night Zone';
        }
      }

      return {
        Timestamp: formatTimestamp(log.timestamp),
        Type: log.type,
        Action: log.action,
        Result: log.result,
        Panel_Serial: log.panelSerial || 'N/A',
        Organization: companies.find(c => c.id === log.companyId)?.name || log.companyId || 'N/A',
        Branch: branches.find(b => b.id === log.branchId)?.name || log.branchId || 'N/A',
        "Zone Number": zoneNum,
        "Event/Fault Type": faultType,
        Account: log.actorEmail || log.user || 'System',
        Role: log.actorRole || log.role || 'N/A',
        Details: log.command || 'N/A'
      };
    });

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Audit Logs");
    xlsx.writeFile(wb, `Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!hasRole(["super_admin", "head_office", "system_integrator"])) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--color-error)] mb-3" />
          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">Access Denied</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-2">You do not have permission to view global reports.</p>
        </div>
      </div>
    );
  }

  const availableBranches = companyId
    ? branches.filter(b => b.companyId === companyId)
    : branches;

  const totalSuccess = filteredLogs.filter(l => l.result === 'SUCCESS').length;
  const totalFail = filteredLogs.filter(l => l.result === 'FAIL').length;
  const successRate = filteredLogs.length > 0 ? Math.round((totalSuccess / filteredLogs.length) * 100) : 0;

  const activePanels = panels.filter(p => {
    if (companyId && p.companyId !== companyId) return false;
    if (branchId && p.branchId !== branchId) return false;
    if (action) {
      const searchLower = action.toLowerCase();
      return p.serial.toLowerCase().includes(searchLower) || p.name.toLowerCase().includes(searchLower);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface-base)] relative">

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-5 border-b border-[var(--border-subtle)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Total Events */}
          <div className="relative overflow-hidden p-3 sm:p-5 rounded-[12px] sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5 sm:mb-2">Total Events</p>
                <p className="text-[22px] sm:text-[32px] font-black text-[var(--text-primary)] leading-none">{filteredLogs.length}</p>
                <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-1 sm:mt-1.5">on this page</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-[10px] sm:rounded-xl bg-[var(--accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--accent)]" />
              </div>
            </div>
          </div>

          {/* Success */}
          <div className="relative overflow-hidden p-3 sm:p-5 rounded-[12px] sm:rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-transparent shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mb-1.5 sm:mb-2">Successful</p>
                <p className="text-[22px] sm:text-[32px] font-black text-emerald-400 leading-none">{totalSuccess}</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-500/70 mt-1 sm:mt-1.5">{successRate}% success rate</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-[10px] sm:rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="relative overflow-hidden p-3 sm:p-5 rounded-[12px] sm:rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/8 to-transparent shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-red-500/80 mb-1.5 sm:mb-2">Failed</p>
                <p className="text-[22px] sm:text-[32px] font-black text-red-400 leading-none">{totalFail}</p>
                <p className="text-[10px] sm:text-[11px] text-red-500/70 mt-1 sm:mt-1.5">{filteredLogs.length > 0 ? 100 - successRate : 0}% failure rate</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-[10px] sm:rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
              </div>
            </div>
          </div>

          {/* Active Branches */}
          <div className="relative overflow-hidden p-3 sm:p-5 rounded-[12px] sm:rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-transparent shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-500/80 mb-1.5 sm:mb-2">Active Branches</p>
                <p className="text-[22px] sm:text-[32px] font-black text-blue-400 leading-none">{new Set(filteredLogs.map(l => l.branchId).filter(Boolean)).size}</p>
                <p className="text-[10px] sm:text-[11px] text-blue-500/70 mt-1 sm:mt-1.5">in this view</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-[10px] sm:rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Advanced Filtering</h2>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-[var(--surface-raised)] rounded-[8px] p-1 border border-[var(--border-subtle)]">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-bold transition-all ${viewMode === 'list' ? 'bg-[var(--surface-overlay)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'}`}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-bold transition-all ${viewMode === 'matrix' ? 'bg-[var(--surface-overlay)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Matrix
              </button>
            </div>
            <button
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className="flex h-[34px] items-center justify-center gap-2 rounded-[8px] bg-[var(--accent)] px-4 text-[12px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row flex-wrap gap-4">
          {(hasRole(["super_admin"]) || (hasRole(["system_integrator"]) && companies.length > 1)) && (
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                <Building2 className="h-3 w-3" /> Organization
              </label>
              <select
                className="control-field h-9 w-full rounded-[8px] px-3 pr-8 text-[12px]"
                value={companyId}
                onChange={e => { setCompanyId(e.target.value); setBranchId(""); }}
              >
                <option value="">All Organizations</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              <MapPin className="h-3 w-3" /> Branch
            </label>
            <select
              className="control-field h-9 w-full rounded-[8px] px-3 pr-8 text-[12px]"
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              disabled={!companyId && hasRole(["super_admin"])}
            >
              <option value="">All Branches</option>
              {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Action, command, email…"
                className="control-field h-9 w-full rounded-[8px] pl-8 pr-3 text-[12px]"
                value={action}
                onChange={e => setAction(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              <Clock className="h-3 w-3" /> Date Range
            </label>
            <select
              className="control-field h-9 w-full rounded-[8px] px-3 pr-8 text-[12px]"
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">Loading audit logs…</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-center gap-3 rounded-xl bg-[var(--status-danger-bg)] px-5 py-4 text-[13px] text-[var(--color-error)] border border-[var(--status-danger-border)]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center mb-5">
              <Search className="h-8 w-8 text-[var(--text-secondary)] opacity-40" />
            </div>
            <p className="text-[16px] font-bold text-[var(--text-primary)]">No logs found</p>
            <p className="text-[13px] text-[var(--text-secondary)] opacity-70 mt-2 max-w-sm">
              Adjust your filters or date range to see results.
            </p>
          </div>
        ) : viewMode === 'matrix' ? (
          <div className="min-w-[1000px] w-full">
            {(() => {
              const maxZones = Math.min(8, Math.max(1, ...activePanels.map(p => p.zoneCount || 8)));

              return (
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[var(--surface-overlay)] sticky top-0 border-b border-[var(--border-subtle)] z-10">
                    <tr>
                      <th className="px-4 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] w-12">S No.</th>
                      <th className="px-4 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Panel Id</th>
                      <th className="px-4 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Bank</th>
                      <th className="px-4 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Branch Name</th>
                      {Array.from({ length: maxZones }).map((_, i) => (
                        <th key={i} className="px-2 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] text-center w-12">Zone {i + 1}</th>
                      ))}
                      <th className="px-2 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] text-center min-w-[70px]">Earth / Tamper</th>
                      <th className="px-2 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] text-center min-w-[70px]">EVA / Siren</th>
                      <th className="px-2 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] text-center min-w-[70px]">Bat. / EVA</th>
                      <th className="px-2 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] text-center min-w-[70px]">Ideal / Bat.</th>
                      <th className="px-2 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px] text-center min-w-[70px]">Empty / Night</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-base)]">
                    {activePanels.map((panel, idx) => {
                      const bankName = companies.find(c => c.id === panel.companyId)?.name || panel.companyId || '';
                      const branchName = branches.find(b => b.id === panel.branchId)?.name || panel.branchId || '';

                      return (
                        <tr key={panel.serial} className="hover:bg-[var(--surface-hover)] transition-colors group">
                          <td className="px-4 py-3.5 whitespace-nowrap text-[11px] font-mono text-[var(--text-secondary)]">{idx + 1}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] border font-bold text-[9px] tracking-widest ${getPanelTypeBadge(panel.panelType).colorClass}`}>
                                {getPanelTypeBadge(panel.panelType).text}
                              </span>
                              <span className="font-bold text-[13px] text-[var(--text-primary)]">{panel.serial}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-[12px] font-medium text-[var(--text-secondary)]">{bankName}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-[12px] font-medium text-[var(--text-secondary)]">{branchName}</td>
                          {Array.from({ length: maxZones }).map((_, i) => {
                            if (i >= (panel.zoneCount || 8)) {
                              return (
                                <td key={i} className="px-2 py-3.5 text-center">
                                  <span className="text-[var(--text-secondary)] opacity-30 text-[10px]">—</span>
                                </td>
                              );
                            }

                            const zoneStatus = panel.zones?.[i] || 1;
                            let code = 'N';
                            let badgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_6px_rgba(16,185,129,0.15)]'; 

                            if (zoneStatus === 2) {
                              code = 'F';
                              badgeClass = 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_6px_rgba(249,115,22,0.15)]';
                            } else if (zoneStatus === 3 || zoneStatus === 4) {
                              code = 'Flt';
                              badgeClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_6px_rgba(99,102,241,0.15)]';
                            } else if (zoneStatus === 5) {
                              code = 'I';
                              badgeClass = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shadow-[0_0_6px_rgba(234,179,8,0.15)] dark:text-yellow-400';
                            }

                            return (
                              <td key={i} className="px-2 py-3.5 text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-6 rounded-md border font-bold text-[11px] transition-all ${badgeClass}`}>
                                  {code}
                                </span>
                              </td>
                            );
                          })}
                          
                          {/* Special Events (Z9 - Z13) */}
                          {(() => {
                            const isSecurity = panel.panelType === 'Security';
                            
                            const isZ9Active = panel.zones?.[8] === 2;
                            const isZ10Active = panel.zones?.[9] === 2;
                            const isZ11Active = panel.zones?.[10] === 2;
                            const isZ12Active = panel.zones?.[11] === 2;
                            const isZ13Active = panel.zones?.[12] === 2;

                            const renderBadge = (active: boolean, codeActive: string, codeInactive: string, activeClass: string, inactiveClass: string) => (
                              <td className="px-2 py-3.5 text-center">
                                <span className={`inline-flex items-center justify-center min-w-[32px] h-6 px-1 rounded-md border font-bold text-[11px] transition-all ${active ? activeClass : inactiveClass}`}>
                                  {active ? codeActive : codeInactive}
                                </span>
                              </td>
                            );

                            const activeDanger = 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_6px_rgba(239,68,68,0.15)]';
                            const activeWarning = 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_6px_rgba(249,115,22,0.15)]';
                            const activeInfo = 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_6px_rgba(59,130,246,0.15)]';
                            const inactiveBadge = 'bg-[var(--surface-overlay)] text-[var(--text-secondary)] border-[var(--border-subtle)]';

                            return (
                              <>
                                {renderBadge(isZ9Active, 'F', 'N', activeDanger, inactiveBadge)}
                                {renderBadge(isZ10Active, 'F', 'N', activeDanger, inactiveBadge)}
                                {renderBadge(isZ11Active, 'F', 'N', isSecurity ? activeDanger : activeWarning, inactiveBadge)}
                                {renderBadge(isZ12Active, 'F', 'N', isSecurity ? activeWarning : activeDanger, inactiveBadge)}
                                {renderBadge(isZ13Active, isSecurity ? 'ON' : 'F', isSecurity ? 'OFF' : 'N', isSecurity ? activeInfo : activeDanger, inactiveBadge)}
                              </>
                            );
                          })()}
                        </tr>
                      );
                    })}
                    {activePanels.length === 0 && (
                      <tr>
                        <td colSpan={maxZones + 4 + 5} className="px-4 py-10 text-center text-[13px] text-[var(--text-secondary)]">
                          No panels match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              );
            })()}
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block min-w-[1000px] w-full">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--surface-overlay)] sticky top-0 border-b border-[var(--border-subtle)] z-10">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Timestamp</th>
                  <th className="px-5 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Action</th>
                  <th className="px-5 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Panel / Zone</th>
                  <th className="px-5 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Account</th>
                  <th className="px-5 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Details</th>
                  <th className="px-5 py-3.5 font-bold text-[var(--text-secondary)] uppercase tracking-widest text-[9px]">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredLogs.map(log => {
                  return (
                    <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-[var(--text-secondary)]">{formatTimestamp(log.timestamp)}</span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[220px]">
                        {(() => {
                          let displayAction = log.action;
                          if (log.action === 'ALARM' || log.action === 'CLEAR') {
                            const p = panels.find(p => p.serial === log.panelSerial);
                            const pType = p?.panelType;
                            const z = log.zone;
                            
                            if (pType === 'Fire Alarm') {
                              if (z === 9) displayAction = 'Earth Fault';
                              if (z === 10) displayAction = 'Evacuate (EVA)';
                              if (z === 11) displayAction = 'Low Battery';
                              if (z === 12) displayAction = 'Ideal / Empty';
                              if (z === 13) displayAction = 'Empty';
                            } else if (pType === 'Security') {
                              if (z === 9) displayAction = 'Tamper';
                              if (z === 10) displayAction = 'Siren Cut';
                              if (z === 11) displayAction = 'Evacuate (EVA)';
                              if (z === 12) displayAction = 'Battery Low';
                              if (z === 13) displayAction = 'Night Zone';
                            }
                          }
                          return (
                            <span className="font-bold text-[13px] text-[var(--text-primary)]">{displayAction}</span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.panelSerial ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const p = panels.find(p => p.serial === log.panelSerial);
                                if (p && p.panelType) {
                                  const badge = getPanelTypeBadge(p.panelType);
                                  return (
                                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] border font-bold text-[8px] tracking-widest ${badge.colorClass}`}>
                                      {badge.text}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              <span className="font-mono font-semibold text-[var(--text-primary)]">{log.panelSerial}</span>
                            </div>
                            {log.zone !== undefined && log.zone !== null && (
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {(() => {
                                  const p = panels.find(p => p.serial === log.panelSerial);
                                  return formatZoneLabel(log.zone - 1, p?.zoneNames?.[(log.zone - 1).toString()]);
                                })()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-secondary)] italic opacity-50">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]" title={log.actorEmail || log.user || 'System'}>
                            {log.actorEmail || log.user || 'System'}
                            {log.isApiKey && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 tracking-wider">API</span>
                            )}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] opacity-70 truncate max-w-[200px]">
                            {log.actorRole || log.role || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          {log.command ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] break-all" title={log.command}>
                              {log.command}
                            </span>
                          ) : null}
                          {log.details ? (
                            <span className="text-[10px] text-[var(--color-error)] opacity-90 break-words font-mono" title={log.details}>
                              {log.details}
                            </span>
                          ) : null}
                          {!log.command && !log.details && (
                            <span className="text-[var(--text-secondary)] italic opacity-40">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_6px_rgba(52,211,153,0.15)]'
                            : log.result === 'FAIL'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_6px_rgba(239,68,68,0.15)]'
                            : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        }`}>
                          {log.result === 'SUCCESS' && <CheckCircle className="h-3 w-3" />}
                          {log.result === 'FAIL' && <AlertCircle className="h-3 w-3" />}
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            
            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col p-4 gap-3">
              {filteredLogs.map(log => {
                return (
                  <div key={log.id} className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[12px] p-3.5 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[13px] text-[var(--text-primary)]">{log.action}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : log.result === 'FAIL'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-[var(--surface-overlay)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        }`}>
                          {log.result === 'SUCCESS' && <CheckCircle className="h-2.5 w-2.5" />}
                          {log.result === 'FAIL' && <AlertCircle className="h-2.5 w-2.5" />}
                          {log.result}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] shrink-0">{formatTimestamp(log.timestamp)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-[var(--surface-overlay)] rounded-[8px] border border-[var(--border-subtle)] p-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-[var(--text-quaternary)] uppercase font-bold tracking-wider">Panel / Zone</span>
                        {log.panelSerial ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {(() => {
                              const p = panels.find(p => p.serial === log.panelSerial);
                              if (p && p.panelType) {
                                const badge = getPanelTypeBadge(p.panelType);
                                return (
                                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] border font-bold text-[8px] tracking-widest ${badge.colorClass}`}>
                                    {badge.text}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            <span className="font-mono font-semibold text-[11px] text-[var(--text-primary)] truncate">{log.panelSerial}</span>
                            {log.zone !== undefined && log.zone !== null && (
                              <span className="text-[10px] text-[var(--text-secondary)] shrink-0 truncate max-w-[120px]" title={(() => {
                                  const p = panels.find(p => p.serial === log.panelSerial);
                                  return formatZoneLabel(log.zone - 1, p?.zoneNames?.[(log.zone - 1).toString()]);
                                })()}>
                                {(() => {
                                  const p = panels.find(p => p.serial === log.panelSerial);
                                  return formatZoneLabel(log.zone - 1, p?.zoneNames?.[(log.zone - 1).toString()]);
                                })()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-secondary)] text-[11px] italic opacity-50">—</span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-[9px] text-[var(--text-quaternary)] uppercase font-bold tracking-wider">Account</span>
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                            {log.actorEmail || log.user || 'System'}
                          </span>
                          <span className="text-[9px] text-[var(--text-secondary)] opacity-70 truncate">
                            {log.actorRole || log.role || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {log.command && (
                      <div className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[6px] p-2 overflow-hidden">
                        <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate block">{log.command}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {((!loading && logs.length > 0 && viewMode === 'list') || (viewMode === 'matrix' && activePanels.length > 0)) && (
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] grid grid-cols-2 gap-y-3 sm:flex sm:items-center sm:justify-between sticky bottom-0 z-10">
          <div className="col-span-1 flex items-center sm:gap-6">
            <p className="text-[12px] text-[var(--text-secondary)] font-medium">
              Showing <span className="text-[var(--text-primary)] font-bold">
                {viewMode === 'matrix' ? activePanels.length : filteredLogs.length}
              </span> {viewMode === 'matrix' ? 'panels' : 'results'}
            </p>

            {viewMode === 'matrix' && (
              <div className="hidden sm:flex items-center gap-4 border-l border-[var(--border-subtle)] pl-6">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">N</span>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-orange-500/10 text-orange-500 border-orange-500/20">F</span>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Fire</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Flt</span>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Fault</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400">I</span>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Isolate</span>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pageHistory.length === 0}
                className="flex h-[32px] px-3 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pageToken}
                className="flex h-[32px] px-3 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--accent)] text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {viewMode === 'matrix' && (
            <div className="col-span-2 flex sm:hidden items-center gap-3 pt-3 border-t border-[var(--border-subtle)] overflow-x-auto pb-1 hide-scrollbar">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">N</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-orange-500/10 text-orange-500 border-orange-500/20">F</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Fire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Flt</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Fault</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-4 rounded-[4px] border font-bold text-[9px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400">I</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Isolate</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
