import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePanel } from "../hooks/usePanels";

import { PanelService } from "../api/PanelService";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_PANEL_COMMANDS } from "../config/panelDefaults";
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
  Save,
  WifiOff,
} from "lucide-react";
import { formatDateTime } from "../utils/formatters";
import { Event } from "../types";

type Tab = "zones" | "controls" | "history" | "contacts";

const tabs: Array<{ id: Tab; label: string; icon: typeof Settings }> = [
  { id: "zones", label: "Zone Status", icon: Settings },
  { id: "controls", label: "Controls", icon: Play },
  { id: "history", label: "Event History", icon: History },
  { id: "contacts", label: "Contact Numbers", icon: Phone },
];

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
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

  const [activeTab, setActiveTab] = useState<Tab>("zones");
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [contactNumbers, setContactNumbers] = useState<Record<string, string>>(
    {},
  );
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

  const canControl = hasRole([
    "super_admin",
    "head_office",
    "system_integrator",
  ]);

  const loadEvents = useCallback(async () => {
    if (!serial) return;
    setEventsLoading(true);
    try {
      const data = await PanelService.getEvents(serial);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setEventsLoading(false);
    }
  }, [serial]);

  useEffect(() => {
    if (activeTab === "history" && serial) {
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
      setCommandError(getApiErrorMessage(err, "Failed to send command"));
    } finally {
      setCommandLoading(null);
    }
  };

  const handleSyncContact = async (slot: string) => {
    if (!serial) return;

    setCommandError(null);
    setSyncingSlot(slot);

    try {
      const number = contactNumbers[slot] || "";

      // Update in Firestore
      await PanelService.updatePanel(serial, {
        contactNumbers: {
          ...(panel?.contactNumbers || {}),
          [slot]: number,
        },
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

  if (loading) {
    return (
      <div className="animate-fade-in space-y-8">
        {/* Header skeleton */}
        <div className="skeleton h-36 rounded-card" />
        {/* Tab bar skeleton */}
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-32 rounded-t-lg" />
          ))}
        </div>
        {/* Zone grid skeleton */}
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton aspect-square rounded-[10px]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel max-w-md rounded-card p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[14px] border border-red-400/20 bg-gradient-to-br from-red-500/20 to-red-600/5 text-red-300 shadow-glow-red">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="font-display text-title text-balance text-white">Panel Not Found</h3>
          <p className="mt-3 text-body leading-relaxed text-slate-400">
            The panel with serial "{serial}" could not be found.
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-primary mt-6 rounded-element px-5 py-2.5 text-sm font-semibold"
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
    allowedCommands: Array.isArray(panel.allowedCommands)
      ? panel.allowedCommands
      : [],
    groupId: panel.groupId || "",
  };

  const panelCommands =
    normalizedPanel.allowedCommands.length > 0
      ? normalizedPanel.allowedCommands
      : DEFAULT_PANEL_COMMANDS;

  const isOffline = normalizedPanel.manuallyMarkedOffline === true;
  const hasAlarm = normalizedPanel.alarm;
  const activeZones = normalizedPanel.zones.filter(Boolean).length;
  const visibleZones = Math.min(normalizedPanel.zoneCount || 0, 8);

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header card — glows red when alarm is active */}
      <section
        className={`surface-panel relative overflow-hidden rounded-card p-6 transition-all duration-500 ease-smooth ${
          hasAlarm ? "shadow-[0_0_60px_rgba(239,68,68,0.15),0_0_20px_rgba(239,68,68,0.1)]" : ""
        }`}
      >
        {/* Red left-rail accent */}
        {hasAlarm && (
          <div className="absolute left-0 top-0 h-full w-1.5 rounded-bl-card rounded-tl-card bg-gradient-to-b from-red-400 via-red-500 to-red-600" />
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Link
              to="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.03] text-slate-300 transition-all duration-200 ease-smooth hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white hover:-translate-y-0.5"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display truncate text-display text-balance leading-tight text-white">
                  {normalizedPanel.name}
                </h1>

                {hasAlarm && (
                  <span className="inline-flex animate-pulse-shadow items-center gap-1.5 rounded-full border border-red-300/30 bg-red-500/15 px-4 py-1.5 text-sm font-bold tracking-wide text-red-100 shadow-glow-red">
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
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="font-mono tabular-nums text-slate-300">
                  {normalizedPanel.serial}
                </span>
                <span className="tabular-nums">{normalizedPanel.zoneCount} Zones</span>
                {normalizedPanel.ipAddress && (
                  <span className="font-mono tabular-nums text-slate-300">
                    {normalizedPanel.ipAddress}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 stat mini-cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[440px]">
            <div className="surface-muted relative overflow-hidden rounded-[10px] px-4 py-3.5">
              <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-400/[0.06]">
                <Settings className="h-4 w-4 text-slate-600" />
              </div>
              <p className="text-micro uppercase tracking-wider text-slate-500">Total Zones</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white">
                {normalizedPanel.zoneCount}
              </p>
            </div>
            <div className="surface-muted relative overflow-hidden rounded-[10px] px-4 py-3.5">
              <div className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg ${activeZones > 0 ? "bg-red-500/10" : "bg-slate-400/[0.06]"}`}>
                <AlertTriangle className={`h-4 w-4 ${activeZones > 0 ? "text-red-400/60" : "text-slate-600"}`} />
              </div>
              <p className="text-micro uppercase tracking-wider text-slate-500">In Alarm</p>
              <p
                className={`mt-1.5 text-2xl font-semibold tabular-nums ${activeZones > 0 ? "text-red-200" : "text-slate-300"}`}
              >
                {activeZones}
              </p>
            </div>
            <div className="surface-muted relative overflow-hidden rounded-[10px] px-4 py-3.5">
              <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/[0.08]">
                <Play className="h-4 w-4 text-amber-500/50" />
              </div>
              <p className="text-micro uppercase tracking-wider text-slate-500">Commands</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-amber-200">
                {panelCommands.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tab bar — polished underline style */}
      <div className="flex flex-row gap-0 border-b border-white/[0.07] bg-transparent overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap shrink-0 flex items-center justify-center gap-2 px-5 py-3.5 text-[13px] font-medium transition-all duration-200 ease-smooth ${
              activeTab === tab.id
                ? "rounded-t-lg border-b-[3px] border-amber-400 bg-amber-400/[0.04] text-white"
                : "rounded-t-lg border-b-[3px] border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
            }`}
          >
            <tab.icon className={`h-4 w-4 transition-colors duration-200 ${activeTab === tab.id ? "text-amber-400" : ""}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Zones tab */}
      {activeTab === "zones" && (
        <div className="animate-fade-in space-y-6">
          <section className="surface-panel rounded-card p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-subtitle text-balance text-white">
                  Zone Status Grid
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="tabular-nums">{visibleZones}</span> zones displayed
                </p>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-[3px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.75)]" />
                  <span className="text-slate-400">Alarm</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-[3px] bg-slate-700" />
                  <span className="text-slate-400">Normal</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {Array.from({ length: visibleZones }).map((_, idx) => {
                const zoneAlarm = panel.zones[idx] || false;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-[10px] border text-sm font-semibold tabular-nums transition-all duration-200 ease-smooth ${
                      zoneAlarm
                        ? "animate-pulse-shadow border-red-300/40 bg-red-500 text-white shadow-glow-red"
                        : "border-white/[0.07] bg-white/[0.04] text-slate-400 hover:scale-105 hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-slate-200 hover:shadow-elevation-1"
                    } flex cursor-default items-center justify-center`}
                    title={`Zone ${idx + 1}: ${zoneAlarm ? "ALARM" : "Normal"}`}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
          </section>

          {panel.zones.some((z) => z) && (
            <section className="overflow-hidden rounded-card border border-red-400/30 bg-gradient-to-br from-red-950/50 via-red-950/30 to-slate-950/70 p-6 shadow-[0_0_40px_rgba(239,68,68,0.08)]">
              <h3 className="mb-5 flex items-center gap-2.5 text-subtitle font-semibold text-red-100">
                {/* Pulsing live-indicator dot */}
                <span className="relative mr-1 flex h-3 w-3">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative h-3 w-3 rounded-full bg-red-500" />
                </span>
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Active Alarms
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {panel.zones.map((zoneAlarm, idx) =>
                  zoneAlarm ? (
                    <div
                      key={idx}
                      className="surface-panel animate-pulse-shadow rounded-[10px] border border-red-300/20 bg-gradient-to-br from-red-950/40 to-slate-950/80 p-5"
                    >
                      <p className="text-lg font-semibold tabular-nums text-red-100">
                        Zone {idx + 1}
                      </p>
                      <p className="mt-1.5 text-micro uppercase tracking-wider text-red-300/70">
                        ALARM ACTIVE
                      </p>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === "controls" && (
        <div className="animate-fade-in space-y-6">
          {!canControl && (
            <div className="rounded-[10px] border border-amber-300/20 bg-amber-400/[0.08] p-4">
              <p className="text-sm text-amber-100">
                You do not have permission to execute commands on this panel.
              </p>
            </div>
          )}

          {commandError && (
            <div className="rounded-[10px] border border-red-300/20 bg-red-500/[0.08] p-4">
              <p className="text-sm text-red-100">{commandError}</p>
            </div>
          )}

          <section className="surface-panel rounded-card p-6">
            <div className="mb-6">
              <h3 className="font-display text-subtitle text-balance text-white">
                Available Commands
              </h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Commands are sent to the selected panel.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {panelCommands.map((command) => (
                <button
                  key={command}
                  onClick={() => handleSendCommand(command)}
                  disabled={!canControl || commandLoading !== null}
                  className={`rounded-[10px] border p-5 text-left transition-all duration-200 ease-smooth disabled:cursor-not-allowed disabled:opacity-50 ${
                    commandSuccess === command
                      ? "border-emerald-300/30 bg-emerald-400/[0.08] text-emerald-100 shadow-glow-emerald"
                      : commandLoading === command
                        ? "border-amber-300/30 bg-amber-400/[0.08] text-amber-100 shadow-glow-amber"
                        : "border-white/[0.07] bg-white/[0.03] text-white hover:border-amber-300/30 hover:bg-amber-400/[0.06] hover:shadow-glow-amber hover:-translate-y-0.5"
                  }`}
                >
                  {commandSuccess === command ? (
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-emerald-500/15">
                        <CheckCircle className="h-5 w-5 text-emerald-300" />
                      </span>
                      <span className="text-sm font-semibold">Sent</span>
                    </div>
                  ) : commandLoading === command ? (
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-amber-500/15">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-200" />
                      </span>
                      <span className="text-sm font-semibold">Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/[0.07] bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                        <Play className="h-4 w-4 text-amber-300/70" />
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

      {activeTab === "history" && (
        <div className="animate-fade-in space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-subtitle text-balance text-white">
                Event History
              </h2>
              <p className="mt-1 text-sm text-slate-500">Panel event stream</p>
            </div>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="btn-secondary flex items-center gap-2 rounded-element px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {eventsLoading ? (
            <div className="surface-panel flex justify-center rounded-card py-16">
              <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
            </div>
          ) : events.length === 0 ? (
            <div className="surface-panel rounded-card py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-slate-800/50">
                <Clock className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400">No events recorded</p>
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="sticky top-0 border-b border-white/[0.07] bg-slate-950/95 backdrop-blur-lg">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-micro uppercase tracking-wider text-slate-500">
                      Timestamp
                    </th>
                    <th className="px-5 py-3.5 text-left text-micro uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-5 py-3.5 text-left text-micro uppercase tracking-wider text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="transition-all duration-150 ease-smooth hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-3.5 font-mono text-sm tabular-nums text-slate-300">
                        {formatDateTime(
                          event.timestamp || (event as any).createdAt,
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-micro font-semibold tracking-wide ${
                            event.type.includes("alarm")
                              ? "border-red-300/25 bg-red-500/[0.08] text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                              : event.type.includes("warning")
                                ? "border-amber-300/25 bg-amber-400/[0.08] text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                : "border-white/[0.07] bg-white/[0.04] text-slate-300"
                          }`}
                        >
                          {event.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {event.details}
                        {event.zoneNumber && (
                          <span className="ml-2 font-mono tabular-nums text-slate-500">
                            (Zone {event.zoneNumber})
                          </span>
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

      {activeTab === "contacts" && (
        <div className="animate-fade-in space-y-5">
          <div className="mb-6">
            <h2 className="font-display text-subtitle text-balance text-white">
              Contact Numbers
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Configure up to 9 mobile numbers to receive alerts from this
              panel.
            </p>
          </div>

          {commandError && (
            <div className="mb-4 rounded-[10px] border border-red-300/20 bg-red-500/[0.08] p-4">
              <p className="text-sm text-red-100">{commandError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => {
              const slot = String(idx + 1).padStart(2, "0");
              const isSyncing = syncingSlot === slot;
              const isSuccess = syncSuccessSlot === slot;

              return (
                <div key={slot} className="surface-muted rounded-[10px] p-5">
                  <label className="mb-2.5 block text-micro uppercase tracking-wider font-semibold text-slate-400">
                    Slot {slot}
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 z-10">
                        <Phone className="h-4 w-4 text-white/40" />
                      </div>
                      <input
                        type="text"
                        placeholder="0000000000"
                        value={contactNumbers[slot] || ""}
                        onChange={(e) =>
                          setContactNumbers((prev) => ({
                            ...prev,
                            [slot]: e.target.value,
                          }))
                        }
                        disabled={!canControl || isSyncing}
                        className="control-field w-full rounded-element py-2.5 pl-10 pr-3 text-sm tabular-nums transition-all duration-200 focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50"
                      />
                    </div>
                    <button
                      onClick={() => handleSyncContact(slot)}
                      disabled={!canControl || isSyncing}
                      className={`flex items-center justify-center gap-2 rounded-element px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-smooth disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSuccess
                          ? "bg-emerald-500/15 text-emerald-300 shadow-glow-emerald hover:bg-emerald-500/25"
                          : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:-translate-y-0.5"
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
