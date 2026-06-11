import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserService } from '../api/UserService';
import { PanelService } from '../api/PanelService';
import { User, Role } from '../types';
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Users,
  XCircle
} from 'lucide-react';

const panelSchema = z.object({
  serial: z.string().min(1, 'Serial is required'),
  name: z.string().min(1, 'Name is required'),
  zoneCount: z.coerce.number().min(1).max(64, 'Max 64 zones'),
  groupId: z.string().min(1, 'Group ID is required')
});

type PanelFormData = z.infer<typeof panelSchema>;

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
  const [usersLoading, setUsersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'panels'>('users');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [panelFormLoading, setPanelFormLoading] = useState(false);
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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await UserService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
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
      await PanelService.createPanel(data);
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
