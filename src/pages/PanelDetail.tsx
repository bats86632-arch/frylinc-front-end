import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePanel } from '../hooks/usePanels';
import { PanelService } from '../api/PanelService';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PANEL_COMMANDS } from '../config/panelDefaults';
import {
  RefreshCw,
  Loader2
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import { Event } from '../types';

type Tab = 'zones' | 'controls' | 'history';

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }
  return fallback;
}

export function PanelDetail() {
  const { serial } = useParams<{ serial: string }>();
  const navigate = useNavigate();
  const { panel, loading, error } = usePanel(serial!);
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('zones');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandSuccess, setCommandSuccess] = useState<string | null>(null);

  const canControl = hasRole(['super_admin', 'head_office', 'system_integrator']);

  const loadEvents = useCallback(async () => {
    if (!serial) return;
    setEventsLoading(true);
    try {
      const data = await PanelService.getEvents(serial);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, [serial]);

  useEffect(() => {
    if (activeTab === 'history' && serial) {
      loadEvents();
    }
  }, [activeTab, loadEvents, serial]);

  const handleSendCommand = async (command: string) => {
    if (!serial) return;

    setCommandError(null);
    setCommandSuccess(null);
    setCommandLoading(command);

    try {
      await PanelService.sendCommand(serial, command);
      setCommandSuccess('Sent');
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, 'Failed to send command'));
    } finally {
      setCommandLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-panel rounded-xl px-8 py-7 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-tertiary-container" />
          <p className="font-label-md text-label-md text-on-surface-variant">Loading panel details...</p>
        </div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-panel max-w-md rounded-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-tertiary-container/10 text-tertiary-container">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Panel Not Found</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            The panel with serial "{serial}" could not be found.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary/20 hover:bg-primary/30 mt-5 rounded-lg px-4 py-2.5 font-label-md text-label-md text-primary transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const normalizedPanel = {
    ...panel,
    zones: Array.isArray(panel.zones) ? panel.zones : [],
  };

  const panelCommands = DEFAULT_PANEL_COMMANDS;

  const hasAlarm = normalizedPanel.alarm;
  const activeZones = normalizedPanel.zones.filter(Boolean).length;
  const visibleZones = Math.min(normalizedPanel.zoneCount || 0, 64);

  return (
    <div className="max-w-[1440px] mx-auto px-margin py-lg space-y-lg">
      <header className="flex justify-between items-start border-b border-white/10 pb-md">
        <div>
          <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md flex items-center gap-xs mb-sm">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-md">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{normalizedPanel.name}</h1>
            {hasAlarm && (
              <div className="bg-tertiary-container/20 border border-tertiary-container text-tertiary-container px-sm py-xs rounded-full flex items-center gap-xs animate-pulse">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                <span className="font-label-md text-label-md font-bold">ALARM ACTIVE</span>
              </div>
            )}
          </div>
          <p className="text-on-surface-variant font-label-md text-label-md mt-xs">SN: {normalizedPanel.serial} • {normalizedPanel.zoneCount} Total Zones {normalizedPanel.ipAddress && `• IP: ${normalizedPanel.ipAddress}`}</p>
        </div>
      </header>

      <nav className="flex gap-md border-b border-white/10">
        <button onClick={() => setActiveTab('zones')} className={`pb-sm font-label-md text-label-md transition-colors ${activeTab === 'zones' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Zone Status</button>
        <button onClick={() => setActiveTab('controls')} className={`pb-sm font-label-md text-label-md transition-colors ${activeTab === 'controls' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Controls</button>
        <button onClick={() => setActiveTab('history')} className={`pb-sm font-label-md text-label-md transition-colors ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Event History</button>
      </nav>

      {activeTab === 'zones' && (
        <div className="space-y-lg">
          <div className="glass-panel p-gutter rounded-xl">
            <div className="mb-md flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md text-on-surface">Zone Map</h2>
              <div className="flex gap-md">
                <div className="flex items-center gap-xs text-on-surface-variant text-label-sm">
                  <div className="w-3 h-3 bg-tertiary-container rounded-[2px] shadow-[0_0_10px_rgba(255,84,81,0.5)]"></div>
                  Alarm
                </div>
                <div className="flex items-center gap-xs text-on-surface-variant text-label-sm">
                  <div className="w-3 h-3 bg-white/10 rounded-[2px]"></div>
                  Normal
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-xs">
              {Array.from({ length: visibleZones }).map((_, idx) => {
                const zoneAlarm = panel.zones[idx] || false;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-md flex items-center justify-center font-data-mono text-sm transition-all ${
                      zoneAlarm
                        ? 'bg-tertiary-container text-white shadow-[0_0_15px_rgba(255,84,81,0.6)] font-bold'
                        : 'bg-white/5 text-on-surface-variant border border-white/5'
                    }`}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {activeZones > 0 && (
            <div className="glass-panel-raised p-gutter rounded-xl border-tertiary-container/30">
              <h3 className="font-headline-md text-headline-md text-tertiary-container mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined">warning</span> Active Alarms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-sm">
                {panel.zones.map((zoneAlarm, idx) =>
                  zoneAlarm ? (
                    <div key={idx} className="bg-tertiary-container/10 border border-tertiary-container/30 rounded-lg p-md">
                      <span className="font-label-md text-label-md text-on-surface-variant">Zone {idx + 1}</span>
                      <p className="font-headline-md text-headline-md text-tertiary-container mt-xs">ALARM ACTIVE</p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'controls' && (
        <div className="glass-panel p-gutter rounded-xl">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Panel Controls</h2>
          
          {!canControl && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg p-md mb-md">
              You do not have permission to execute commands on this panel.
            </div>
          )}

          {commandError && (
            <div className="bg-tertiary-container/10 border border-tertiary-container/30 text-tertiary-container rounded-lg p-md mb-md">
              {commandError}
            </div>
          )}

          {commandSuccess && (
            <div className="bg-secondary/10 border border-secondary/30 text-secondary rounded-lg p-md mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined">check_circle</span>
              {commandSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
            {panelCommands.map((command) => (
              <button
                key={command}
                onClick={() => handleSendCommand(command)}
                disabled={!canControl || commandLoading !== null}
                className={`flex items-center gap-sm p-md rounded-xl border transition-all text-left ${
                  commandLoading === command
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-white/10 bg-white/5 text-on-surface hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {commandLoading === command ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <span className="material-symbols-outlined text-primary">play_arrow</span>
                )}
                <span className="font-label-md text-label-md">{command}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-md border-b border-white/5 flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">Event History</h2>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="text-primary text-label-md flex items-center gap-xs hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${eventsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          <div className="p-0">
            {eventsLoading ? (
              <div className="py-xl flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : events.length === 0 ? (
              <div className="py-xl text-center text-on-surface-variant font-label-md text-label-md">
                No events recorded.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {events.map((event) => {
                  const isAlarm = event.type.includes('alarm');
                  const isWarning = event.type.includes('warning');
                  const colorClass = isAlarm ? 'bg-tertiary-container' : isWarning ? 'bg-amber-500' : 'bg-primary';
                  const textClass = isAlarm ? 'text-tertiary-container' : isWarning ? 'text-amber-500' : 'text-on-surface-variant';

                  return (
                    <div key={event.id} className="p-md hover:bg-white/5 transition-colors flex items-start sm:items-center gap-md flex-col sm:flex-row">
                      <div className="flex items-center gap-sm min-w-[140px]">
                        <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                        <span className="font-data-mono text-label-md text-on-surface-variant">{formatDateTime(event.timestamp)}</span>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-sm mb-xs">
                          <span className={`uppercase font-bold text-[11px] tracking-wider px-2 py-0.5 rounded-full border ${isAlarm ? 'border-tertiary-container/30 bg-tertiary-container/10 text-tertiary-container' : isWarning ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-on-surface-variant'}`}>
                            {event.type}
                          </span>
                          {event.zoneNumber && (
                            <span className="font-data-mono text-label-sm text-on-surface-variant">Zone {event.zoneNumber}</span>
                          )}
                        </div>
                        <span className={`font-body-md text-body-md ${isAlarm ? 'text-tertiary-container font-medium' : 'text-on-surface'}`}>
                          {event.details}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
