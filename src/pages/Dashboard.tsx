import { useState, useMemo } from 'react';
import { usePanels } from '../hooks/usePanels';
import { PanelCard } from '../components/PanelCard';
import {
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'alarms';

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-panel rounded-xl px-8 py-7 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-tertiary-container" />
          <p className="font-label-md text-label-md text-on-surface-variant">Loading panels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-panel max-w-md rounded-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-tertiary-container/10 text-tertiary-container">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Error Loading Panels</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary/20 hover:bg-primary/30 mt-5 rounded-lg px-4 py-2.5 font-label-md text-label-md text-primary transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-margin py-lg space-y-lg">
      <div className="space-y-md mb-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Fyrlinc Fire Panel Monitoring Station</h1>
        <p className="font-body-md text-primary/80 tracking-wide text-sm">High trust monitoring for every connected fire panel.</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="glass-panel p-md rounded-xl flex items-center justify-between group hover:border-secondary/30 transition-all">
          <div className="space-y-xs">
            <span className="text-on-surface-variant font-label-md text-label-md">Total Panels</span>
            <h2 className="font-headline-lg text-headline-lg text-secondary">{stats.total}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined">domain</span>
          </div>
        </div>

        <div className={`glass-panel p-md rounded-xl flex items-center justify-between transition-all ${stats.alarms > 0 ? 'border-tertiary-container/20 group hover:animate-pulse-alarm' : 'group hover:border-primary/30'}`}>
          <div className="space-y-xs">
            <span className="text-on-surface-variant font-label-md text-label-md">Active Alarms</span>
            <h2 className={`font-headline-lg text-headline-lg ${stats.alarms > 0 ? 'text-tertiary-container' : 'text-on-surface'}`}>{stats.alarms}</h2>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.alarms > 0 ? 'bg-tertiary-container/20 text-tertiary-container animate-pulse' : 'bg-white/5 text-on-surface-variant'}`}>
            <span className="material-symbols-outlined" style={stats.alarms > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>emergency_home</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col md:flex-row gap-gutter items-center">
        <div className="relative w-full md:max-w-md group">
          <span className="material-symbols-outlined absolute left-base top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-lg pr-base py-sm bg-white/5 border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all backdrop-blur-md"
            placeholder="Search by panel name or serial..."
          />
        </div>
        <div className="flex p-xs bg-white/5 rounded-xl border border-white/10 backdrop-blur-md self-stretch md:self-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${filterMode === 'all' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('alarms')}
            className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${filterMode === 'alarms' ? 'bg-tertiary-container text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Alarms Only
          </button>
        </div>
        <div className="flex ml-auto p-xs bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-xs rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-xs rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[20px]">view_list</span>
          </button>
        </div>
      </section>

      {filteredPanels.length === 0 ? (
        <div className="glass-panel rounded-xl py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white/5">
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">filter_list_off</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">No panels found</h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            {searchQuery
              ? `No panels matching "${searchQuery}"`
              : 'No panels match the current filter'}
          </p>
        </div>
      ) : (
        <section className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter" : "flex flex-col gap-sm"}>
          {filteredPanels.map((panel) => (
            <PanelCard key={panel.serial} panel={panel} viewMode={viewMode} />
          ))}
        </section>
      )}

      {stats.alarms > 0 && (
        <button className="fixed bottom-margin right-margin bg-tertiary-container text-white px-lg py-md rounded-full shadow-2xl shadow-tertiary-container/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-base z-40 group">
          <span className="material-symbols-outlined animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>crisis_alert</span>
          <span className="font-bold uppercase tracking-widest text-sm">Emergency Protocol ({stats.alarms})</span>
        </button>
      )}
    </div>
  );
}
