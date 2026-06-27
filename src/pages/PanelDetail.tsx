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
  Shield,
  ShieldAlert,
  BellOff,
  RotateCcw
} from "lucide-react";
import { formatDateTime } from "../utils/formatters";
import { Event } from "../types";

type Tab = "zones" | "history" | "contacts";

const tabs: Array<{ id: Tab; label: string; icon: typeof Settings }> = [
  { id: "zones", label: "Zones", icon: Settings },
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

  const canManageContacts = hasRole(["system_integrator"]);
  const isStrictlyEndUser = hasRole(["end_user"]) && !hasRole(["system_integrator"]);

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
      let apiCommand = command;
      if (command.startsWith("ARM")) apiCommand = "ARM";
      if (command.startsWith("ZONE OFF")) apiCommand = "ZONE OFF";
      
      const response = await PanelService.sendCommand(serial, apiCommand);
      
      if (response.commandId) {
        await PanelService.waitForCommandConfirmation(serial, response.commandId);
      }

      setCommandSuccess(command);
      setTimeout(() => setCommandSuccess(null), 3000);
    } catch (err: unknown) {
      // Extract specific error message if it's the timeout error
      const errMessage = err instanceof Error ? err.message : "Failed to send command";
      setCommandError(getApiErrorMessage(err, errMessage));
    } finally {
      setCommandLoading(null);
    }
  };

  const handleResetZone = async (zoneIndex: number) => {
    if (!serial || !panel) return;
    const commandId = `RESET ${zoneIndex + 1}`;

    setCommandError(null);
    setCommandSuccess(null);
    setCommandLoading(commandId);

    try {
      const newZones = [...(panel.zones || [])];
      newZones[zoneIndex] = false;
      const hasAnyAlarm = newZones.some(Boolean);

      await PanelService.updatePanel(serial, {
        zones: newZones,
        alarm: hasAnyAlarm
      });

      setCommandSuccess(commandId);
      setTimeout(() => setCommandSuccess(null), 3000);
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, "Failed to reset zone"));
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
      const response = await PanelService.sendCommand(serial, `MOB=${slot}=${number}`);
      
      if (response.commandId) {
        await PanelService.waitForCommandConfirmation(serial, response.commandId);
      }

      setSyncSuccessSlot(slot);
      setTimeout(() => setSyncSuccessSlot(null), 3000);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Failed to sync contact";
      setCommandError(getApiErrorMessage(err, errMessage));
    } finally {
      setSyncingSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-8 p-[32px]">
        {/* Header skeleton */}
        <div className="skeleton h-36 rounded-[12px]" />
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
              className="skeleton aspect-square rounded-[8px]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] items-center justify-center p-[32px]">
        <div className="surface-panel max-w-md rounded-[16px] p-10 text-center border border-[var(--border-subtle)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[12px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--color-error)]">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="font-sans text-[22px] font-bold text-[var(--text-primary)]">Panel Not Found</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            The panel with serial "{serial}" could not be found.
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-primary mt-6 rounded-[8px] px-5 py-2.5 text-sm font-semibold"
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
  };

  const visibleZones = Math.min(normalizedPanel.zoneCount || 0, 8);
  const panelCommands = [];
  for (let i = 1; i <= visibleZones; i++) {
    panelCommands.push(`ARM ${i}`);
  }
  panelCommands.push("ZONE OFF");

  const isOffline = normalizedPanel.manuallyMarkedOffline === true;
  const hasAlarm = normalizedPanel.alarm;
  const activeZones = normalizedPanel.zones.filter(Boolean).length;

  return (
    <div className="animate-fade-in p-[32px] space-y-8">
      {/* Header card */}
      <section
        className={`surface-panel relative overflow-hidden rounded-[16px] p-6 transition-all duration-300 ${
          hasAlarm ? "border border-[var(--color-error)]" : "border border-[var(--border-subtle)]"
        }`}
      >
        {/* Left rail accent */}
        {hasAlarm && (
          <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-[16px] bg-[var(--color-error)]" />
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Link
              to="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
                  {normalizedPanel.name}
                </h1>

                {hasAlarm && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-1.5 text-sm font-bold tracking-wide text-[var(--color-error)]">
                    <AlertTriangle className="h-4 w-4" />
                    ALARM ACTIVE
                  </span>
                )}

                {isOffline && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    <WifiOff className="h-4 w-4" />
                    Disabled (Offline)
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
                <span className="font-mono tabular-nums">
                  {normalizedPanel.serial}
                </span>
                <span className="tabular-nums">{normalizedPanel.zoneCount} Zones</span>
                {normalizedPanel.ipAddress && (
                  <span className="font-mono tabular-nums">
                    {normalizedPanel.ipAddress}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 stat mini-cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[440px]">
            <div className="surface-overlay relative overflow-hidden rounded-[8px] px-4 py-3.5 border border-[var(--border-subtle)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Total Zones</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {normalizedPanel.zoneCount}
              </p>
            </div>
            <div className="surface-overlay relative overflow-hidden rounded-[8px] px-4 py-3.5 border border-[var(--border-subtle)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">In Alarm</p>
              <p
                className={`mt-1.5 text-2xl font-semibold tabular-nums ${activeZones > 0 ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"}`}
              >
                {activeZones}
              </p>
            </div>
            <div className="surface-overlay relative overflow-hidden rounded-[8px] px-4 py-3.5 border border-[var(--border-subtle)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Commands</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {panelCommands.length + 1}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tab bar */}
      <div className="flex flex-row gap-0 border-b border-[var(--border-subtle)] bg-transparent overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap shrink-0 flex items-center justify-center gap-2 px-5 py-3.5 text-[13px] font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "border-b-[2px] border-[var(--accent)] text-[var(--text-primary)]"
                : "border-b-[2px] border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            }`}
          >
            <tab.icon className={`h-4 w-4 transition-colors duration-200 ${activeTab === tab.id ? "text-[var(--accent)]" : ""}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      {/* Zones tab */}
      {activeTab === "zones" && (
        <div className="animate-fade-in space-y-6">
          {commandError && (
            <div className="rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4">
              <p className="text-sm text-[var(--color-error)]">{commandError}</p>
            </div>
          )}



          {/* Zones Grid */}
          <section className="surface-panel rounded-[12px] p-6 border border-[var(--border-subtle)]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Zones & Controls
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  <span className="tabular-nums">{visibleZones}</span> zones displayed
                </p>
              </div>
            </div>

            {/* MOB Command section */}
            <div className="mb-8 pb-8 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[14px] font-bold text-[var(--text-primary)]">
                  MOB Command
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  To configure mobile numbers for the MOB command, click on the contact numbers tab.
                </p>
              </div>
              <button
                key="MOB_CONFIGURE"
                onClick={() => setActiveTab("contacts")}
                className="rounded-[8px] border px-6 py-3 transition-all duration-200 border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] shrink-0 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-sm font-semibold">Configure MOB</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: visibleZones }).map((_, idx) => {
                const zoneNum = idx + 1;
                const zoneAlarm = panel.zones[idx] || false;
                
                const armCmd = `ARM ${zoneNum}`;
                const silenceCmd = `ZONE OFF ${zoneNum}`;
                const resetCmd = `RESET ${zoneNum}`;
                
                const isEuRestricted = isStrictlyEndUser;

                return (
                  <div
                    key={idx}
                    className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                      zoneAlarm
                        ? "border-[var(--color-error)] shadow-[0_0_20px_rgba(220,38,38,0.15)] bg-gradient-to-br from-[var(--status-danger-bg)] to-[var(--surface-raised)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {/* Top status bar */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold tracking-widest uppercase ${zoneAlarm ? "text-[var(--color-error)]" : "text-[var(--text-tertiary)]"}`}>
                          Status
                        </span>
                        <span className={`text-xl font-black tracking-tight ${zoneAlarm ? "text-[var(--color-error)]" : "text-[var(--text-primary)]"}`}>
                          Zone {zoneNum}
                        </span>
                      </div>
                      {zoneAlarm ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] animate-pulse">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-overlay)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          <Shield className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Controls Divider */}
                    <div className={`h-[1px] w-full ${zoneAlarm ? 'bg-[var(--color-error)]/20' : 'bg-[var(--border-subtle)]'}`} />

                    {/* Control Panel Buttons */}
                    <div className="grid grid-cols-1 gap-2.5 relative z-10 mt-auto">
                      {/* Action buttons with glassmorphic aesthetic */}
                      <button
                        onClick={() => handleSendCommand(armCmd)}
                        disabled={commandLoading !== null || isEuRestricted}
                        className="group relative flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/50 px-4 py-2.5 transition-all duration-300 hover:border-[var(--color-error)] hover:bg-[var(--color-error)]/5 hover:shadow-lg hover:shadow-[var(--color-error)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-error)]">Alarm</span>
                         {commandLoading === armCmd ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-error)]" /> : commandSuccess === armCmd ? <CheckCircle className="h-4 w-4 text-[var(--color-success)]" /> : <ShieldAlert className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--color-error)] transition-colors" />}
                      </button>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => handleSendCommand(silenceCmd)}
                          disabled={commandLoading !== null}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                            zoneAlarm 
                              ? "border-[var(--color-warning)]/30 bg-[var(--status-warning-bg)] text-[var(--color-warning)] hover:border-[var(--color-warning)] hover:shadow-lg hover:shadow-[var(--color-warning)]/20" 
                              : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/50 text-[var(--text-secondary)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)]"
                          }`}
                        >
                           {commandLoading === silenceCmd ? <Loader2 className="h-4 w-4 animate-spin" /> : commandSuccess === silenceCmd ? <CheckCircle className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                           <span className="text-xs font-bold uppercase tracking-wider">Silence</span>
                        </button>
                        
                        <button
                          onClick={() => handleResetZone(idx)}
                          disabled={commandLoading !== null || isEuRestricted}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                            zoneAlarm 
                              ? "border-[var(--color-success)]/30 bg-[var(--status-success-bg)] text-[var(--color-success)] hover:border-[var(--color-success)] hover:shadow-lg hover:shadow-[var(--color-success)]/20" 
                              : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/50 text-[var(--text-secondary)] hover:border-[var(--color-success)] hover:text-[var(--color-success)]"
                          }`}
                        >
                           {commandLoading === resetCmd ? <Loader2 className="h-4 w-4 animate-spin" /> : commandSuccess === resetCmd ? <CheckCircle className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                           <span className="text-xs font-bold uppercase tracking-wider">Reset</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Background decorative blob for alarm state */}
                    {zoneAlarm && (
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--color-error)] blur-[50px] opacity-20 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === "history" && (
        <div className="animate-fade-in space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                Event History
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Panel event stream</p>
            </div>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="flex items-center gap-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] px-4 py-2 text-[13px] font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {eventsLoading ? (
            <div className="surface-panel flex justify-center rounded-[12px] py-16 border border-[var(--border-subtle)]">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
            </div>
          ) : events.length === 0 ? (
            <div className="surface-panel rounded-[12px] py-16 text-center border border-[var(--border-subtle)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] bg-[var(--surface-overlay)] border border-[var(--border-subtle)]">
                <Clock className="h-7 w-7 text-[var(--text-quaternary)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">No events recorded</p>
            </div>
          ) : (
            <div className="surface-panel rounded-[12px] border border-[var(--border-subtle)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-[var(--surface-overlay)] border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Timestamp
                      </th>
                      <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Type
                      </th>
                      <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Direction
                      </th>
                      <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className="transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <td className="px-5 py-3.5 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
                          {formatDateTime(
                            event.timestamp || (event as { createdAt?: unknown }).createdAt,
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                              event.type.includes("alarm")
                                ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--color-error)]"
                                : event.type.includes("warning")
                                  ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--color-warning)]"
                                  : "border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {event.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                              event.type === "command"
                                ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "border-[var(--color-success)]/30 bg-[var(--status-success-bg)] text-[var(--color-success)]"
                            }`}
                          >
                            {event.type === "command" ? "Sent" : "Received"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--text-primary)]">
                          {event.command && (
                            <span>
                              {event.command}
                              {event.ackPayload && <span className="ml-2 text-[var(--text-secondary)]">(Ack: {event.ackPayload})</span>}
                            </span>
                          )}
                          {event.raw && <span className="font-mono text-xs">{event.raw}</span>}
                          {event.zone && <span>Zone {event.zone}</span>}
                          {event.details && <span>{event.details}</span>}
                          {(!event.command && !event.raw && !event.zone && !event.details) && <span className="text-[var(--text-secondary)]">-</span>}
                          
                          {event.zoneNumber && (
                            <span className="ml-2 font-mono tabular-nums text-[var(--text-secondary)]">
                              (Zone {event.zoneNumber})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="animate-fade-in space-y-5">
          <div className="mb-6">
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
              Contact Numbers
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Configure up to 9 mobile numbers to receive alerts from this
              panel.
            </p>
          </div>

          {commandError && (
            <div className="mb-4 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4">
              <p className="text-sm text-[var(--color-error)]">{commandError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => {
              const slot = String(idx + 1).padStart(2, "0");
              const isSyncing = syncingSlot === slot;
              const isSuccess = syncSuccessSlot === slot;

              return (
                <div key={slot} className="surface-overlay rounded-[12px] p-5 border border-[var(--border-subtle)]">
                  <label className="mb-2.5 block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
                    Slot {slot}
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 z-10">
                        <Phone className="h-4 w-4 text-[var(--text-quaternary)]" />
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
                        disabled={!canManageContacts || isSyncing}
                        className="control-field w-full rounded-[8px] py-2.5 pl-10 pr-3 text-[13px] tabular-nums transition-colors focus:ring-1 focus:ring-[var(--border-strong)] disabled:opacity-50"
                      />
                    </div>
                    <button
                      onClick={() => handleSyncContact(slot)}
                      disabled={!canManageContacts || isSyncing}
                      className={`flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSuccess
                          ? "bg-[var(--status-success-bg)] text-[var(--color-success)] border border-[var(--status-success-border)]"
                          : "bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
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
