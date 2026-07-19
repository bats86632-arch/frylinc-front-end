import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { ReportsService, AuditLogFilters } from "../api/ReportsService";
import { AuditLog } from "../types";
import {
  Loader2, Search, FileText, AlertCircle, Building2, MapPin,
  ChevronLeft, ChevronRight, Download, CheckCircle, Clock,
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


export function Reports() {
  const { hasRole, userData } = useAuth();
  const { companies } = useCompanies();
  const { branches } = useBranches();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [companyId, setCompanyId] = useState<string>(userData?.companyId || "");
  const [branchId, setBranchId] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface-base)] relative">

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 border-b border-[var(--border-subtle)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Events */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">Total Events</p>
                <p className="text-[32px] font-black text-[var(--text-primary)] leading-none">{filteredLogs.length}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">on this page</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-[var(--accent)]" />
              </div>
            </div>
          </div>

          {/* Success */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-transparent shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mb-2">Successful</p>
                <p className="text-[32px] font-black text-emerald-400 leading-none">{totalSuccess}</p>
                <p className="text-[11px] text-emerald-500/70 mt-1.5">{successRate}% success rate</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/8 to-transparent shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 mb-2">Failed</p>
                <p className="text-[32px] font-black text-red-400 leading-none">{totalFail}</p>
                <p className="text-[11px] text-red-500/70 mt-1.5">{filteredLogs.length > 0 ? 100 - successRate : 0}% failure rate</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </div>

          {/* Active Branches */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-transparent shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500/80 mb-2">Active Branches</p>
                <p className="text-[32px] font-black text-blue-400 leading-none">{new Set(filteredLogs.map(l => l.branchId).filter(Boolean)).size}</p>
                <p className="text-[11px] text-blue-500/70 mt-1.5">in this view</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Advanced Filtering</h2>
          </div>
          <button
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            className="flex h-[34px] items-center justify-center gap-2 rounded-[8px] bg-[var(--accent)] px-4 text-[12px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {(hasRole(["super_admin"]) || (hasRole(["system_integrator"]) && companies.length > 1)) && (
            <div>
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

          <div>
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

          <div>
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

          <div>
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
        ) : (
          <div className="min-w-[1000px] w-full">
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
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-[13px] text-[var(--text-primary)]">{log.action}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.panelSerial ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-semibold text-[var(--text-primary)]">{log.panelSerial}</span>
                            {log.zone !== undefined && log.zone !== null && (
                              <span className="text-[10px] text-[var(--text-secondary)]">Zone {log.zone}</span>
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
                      <td className="px-5 py-3.5 max-w-[220px]">
                        {log.command ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] truncate max-w-full" title={log.command}>
                            {log.command}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] italic opacity-40">—</span>
                        )}
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
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!loading && logs.length > 0 && (
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] flex items-center justify-between sticky bottom-0 z-10">
          <p className="text-[12px] text-[var(--text-secondary)] font-medium">
            Showing <span className="text-[var(--text-primary)] font-bold">{filteredLogs.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pageHistory.length === 0}
              className="flex h-[32px] px-3 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={!pageToken}
              className="flex h-[32px] px-3 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--accent)] text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
