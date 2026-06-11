import { Link } from 'react-router-dom';
import { Panel } from '../types';
import { WifiOff, Wifi, AlertTriangle, ExternalLink } from 'lucide-react';

interface PanelCardProps {
  panel: Panel;
}

export function PanelCard({ panel }: PanelCardProps) {
  const hasAlarm = panel.alarm;
  const isOnline = panel.mqttConnected;

  return (
    <Link
      to={`/panel/${panel.serial}`}
      className={`block bg-slate-800/50 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-xl ${
        hasAlarm
          ? 'border-red-500/50 animate-pulse-shadow'
          : isOnline
          ? 'border-slate-700/50 hover:border-amber-500/30'
          : 'border-slate-700/50 opacity-60'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white truncate">{panel.name}</h3>
              <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
            </div>
            <p className="text-sm text-slate-400 font-mono">{panel.serial}</p>
          </div>

          <div className="flex items-center gap-3">
            {hasAlarm && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 rounded-full">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-red-500">ALARM</span>
              </div>
            )}

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                isOnline ? 'bg-green-500/20' : 'bg-slate-700'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-medium text-green-500">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-400">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-400">
            <span>{panel.zoneCount} Zones</span>

            {panel.ipAddress && (
              <span className="font-mono text-xs">{panel.ipAddress}</span>
            )}
          </div>

          {hasAlarm && (
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-medium">Active Alarm</span>
            </div>
          )}
        </div>

        {hasAlarm && (
          <div className="mt-3 pt-3 border-t border-red-500/20">
            <div className="grid grid-cols-8 gap-1">
              {panel.zones.slice(0, Math.min(panel.zoneCount, 64)).map((zoneAlarm, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-sm ${
                    zoneAlarm ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                  title={`Zone ${idx + 1}: ${zoneAlarm ? 'ALARM' : 'Normal'}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
