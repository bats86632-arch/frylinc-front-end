import { useState, useEffect } from "react";
import { CopyButton } from "./CopyButton";
import {
  Loader2,
  Plus,
  Trash2,
  Key,
  XCircle,
  Settings2,
  Building2,
  MapPin,
  FileText,
  Radio,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  X,
} from "lucide-react";
import { ApiKeyService } from "../api/ApiKeyService";
import { WebhookService } from "../api/WebhookService";
import { ApiKeyRecord, Branch, Company, WebhookRecord, WebhookTestResult } from "../types";
import { generateApiKeyDoc } from "../utils/generateApiKeyDoc";
import { generateWebhookDoc } from "../utils/generateWebhookDoc";

interface ApiKeysSectionProps {
  companyId?: string; // If provided, scoped to company. If omitted, shows all (for super admin)
  companies?: Company[];
  branches?: Branch[];
  initialTab?: "api_keys" | "webhooks";
}

const formatDate = (dateValue: any) => {
  if (!dateValue) return null;
  if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
  if (dateValue._seconds) return new Date(dateValue._seconds * 1000);
  if (typeof dateValue === "string" || typeof dateValue === "number") return new Date(dateValue);
  return null;
};

const AVAILABLE_WEBHOOK_EVENTS = [
  { id: "ALL", label: "All Events", desc: "Subscribe to all current and future events" },
  { id: "ALARM_TRIGGERED", label: "Fire Alarms (ALARM_TRIGGERED)", desc: "Immediate fire alarm trigger on any panel" },
  { id: "ALARM_RESOLVED", label: "Alarm Cleared (ALARM_RESOLVED)", desc: "Zone reset or alarm silenced" },
  { id: "PANEL_STATUS_CHANGED", label: "Panel Status (PANEL_STATUS_CHANGED)", desc: "Online/offline and configuration changes" },
  { id: "TELEMETRY_UPDATE", label: "Telemetry Pings (TELEMETRY_UPDATE)", desc: "Real-time zone status and heartbeat stream" },
  { id: "FAULT_REPORTED", label: "Trouble / Faults (FAULT_REPORTED)", desc: "Hardware faults, line trouble, or disconnects" },
];

