import { Link } from 'react-router-dom';
import { Panel } from '../types';
import { AlertTriangle, ExternalLink, Wifi, WifiOff } from 'lucide-react';

interface PanelCardProps {
  panel: Panel;
  viewMode?: 'grid' | 'list';
}

export function PanelCard({ panel, viewMode = 'grid' }: PanelCardProps) {
  const hasAlarm = panel.alarm;
  const isOnline = panel.manuallyMarkedOffline !== true;
  const alarmZones = panel.zones.filter(Boolean).length;
  const visibleZones = Math.min(panel.zoneCount, 64);

  const statusLabel = hasAlarm ? 'ALARM' : isOnline ? 'Online' : 'Offline';
  const stateClasses = hasAlarm
    ? 'border-red-400/50 bg-red-500/10 text-red-100'
    : isOnline
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
    : 'border-slate-400/20 bg-slate-500/10 text-slate-300';
  const railClass = hasAlarm ? 'bg-red-500' : isOnline ? 'bg-emerald-400' : 'bg-slate-500';

  return (
    <Link
      to={`/panel/${panel.serial}`}
      className={`group relative block overflow-hidden rounded-lg border bg-slate-950/40 transition-all hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-black/30 ${
        hasAlarm
          ? 'border-red-400/40 animate-pulse-shadow'
          : isOnline
          ? 'border-white/10'
          : 'border-white/10 opacity-80'
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${railClass}`} />

      <div
        className={
          viewMode === 'list'
            ? 'grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:items-center'
            : 'p-5'
        }
      >
        <div className="min-w-0">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-white">{panel.name}</h3>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-amber-200" />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{panel.serial}</p>
            </div>

            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClasses}`}>
              {hasAlarm ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : isOnline ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span>{panel.zoneCount} Zones</span>
            {panel.ipAddress && <span className="font-mono text-xs">{panel.ipAddress}</span>}
            {hasAlarm && (
              <span className="inline-flex items-center gap-1.5 font-medium text-red-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                {alarmZones} zone{alarmZones === 1 ? '' : 's'} active
              </span>
            )}
          </div>
        </div>

        <div className={viewMode === 'list' ? 'sm:px-2' : 'mt-5'}>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Zone map</span>
            <span>{visibleZones} shown</span>
          </div>
          <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
            {Array.from({ length: visibleZones }).map((_, idx) => {
              const zoneAlarm = panel.zones[idx] || false;

              return (
                <div
                  key={idx}
                  className={`h-2 rounded-[2px] ${
                    zoneAlarm
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.75)]'
                      : isOnline
                      ? 'bg-slate-700/90'
                      : 'bg-slate-800'
                  }`}
                  title={`Zone ${idx + 1}: ${zoneAlarm ? 'ALARM' : 'Normal'}`}
                />
              );
            })}
          </div>
        </div>

        <div
          className={
            viewMode === 'list'
              ? 'flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 sm:block'
              : 'mt-5 flex items-center justify-between border-t border-white/10 pt-4'
          }
        >
          <div>
            <p className="text-xs text-slate-500">Connection</p>
            <p className={`mt-1 text-sm font-semibold ${isOnline ? 'text-emerald-200' : 'text-slate-400'}`}>
              {isOnline ? 'MQTT connected' : 'Awaiting signal'}
            </p>
          </div>
          <span className="text-xs font-medium text-amber-200 opacity-0 transition-opacity group-hover:opacity-100">
            Open
          </span>
        </div>
      </div>
    </Link>
  );
}
