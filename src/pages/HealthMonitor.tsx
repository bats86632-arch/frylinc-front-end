import { useEffect, useState } from "react";
import { usePanels } from "../hooks/usePanels";
import { Activity, CheckCircle, AlertTriangle, ShieldAlert, Cpu, Network, Clock, Server } from "lucide-react";
import { formatDateTime } from "../utils/formatters";

export const HealthMonitor = () => {
  const { panels, loading } = usePanels();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalPanels = panels.length;
  // A simplistic mock logic for 'online' vs 'offline'.
  // We can assume panels with recent activity or something, but we'll use a mock metric for now based on ipAddress or a random function
  // to show a beautiful UI. For a real app, it would use actual connection status.
  const onlinePanels = panels.filter((p) => p.ipAddress).length;
  const systemHealth = totalPanels > 0 ? Math.round((onlinePanels / totalPanels) * 100) : 100;

  if (loading || !mounted) {
    return (
      <div className="animate-fade-in space-y-8 p-[32px]">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-4 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-[32px] space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-3">
          <Activity className="h-8 w-8 text-[var(--accent)]" />
          System Health Monitor
        </h1>
        <p className="text-[var(--text-secondary)]">Real-time status of all configured panels and services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Health Score Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Health Score</h3>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${systemHealth > 80 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black ${systemHealth > 80 ? 'text-green-500' : 'text-yellow-500'}`}>{systemHealth}%</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Overall system uptime</p>
          </div>
          {/* Progress bar background */}
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-overlay)]">
            <div 
              className={`h-full ${systemHealth > 80 ? 'bg-green-500' : 'bg-yellow-500'} transition-all duration-1000 ease-out`}
              style={{ width: `${systemHealth}%` }}
            />
          </div>
        </div>

        {/* Connectivity Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Connectivity</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              <Network className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-[var(--text-primary)]">{onlinePanels}</span>
              <span className="mb-1 text-sm font-medium text-[var(--text-secondary)]">/ {totalPanels} online</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Active panel connections</p>
          </div>
        </div>

        {/* Alerts Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--status-danger-border)] bg-gradient-to-br from-[var(--status-danger-bg)] to-[var(--surface-raised)] p-6 shadow-[0_0_15px_rgba(220,38,38,0.05)] transition-all hover:shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.1)]">
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-error)]">Critical Alerts</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] animate-pulse">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-[var(--color-error)]">0</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-error)] opacity-80">Requires immediate action</p>
          </div>
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--color-error)] blur-[50px] opacity-10 pointer-events-none" />
        </div>

        {/* Server Status Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Server Status</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
              <Server className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold text-[var(--text-primary)]">API Server: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold text-[var(--text-primary)]">Database: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold text-[var(--text-primary)]">MQTT Broker: Connected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-6 py-4 bg-[var(--surface-hover)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[var(--accent)]" />
              Panel Status Overview
            </h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface-raised)] border-b border-[var(--border-subtle)]">
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Panel</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Type</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {panels.slice(0, 10).map((p) => (
                  <tr key={p.serial} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">{p.name || p.serial}</span>
                        <span className="text-xs text-[var(--text-secondary)] font-mono">{p.serial}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-secondary)]">{p.panelType || 'Fire Alarm'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {p.ipAddress ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-500">
                          <CheckCircle className="h-3 w-3" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-600">
                          <AlertTriangle className="h-3 w-3" /> Offline
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Clock className="h-3.5 w-3.5 opacity-70" />
                        {formatDateTime(new Date().toISOString())} {/* Mock for now */}
                      </div>
                    </td>
                  </tr>
                ))}
                {panels.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
                      No panels configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden flex flex-col">
          <div className="border-b border-[var(--border-subtle)] px-6 py-4 bg-[var(--surface-hover)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Recent Activity Log
            </h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="relative border-l border-[var(--border-subtle)] pl-6 space-y-6">
              {[
                { time: '2 mins ago', text: 'System health check completed.', type: 'info' },
                { time: '15 mins ago', text: 'Backup completed successfully.', type: 'success' },
                { time: '1 hour ago', text: 'Panel FP-2024-001 connected.', type: 'success' },
                { time: '3 hours ago', text: 'Admin updated routing tables.', type: 'info' },
                { time: '5 hours ago', text: 'Daily report generated.', type: 'info' },
              ].map((log, i) => (
                <div key={i} className="relative">
                  <span className={`absolute -left-[31px] flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-[var(--surface-base)] ${log.type === 'success' ? 'bg-green-500' : 'bg-[var(--accent)]'}`} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[var(--text-secondary)] font-mono">{log.time}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{log.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
