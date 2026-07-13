import { useEffect, useState } from "react";
import { usePanels } from "../hooks/usePanels";
import { Activity, CheckCircle, AlertTriangle, ShieldAlert, Cpu, Server, Info } from "lucide-react";

type SystemStatus = 'online' | 'offline' | 'degraded';

interface SystemHealth {
  id: string;
  name: string;
  status: SystemStatus;
  uptime: number;
  history: SystemStatus[]; // 30 dots representing last 30 hours/days
  connectedCount: number;
}

const generateMockHistory = (baseStatus: SystemStatus): SystemStatus[] => {
  return Array.from({ length: 30 }).map(() => {
    const rand = Math.random();
    if (baseStatus === 'offline') {
      return rand > 0.8 ? 'online' : 'offline';
    }
    if (baseStatus === 'degraded') {
      return rand > 0.6 ? 'degraded' : (rand > 0.3 ? 'offline' : 'online');
    }
    return rand > 0.95 ? 'offline' : 'online';
  });
};

const SYSTEMS: SystemHealth[] = [
  {
    id: 'fire',
    name: 'Fire Alarm',
    status: 'online',
    uptime: 99.99,
    history: generateMockHistory('online'),
    connectedCount: 12,
  },
  {
    id: 'security',
    name: 'Security Panel',
    status: 'online',
    uptime: 100,
    history: generateMockHistory('online'),
    connectedCount: 5,
  },
  {
    id: 'gsm',
    name: 'GSM Dialer',
    status: 'offline',
    uptime: 85.5,
    history: generateMockHistory('offline'),
    connectedCount: 2,
  },
  {
    id: 'access',
    name: 'Access Control',
    status: 'online',
    uptime: 99.5,
    history: generateMockHistory('online'),
    connectedCount: 8,
  },
  {
    id: 'cctv',
    name: 'CCTV',
    status: 'online',
    uptime: 99.9,
    history: generateMockHistory('online'),
    connectedCount: 24,
  }
];

export const HealthMonitor = () => {
  const { loading } = usePanels();
  const [mounted, setMounted] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(SYSTEMS[0].id);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const selectedSystem = SYSTEMS.find(s => s.id === selectedSystemId) || SYSTEMS[0];

  return (
    <div className="animate-fade-in p-[32px] space-y-8 max-w-7xl mx-auto">
      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 mb-2 flex items-start gap-3">
        <div className="rounded-full bg-indigo-500/20 p-2 text-indigo-400 shrink-0">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-indigo-400">Preview Mode — Coming Soon</h3>
          <p className="text-sm text-indigo-400/80 mt-1">
            This dashboard is a live preview of the upcoming design. Real-time data integration is currently being finalized. All interactions are disabled.
          </p>
        </div>
      </div>



      {/* View-Only Wrapper */}
      <div className="relative">
        <div className="opacity-95">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left side: System List with Dots */}
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">System Status</h2>
              
              {SYSTEMS.map((system) => (
                <div 
                  key={system.id}
                  onClick={() => setSelectedSystemId(system.id)}
                  className={`relative overflow-hidden rounded-xl border p-5 transition-all cursor-pointer ${
                    selectedSystemId === system.id 
                      ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] shadow-md' 
                      : 'border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {system.status === 'online' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : system.status === 'degraded' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <ShieldAlert className="h-5 w-5 text-[var(--color-error)]" />
                      )}
                      <h3 className="font-bold text-[var(--text-primary)] text-base">{system.name}</h3>
                    </div>
                    <span className="text-sm font-mono text-[var(--text-secondary)]">{system.uptime}% uptime</span>
                  </div>

                  {/* The Dots */}
                  <div className="flex items-center justify-between gap-1 w-full mt-2">
                    {system.history.map((status, idx) => (
                      <div 
                        key={idx}
                        className={`h-6 flex-1 rounded-sm ${
                          status === 'online' ? 'bg-green-500' 
                          : status === 'degraded' ? 'bg-yellow-500' 
                          : 'bg-[var(--color-error)]'
                        } opacity-90 hover:opacity-100 transition-opacity`}
                        title={`${status.toUpperCase()} - ${idx} hours ago`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-2 text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                    <span>30 hours ago</span>
                    <span>Now</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right side: Selected System Details */}
            <div className="w-full lg:w-[400px] shrink-0">
              <div className="sticky top-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 overflow-hidden">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedSystem.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        {selectedSystem.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          selectedSystem.status === 'online' ? 'bg-green-500' 
                          : selectedSystem.status === 'degraded' ? 'bg-yellow-500' 
                          : 'bg-[var(--color-error)]'
                        }`}></span>
                      </span>
                      <span className="text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                        {selectedSystem.status}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--surface-hover)] p-3 text-[var(--accent)]">
                    <Cpu className="h-6 w-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
                    <p className="text-xs text-[var(--text-secondary)] font-medium mb-1 uppercase tracking-wider">Uptime</p>
                    <p className="text-2xl font-black text-[var(--text-primary)]">{selectedSystem.uptime}%</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
                    <p className="text-xs text-[var(--text-secondary)] font-medium mb-1 uppercase tracking-wider">Connected</p>
                    <p className="text-2xl font-black text-[var(--text-primary)]">{selectedSystem.connectedCount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
                    <Server className="h-4 w-4" />
                    System Details
                  </h4>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">Active Incidents</span>
                    <span className={`font-medium ${selectedSystem.status === 'offline' ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'}`}>
                      {selectedSystem.status === 'offline' ? '1 Critical' : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">Last Ping</span>
                    <span className="font-medium text-[var(--text-primary)]">Just now</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">Data Sync</span>
                    <span className="font-medium text-[var(--text-primary)]">Real-time</span>
                  </div>
                </div>

                {selectedSystem.status === 'offline' && (
                  <div className="mt-6 rounded-lg bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-4 flex gap-3 items-start">
                    <Info className="h-5 w-5 text-[var(--color-error)] shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--color-error)]">
                      This system is currently offline. Please check the network connectivity or contact support if the issue persists.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
