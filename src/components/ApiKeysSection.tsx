import { useState, useEffect } from "react";
import { CopyButton } from "./CopyButton";
import { Loader2, Plus, Trash2, Key, RefreshCw, XCircle, Settings2, Globe, Building2, MapPin } from "lucide-react";
import { ApiKeyService } from "../api/ApiKeyService";
import { ApiKeyRecord, Branch, Company } from "../types";

interface ApiKeysSectionProps {
  companyId?: string; // If provided, scoped to company. If omitted, shows all (for super admin)
  companies?: Company[];
  branches?: Branch[];
}

export function ApiKeysSection({ companyId, companies = [], branches = [] }: ApiKeysSectionProps) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId || "");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  
  // The raw API key returned upon creation
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [companyId]);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiKeyService.getApiKeys(companyId);
      setKeys(data);
    } catch (err: any) {
      setError(err.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;
    try {
      setCreating(true);
      setError(null);
      const result = await ApiKeyService.createKey({
        label,
        companyId: selectedCompanyId || undefined,
        branchIds: selectedBranches.length > 0 ? selectedBranches : undefined,
        webhookUrl: webhookUrl || undefined,
      });
      setNewKey(result.apiKey);
      await fetchKeys();
      // Reset form
      setLabel("");
      setWebhookUrl("");
      setSelectedBranches([]);
      if (!companyId) setSelectedCompanyId("");
    } catch (err: any) {
      setError(err.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      setError(null);
      await ApiKeyService.revokeKey(id);
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || "Failed to revoke API key");
    }
  };

  const availableBranches = selectedCompanyId 
    ? branches.filter(b => b.companyId === selectedCompanyId)
    : branches;

  return (
    <div className="flex flex-col h-full bg-[var(--surface-base)] relative">
      <div className="pl-5 pr-14 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between sticky top-0 bg-[var(--surface-base)] z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-sm">
            <Key className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">API Keys</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">Manage API keys and Webhooks</p>
          </div>
        </div>
        {!showCreateForm && !newKey && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex h-8 items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-3 text-[12px] font-medium text-[var(--surface-base)] transition-colors hover:opacity-90"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Key
          </button>
        )}
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-[6px] bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-error)]">
            <XCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {newKey && (
          <div className="mb-6 rounded-[8px] border border-emerald-300/30 bg-[var(--status-success-bg)] p-4 shadow-sm">
            <h4 className="text-[13px] font-bold text-[var(--color-success)] mb-2 flex items-center gap-2">
              <Key className="h-4 w-4" /> API Key Created Successfully
            </h4>
            <p className="text-[12px] text-[var(--text-secondary)] mb-4">
              Please copy this key and store it securely. You will not be able to see it again.
            </p>
            <div className="flex items-center gap-2 bg-[var(--surface-base)] p-3 rounded-[6px] border border-[var(--border-subtle)] font-mono text-[13px] text-[var(--text-primary)] break-all">
              <span className="flex-1 select-all">{newKey}</span>
              <CopyButton
                textToCopy={newKey}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
                iconClassName="h-4 w-4"
                title="Copy API Key"
              />
            </div>
            <button
              onClick={() => {
                setNewKey(null);
                setShowCreateForm(false);
              }}
              className="mt-4 px-4 py-2 bg-[var(--color-success)] text-white rounded-[6px] text-[12px] font-medium hover:bg-emerald-600 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {showCreateForm && !newKey && (
          <form onSubmit={handleCreate} className="mb-6 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-4 shadow-sm animate-fade-in-up">
            <h4 className="mb-4 text-[13px] font-bold text-[var(--text-primary)]">Create New API Key</h4>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Key Label *</label>
                <input
                  required
                  className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Acme Corp Live Sync"
                  disabled={creating}
                />
              </div>

              {!companyId && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <Building2 className="h-3 w-3" /> Organization Scope
                  </label>
                  <select
                    className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                    disabled={creating}
                  >
                    <option value="">No Organization Scope (Global)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCompanyId && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <MapPin className="h-3 w-3" /> Branch Scope (Optional)
                  </label>
                  <select
                    multiple
                    className="control-field w-full rounded-[6px] px-3 py-2 text-[13px] min-h-[80px]"
                    value={selectedBranches}
                    onChange={e => {
                      const options = Array.from(e.target.selectedOptions as HTMLOptionElement[]);
                      setSelectedBranches(options.map(o => o.value));
                    }}
                    disabled={creating}
                  >
                    <option value="" disabled>Select branches (Hold Ctrl/Cmd to select multiple)</option>
                    {availableBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} {b.bsrCode ? `(${b.bsrCode})` : ''}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">Leave empty to grant access to all branches in this organization.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Username (Optional)</label>
                  <input
                    className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. integration_user"
                    disabled={creating}
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">Can be used as a Basic Auth username if needed.</p>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <Globe className="h-3 w-3" /> Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="control-field h-9 w-full rounded-[6px] px-3 text-[13px]"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    disabled={creating}
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">Live panel events will be POSTed here.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                  className="flex h-8 items-center justify-center rounded-[6px] px-4 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !label}
                  className="flex h-8 items-center justify-center rounded-[6px] bg-[var(--accent)] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {creating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Create Key"}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
          </div>
        ) : keys.length === 0 && !showCreateForm ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-10 w-10 text-[var(--text-secondary)] opacity-30 mb-3" />
            <p className="text-[14px] font-medium text-[var(--text-secondary)]">No API Keys Found</p>
            <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1 max-w-xs">
              Create an API key to allow programmatic access or configure webhook event forwarding.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {keys.map(key => (
              <div key={key.id} className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm hover:border-[var(--border-default)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                      <Settings2 className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h5 className="text-[13px] font-bold text-[var(--text-primary)] truncate" title={key.label}>{key.label}</h5>
                      <p className="text-[10px] text-[var(--text-secondary)] font-mono">{key.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] hover:border-[var(--color-error)] transition-all"
                    title="Revoke Key"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">Status</span>
                    <span className={`px-1.5 py-0.5 rounded-[4px] font-medium ${
                      key.status === 'active' ? 'bg-[var(--status-success-bg)] text-[var(--color-success)]' :
                      key.status === 'suspended' ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-border)]' :
                      'bg-[var(--status-danger-bg)] text-[var(--color-error)]'
                    }`}>
                      {key.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {key.username && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">Username</span>
                      <span className="text-[var(--text-primary)] font-mono">{key.username}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">Organization</span>
                    <span className="text-[var(--text-primary)] truncate max-w-[150px]">
                      {key.companyId ? companies.find(c => c.id === key.companyId)?.name || key.companyId : "Global Scope"}
                    </span>
                  </div>

                  {key.webhookUrl && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[9px]">Webhook</span>
                      <span className="text-[var(--text-primary)] truncate max-w-[150px]" title={key.webhookUrl}>{key.webhookUrl}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>Created: {key.createdAt ? new Date(key.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                  <span>Last Used: {key.lastUsedAt ? new Date(key.lastUsedAt.seconds * 1000).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