export function ApiKeysSection({
  companyId,
  companies = [],
  branches = [],
  initialTab = "api_keys",
}: ApiKeysSectionProps) {
  const [activeTab, setActiveTab] = useState<"api_keys" | "webhooks">(initialTab);

  // ── API Keys State ──────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [showCreateKeyForm, setShowCreateKeyForm] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [keyLabel, setKeyLabel] = useState("");
  const [keyCompanyId, setKeyCompanyId] = useState<string>(companyId || "");
  const [keyBranches, setKeyBranches] = useState<string[]>([]);
  const [newKey, setNewKey] = useState<{ apiKey: string; apiKeyId: string; last4: string } | null>(null);

  // ── Webhooks State ──────────────────────────────────────────────────────────
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [showCreateWebhookForm, setShowCreateWebhookForm] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookDescription, setWebhookDescription] = useState("");
  const [webhookCompanyId, setWebhookCompanyId] = useState<string>(companyId || "");
  const [webhookBranches, setWebhookBranches] = useState<string[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["ALL"]);
  const [newWebhook, setNewWebhook] = useState<WebhookRecord | null>(null);

  // ── Webhook Testing & Secret Modals ─────────────────────────────────────────
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    isOpen: boolean;
    webhookUrl: string;
    loading: boolean;
    result: WebhookTestResult | null;
  } | null>(null);

  const [secretModal, setSecretModal] = useState<{
    isOpen: boolean;
    webhook: WebhookRecord | null;
    revealed: boolean;
  } | null>(null);

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, [companyId]);

  // ── Fetch Operations ────────────────────────────────────────────────────────
  const fetchKeys = async () => {
    try {
      setKeysLoading(true);
      setKeyError(null);
      const data = await ApiKeyService.getApiKeys(companyId);
      setKeys(data || []);
    } catch (err: any) {
      setKeyError(err.message || "Failed to load API keys");
    } finally {
      setKeysLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      setWebhooksLoading(true);
      setWebhookError(null);
      const data = await WebhookService.getWebhooks(companyId);
      setWebhooks(data || []);
    } catch (err: any) {
      setWebhookError(err.message || "Failed to load Webhooks");
    } finally {
      setWebhooksLoading(false);
    }
  };

  // ── Key Actions ─────────────────────────────────────────────────────────────
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyLabel) return;
    try {
      setCreatingKey(true);
      setKeyError(null);
      const result = await ApiKeyService.createApiKey({
        label: keyLabel,
        companyId: keyCompanyId || undefined,
        branchIds: keyBranches.length > 0 ? keyBranches : undefined,
      });
      setNewKey(result);
      await fetchKeys();
      setKeyLabel("");
      setKeyBranches([]);
      if (!companyId) setKeyCompanyId("");
    } catch (err: any) {
      setKeyError(err.message || "Failed to create API key");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      setKeyError(null);
      await ApiKeyService.deleteApiKey(id);
      await fetchKeys();
    } catch (err: any) {
      setKeyError(err.message || "Failed to revoke API key");
    }
  };

  // ── Webhook Actions ─────────────────────────────────────────────────────────
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;
    try {
      setCreatingWebhook(true);
      setWebhookError(null);
      const created = await WebhookService.createWebhook({
        url: webhookUrl.trim(),
        description: webhookDescription.trim() || undefined,
        companyId: webhookCompanyId || undefined,
        branchIds: webhookBranches.length > 0 ? webhookBranches : undefined,
        events: webhookEvents.length > 0 ? webhookEvents : ["ALL"],
      });
      setNewWebhook(created);
      await fetchWebhooks();
      setWebhookUrl("");
      setWebhookDescription("");
      setWebhookBranches([]);
      setWebhookEvents(["ALL"]);
      if (!companyId) setWebhookCompanyId("");
    } catch (err: any) {
      setWebhookError(err.message || "Failed to create webhook");
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook subscription? Event delivery will cease immediately.")) return;
    try {
      setWebhookError(null);
      await WebhookService.deleteWebhook(id);
      await fetchWebhooks();
    } catch (err: any) {
      setWebhookError(err.message || "Failed to delete webhook");
    }
  };

  const handleTestWebhook = async (wh: WebhookRecord) => {
    try {
      setTestingWebhookId(wh.id);
      setTestResult({
        isOpen: true,
        webhookUrl: wh.url,
        loading: true,
        result: null,
      });
      const result = await WebhookService.testWebhook(wh.id);
      setTestResult({
        isOpen: true,
        webhookUrl: wh.url,
        loading: false,
        result,
      });
      // Refresh status indicators
      await fetchWebhooks();
    } catch (err: any) {
      setTestResult({
        isOpen: true,
        webhookUrl: wh.url,
        loading: false,
        result: {
          ok: false,
          success: false,
          error: err.message || "Failed to execute webhook test ping",
        },
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const toggleEventSelection = (eventId: string) => {
    if (eventId === "ALL") {
      setWebhookEvents(["ALL"]);
      return;
    }
    let updated = webhookEvents.filter(e => e !== "ALL");
    if (updated.includes(eventId)) {
      updated = updated.filter(e => e !== eventId);
    } else {
      updated.push(eventId);
    }
    if (updated.length === 0) {
      updated = ["ALL"];
    }
    setWebhookEvents(updated);
  };

  const availableBranchesForKey = keyCompanyId
    ? branches.filter(b => b.companyId === keyCompanyId)
    : branches;

  const availableBranchesForWebhook = webhookCompanyId
    ? branches.filter(b => b.companyId === webhookCompanyId)
    : branches;

  return (
    <div className="flex flex-col h-full bg-[var(--surface-base)] relative">
      {/* ── Header with Segmented Tabs ────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-[var(--surface-base)] z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-sm">
            {activeTab === "api_keys" ? (
              <Key className="h-4.5 w-4.5 text-[var(--accent)]" />
            ) : (
              <Zap className="h-4.5 w-4.5 text-emerald-500" />
            )}
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
              API & Webhook Provisioning
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Manage REST credentials and real-time streaming endpoints
            </p>
          </div>
        </div>

        {/* Tab Switcher & Create Action */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-[8px] bg-[var(--surface-raised)] p-1 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab("api_keys")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                activeTab === "api_keys"
                  ? "bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              REST API Keys
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                {keys.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                activeTab === "webhooks"
                  ? "bg-[var(--surface-base)] text-emerald-500 shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              Webhooks (Real-Time)
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                {webhooks.length}
              </span>
            </button>
          </div>

          {activeTab === "api_keys" && !showCreateKeyForm && !newKey && (
            <button
              onClick={() => setShowCreateKeyForm(true)}
              className="flex h-8 items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-3 text-[12px] font-medium text-[var(--surface-base)] transition-colors hover:opacity-90 shadow-sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Key
            </button>
          )}

          {activeTab === "webhooks" && !showCreateWebhookForm && !newWebhook && (
            <button
              onClick={() => setShowCreateWebhookForm(true)}
              className="flex h-8 items-center justify-center rounded-[6px] bg-emerald-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Webhook
            </button>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {/* ── Informational Architecture Comparison Banner ──────────────────────── */}
        <div className="mb-5 rounded-[10px] border border-blue-500/20 bg-blue-500/5 p-3.5 text-[12px] text-[var(--text-primary)] shadow-sm">
          <div className="flex items-start gap-2.5">
            <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-500">
                ⚡ Real-Time Push vs REST API Polling:
              </span>{" "}
              <span className="text-[var(--text-secondary)]">
                <strong>Webhooks automatically stream event data</strong> (fire alarms, trouble/faults, zone state changes, and telemetry pings) to your HTTPS endpoint the instant they happen with sub-second latency. In contrast, <strong>REST APIs require manual polling</strong> and repeated client requests.
              </span>
            </div>
          </div>
        </div>

        {/* ── TAB 1: REST API KEYS ────────────────────────────────────────────── */}
        {activeTab === "api_keys" && (
          <div>
            {keyError && (
              <div className="mb-4 flex items-center gap-2 rounded-[6px] bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-error)]">
                <XCircle className="h-4 w-4 shrink-0" />
                <p>{keyError}</p>
              </div>
            )}

            {newKey && (
              <div className="mb-6 rounded-[8px] border border-emerald-300/30 bg-[var(--status-success-bg)] p-4 shadow-sm animate-fade-in-up">
                <h4 className="text-[13px] font-bold text-[var(--color-success)] mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4" /> API Key Created Successfully
                </h4>
                <p className="text-[12px] text-[var(--text-secondary)] mb-4">
                  Please copy this key and store it securely. You will not be able to see it again.
                </p>
                <div className="flex items-center gap-2 bg-[var(--surface-base)] p-3 rounded-[6px] border border-[var(--border-subtle)] font-mono text-[13px] text-[var(--text-primary)] break-all">
                  <span className="flex-1 select-all">{newKey.apiKey}</span>
                  <CopyButton
                    textToCopy={newKey.apiKey}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
                    iconClassName="h-4 w-4"
                    title="Copy API Key"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const createdKeyRecord = keys.find((k) => k.id === newKey.apiKeyId);
                      if (createdKeyRecord) {
                        const orgName = createdKeyRecord.companyId
                          ? companies.find((c) => c.id === createdKeyRecord.companyId)?.name || createdKeyRecord.companyId
                          : "Global Scope";
                        generateApiKeyDoc(createdKeyRecord, orgName, newKey.apiKey);
                      }
                    }}
                    className="px-4 py-2 bg-[var(--surface-base)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[6px] text-[12px] font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <FileText className="h-4 w-4" /> Download Complete Manual
                  </button>
                  <button
                    onClick={() => {
                      setNewKey(null);
                      setShowCreateKeyForm(false);
                    }}
                    className="px-4 py-2 bg-[var(--color-success)] text-white rounded-[6px] text-[12px] font-medium hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {showCreateKeyForm && !newKey && (
              <form
                onSubmit={handleCreateKey}
                className="mb-6 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-4 shadow-sm animate-fade-in-up"
              >
                <h4 className="mb-4 text-[13px] font-bold text-[var(--text-primary)]">
                  Create New REST API Key
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Key Label *
                    </label>
                    <input
                      required
                      className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                      value={keyLabel}
                      onChange={(e) => setKeyLabel(e.target.value)}
                      placeholder="e.g. Acme Corp Live Sync"
                      disabled={creatingKey}
                    />
                  </div>

                  {!companyId && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        <Building2 className="h-3 w-3" /> Organization Scope
                      </label>
                      <select
                        className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                        value={keyCompanyId}
                        onChange={(e) => setKeyCompanyId(e.target.value)}
                        disabled={creatingKey}
                      >
                        <option value="">No Organization Scope (Global)</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {keyCompanyId && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        <MapPin className="h-3 w-3" /> Branch Scope (Optional)
                      </label>
                      <select
                        multiple
                        className="control-field w-full rounded-[6px] px-3 py-2 text-[13px] min-h-[80px]"
                        value={keyBranches}
                        onChange={(e) => {
                          const options = Array.from(e.target.selectedOptions, (o) => o.value);
                          setKeyBranches(options);
                        }}
                        disabled={creatingKey}
                      >
                        <option value="" disabled>
                          Select branches (Hold Ctrl/Cmd to select multiple)
                        </option>
                        {availableBranchesForKey.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.bsrCode ? `(${b.bsrCode})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                        Leave empty to grant access to all branches in this organization.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setShowCreateKeyForm(false)}
                      disabled={creatingKey}
                      className="flex h-8 items-center justify-center rounded-[6px] px-4 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingKey || !keyLabel}
                      className="flex h-8 items-center justify-center rounded-[6px] bg-[var(--accent)] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {creatingKey ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Create Key"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {keysLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
              </div>
            ) : keys.length === 0 && !showCreateKeyForm ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Key className="h-10 w-10 text-[var(--text-secondary)] opacity-30 mb-3" />
                <p className="text-[14px] font-medium text-[var(--text-secondary)]">
                  No API Keys Found
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1 max-w-xs">
                  Create an API key to allow programmatic REST access.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm hover:border-[var(--border-default)] transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                          <Settings2 className="h-4 w-4 text-[var(--text-secondary)]" />
                        </div>
                        <div>
                          <h5
                            className="text-[13px] font-bold text-[var(--text-primary)] truncate"
                            title={key.label}
                          >
                            {key.label}
                          </h5>
                          <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                            {key.id} {key.last4 ? `(ends in ${key.last4})` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const orgName = key.companyId
                              ? companies.find((c) => c.id === key.companyId)?.name || key.companyId
                              : "Global Scope";
                            generateApiKeyDoc(key, orgName);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                          title="Download API Manual"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] hover:border-[var(--color-error)] transition-all"
                          title="Revoke Key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">
                          Status
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-[4px] font-medium text-[10px] ${
                            key.status === "active"
                              ? "bg-[var(--status-success-bg)] text-[var(--color-success)]"
                              : key.status === "suspended"
                              ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-border)]"
                              : "bg-[var(--status-danger-bg)] text-[var(--color-error)]"
                          }`}
                        >
                          {key.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">
                          Organization
                        </span>
                        <span className="text-[var(--text-primary)] truncate max-w-[150px]">
                          {key.companyId
                            ? companies.find((c) => c.id === key.companyId)?.name || key.companyId
                            : "Global Scope"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Created: {formatDate(key.createdAt)?.toLocaleDateString() || "N/A"}</span>
                      <span>Last Used: {formatDate(key.lastUsedAt)?.toLocaleDateString() || "Never"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: WEBHOOKS (REAL-TIME STREAM) ──────────────────────────────── */}
        {activeTab === "webhooks" && (
          <div>
            {webhookError && (
              <div className="mb-4 flex items-center gap-2 rounded-[6px] bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-error)]">
                <XCircle className="h-4 w-4 shrink-0" />
                <p>{webhookError}</p>
              </div>
            )}

            {newWebhook && (
              <div className="mb-6 rounded-[8px] border border-emerald-300/40 bg-[var(--status-success-bg)] p-4 shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold text-[var(--color-success)] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Webhook Provisioned Successfully
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 text-[10px] font-bold">
                    Active
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                  Events will stream in real-time to your URL. Use this signing secret to verify the HMAC-SHA256 signature in incoming requests.
                </p>

                <div className="space-y-3 bg-[var(--surface-base)] p-3 rounded-[6px] border border-[var(--border-subtle)] text-[12px]">
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                      Target URL
                    </span>
                    <span className="font-mono text-[13px] text-[var(--text-primary)] break-all select-all">
                      {newWebhook.url}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                      Signing Secret (x-fyrlinc-signature)
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-[13px] text-emerald-700 select-all break-all bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        {newWebhook.secret}
                      </code>
                      <CopyButton
                        textToCopy={newWebhook.secret}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
                        iconClassName="h-4 w-4"
                        title="Copy Secret"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const orgName = newWebhook.companyId
                        ? companies.find((c) => c.id === newWebhook.companyId)?.name || newWebhook.companyId
                        : "Global Scope";
                      generateWebhookDoc(newWebhook, orgName, newWebhook.secret);
                    }}
                    className="px-4 py-2 bg-[var(--surface-base)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[6px] text-[12px] font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <FileText className="h-4 w-4" /> Download Webhook Manual
                  </button>
                  <button
                    onClick={() => {
                      setNewWebhook(null);
                      setShowCreateWebhookForm(false);
                    }}
                    className="px-4 py-2 bg-[var(--color-success)] text-white rounded-[6px] text-[12px] font-medium hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {showCreateWebhookForm && !newWebhook && (
              <form
                onSubmit={handleCreateWebhook}
                className="mb-6 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-4 shadow-sm animate-fade-in-up"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-500" />
                    Configure Real-Time Webhook
                  </h4>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Sub-second push delivery
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Endpoint HTTPS URL *
                    </label>
                    <input
                      required
                      type="url"
                      className="control-field h-9 w-full rounded-[6px] px-3 text-[13px] font-mono"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://api.yourdomain.com/webhooks/fyrlinc"
                      disabled={creatingWebhook}
                    />
                    <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                      Must be an accessible HTTP/HTTPS receiver that returns status 2xx within 5 seconds.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Description / Friendly Name
                    </label>
                    <input
                      className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                      value={webhookDescription}
                      onChange={(e) => setWebhookDescription(e.target.value)}
                      placeholder="e.g. Acme Security Operations Center (SOC)"
                      disabled={creatingWebhook}
                    />
                  </div>

                  {/* Events Selection */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Subscribed Real-Time Events
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {AVAILABLE_WEBHOOK_EVENTS.map((evt) => {
                        const isSelected =
                          webhookEvents.includes("ALL") || webhookEvents.includes(evt.id);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => toggleEventSelection(evt.id)}
                            className={`p-2.5 rounded-[6px] border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500/30 text-[var(--text-primary)]"
                                : "bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Controlled by outer div click
                                className="h-3.5 w-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-[12px] font-semibold">{evt.label}</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 ml-5">
                              {evt.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!companyId && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        <Building2 className="h-3 w-3" /> Organization Scope
                      </label>
                      <select
                        className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                        value={webhookCompanyId}
                        onChange={(e) => setWebhookCompanyId(e.target.value)}
                        disabled={creatingWebhook}
                      >
                        <option value="">No Organization Scope (Global Broadcast)</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {webhookCompanyId && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        <MapPin className="h-3 w-3" /> Branch Scope (Optional)
                      </label>
                      <select
                        multiple
                        className="control-field w-full rounded-[6px] px-3 py-2 text-[13px] min-h-[80px]"
                        value={webhookBranches}
                        onChange={(e) => {
                          const options = Array.from(e.target.selectedOptions, (o) => o.value);
                          setWebhookBranches(options);
                        }}
                        disabled={creatingWebhook}
                      >
                        <option value="" disabled>
                          Select branches (Hold Ctrl/Cmd to select multiple)
                        </option>
                        {availableBranchesForWebhook.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.bsrCode ? `(${b.bsrCode})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                        Leave empty to receive events from all branches in this organization.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setShowCreateWebhookForm(false)}
                      disabled={creatingWebhook}
                      className="flex h-8 items-center justify-center rounded-[6px] px-4 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingWebhook || !webhookUrl}
                      className="flex h-8 items-center justify-center rounded-[6px] bg-emerald-600 px-4 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {creatingWebhook ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Create Webhook"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {webhooksLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
              </div>
            ) : webhooks.length === 0 && !showCreateWebhookForm ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Radio className="h-10 w-10 text-[var(--text-secondary)] opacity-30 mb-3" />
                <p className="text-[14px] font-medium text-[var(--text-secondary)]">
                  No Webhook Subscriptions Found
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1 max-w-sm">
                  Register an HTTPS endpoint to receive immediate, real-time push events for alarms, zone updates, and hardware telemetry.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm hover:border-[var(--border-default)] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                            <Radio className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h5
                              className="text-[13px] font-bold text-[var(--text-primary)] truncate"
                              title={wh.description || wh.url}
                            >
                              {wh.description || "Real-Time Webhook"}
                            </h5>
                            <p
                              className="text-[11px] text-[var(--text-secondary)] font-mono truncate"
                              title={wh.url}
                            >
                              {wh.url}
                            </p>
                          </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              setSecretModal({
                                isOpen: true,
                                webhook: wh,
                                revealed: false,
                              })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                            title="Reveal Signing Secret"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const orgName = wh.companyId
                                ? companies.find((c) => c.id === wh.companyId)?.name || wh.companyId
                                : "Global Scope";
                              generateWebhookDoc(wh, orgName);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                            title="Download Webhook Manual"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] hover:border-[var(--color-error)] transition-all"
                            title="Delete Webhook"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Event Tags */}
                      <div className="mb-3">
                        <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                          Events Subscribed
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {wh.events && wh.events.length > 0 ? (
                            wh.events.map((evt) => (
                              <span
                                key={evt}
                                className="px-1.5 py-0.5 rounded-[4px] bg-[var(--surface-hover)] border border-[var(--border-subtle)] font-mono text-[9px] text-[var(--text-secondary)]"
                              >
                                {evt}
                              </span>
                            ))
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--surface-hover)] border border-[var(--border-subtle)] font-mono text-[9px] text-[var(--text-secondary)]">
                              ALL
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status and Last Delivery */}
                      <div className="space-y-1.5 mb-3 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">
                            Last Delivery
                          </span>
                          <span>
                            {wh.lastStatus === "success" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-600 font-medium text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                {wh.lastStatusCode ? `HTTP ${wh.lastStatusCode}` : "Success"}
                              </span>
                            ) : wh.lastStatus === "failed" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[var(--status-danger-bg)] text-[var(--color-error)] font-medium text-[10px]">
                                <AlertCircle className="h-3 w-3" />
                                {wh.lastStatusCode ? `HTTP ${wh.lastStatusCode}` : "Failed"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                Untriggered
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">
                            Organization Scope
                          </span>
                          <span className="text-[var(--text-primary)] truncate max-w-[150px]">
                            {wh.companyId
                              ? companies.find((c) => c.id === wh.companyId)?.name || wh.companyId
                              : "Global (All Orgs)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions & Testing */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {wh.lastTriggeredAt
                          ? `Last fired: ${formatDate(wh.lastTriggeredAt)?.toLocaleTimeString()}`
                          : "Not triggered yet"}
                      </span>

                      <button
                        onClick={() => handleTestWebhook(wh)}
                        disabled={testingWebhookId === wh.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[5px] bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all shadow-xs disabled:opacity-50"
                      >
                        {testingWebhookId === wh.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                        ) : (
                          <Send className="h-3 w-3 text-emerald-600" />
                        )}
                        Test Ping
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Test Result Modal ─────────────────────────────────────────────────── */}
      {testResult && testResult.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[var(--surface-base)] rounded-[12px] border border-[var(--border-default)] shadow-xl w-full max-w-md p-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" />
                <h4 className="text-[14px] font-bold text-[var(--text-primary)]">
                  Webhook Ping Test Result
                </h4>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {testResult.loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Sending test event payload with HMAC signature...
                </p>
              </div>
            ) : testResult.result ? (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-[8px] flex items-center gap-2.5 ${
                    testResult.result.success
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700"
                      : "bg-[var(--status-danger-bg)] border border-red-500/30 text-[var(--color-error)]"
                  }`}
                >
                  {testResult.result.success ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <h5 className="font-bold text-[13px]">
                      {testResult.result.success ? "Endpoint Responded Successfully" : "Delivery Failed"}
                    </h5>
                    <p className="text-[11px] opacity-90">
                      {testResult.result.success
                        ? `Received HTTP ${testResult.result.statusCode} response in ${testResult.result.durationMs}ms.`
                        : testResult.result.error || `Received HTTP ${testResult.result.statusCode}`}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--surface-hover)] p-3 rounded-[6px] border border-[var(--border-subtle)] font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Endpoint:</span>
                    <span className="truncate max-w-[220px]">{testResult.webhookUrl}</span>
                  </div>
                  {testResult.result.statusCode !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">HTTP Status:</span>
                      <span className="font-bold">{testResult.result.statusCode}</span>
                    </div>
                  )}
                  {testResult.result.durationMs !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Roundtrip Latency:</span>
                      <span>{testResult.result.durationMs} ms</span>
                    </div>
                  )}
                </div>

                {testResult.result.responseBody && (
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                      Response Body Preview
                    </span>
                    <pre className="bg-[var(--surface-raised)] p-2.5 rounded-[6px] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                      {testResult.result.responseBody}
                    </pre>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setTestResult(null)}
                    className="px-4 py-1.5 rounded-[6px] bg-[var(--text-primary)] text-[var(--surface-base)] text-[12px] font-medium hover:opacity-90 transition-opacity"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Reveal Secret Modal ───────────────────────────────────────────────── */}
      {secretModal && secretModal.isOpen && secretModal.webhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[var(--surface-base)] rounded-[12px] border border-[var(--border-default)] shadow-xl w-full max-w-md p-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h4 className="text-[14px] font-bold text-[var(--text-primary)]">
                  Webhook Signing Secret
                </h4>
              </div>
              <button
                onClick={() => setSecretModal(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[12px] text-[var(--text-secondary)]">
                Every webhook event includes an HMAC-SHA256 signature in the <code className="font-mono text-emerald-600 font-bold">x-fyrlinc-signature</code> header. Use this secret to verify delivery authenticity.
              </p>

              <div>
                <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                  Secret Key
                </label>
                <div className="flex items-center gap-2 bg-[var(--surface-hover)] p-2.5 rounded-[6px] border border-[var(--border-subtle)]">
                  <span className="flex-1 font-mono text-[12px] text-[var(--text-primary)] break-all select-all">
                    {secretModal.revealed
                      ? secretModal.webhook.secret
                      : "whsec_••••••••••••••••••••••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSecretModal({
                        ...secretModal,
                        revealed: !secretModal.revealed,
                      })
                    }
                    className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title={secretModal.revealed ? "Hide Secret" : "Reveal Secret"}
                  >
                    {secretModal.revealed ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <CopyButton
                    textToCopy={secretModal.webhook.secret}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    iconClassName="h-4 w-4"
                    title="Copy Secret"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    const orgName = secretModal.webhook?.companyId
                      ? companies.find((c) => c.id === secretModal.webhook?.companyId)?.name || secretModal.webhook?.companyId
                      : "Global Scope";
                    generateWebhookDoc(secretModal.webhook!, orgName, secretModal.webhook?.secret);
                  }}
                  className="px-3 py-1.5 rounded-[6px] border border-[var(--border-default)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Documentation
                </button>
                <button
                  onClick={() => setSecretModal(null)}
                  className="px-4 py-1.5 rounded-[6px] bg-[var(--text-primary)] text-[var(--surface-base)] text-[12px] font-medium hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Alias export for semantic naming
export const ApiAndWebhooksSection = ApiKeysSection;
