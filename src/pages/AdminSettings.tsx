import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserService } from '../api/UserService';
import { GroupService } from '../api/GroupService';
import { ApiKeyService, ApiKeyRecord } from '../api/ApiKeyService';
import { PanelService } from '../api/PanelService';
import { Panel, User, Role, Group } from '../types';
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Users,
  KeyRound,
  Layers3,
  XCircle
} from 'lucide-react';

const panelSchema = z.object({
  serial: z.string().min(1, 'Serial is required'),
  name: z.string().min(1, 'Name is required'),
  zoneCount: z.coerce.number().min(1).max(64, 'Max 64 zones'),
  groupId: z.string().min(1, 'Group ID is required'),
  ipAddress: z.string().optional(),
  allowedCommands: z.string().optional()
});

const userSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['super_admin', 'head_office', 'system_integrator', 'end_user']),
  groups: z.string().optional()
});

const groupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  groupId: z.string().optional(),
  description: z.string().optional(),
  allowedCommands: z.string().optional()
});

const apiKeySchema = z.object({
  email: z.string().email('Valid email is required').optional(),
  uid: z.string().optional(),
  label: z.string().optional()
});

type PanelFormData = z.infer<typeof panelSchema>;
type UserFormData = z.infer<typeof userSchema>;
type GroupFormData = z.infer<typeof groupSchema>;
type ApiKeyFormData = z.infer<typeof apiKeySchema>;

const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  head_office: 'Head Office',
  system_integrator: 'System Integrator',
  end_user: 'End User'
};

const roleColors: Record<Role, string> = {
  super_admin: 'border-red-300/30 bg-red-500/10 text-red-100',
  head_office: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  system_integrator: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100',
  end_user: 'border-white/10 bg-white/[0.04] text-slate-300'
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }

  return fallback;
}

