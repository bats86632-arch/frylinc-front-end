import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserService } from '../api/UserService';
import { PanelService } from '../api/PanelService';
import { User, Role } from '../types';
import {
  Users,
  Plus,
  Edit2,
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
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
  super_admin: 'bg-red-500/20 text-red-500',
  head_office: 'bg-orange-500/20 text-orange-500',
  system_integrator: 'bg-blue-500/20 text-blue-500',
  end_user: 'bg-slate-600 text-slate-300'
};

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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create panel');
    } finally {
      setPanelFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage users and panel provisioning</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Users</span>
          </button>
          <button
            onClick={() => setActiveTab('panels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'panels'
                ? 'bg-amber-500 text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="font-medium">Panels</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-green-500 text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">User Management</h2>
            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Groups
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-700/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
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
                            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="head_office">Head Office</option>
                            <option value="system_integrator">System Integrator</option>
                            <option value="end_user">End User</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
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
                            className="text-slate-400 hover:text-white px-2 py-1 text-sm"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingUser(user.uid)}
                            className="flex items-center gap-1 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* Panels Tab */}
      {activeTab === 'panels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Panel Provisioning</h2>
            <button
              onClick={() => setPanelFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Panel</span>
            </button>
          </div>

          {panelFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setPanelFormOpen(false)}
              />
              <div className="relative bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-white mb-6">Add New Panel</h3>

                <form onSubmit={handleSubmit(handleCreatePanel)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Serial Number
                    </label>
                    <input
                      {...register('serial')}
                      className={`w-full px-4 py-2.5 bg-slate-900/50 border ${
                        errors.serial ? 'border-red-500' : 'border-slate-600'
                      } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                      placeholder="e.g., FP-2024-001"
                      disabled={panelFormLoading}
                    />
                    {errors.serial && (
                      <p className="mt-1 text-sm text-red-400">{errors.serial.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Panel Name
                    </label>
                    <input
                      {...register('name')}
                      className={`w-full px-4 py-2.5 bg-slate-900/50 border ${
                        errors.name ? 'border-red-500' : 'border-slate-600'
                      } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                      placeholder="e.g., Building A - Floor 1"
                      disabled={panelFormLoading}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Number of Zones (1-64)
                    </label>
                    <input
                      type="number"
                      {...register('zoneCount')}
                      className={`w-full px-4 py-2.5 bg-slate-900/50 border ${
                        errors.zoneCount ? 'border-red-500' : 'border-slate-600'
                      } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                      placeholder="8"
                      min={1}
                      max={64}
                      disabled={panelFormLoading}
                    />
                    {errors.zoneCount && (
                      <p className="mt-1 text-sm text-red-400">{errors.zoneCount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Group ID
                    </label>
                    <input
                      {...register('groupId')}
                      className={`w-full px-4 py-2.5 bg-slate-900/50 border ${
                        errors.groupId ? 'border-red-500' : 'border-slate-600'
                      } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                      placeholder="e.g., group-building-a"
                      disabled={panelFormLoading}
                    />
                    {errors.groupId && (
                      <p className="mt-1 text-sm text-red-400">{errors.groupId.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setPanelFormOpen(false);
                        reset();
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                      disabled={panelFormLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={panelFormLoading}
                      className="flex-1 px-4 py-2.5 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {panelFormLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
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

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Use the "Add Panel" button above to provision new fire alarm panels.</p>
            <p className="text-slate-500 text-sm mt-2">All panels will appear on the dashboard after creation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
