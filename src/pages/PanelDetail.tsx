import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePanel } from '../hooks/usePanels';
import { useCommandStatus } from '../hooks/useCommands';
import { PanelService } from '../api/PanelService';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Clock,
  Settings,
  History,
  Play,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import { Event } from '../types';

type Tab = 'zones' | 'controls' | 'history';

export function PanelDetail() {
  const { serial } = useParams<{ serial: string }>();
  const navigate = useNavigate();
  const { panel, loading, error } = usePanel(serial!);
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('zones');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandId, setCommandId] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  const { commandLog } = useCommandStatus(serial!, commandId);

  const canControl = hasRole(['super_admin', 'head_office', 'system_integrator']);

  useEffect(() => {
    if (activeTab === 'history' && serial) {
      loadEvents();
    }
  }, [activeTab, serial]);

  useEffect(() => {
    if (commandLog?.status === 'sent' && commandLog?.ackStatus === 'acknowledged') {
      setCommandLoading(null);
      setCommandId(null);
    }
  }, [commandLog]);

  const loadEvents = async () => {
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
  };

  const handleSendCommand = async (command: string) => {
    if (!serial) return;

    setCommandError(null);
    setCommandLoading(command);

    try {
      const response = await PanelService.sendCommand(serial, command);
      setCommandId(response.commandId);
    } catch (err: any) {
      setCommandError(err.response?.data?.message || 'Failed to send command');
      setCommandLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading panel details...</p>
        </div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Panel Not Found</h3>
          <p className="text-slate-400 mb-4">
            The panel with serial "{serial}" could not be found.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isOnline = panel.mqttConnected;
  const hasAlarm = panel.alarm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white truncate">{panel.name}</h1>

            {hasAlarm && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-semibold animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                ALARM ACTIVE
              </span>
            )}

            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                isOnline ? 'bg-green-500/20 text-green-500' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="font-mono">{panel.serial}</span>
            <span>{panel.zoneCount} Zones</span>
            {panel.ipAddress && <span className="font-mono">{panel.ipAddress}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex gap-6">
          {[
            { id: 'zones' as Tab, label: 'Zone Status', icon: Settings },
            { id: 'controls' as Tab, label: 'Controls', icon: Play },
            { id: 'history' as Tab, label: 'Event History', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Zone Status Grid</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-slate-400">Alarm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-600 rounded" />
                <span className="text-slate-400">Normal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-2">
            {Array.from({ length: Math.min(panel.zoneCount, 64) }).map((_, idx) => {
              const zoneAlarm = panel.zones[idx] || false;
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-lg flex items-center justify-center font-mono text-sm font-bold transition-all ${
                    zoneAlarm
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 animate-pulse'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                  title={`Zone ${idx + 1}: ${zoneAlarm ? 'ALARM' : 'Normal'}`}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          {panel.zones.some((z) => z) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Alarms
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {panel.zones.map((zoneAlarm, idx) =>
                  zoneAlarm ? (
                    <div
                      key={idx}
                      className="bg-slate-800 rounded-lg p-3 border border-red-500/30"
                    >
                      <p className="text-red-500 font-semibold">Zone {idx + 1}</p>
                      <p className="text-xs text-slate-400">ALARM ACTIVE</p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'controls' && (
        <div className="space-y-6">
          {!canControl && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-500 text-sm">
                You do not have permission to execute commands on this panel.
              </p>
            </div>
          )}

          {commandError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-500 text-sm">{commandError}</p>
            </div>
          )}

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Available Commands</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {panel.allowedCommands.map((command) => (
                <button
                  key={command}
                  onClick={() => handleSendCommand(command)}
                  disabled={!canControl || !isOnline || commandLoading !== null}
                  className={`p-4 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    commandLoading === command
                      ? 'bg-amber-500/20 border-amber-500/50'
                      : 'bg-slate-700/50 border-slate-600 hover:border-amber-500/50 hover:bg-amber-500/10'
                  }`}
                >
                  {commandLoading === command ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm font-medium text-amber-500">Sending...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Play className="w-6 h-6 text-white" />
                      <span className="text-sm font-medium text-white">{command}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {commandLog && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Command Status</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {commandLog.status === 'queued' && (
                    <>
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                      <span className="text-amber-500">Queued</span>
                    </>
                  )}
                  {commandLog.status === 'sent' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-500">Sent</span>
                    </>
                  )}
                  {commandLog.status === 'failed' && (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-500">Failed</span>
                    </>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-600" />

                <div className="flex items-center gap-2">
                  {commandLog.ackStatus === 'pending' && (
                    <>
                      <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                      <span className="text-amber-500">Awaiting Acknowledgment</span>
                    </>
                  )}
                  {commandLog.ackStatus === 'acknowledged' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-500">Acknowledged by Panel</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Event History</h2>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No events recorded</p>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {formatDateTime(event.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.type.includes('alarm')
                              ? 'bg-red-500/20 text-red-500'
                              : event.type.includes('warning')
                              ? 'bg-amber-500/20 text-amber-500'
                              : 'bg-slate-600 text-slate-300'
                          }`}
                        >
                          {event.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {event.details}
                        {event.zoneNumber && <span className="ml-2 font-mono text-slate-500">(Zone {event.zoneNumber})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