export function AdminSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [panelsLoading, setPanelsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'panels'>('users');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [apiKeyFormOpen, setApiKeyFormOpen] = useState(false);
  const [panelFormLoading, setPanelFormLoading] = useState(false);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [groupFormLoading, setGroupFormLoading] = useState(false);
  const [apiKeyFormLoading, setApiKeyFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PanelFormData>({
    resolver: zodResolver(panelSchema)
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    formState: { errors: userErrors }
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema) });

  const {
    register: registerGroup,
    handleSubmit: handleSubmitGroup,
    reset: resetGroup,
    formState: { errors: groupErrors }
  } = useForm<GroupFormData>({ resolver: zodResolver(groupSchema) });

  const {
    register: registerApiKey,
    handleSubmit: handleSubmitApiKey,
    reset: resetApiKey,
    formState: { errors: apiKeyErrors }
  } = useForm<ApiKeyFormData>({ resolver: zodResolver(apiKeySchema) });

  useEffect(() => {
    loadUsers();
    loadGroups();
    loadApiKeys();
    loadPanels();
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await UserService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      setGroups(await GroupService.getGroups());
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      setApiKeys(await ApiKeyService.getApiKeys());
    } catch (err) {
      console.error('Failed to load api keys:', err);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const loadPanels = async () => {
    setPanelsLoading(true);
    try {
      const data = await PanelService.getPanels();
      setPanels(data);
    } catch (err) {
      console.error('Failed to load panels:', err);
    } finally {
      setPanelsLoading(false);
    }
  };

  const handleCreateUser = async (data: UserFormData) => {
    setUserFormLoading(true);
    setError(null);
    try {
      const groups = data.groups
        ? data.groups.split(',').map((group) => group.trim()).filter(Boolean)
        : [];
      await UserService.createUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
        groups
      });
      setUserFormOpen(false);
      resetUser();
      await loadUsers();
      setSuccess('User created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create user'));
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleCreateGroup = async (data: GroupFormData) => {
    setGroupFormLoading(true);
    setError(null);
    try {
      const allowedCommands = data.allowedCommands
        ? data.allowedCommands.split(',').map((command) => command.trim()).filter(Boolean)
        : [];
      await GroupService.createGroup({
        name: data.name,
        groupId: data.groupId?.trim() || undefined,
        description: data.description?.trim() || undefined,
        allowedCommands
      });
      setGroupFormOpen(false);
      resetGroup();
      await loadGroups();
      setSuccess('Group created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create group'));
    } finally {
      setGroupFormLoading(false);
    }
  };

  const handleCreateApiKey = async (data: ApiKeyFormData) => {
    setApiKeyFormLoading(true);
    setError(null);
    try {
      await ApiKeyService.createApiKey({
        uid: data.uid?.trim() || undefined,
        email: data.email?.trim() || undefined,
        label: data.label?.trim() || undefined
      });
      setApiKeyFormOpen(false);
      resetApiKey();
      await loadApiKeys();
      setSuccess('API key created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create API key'));
    } finally {
      setApiKeyFormLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: Role) => {
    setError(null);
    try {
      await UserService.updateUserRole(uid, newRole);
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      setEditingUser(null);
      setSuccess('User role updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update role'));
    }
  };

  const handleCreatePanel = async (data: PanelFormData) => {
    setPanelFormLoading(true);
    setError(null);
    try {
      const allowedCommands = data.allowedCommands
        ? data.allowedCommands.split(',').map((command) => command.trim()).filter(Boolean)
        : [];

      await PanelService.createPanel({
        serial: data.serial,
        name: data.name,
        zoneCount: data.zoneCount,
        groupId: data.groupId,
        ipAddress: data.ipAddress?.trim() || undefined,
        allowedCommands
      });
      setPanelFormOpen(false);
      reset();
      setSuccess('Panel created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create panel'));
    } finally {
      setPanelFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-white">Admin Settings</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Manage users and panel provisioning</p>
          </div>

          <div className="surface-muted flex rounded-lg p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-950/30'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('panels')}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'panels'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-950/30'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Panels</span>
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300/25 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-200" />
          <p className="text-sm text-red-100">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-200/80 hover:text-red-100">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300/25 bg-emerald-400/10 p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-200" />
          <p className="text-sm text-emerald-100">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-200/80 hover:text-emerald-100">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">User Management</h2>
              <p className="mt-1 text-sm text-slate-500">{users.length} user{users.length === 1 ? '' : 's'}</p>
            </div>
            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className="btn-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setUserFormOpen(true)} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
              Add User
            </button>
            <button onClick={() => setGroupFormOpen(true)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">
              <Layers3 className="mr-2 inline h-4 w-4" />
              Add Group
            </button>
            <button onClick={() => setApiKeyFormOpen(true)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">
              <KeyRound className="mr-2 inline h-4 w-4" />
              Add API Key
            </button>
          </div>

          {userFormOpen && (
            <div className="surface-panel rounded-lg p-5">
              <h3 className="mb-4 text-lg font-semibold text-white">Create User</h3>
              <form onSubmit={handleSubmitUser(handleCreateUser)} className="grid gap-4 md:grid-cols-2">
                <input {...registerUser('displayName')} placeholder="Display name" className="control-field rounded-lg px-4 py-2.5 text-sm md:col-span-2" />
                <div>
                  <input {...registerUser('email')} placeholder="Email" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                  {userErrors.email && <p className="mt-1 text-sm text-red-300">{userErrors.email.message}</p>}
                </div>
                <div>
                  <input {...registerUser('password')} type="password" placeholder="Password" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                  {userErrors.password && <p className="mt-1 text-sm text-red-300">{userErrors.password.message}</p>}
                </div>
                <div>
                  <select {...registerUser('role')} className="control-field w-full rounded-lg px-4 py-2.5 text-sm">
                    <option value="end_user">End User</option>
                    <option value="system_integrator">System Integrator</option>
                    <option value="head_office">Head Office</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <input {...registerUser('groups')} placeholder="group-a, group-b" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={userFormLoading} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {userFormLoading ? 'Creating...' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setUserFormOpen(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {groupFormOpen && (
            <div className="surface-panel rounded-lg p-5">
              <h3 className="mb-4 text-lg font-semibold text-white">Create Group</h3>
              <form onSubmit={handleSubmitGroup(handleCreateGroup)} className="grid gap-4 md:grid-cols-2">
                <div>
                  <input {...registerGroup('name')} placeholder="Group name" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                  {groupErrors.name && <p className="mt-1 text-sm text-red-300">{groupErrors.name.message}</p>}
                </div>
                <input {...registerGroup('groupId')} placeholder="Optional group ID" className="control-field rounded-lg px-4 py-2.5 text-sm" />
                <textarea {...registerGroup('description')} placeholder="Description" className="control-field min-h-24 rounded-lg px-4 py-2.5 text-sm md:col-span-2" />
                <input {...registerGroup('allowedCommands')} placeholder="ARM, ZONE OFF, MOB=01=..." className="control-field rounded-lg px-4 py-2.5 text-sm md:col-span-2" />
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={groupFormLoading} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {groupFormLoading ? 'Creating...' : 'Create Group'}
                  </button>
                  <button type="button" onClick={() => setGroupFormOpen(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {apiKeyFormOpen && (
            <div className="surface-panel rounded-lg p-5">
              <h3 className="mb-4 text-lg font-semibold text-white">Create API Key</h3>
              <form onSubmit={handleSubmitApiKey(handleCreateApiKey)} className="grid gap-4 md:grid-cols-3">
                <div>
                  <input {...registerApiKey('email')} placeholder="User email" className="control-field rounded-lg px-4 py-2.5 text-sm" />
                  {apiKeyErrors.email && <p className="mt-1 text-sm text-red-300">{apiKeyErrors.email.message}</p>}
                </div>
                <div>
                  <input {...registerApiKey('uid')} placeholder="Or user UID" className="control-field rounded-lg px-4 py-2.5 text-sm" />
                  {apiKeyErrors.uid && <p className="mt-1 text-sm text-red-300">{apiKeyErrors.uid.message}</p>}
                </div>
                <div>
                  <input {...registerApiKey('label')} placeholder="Label" className="control-field rounded-lg px-4 py-2.5 text-sm" />
                  {apiKeyErrors.label && <p className="mt-1 text-sm text-red-300">{apiKeyErrors.label.message}</p>}
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <button type="submit" disabled={apiKeyFormLoading} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {apiKeyFormLoading ? 'Creating...' : 'Create API Key'}
                  </button>
                  <button type="button" onClick={() => setApiKeyFormOpen(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="surface-panel rounded-lg p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Groups</h3>
                  <p className="mt-1 text-sm text-slate-500">{groups.length} total</p>
                </div>
                <button onClick={loadGroups} disabled={groupsLoading} className="btn-secondary rounded-lg px-3 py-2 text-sm font-medium">
                  <RefreshCw className={`h-4 w-4 ${groupsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {groupsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
              ) : groups.length === 0 ? (
                <p className="text-sm text-slate-500">No groups yet.</p>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-semibold text-white">{group.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{group.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel rounded-lg p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">API Keys</h3>
                  <p className="mt-1 text-sm text-slate-500">{apiKeys.length} total</p>
                </div>
                <button onClick={loadApiKeys} disabled={apiKeysLoading} className="btn-secondary rounded-lg px-3 py-2 text-sm font-medium">
                  <RefreshCw className={`h-4 w-4 ${apiKeysLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {apiKeysLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-slate-500">No API keys issued yet.</p>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-semibold text-white">{key.label || 'Untitled key'}</p>
                      <p className="mt-1 text-xs text-slate-500">{key.email || key.userId || 'Unknown owner'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {usersLoading ? (
            <div className="surface-panel flex justify-center rounded-lg py-14">
              <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                      Groups
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((user) => (
                    <tr key={user.uid} className="transition-colors hover:bg-white/[0.035]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400 text-sm font-semibold text-white">
                            {user.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.displayName || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">{user.email}</td>
                      <td className="px-4 py-4">
                        {editingUser === user.uid ? (
                          <select
                            defaultValue={user.role}
                            onChange={(e) => handleRoleChange(user.uid, e.target.value as Role)}
                            className="control-field rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="head_office">Head Office</option>
                            <option value="system_integrator">System Integrator</option>
                            <option value="end_user">End User</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${roleColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-400">
                          {user.groups.length > 0 ? `${user.groups.length} groups` : 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {editingUser === user.uid ? (
                          <button
                            onClick={() => setEditingUser(null)}
                            className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingUser(user.uid)}
                            className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span>Edit Role</span>
                          </button>
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

      {activeTab === 'panels' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Panel Provisioning</h2>
              <p className="mt-1 text-sm text-slate-500">Create panel records for monitoring</p>
            </div>
            <button
              onClick={() => setPanelFormOpen(true)}
              className="btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              <Plus className="h-5 w-5" />
              <span>Add Panel</span>
            </button>
          </div>

          <div className="surface-panel rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Provisioned Panels</h3>
                <p className="mt-1 text-sm text-slate-500">Panels currently stored in Firestore</p>
              </div>
              <button onClick={loadPanels} disabled={panelsLoading} className="btn-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
                <RefreshCw className={`h-4 w-4 ${panelsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {panelsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-300" /></div>
            ) : panels.length === 0 ? (
              <p className="text-sm text-slate-500">No panels provisioned yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {panels.map((panel) => (
                  <div key={panel.serial} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{panel.name}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{panel.serial}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-xs ${panel.mqttConnected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-slate-400/20 bg-slate-500/10 text-slate-300'}`}>{panel.mqttConnected ? 'Online' : 'Offline'}</span>
                    </div>
                    <div className="mt-3 text-sm text-slate-400">
                      <p>{panel.zoneCount} zones</p>
                      <p>{panel.groupId || 'No group'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {panelFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => setPanelFormOpen(false)}
              />
              <div className="surface-panel relative w-full max-w-md rounded-lg p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Add New Panel</h3>
                    <p className="mt-1 text-sm text-slate-500">Provision a new fire alarm panel.</p>
                  </div>
                  <button
                    onClick={() => setPanelFormOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    type="button"
                    aria-label="Close panel form"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(handleCreatePanel)} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Serial Number
                    </label>
                    <input
                      {...register('serial')}
                      className={`control-field w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 ${
                        errors.serial ? 'border-red-400/70' : ''
                      }`}
                      placeholder="e.g., FP-2024-001"
                      disabled={panelFormLoading}
                    />
                    {errors.serial && (
                      <p className="mt-1 text-sm text-red-300">{errors.serial.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Panel Name
                    </label>
                    <input
                      {...register('name')}
                      className={`control-field w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 ${
                        errors.name ? 'border-red-400/70' : ''
                      }`}
                      placeholder="e.g., Building A - Floor 1"
                      disabled={panelFormLoading}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-300">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Number of Zones (1-64)
                    </label>
                    <input
                      type="number"
                      {...register('zoneCount')}
                      className={`control-field w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 ${
                        errors.zoneCount ? 'border-red-400/70' : ''
                      }`}
                      placeholder="8"
                      min={1}
                      max={64}
                      disabled={panelFormLoading}
                    />
                    {errors.zoneCount && (
                      <p className="mt-1 text-sm text-red-300">{errors.zoneCount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Group ID
                    </label>
                    <input
                      {...register('groupId')}
                      className={`control-field w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 ${
                        errors.groupId ? 'border-red-400/70' : ''
                      }`}
                      placeholder="e.g., group-building-a"
                      disabled={panelFormLoading}
                    />
                    {errors.groupId && (
                      <p className="mt-1 text-sm text-red-300">{errors.groupId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      IP Address
                    </label>
                    <input
                      {...register('ipAddress')}
                      className="control-field w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500"
                      placeholder="Optional"
                      disabled={panelFormLoading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Allowed Commands
                    </label>
                    <input
                      {...register('allowedCommands')}
                      className="control-field w-full rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500"
                      placeholder="ARM, ZONE OFF, MOB=01=..."
                      disabled={panelFormLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setPanelFormOpen(false);
                        reset();
                      }}
                      className="btn-secondary rounded-lg px-4 py-2.5 text-sm font-semibold"
                      disabled={panelFormLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={panelFormLoading}
                      className="btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
                    >
                      {panelFormLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <span>Create Panel</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="surface-panel rounded-lg p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
              <Shield className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-sm text-slate-300">Use the "Add Panel" button above to provision new fire alarm panels.</p>
            <p className="mt-2 text-sm text-slate-500">All panels will appear on the dashboard after creation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
