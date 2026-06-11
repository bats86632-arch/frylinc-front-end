import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePanel } from '../hooks/usePanels';

import { PanelService } from '../api/PanelService';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PANEL_COMMANDS } from '../config/panelDefaults';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  History,
  Loader2,
  Play,
  RefreshCw,
  Settings,
  Phone,
  Save
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import { Event } from '../types';

type Tab = 'zones' | 'controls' | 'history' | 'contacts';

const tabs: Array<{ id: Tab; label: string; icon: typeof Settings }> = [
  { id: 'zones', label: 'Zone Status', icon: Settings },
  { id: 'controls', label: 'Controls', icon: Play },
  { id: 'history', label: 'Event History', icon: History },
  { id: 'contacts', label: 'Contact Numbers', icon: Phone }
];

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
  const [togglingOffline, setTogglingOffline] = useState(false);
  const [contactNumbers, setContactNumbers] = useState<Record<string, string>>({});
  const [syncingSlot, setSyncingSlot] = useState<string | null>(null);
  const [syncSuccessSlot, setSyncSuccessSlot] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandSuccess, setCommandSuccess] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  useEffect(() => {
    if (panel?.contactNumbers) {
      setContactNumbers(panel.contactNumbers);
    }
  }, [panel]);

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
      setCommandSuccess(command);
      setTimeout(() => setCommandSuccess(null), 3000);
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, 'Failed to send command'));
    } finally {
      setCommandLoading(null);
    }
  };

  const handleSyncContact = async (slot: string) => {
    if (!serial) return;
    
    setCommandError(null);
    setSyncingSlot(slot);
    
    try {
      const number = contactNumbers[slot] || '';
      
      // Update in Firestore
      await PanelService.updatePanel(serial, {
        contactNumbers: {
          ...(panel?.contactNumbers || {}),
          [slot]: number
        }
      });
      
      // Send to panel
      await PanelService.sendCommand(serial, `MOB=${slot}=${number}`);
      
      setSyncSuccessSlot(slot);
      setTimeout(() => setSyncSuccessSlot(null), 3000);
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, `Failed to sync slot ${slot}`));
    } finally {
      setSyncingSlot(null);
    }
  };

  const handleToggleOffline = async () => {
    if (!serial) return;
    setTogglingOffline(true);
    try {
      await PanelService.updatePanel(serial, {
        manuallyMarkedOffline: !panel?.manuallyMarkedOffline
      });
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, 'Failed to toggle offline state'));
    } finally {
      setTogglingOffline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel rounded-lg px-8 py-7 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-amber-300" />
          <p className="text-sm font-medium text-slate-300">Loading panel details...</p>
        </div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel max-w-md rounded-lg p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">Panel Not Found</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The panel with serial "{serial}" could not be found.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold"
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
    allowedCommands: Array.isArray(panel.allowedCommands) ? panel.allowedCommands : [],
    groupId: panel.groupId || ''
  };

  const panelCommands = normalizedPanel.allowedCommands.length > 0 ? normalizedPanel.allowedCommands : DEFAULT_PANEL_COMMANDS;

  const isOffline = normalizedPanel.manuallyMarkedOffline === true;
  const hasAlarm = normalizedPanel.alarm;
  const activeZones = normalizedPanel.zones.filter(Boolean).length;
  const visibleZones = Math.min(normalizedPanel.zoneCount || 0, 8);

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-lg p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Link
              to="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-3xl font-semibold leading-tight text-white">{normalizedPanel.name}</h1>
                {hasAlarm && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100">
                    <AlertTriangle className="h-4 w-4" />
                    ALARM ACTIVE
                  </span>
                )}
                {isOffline && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-300">
                    <WifiOff className="h-4 w-4" />
                    Disabled (Offline)
                  </span>
                )}
                {canControl && (
                  <button
                    onClick={handleToggleOffline}
                    disabled={togglingOffline}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {togglingOffline ? 'Updating...' : `Mark ${isOffline ? 'Online' : 'Offline'}`}
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="font-mono text-slate-300">{normalizedPanel.serial}</span>
                <span>{normalizedPanel.zoneCount} Zones</span>
                {normalizedPanel.ipAddress && <span className="font-mono text-slate-300">{normalizedPanel.ipAddress}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Total Zones</p>
              <p className="mt-1 text-xl font-semibold text-white">{normalizedPanel.zoneCount}</p>
            </div>
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">In Alarm</p>
              <p className={`mt-1 text-xl font-semibold ${activeZones > 0 ? 'text-red-200' : 'text-slate-300'}`}>
                {activeZones}
              </p>
            </div>
            <div className="surface-muted rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Commands</p>
              <p className="mt-1 text-xl font-semibold text-amber-200">{panelCommands.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="surface-muted flex flex-col gap-2 rounded-lg p-1 sm:inline-flex sm:flex-row">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-red-500 text-white shadow-lg shadow-red-950/30'
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'zones' && (
        <div className="space-y-6">
          <section className="surface-panel rounded-lg p-5">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Zone Status Grid</h2>
                <p className="mt-1 text-sm text-slate-500">{visibleZones} zones displayed</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-[3px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.75)]" />
                  <span className="text-slate-400">Alarm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-[3px] bg-slate-700" />
                  <span className="text-slate-400">Normal</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-[repeat(16,minmax(0,1fr))]">
              {Array.from({ length: visibleZones }).map((_, idx) => {
                const zoneAlarm = panel.zones[idx] || false;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-lg border text-sm font-semibold transition-all ${
                      zoneAlarm
                        ? 'border-red-300/40 bg-red-500 text-white shadow-lg shadow-red-950/30'
                        : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.07]'
                    } flex items-center justify-center`}
                    title={`Zone ${idx + 1}: ${zoneAlarm ? 'ALARM' : 'Normal'}`}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
          </section>

          {panel.zones.some((z) => z) && (
            <section className="rounded-lg border border-red-300/25 bg-red-500/10 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-100">
                <AlertTriangle className="h-5 w-5" />
                Active Alarms
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {panel.zones.map((zoneAlarm, idx) =>
                  zoneAlarm ? (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-300/25 bg-slate-950/60 p-4"
                    >
                      <p className="font-semibold text-red-100">Zone {idx + 1}</p>
                      <p className="mt-1 text-xs text-red-200/70">ALARM ACTIVE</p>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'controls' && (
        <div className="space-y-5">
          {!canControl && (
            <div className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-100">
                You do not have permission to execute commands on this panel.
              </p>
            </div>
          )}

          {commandError && (
            <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-4">
              <p className="text-sm text-red-100">{commandError}</p>
            </div>
          )}

          <section className="surface-panel rounded-lg p-5">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-white">Available Commands</h3>
              <p className="mt-1 text-sm text-slate-500">
                Commands are sent to the selected panel.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {panelCommands.map((command) => (
                <button
                  key={command}
                  onClick={() => handleSendCommand(command)}
                  disabled={!canControl || commandLoading !== null}
                  className={`rounded-lg border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    commandSuccess === command 
                      ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100'
                      : commandLoading === command
                      ? 'border-amber-300/40 bg-amber-400/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.03] text-white hover:border-amber-300/35 hover:bg-amber-400/10'
                  }`}
                >
                  {commandSuccess === command ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-300" />
                      <span className="text-sm font-semibold">Sent</span>
                    </div>
                  ) : commandLoading === command ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-200" />
                      <span className="text-sm font-semibold">Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20">
                        <Play className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{command}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Event History</h2>
              <p className="mt-1 text-sm text-slate-500">Panel event stream</p>
            </div>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="btn-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${eventsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {eventsLoading ? (
            <div className="surface-panel flex justify-center rounded-lg py-14">
              <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
            </div>
          ) : events.length === 0 ? (
            <div className="surface-panel rounded-lg py-14 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-slate-600" />
              <p className="text-sm text-slate-400">No events recorded</p>
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {events.map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-white/[0.035]">
                      <td className="px-4 py-3 font-mono text-sm text-slate-300">
                        {formatDateTime(event.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            event.type.includes('alarm')
                              ? 'border-red-300/30 bg-red-500/10 text-red-100'
                              : event.type.includes('warning')
                              ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
                              : 'border-white/10 bg-white/[0.04] text-slate-300'
                          }`}
                        >
                          {event.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {event.details}
                        {event.zoneNumber && (
                          <span className="ml-2 font-mono text-slate-500">(Zone {event.zoneNumber})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Contact Numbers</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure up to 9 mobile numbers to receive alerts from this panel.
            </p>
          </div>

          {commandError && (
            <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-4 mb-4">
              <p className="text-sm text-red-100">{commandError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => {
              const slot = String(idx + 1).padStart(2, '0');
              const isSyncing = syncingSlot === slot;
              const isSuccess = syncSuccessSlot === slot;
              
              return (
                <div key={slot} className="surface-panel rounded-lg p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Slot {slot}
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Mobile Number"
                      value={contactNumbers[slot] || ''}
                      onChange={(e) => setContactNumbers(prev => ({ ...prev, [slot]: e.target.value }))}
                      disabled={!canControl || isSyncing}
                      className="form-input flex-1 disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleSyncContact(slot)}
                      disabled={!canControl || isSyncing}
                      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSuccess
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      {isSuccess ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Saved</span>
                        </>
                      ) : isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Syncing</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Sync</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
