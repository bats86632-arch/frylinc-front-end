import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { ReportsService, AuditLogFilters } from "../api/ReportsService";
import { AuditLog } from "../types";
import { Loader2, Search, FileText, AlertCircle, Building2, MapPin, ChevronLeft, ChevronRight, Download, CheckCircle, Clock } from "lucide-react";
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
  const [type, setType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  
  // Pagination
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<string[]>([]); // To go back

  useEffect(() => {
    fetchLogs(true);
  }, [companyId, branchId, type, dateRange]);

  const fetchLogs = async (resetPagination: boolean = false, token?: string) => {
    try {
      const cacheKey = JSON.stringify({ companyId, branchId, type, dateRange, token });
      const cached = reportsCache.get(cacheKey);
      
      if (cached) {
        setLogs(cached.logs);
        setPageToken(cached.nextPageToken);
        setLoading(false);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const filters: AuditLogFilters = {
        limit: 50,
      };

      if (companyId) filters.companyId = companyId;
      if (branchId) filters.branchId = branchId;
      if (type) filters.type = type;
      // Do not send action to backend, we filter locally

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

  const handleNextPage = () => {
    if (pageToken) fetchLogs(false, pageToken);
  };

  const handlePrevPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      newHistory.pop(); // Remove current token
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
    const exportData = filteredLogs.map(log => ({
      Timestamp: formatTimestamp(log.timestamp),
      Type: log.type,
      Action: log.action,
      Result: log.result,
      Panel_Serial: log.panelSerial || 'N/A',
      Organization: companyId ? companies.find(c => c.id === log.companyId)?.name : (log.companyId || 'N/A'),
      Branch: branchId ? branches.find(b => b.id === log.branchId)?.name : (log.branchId || 'N/A'),
      Account: log.actorEmail || log.user || 'System',
      Role: log.actorRole || log.role || 'N/A',
      Details: log.command || 'N/A'
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Audit Logs");
    xlsx.writeFile(wb, `Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!hasRole(["super_admin", "head_office"])) {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface-base)] relative">


      <div className="px-6 py-6 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 w-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Events (Page)</p>
              <p className="text-3xl font-black text-[var(--text-primary)]">{filteredLogs.length}</p>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-green-500/20 bg-green-500/5 flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-600">Successful Events</p>
              <p className="text-3xl font-black text-green-500">{filteredLogs.filter(l => l.result === 'SUCCESS').length}</p>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">Failed Events</p>
              <p className="text-3xl font-black text-red-500">{filteredLogs.filter(l => l.result === 'FAIL').length}</p>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Active Branches</p>
              <p className="text-3xl font-black text-blue-500">{new Set(filteredLogs.map(l => l.branchId).filter(Boolean)).size}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--accent)]" /> 
              Advanced Filtering
            </h2>
            <button
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className="flex h-[32px] items-center justify-center gap-2 rounded-[6px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-3 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50 shadow-sm"
            >
              <Download className="h-4 w-4" /> Export View
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {hasRole(["super_admin"]) && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <Building2 className="h-3 w-3" /> Organization
              </label>
              <select
                className="control-field h-9 w-full rounded-[6px] px-3 pr-8 text-[12px]"
                value={companyId}
                onChange={e => {
                  setCompanyId(e.target.value);
                  setBranchId("");
                }}
              >
                <option value="">All Organizations</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              <MapPin className="h-3 w-3" /> Branch
            </label>
            <select
              className="control-field h-9 w-full rounded-[6px] px-3 pr-8 text-[12px]"
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              disabled={!companyId && hasRole(["super_admin"])}
            >
              <option value="">All Branches</option>
              {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Event Type
            </label>
            <select
              className="control-field h-9 w-full rounded-[6px] px-3 pr-8 text-[12px]"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="admin_action">Admin Action</option>
              <option value="command">Command</option>
              <option value="panel_event">Panel Event</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Search
            </label>
            <input
              type="text"
              placeholder="e.g. SEND_COMMAND, DELETE"
              className="control-field h-9 w-full rounded-[6px] px-3 text-[12px]"
              value={action}
              onChange={e => setAction(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              <Clock className="h-3 w-3" /> Date Range
            </label>
            <select
              className="control-field h-9 w-full rounded-[6px] px-3 pr-8 text-[12px]"
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
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-center gap-2 rounded-[6px] bg-[var(--status-danger-bg)] px-4 py-3 text-[13px] text-[var(--color-error)] border border-[var(--status-danger-border)]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 text-[var(--text-secondary)] opacity-30 mb-4" />
            <p className="text-[15px] font-medium text-[var(--text-primary)]">No logs found</p>
            <p className="text-[13px] text-[var(--text-secondary)] opacity-80 mt-1 max-w-sm">
              Adjust your filters to see more results.
            </p>
          </div>
        ) : (
          <div className="min-w-[1000px] w-full">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--surface-overlay)] sticky top-0 border-b border-[var(--border-subtle)] z-10 shadow-sm">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="px-5 py-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Type / Action</th>
                  <th className="px-5 py-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Panel / Zone</th>
                  <th className="px-5 py-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Account</th>
                  <th className="px-5 py-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Details</th>
                  <th className="px-5 py-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-[var(--text-primary)] font-medium">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[var(--text-primary)]">{log.action}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] opacity-80">{log.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {log.panelSerial ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[var(--text-primary)]">{log.panelSerial}</span>
                          {log.zone !== undefined && log.zone !== null && (
                            <span className="text-[10px] text-[var(--text-secondary)]">Zone {log.zone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-secondary)] italic">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]" title={log.actorEmail || log.user || 'System'}>
                          {log.actorEmail || log.user || 'System'}
                          {log.isApiKey && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border-subtle)]">API</span>}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[200px]">
                          {log.actorRole || log.role || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[11px] text-[var(--text-secondary)] max-w-[250px] truncate" title={log.command || ''}>
                      {log.command || '-'}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm transition-all ${
                        log.result === 'SUCCESS' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                        log.result === 'FAIL' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                        'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                      }`}>
                        {log.result === 'SUCCESS' && <CheckCircle className="h-3 w-3" />}
                        {log.result === 'FAIL' && <AlertCircle className="h-3 w-3" />}
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <p className="text-[12px] text-[var(--text-secondary)] font-medium">
            Showing up to 50 results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pageHistory.length === 0}
              className="flex h-[32px] px-3 items-center justify-center gap-1.5 rounded-[6px] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={!pageToken}
              className="flex h-[32px] px-3 items-center justify-center gap-1.5 rounded-[6px] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors shadow-sm"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
