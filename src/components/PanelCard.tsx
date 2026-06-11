import { Link } from 'react-router-dom';
import { Panel } from '../types';

interface PanelCardProps {
  panel: Panel;
  viewMode?: 'grid' | 'list';
}

export function PanelCard({ panel, viewMode = 'grid' }: PanelCardProps) {
  const hasAlarm = panel.alarm;
  const alarmZones = panel.zones.filter(Boolean).length;
  const activeZones = panel.zones.length; // Actually, the panel has zoneCount but let's use what we have

  if (hasAlarm) {
    return (
      <Link
        to={`/panel/${panel.serial}`}
        className={`glass-panel-raised p-gutter rounded-xl border-tertiary-container animate-pulse-alarm flex flex-col gap-md relative overflow-hidden group block ${viewMode === 'list' ? 'sm:flex-row sm:items-center sm:justify-between' : ''}`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary-container/10 blur-3xl -z-10 group-hover:bg-tertiary-container/20 transition-all"></div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface truncate">{panel.name}</h3>
            <p className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">SN: {panel.serial}</p>
          </div>
          <div className="bg-tertiary-container text-white px-sm py-xs rounded-full flex items-center gap-xs shadow-lg shadow-tertiary-container/40 shrink-0">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
            <span className="font-label-md text-label-md font-bold">ALARM</span>
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-base border-y border-white/5 py-md ${viewMode === 'list' ? 'hidden sm:grid sm:border-y-0 sm:py-0' : ''}`}>
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-[12px] uppercase">Total Zones</span>
            <span className="text-on-surface font-headline-md">{panel.zoneCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-[12px] uppercase">Alert</span>
            <span className="text-tertiary-container font-headline-md">{alarmZones} Zone(s)</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-auto">
          <span className="text-on-surface-variant text-label-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-[16px] text-tertiary">warning</span>
            Active fire detected
          </span>
          <button className="bg-white/10 hover:bg-white/20 px-md py-base rounded-lg text-on-surface transition-all active:scale-95 shrink-0">
            Inspect
          </button>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/panel/${panel.serial}`}
      className={`glass-panel p-gutter rounded-xl hover:border-secondary/50 transition-all flex flex-col gap-md group block ${viewMode === 'list' ? 'sm:flex-row sm:items-center sm:justify-between' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface truncate">{panel.name}</h3>
          <p className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">SN: {panel.serial}</p>
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-base border-y border-white/5 py-md ${viewMode === 'list' ? 'hidden sm:grid sm:border-y-0 sm:py-0' : ''}`}>
        <div className="flex flex-col">
          <span className="text-on-surface-variant text-[12px] uppercase">Total Zones</span>
          <span className="text-on-surface font-headline-md">{panel.zoneCount}</span>
        </div>
        <div></div>
      </div>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-on-surface-variant text-label-md truncate mr-2">All zones clear</span>
        <button className="bg-white/5 hover:bg-white/10 px-md py-base rounded-lg text-on-surface-variant transition-all shrink-0">
          Details
        </button>
      </div>
    </Link>
  );
}
