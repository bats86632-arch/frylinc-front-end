import { useState, useMemo } from 'react';
import { usePanels } from '../hooks/usePanels';
import { PanelCard } from '../components/PanelCard';
import {
  AlertTriangle,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  ShieldCheck
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'alarms';

interface StatCardProps {
  label: string;
  value: number;
  caption: string;
  icon: typeof LayoutGrid;
  tone: 'neutral' | 'alarm';
}

const statToneClasses: Record<StatCardProps['tone'], string> = {
  neutral: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200',
  alarm: 'border-red-400/30 bg-red-500/10 text-red-200'
};

function StatCard({ label, value, caption, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="surface-panel rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold leading-none text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${statToneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

export function Dashboard() {
  const { panels, loading, error } = usePanels();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const filteredPanels = useMemo(() => {
    let result = [...panels];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (panel) =>
          panel.name.toLowerCase().includes(query) ||
          panel.serial.toLowerCase().includes(query)
      );
    }

    switch (filterMode) {
      case 'alarms':
        result = result.filter((panel) => panel.alarm);
        break;
    }

    result.sort((a, b) => {
      if (a.alarm && !b.alarm) return -1;
      if (!a.alarm && b.alarm) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [panels, searchQuery, filterMode]);

  const stats = useMemo(() => ({
    total: panels.length,
    alarms: panels.filter((p) => p.alarm).length
  }), [panels]);

  const filters: Array<{ value: FilterMode; label: string; count: number }> = [
    { value: 'all', label: 'All Panels', count: stats.total },
    { value: 'alarms', label: 'Alarms', count: stats.alarms }
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel rounded-lg px-8 py-7 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-amber-300" />
          <p className="text-sm font-medium text-slate-300">Loading panels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel max-w-md rounded-lg p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">Error Loading Panels</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live panel telemetry
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:items-center">
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Filtered</p>
              <p className="mt-1 font-semibold text-white">{filteredPanels.length} panels</p>
            </div>
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Alarm load</p>
              <p className={`mt-1 font-semibold ${stats.alarms > 0 ? 'text-red-200' : 'text-emerald-200'}`}>
                {stats.alarms} active
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Panels"
          value={stats.total}
          caption="All provisioned panels"
          icon={ShieldCheck}
          tone="neutral"
        />
        <StatCard
          label="Active Alarms"
          value={stats.alarms}
          caption={stats.alarms > 0 ? 'Needs immediate review' : 'No active alarms'}
          icon={AlertTriangle}
          tone="alarm"
        />
      </div>

      <section className="surface-muted rounded-lg p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {filters.map((filter) => {
              const active = filterMode === filter.value;

              return (
                <button
                  key={filter.value}
                  onClick={() => setFilterMode(filter.value)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-red-500 text-white shadow-lg shadow-red-950/30'
                      : 'border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search panels by name or serial..."
                className="control-field w-full rounded-lg py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {filteredPanels.length === 0 ? (
        <div className="surface-panel rounded-lg py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
            <Filter className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">No panels found</h3>
          <p className="mt-2 text-sm text-slate-400">
            {searchQuery
              ? `No panels matching "${searchQuery}"`
              : 'No panels match the current filter'}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3'
              : 'space-y-3'
          }
        >
          {filteredPanels.map((panel) => (
            <PanelCard key={panel.serial} panel={panel} viewMode={viewMode} />
          ))}
        </div>
      )}

      {stats.alarms > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-red-300/30 bg-red-500 px-5 py-3 text-white shadow-2xl shadow-red-950/40 animate-bounce-subtle">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {stats.alarms} Active Alarm{stats.alarms > 1 ? 's' : ''} Detected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
