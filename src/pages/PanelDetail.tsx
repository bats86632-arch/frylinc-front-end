import { formatPanelName } from '../utils/formatters';
import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePanel } from "../hooks/usePanels";

import { PanelService } from "../api/PanelService";
import { useAuth } from "../contexts/AuthContext";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  History,
  Loader2,
  RefreshCw,
  Settings,
  Phone,
  Save,
  WifiOff,
  Shield,
  ShieldAlert,
  BellOff,
  RotateCcw,
  Map,
  ShieldOff,
  Wifi,
  Activity,
  Edit2,
  X,
  BatteryMedium,
  BatteryWarning,
  Zap,
  ZapOff
} from "lucide-react";
import { formatDateTime, formatZoneLabel } from "../utils/formatters";
import { getZoneStatusColors } from "../utils/zoneUtils";
import { Event } from "../types";


type Tab = "zones" | "history" | "contacts";

const getZoneStatusColors = (status: number) => {
  switch(status) {
    case 2: // Alarm (Fire)
      return {
        bg: "bg-gradient-to-br from-[var(--status-danger-bg)] to-[var(--surface-raised)]",
        border: "border-[var(--color-error)]",
        text: "text-[var(--color-error)]",
        shadow: "shadow-[0_0_20px_rgba(220,38,38,0.15)]",
        blob: "bg-[var(--color-error)]",
        icon: AlertTriangle,
        iconBg: "bg-[var(--color-error)]/10 text-[var(--color-error)] animate-pulse",
        label: "Status",
        statusText: "Alarm"
      };
    case 3: // Short / Fault
    case 4: // Open / Fault
      return {
        bg: "bg-gradient-to-br from-yellow-500/10 to-[var(--surface-raised)]",
        border: "border-yellow-500",
        text: "text-yellow-600",
        shadow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]",
        blob: "bg-yellow-500",
        icon: AlertTriangle,
        iconBg: "bg-yellow-500/10 text-yellow-600",
        label: "Status",
        statusText: "Fault"
      };
    case 5: // Isolated
      return {
        bg: "bg-[var(--status-warning-bg)] hover:border-[var(--color-warning)]",
        border: "border-[var(--status-warning-border)]",
        text: "text-[var(--color-warning)]",
        shadow: "shadow-none",
        blob: "",
        icon: ShieldOff,
        iconBg: "bg-[var(--surface-overlay)] text-[var(--color-warning)] border border-[var(--status-warning-border)]",
        label: "Status",
        statusText: "Isolated"
      };
    case 1: // Normal
    default:
      return {
        bg: "bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
        border: "border-[var(--border-subtle)]",
        text: "text-[var(--text-primary)]",
        shadow: "shadow-none",
        blob: "",
        icon: Shield,
        iconBg: "bg-[var(--surface-overlay)] text-[var(--text-secondary)] border border-[var(--border-subtle)]",
        label: "Status",
        statusText: "Normal"
      };
  }
};

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
  const [editingZoneIdx, setEditingZoneIdx] = useState<number | null>(null);
  const [editedZoneName, setEditedZoneName] = useState<string>("");
  const [showRawLogs, setShowRawLogs] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'r') {
        setShowRawLogs(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commandSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showCommandSuccess = useCallback((cmd: string) => {
    setCommandSuccess(cmd);
    if (commandSuccessTimeoutRef.current) clearTimeout(commandSuccessTimeoutRef.current);
    commandSuccessTimeoutRef.current = setTimeout(() => setCommandSuccess(null), 2000);
  }, []);



  const syncSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showSyncSuccess = useCallback((slot: string) => {
    setSyncSuccessSlot(slot);
    if (syncSuccessTimeoutRef.current) clearTimeout(syncSuccessTimeoutRef.current);
    syncSuccessTimeoutRef.current = setTimeout(() => setSyncSuccessSlot(null), 2000);
  }, []);

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
      
      console.log(`[DEBUG] Sending command: ${apiCommand} to panel ${serial}`);
      const response = await PanelService.sendCommand(serial, apiCommand);
      
      if (response.commandId) {
        await PanelService.waitForCommandConfirmation(serial, response.commandId);
      }

      showCommandSuccess(command);
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
      await PanelService.resolveZoneAlarm(serial, zoneIndex);
      
      // Optimistically send the command to the panel without waiting for acknowledgment
      PanelService.sendCommand(serial, `RESET ${zoneIndex + 1}`).catch(err => {
        console.error("Failed to send RESET command to panel:", err);
      });
      

      showCommandSuccess(commandId);
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, "Failed to reset zone"));
    } finally {
      setCommandLoading(null);
    }
  };

  const handleSaveZoneName = async (zoneIndex: number) => {
    if (!serial || !panel) return;
    const newName = editedZoneName.trim();
    const updatedZoneNames = { ...(panel.zoneNames || {}) };
    
    if (newName) {
      updatedZoneNames[zoneIndex.toString()] = newName;
    } else {
      delete updatedZoneNames[zoneIndex.toString()];
    }

    try {
      await PanelService.updatePanel(serial, { zoneNames: updatedZoneNames });
    } catch (err: unknown) {
      setCommandError(getApiErrorMessage(err, "Failed to update zone name"));
    } finally {
      setEditingZoneIdx(null);
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

      showSyncSuccess(slot);
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
    zones: Array.isArray(panel.zones) ? panel.zones.map(z => {
      if (typeof z === 'boolean') return z ? 2 : 1; // true = Alarm, false = Normal
      const n = Number(z);
      return !isNaN(n) && n > 0 ? n : 1; // valid number passes through, else Normal
    }) : [],
    allowedCommands: Array.isArray(panel.allowedCommands)
      ? panel.allowedCommands
      : [],
  };

  const visibleZones = normalizedPanel.zoneCount || 8;
  const panelCommands = ["ARM", "ZONE OFF"];

  const isOffline = normalizedPanel.manuallyMarkedOffline === true;
  const hasAlarm = normalizedPanel.alarm;
  const activeZones = normalizedPanel.zones.filter(z => z === 4 || z === 5).length;

  const isFire = normalizedPanel.panelType === 'Fire Alarm';
  const isSecurity = normalizedPanel.panelType === 'Security';
  const isDialer = normalizedPanel.panelType === 'Dialer';
  const isHealth = normalizedPanel.panelType === 'Health';
  const isUnknown = !isFire && !isSecurity && !isDialer && !isHealth;
  
  const hasEarthFault = isFire && normalizedPanel.zones[8] === 2;
  const hasTamper = isSecurity && normalizedPanel.zones[8] === 2;
  const hasSirenCut = isSecurity && normalizedPanel.zones[9] === 2;
  const isEvacuateActive = (isFire && normalizedPanel.zones[9] === 2) || (isSecurity && normalizedPanel.zones[10] === 2);
  const isBatteryLow = (isFire && normalizedPanel.zones[10] === 2) || (isSecurity && normalizedPanel.zones[11] === 2);
  const isNightZone = isSecurity && normalizedPanel.nightZoneOn === true;

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

        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Link
              to="/"
              className="flex h-11 w-11 shrink-0 self-start items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 flex flex-col justify-between lg:pb-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
                  {formatPanelName(normalizedPanel.name || "", normalizedPanel.panelType)}
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

              <div className="mt-3 lg:mt-0 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
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

          {/* Right side stats and indicators */}
          <div className="flex flex-col gap-4 lg:w-[440px]">
            {/* 3 stat mini-cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

            {/* System Indicators */}
            <div className={`grid ${isSecurity ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 gap-2'}`}>
              <div className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 overflow-hidden rounded-[8px] border px-1.5 py-2 transition-all duration-200 text-center ${isBatteryLow ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]' : 'border-[var(--border-subtle)] bg-[var(--surface-overlay)]'} cursor-default`}>
                {isBatteryLow ? (
                  <BatteryWarning className="h-4 w-4 text-[var(--color-error)] shrink-0" />
                ) : (
                  <BatteryMedium className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                )}
                <span className={`truncate text-[11px] font-semibold tracking-tight ${isBatteryLow ? 'text-[var(--color-error)]' : 'text-[var(--text-secondary)]'}`}>
                  {isBatteryLow ? 'Battery Low' : 'Battery Normal'}
                </span>
              </div>
              
              {(isFire || isUnknown) && (
                <div className={`flex flex-col xl:flex-row items-center justify-center gap-2 xl:gap-3 overflow-hidden rounded-[8px] border px-3 py-2.5 transition-all duration-200 text-center ${hasEarthFault ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]' : 'border-[var(--border-subtle)] bg-[var(--surface-overlay)]'} cursor-default`}>
                {hasEarthFault ? (
                  <ZapOff className="h-4 w-4 text-[var(--color-error)] shrink-0" />
                ) : (
                  <Zap className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                )}
                <span className={`truncate text-[11px] font-semibold tracking-tight ${hasEarthFault ? 'text-[var(--color-error)]' : 'text-[var(--text-secondary)]'}`}>
                  {hasEarthFault ? 'Earth Fault!' : 'Earth Normal'}
                </span>
              </div>
              )}
              
              {isSecurity && (
              <>
              <div className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 overflow-hidden rounded-[8px] border px-1.5 py-2 transition-all duration-200 text-center ${hasTamper ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]' : 'border-[var(--border-subtle)] bg-[var(--surface-overlay)]'} cursor-default`}>
                {hasTamper ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--color-error)] shrink-0" />
                ) : (
                  <Shield className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                )}
                <span className={`truncate text-[11px] font-semibold tracking-tight ${hasTamper ? 'text-[var(--color-error)]' : 'text-[var(--text-secondary)]'}`}>
                  {hasTamper ? 'Tamper!' : 'Tamper Normal'}
                </span>
              </div>
              <div className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 overflow-hidden rounded-[8px] border px-1.5 py-2 transition-all duration-200 text-center ${hasSirenCut ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]' : 'border-[var(--border-subtle)] bg-[var(--surface-overlay)]'} cursor-default`}>
                {hasSirenCut ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--color-error)] shrink-0" />
                ) : (
                  <Shield className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                )}
                <span className={`truncate text-[11px] font-semibold tracking-tight ${hasSirenCut ? 'text-[var(--color-error)]' : 'text-[var(--text-secondary)]'}`}>
                  {hasSirenCut ? 'Siren Cut!' : 'Siren Normal'}
                </span>
              </div>
              <div className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 overflow-hidden rounded-[8px] border px-1.5 py-2 transition-all duration-200 text-center ${isNightZone ? 'border-blue-500/20 bg-blue-500/10' : 'border-[var(--border-subtle)] bg-[var(--surface-overlay)]'} cursor-default`}>
                <Activity className={`h-4 w-4 shrink-0 ${isNightZone ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`} />
                <span className={`truncate text-[11px] font-semibold tracking-tight ${isNightZone ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`}>
                  {isNightZone ? 'Night: ARM' : 'Night: DISARM'}
                </span>
              </div>
              </>
              )}
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
            <div className="mb-6 flex flex-col gap-3">
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                  Zones & Controls
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  <span className="tabular-nums">{visibleZones}</span> zones displayed
                </p>
              </div>
              {/* Global Controls & MOB */}
              <div className="mb-2">
                <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">
                  Global Controls & MOB
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Use these controls to interact with the entire panel or configure contacts.
                </p>
              </div>
              {/* All action buttons on one row, wrapping on very small screens */}
              <div className="flex flex-wrap items-center gap-3">
                {panel.panelType === "Security" ? (
                  <>
                    <button
                      onClick={() => handleSendCommand("ARM")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[13px] font-semibold text-blue-500 transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "ARM" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                      Night zone arm
                    </button>
                    <button
                      onClick={() => handleSendCommand("ZONE OFF")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-success)] transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "ZONE OFF" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                      Night zone disarm
                    </button>
                    <button
                      onClick={() => handleSendCommand("EVA")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-error)] transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "EVA" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                      Evacuate
                    </button>
                  </>
                ) : panel.panelType === "GSM Module" ? (
                  <>
                    <button
                      onClick={() => handleSendCommand("ARM")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-error)] transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "ARM" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                      Arm
                    </button>
                    <button
                      onClick={() => handleSendCommand("ZONE OFF")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-success)] transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "ZONE OFF" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                      Zone Off
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSendCommand("ZONE OFF")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-warning)] transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "ZONE OFF" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                      Silence All
                    </button>
                    <button
                      onClick={() => handleSendCommand("EVA")}
                      disabled={commandLoading !== null}
                      className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-error)] transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {commandLoading === "EVA" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                      Evacuate
                    </button>
                    {!isFire && (
                      <button
                        onClick={() => handleSendCommand("ARM")}
                        disabled={commandLoading !== null}
                        className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--color-error)] transition-all hover:shadow-lg disabled:opacity-50"
                      >
                        {commandLoading === "ARM" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                        Test ARM
                      </button>
                    )}
                  </>
                )}
                
                <button
                  onClick={() => setActiveTab("contacts")}
                  className="flex items-center justify-center gap-2 rounded-[8px] border px-4 py-2 text-[13px] font-semibold transition-all duration-200 border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] shadow-sm"
                >
                  <Settings className="h-4 w-4 text-[var(--accent)]" />
                  Configure MOB
                </button>
                {panel.panelType !== "GSM Module" && (
                  <Link
                    to={`/map-zones?panelId=${serial}`}
                    className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)]"
                  >
                    <Map className="h-4 w-4" />
                    View GMS
                  </Link>
                )}
              </div>
            </div>

            {panel.panelType !== "GSM Module" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: visibleZones }).map((_, idx) => {
                const zoneNum = idx + 1;
                const zoneStatus = normalizedPanel.zones[idx] || 1;
                const statusStyles = getZoneStatusColors(zoneStatus);
                const isAlarmOrPre = zoneStatus === 2 || zoneStatus === 3 || zoneStatus === 4;
                const isIsolated = zoneStatus === 5;
                
                const isEvacuatePulse = isEvacuateActive;

                const resetCmd = `RESET ${zoneNum}`;
                const isolateCmd = `ISO${zoneNum}`;
                
                const isEuRestricted = isStrictlyEndUser;
                const isNewIp = panel.ipAddress === "136.66.72.191";

                let additionalLabel = "";
                if (zoneStatus === 2) {
                  if (idx === 8) additionalLabel = isFire ? " - Earth Fault" : " - Siren Cut";
                  if (idx === 9) additionalLabel = " - Evacuate (EVA)";
                  if (idx === 10) additionalLabel = isFire ? " - Low Battery" : " - Battery Low";
                  if (idx === 11) additionalLabel = isFire ? " - ideal / empty" : " - Night zone arm / disarm (ARM)";
                  if (idx === 12) additionalLabel = isFire ? " - empty" : " - Ideal";
                }

                let containerClasses = `relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${statusStyles.bg} ${statusStyles.border} ${statusStyles.shadow}`;
                if (isEvacuatePulse) {
                  containerClasses = `relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] shadow-[var(--status-danger-bg)] animate-[pulse_1s_ease-in-out_infinite]`;
                }

                return (
                  <div
                    key={idx}
                    className={containerClasses}
                  >
                    {/* Top status bar */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col flex-1">
                        {editingZoneIdx === idx ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedZoneName}
                              onChange={(e) => setEditedZoneName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveZoneName(idx);
                                if (e.key === "Escape") setEditingZoneIdx(null);
                              }}
                              className="w-[120px] rounded-md border border-[var(--border-strong)] bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleSaveZoneName(idx)} className="text-[var(--color-success)] hover:opacity-80 flex-shrink-0"><CheckCircle className="h-4 w-4" /></button>
                            <button onClick={() => setEditingZoneIdx(null)} className="text-[var(--color-error)] hover:opacity-80 flex-shrink-0"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className={`text-xl font-black tracking-tight truncate max-w-[120px] sm:max-w-[150px] ${
                              isAlarmOrPre || isEvacuatePulse ? "text-[var(--color-error)]" 
                              : isIsolated ? "text-[var(--color-warning)]" 
                              : "text-[var(--text-primary)]"
                            }`} title={formatZoneLabel(idx, normalizedPanel.zoneNames?.[idx.toString()])}>
                              {formatZoneLabel(idx, normalizedPanel.zoneNames?.[idx.toString()])}
                            </span>
                            {!isStrictlyEndUser && (
                              <button
                                onClick={() => {
                                  setEditedZoneName(normalizedPanel.zoneNames?.[idx.toString()] || "");
                                  setEditingZoneIdx(idx);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--surface-hover)] rounded flex-shrink-0"
                                title="Edit zone name"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                              </button>
                            )}
                          </div>
                        )}
                        {additionalLabel && (
                          <span className={`text-xs font-bold mt-1 ${isAlarmOrPre || isEvacuatePulse ? "text-[var(--color-error)]" : "text-[var(--text-secondary)]"}`}>
                            {additionalLabel}
                          </span>
                        )}
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isEvacuatePulse ? "bg-[var(--color-error)]/20 text-[var(--color-error)]" : statusStyles.iconBg}`}>
                        <statusStyles.icon className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Controls Divider */}
                    <div className={`h-[1px] w-full ${
                      isAlarmOrPre ? 'bg-[var(--color-error)]/20' 
                      : isIsolated ? 'bg-[var(--color-warning)]/20' 
                      : 'bg-[var(--border-subtle)]'
                    }`} />

                    {/* Control Panel Buttons */}
                    <div className="grid grid-cols-1 gap-2.5 relative z-10 mt-auto">
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => handleSendCommand(isolateCmd)}
                          disabled={!panel.ipAddress || !isNewIp || commandLoading !== null || isEuRestricted}
                          title={!isNewIp ? "Upgrade your panel to the new infrastructure to use this feature." : undefined}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isIsolated 
                              ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--color-warning)] hover:border-[var(--color-warning)] hover:shadow-lg hover:shadow-[var(--color-warning)]/20" 
                              : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/50 text-[var(--text-secondary)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)]"
                          }`}
                        >
                           {commandLoading === isolateCmd ? <Loader2 className="h-4 w-4 animate-spin" /> : commandSuccess === isolateCmd ? <CheckCircle className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                           <span className="text-xs font-bold uppercase tracking-wider">Isolate</span>
                        </button>
                        
                        <button
                          onClick={() => handleResetZone(idx)}
                          disabled={commandLoading !== null || isEuRestricted}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isAlarmOrPre 
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
                    {statusStyles.blob && (
                      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${statusStyles.blob} blur-[50px] opacity-20 pointer-events-none`} />
                    )}
                  </div>
                );
              })}
            </div>
            )}
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
                    {events.filter((event, index, array) => {
                      const isDuplicate = array.slice(0, index).some(newerEvent => {
                        if (event.type === "command" && newerEvent.type === "command" && event.command === newerEvent.command) {
                          const t1 = event.timestamp || (event as any).createdAt;
                          const t2 = newerEvent.timestamp || (newerEvent as any).createdAt;
                          if (t1 && t2) {
                            const getMs = (ts: any) => {
                              if (typeof ts === 'string') return new Date(ts).getTime();
                              const secs = ts._seconds || ts.seconds;
                              if (secs) return secs * 1000;
                              return 0;
                            };
                            const timeDiff = Math.abs(getMs(t1) - getMs(t2));
                            if (timeDiff < 15000) return true;
                          }
                        }
                        return false;
                      });
                      return !isDuplicate;
                    }).map((event) => (
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
                                : event.type.includes("warning") || event.type === "fault"
                                  ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--color-warning)]"
                                  : "border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {(() => {
                              if (showRawLogs && event.raw) return event.type;
                              let disp = ((event as any).faultType === "isolate" ? "isolate" : event.type);
                              if (event.type === 'alarm' || (event as any).action === 'ALARM') {
                                const z = event.zone || event.zoneNumber;
                                if (normalizedPanel.panelType === 'Fire Alarm') {
                                  if (z === 9) disp = 'Earth Fault';
                                  if (z === 10) disp = 'Evacuate (EVA)';
                                  if (z === 11) disp = 'Low Battery';
                                  if (z === 12) disp = 'Ideal / Empty';
                                  if (z === 13) disp = 'Empty';
                                } else if (normalizedPanel.panelType === 'Security') {
                                  if (z === 9) disp = 'Siren Cut';
                                  if (z === 10) disp = 'Evacuate (EVA)';
                                  if (z === 11) disp = 'Battery Low';
                                  if (z === 12) disp = 'Night zone arm / disarm (ARM)';
                                  if (z === 13) disp = 'Ideal';
                                }
                              }
                              return disp;
                            })()}
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
                          {showRawLogs ? (
                            event.raw ? (
                              <span className="font-mono text-xs">{event.raw}</span>
                            ) : event.command ? (
                              <span className="font-mono text-xs text-[var(--text-secondary)]">{event.command}</span>
                            ) : (
                              <span className="text-[var(--text-secondary)]">-</span>
                            )
                          ) : (
                            (() => {
                              const z = event.zone || event.zoneNumber;
                              let interpretation: string | null = null;
                              
                              if (z >= 9 && z <= 16) {
                                if (normalizedPanel.panelType === 'Fire Alarm') {
                                  if (z === 9) interpretation = 'Earth Fault';
                                  else if (z === 10) interpretation = 'Evacuate (EVA)';
                                  else if (z === 11) interpretation = 'Low Battery';
                                  else if (z === 12) interpretation = 'Ideal / Empty';
                                  else if (z === 13) interpretation = 'Empty';
                                  else interpretation = `System Zone ${z}`;
                                } else if (normalizedPanel.panelType === 'Security') {
                                  if (z === 9) interpretation = 'Siren Cut';
                                  else if (z === 10) interpretation = 'Evacuate (EVA)';
                                  else if (z === 11) interpretation = 'Battery Low';
                                  else if (z === 12) interpretation = 'Night zone arm / disarm (ARM)';
                                  else if (z === 13) interpretation = 'Ideal';
                                  else interpretation = `System Zone ${z}`;
                                }
                              }

                              if (interpretation) {
                                return <span className="font-medium text-[var(--text-primary)]">{interpretation}</span>;
                              }

                              return (
                                <>
                                  {event.command && (
                                    <span>
                                      {event.command}
                                      {event.ackPayload && <span className="ml-2 text-[var(--text-secondary)]">(Ack: {event.ackPayload})</span>}
                                    </span>
                                  )}
                                  
                                  {/* If it's a fault, display the faultType prominently */}
                                  {(event as any).faultType && (
                                    <span className="capitalize font-medium text-[var(--color-warning)] mr-2">{(event as any).faultType}</span>
                                  )}
                                  
                                  {event.details && <span>{event.details}</span>}
                                  {(!event.command && !(event as any).faultType && !event.details) && <span className="text-[var(--text-secondary)]">-</span>}
                                  
                                  {z && (z < 9 || z > 16) && (
                                    <span className="ml-2 font-mono tabular-nums text-[var(--text-secondary)]">
                                      (Zone {z})
                                    </span>
                                  )}
                                </>
                              );
                            })()
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
