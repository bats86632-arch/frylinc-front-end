import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserService } from '../api/UserService';
import { CompanyService } from '../api/CompanyService';
import { BranchService } from '../api/BranchService';
import { PanelService } from '../api/PanelService';
import { Panel, User, Role, Company, Branch } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Users,
  Layers3,
  XCircle,
  Trash2,
  Building2,
  MapPin
} from 'lucide-react';

const panelSchema = z.object({
  serial: z.string().min(1, 'Serial is required'),
  name: z.string().min(1, 'Name is required'),
  companyId: z.string().min(1, 'Company ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  mobileNumber: z.string().optional()
});

const userSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['super_admin', 'head_office', 'system_integrator', 'end_user']),
  companyId: z.string().optional(),
  branchIds: z.string().optional()
});

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional()
});

const branchSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  supervisorName: z.string().optional(),
  contactNumber: z.string().optional(),
  emailAddress: z.string().email('Invalid email').optional().or(z.literal(''))
});

type PanelFormData = z.infer<typeof panelSchema>;
type UserFormData = z.infer<typeof userSchema>;
type CompanyFormData = z.infer<typeof companySchema>;
type BranchFormData = z.infer<typeof branchSchema>;

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
    const response = (error as { response?: { data?: { error?: string, message?: unknown } } }).response;
    if (typeof response?.data?.error === 'string') {
      return response.data.error;
    }
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }
  return fallback;
}

export function AdminSettings() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  
  const [usersLoading, setUsersLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [panelsLoading, setPanelsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'users' | 'orgs' | 'panels'>('users');
  
  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  
  const [panelFormLoading, setPanelFormLoading] = useState(false);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [branchFormLoading, setBranchFormLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register: registerPanel,
    handleSubmit: handleSubmitPanel,
    reset: resetPanel,
    formState: { errors: panelErrors }
  } = useForm<PanelFormData>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      serial: '',
      name: ''
    }
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    watch: watchUser,
    formState: { errors: userErrors }
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema) });

  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    reset: resetCompany
  } = useForm<CompanyFormData>({ resolver: zodResolver(companySchema) });

  const {
    register: registerBranch,
    handleSubmit: handleSubmitBranch,
    reset: resetBranch
  } = useForm<BranchFormData>({ resolver: zodResolver(branchSchema) });

  const selectedUserRole = watchUser('role');

  useEffect(() => {
    loadUsers();
    loadOrgs();
    loadPanels();
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      setUsers(await UserService.getUsers());
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadOrgs = async () => {
    setOrgsLoading(true);
    try {
      if (userData?.role === 'super_admin' || userData?.role === 'head_office') {
        setCompanies(await CompanyService.getCompanies());
      }
      setBranches(await BranchService.getBranches());
    } catch (err) {
      console.error('Failed to load orgs:', err);
    } finally {
      setOrgsLoading(false);
    }
  };

  const loadPanels = async () => {
    setPanelsLoading(true);
    try {
      setPanels(await PanelService.getPanels());
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
      const branchIds = data.branchIds
        ? data.branchIds.split(',').map((id) => id.trim()).filter(Boolean)
        : [];
      
      let companyId = data.companyId;
      if (userData?.role === 'head_office' && userData.companyId) {
         companyId = userData.companyId;
      }

      await UserService.createUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
        companyId: companyId || undefined,
        branchIds
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

  const handleCreateCompany = async (data: CompanyFormData) => {
    setCompanyFormLoading(true);
    setError(null);
    try {
      await CompanyService.createCompany(data);
      setCompanyFormOpen(false);
      resetCompany();
      await loadOrgs();
      setSuccess('Company created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create company'));
    } finally {
      setCompanyFormLoading(false);
    }
  };

  const handleCreateBranch = async (data: BranchFormData) => {
    setBranchFormLoading(true);
    setError(null);
    try {
      let compId = data.companyId;
      if (userData?.role === 'head_office' && userData.companyId) {
        compId = userData.companyId;
      }
      
      await BranchService.createBranch({
         ...data,
         companyId: compId
      });
      setBranchFormOpen(false);
      resetBranch();
      await loadOrgs();
      setSuccess('Branch created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create branch'));
    } finally {
      setBranchFormLoading(false);
    }
  };

  const handleCreatePanel = async (data: PanelFormData) => {
    setPanelFormLoading(true);
    setError(null);
    try {
      let compId = data.companyId;
      if (userData?.role === 'head_office' && userData.companyId) {
        compId = userData.companyId;
      }

      await PanelService.createPanel({
        serial: data.serial,
        name: data.name,
        companyId: compId,
        branchId: data.branchId,
        mobileNumber: data.mobileNumber?.trim() || undefined
      });
      setPanelFormOpen(false);
      resetPanel();
      await loadPanels();
      setSuccess('Panel created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create panel'));
    } finally {
      setPanelFormLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    setError(null);
    try {
      await UserService.deleteUser(uid);
      await loadUsers();
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to delete user'));
    }
  };

  const handleDeletePanel = async (serial: string) => {
    if (!window.confirm('Delete this panel?')) return;
    setError(null);
    try {
      await PanelService.deletePanel(serial);
      await loadPanels();
      setSuccess('Panel deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to delete panel'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-white">Admin Settings</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Manage organization hierarchy and access</p>
          </div>

          <div className="surface-muted flex rounded-lg p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'users' ? 'bg-red-500 text-white shadow-lg shadow-red-950/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" /><span>Users</span>
            </button>
            {(userData?.role === 'super_admin' || userData?.role === 'head_office' || userData?.role === 'system_integrator') && (
              <button
                onClick={() => setActiveTab('orgs')}
                className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'orgs' ? 'bg-red-500 text-white shadow-lg shadow-red-950/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Layers3 className="h-4 w-4" /><span>Hierarchy</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('panels')}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'panels' ? 'bg-red-500 text-white shadow-lg shadow-red-950/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4" /><span>Panels</span>
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
            </div>
            <button onClick={loadUsers} disabled={usersLoading} className="btn-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
              <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setUserFormOpen(true)} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
              Add User
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
                    {(userData?.role === 'super_admin' || userData?.role === 'head_office') && (
                      <option value="system_integrator">System Integrator</option>
                    )}
                    {userData?.role === 'super_admin' && (
                      <option value="head_office">Head Office</option>
                    )}
                  </select>
                </div>
                
                {(selectedUserRole === 'head_office' || selectedUserRole === 'system_integrator' || selectedUserRole === 'end_user') && userData?.role === 'super_admin' && (
                  <div>
                    <input {...registerUser('companyId')} placeholder="Company ID" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                )}
                
                {(selectedUserRole === 'system_integrator' || selectedUserRole === 'end_user') && (
                  <div>
                    <input {...registerUser('branchIds')} placeholder="Branch IDs (comma separated)" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                )}

                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={userFormLoading} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {userFormLoading ? 'Creating...' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setUserFormOpen(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {usersLoading ? (
            <div className="surface-panel flex justify-center rounded-lg py-14">
              <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Scope</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-400">Actions</th>
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
                          <p className="font-medium text-white">{user.displayName || 'Unknown'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">{user.email}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-400">
                          {user.companyId && <span>Company: {user.companyId}</span>}
                          {user.branchIds && user.branchIds.length > 0 && <span>Branches: {user.branchIds.join(', ')}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleDeleteUser(user.uid)} className="rounded-lg px-3 py-2 text-sm text-red-200 transition-colors hover:bg-red-500/10">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orgs' && (
        <div className="space-y-4">
           <div className="flex flex-wrap gap-2">
            {userData?.role === 'super_admin' && (
              <button onClick={() => setCompanyFormOpen(true)} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
                Add Company
              </button>
            )}
            {(userData?.role === 'super_admin' || userData?.role === 'head_office') && (
              <button onClick={() => setBranchFormOpen(true)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">
                <Layers3 className="mr-2 inline h-4 w-4" />
                Add Branch
              </button>
            )}
          </div>

          {companyFormOpen && (
            <div className="surface-panel rounded-lg p-5">
              <h3 className="mb-4 text-lg font-semibold text-white">Create Company</h3>
              <form onSubmit={handleSubmitCompany(handleCreateCompany)} className="grid gap-4 md:grid-cols-2">
                <input {...registerCompany('name')} placeholder="Company Name" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                <input {...registerCompany('description')} placeholder="Description" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={companyFormLoading} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
                    {companyFormLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setCompanyFormOpen(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {branchFormOpen && (
            <div className="surface-panel rounded-lg p-5">
              <h3 className="mb-4 text-lg font-semibold text-white">Create Branch</h3>
              <form onSubmit={handleSubmitBranch(handleCreateBranch)} className="grid gap-4 md:grid-cols-2">
                <input {...registerBranch('name')} placeholder="Branch Name" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                {userData?.role === 'super_admin' && (
                  <input {...registerBranch('companyId')} placeholder="Company ID" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                )}
                <input {...registerBranch('address')} placeholder="Address" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                <input {...registerBranch('supervisorName')} placeholder="Manager/Supervisor" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                <input {...registerBranch('contactNumber')} placeholder="Contact Number" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={branchFormLoading} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
                    {branchFormLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setBranchFormOpen(false)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {userData?.role === 'super_admin' && (
              <div className="surface-panel rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-4"><Building2 className="inline mr-2" />Companies</h3>
                {orgsLoading ? <Loader2 className="animate-spin" /> : companies.map(c => (
                  <div key={c.id} className="p-3 bg-white/[0.03] border border-white/10 rounded-lg mb-2">
                    <p className="text-white font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">ID: {c.id}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="surface-panel rounded-lg p-5">
               <h3 className="text-lg font-semibold text-white mb-4"><MapPin className="inline mr-2" />Branches</h3>
               {orgsLoading ? <Loader2 className="animate-spin" /> : branches.map(b => (
                  <div key={b.id} className="p-3 bg-white/[0.03] border border-white/10 rounded-lg mb-2">
                    <p className="text-white font-semibold">{b.name}</p>
                    <p className="text-xs text-slate-500">ID: {b.id} | Company: {b.companyId}</p>
                    {b.supervisorName && <p className="text-xs text-slate-400 mt-1">Mgr: {b.supervisorName}</p>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'panels' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Panel Provisioning</h2>
            </div>
            {(userData?.role !== 'end_user') && (
              <button onClick={() => setPanelFormOpen(true)} className="btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold">
                <Plus className="h-5 w-5" /><span>Add Panel</span>
              </button>
            )}
          </div>

          <div className="surface-panel rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Provisioned Panels</h3>
              <button onClick={loadPanels} disabled={panelsLoading} className="btn-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
                <RefreshCw className={`h-4 w-4 ${panelsLoading ? 'animate-spin' : ''}`} /> Refresh
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
                      {(userData?.role !== 'end_user') && (
                        <button onClick={() => handleDeletePanel(panel.serial)} className="rounded-lg px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/10">
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-slate-400">
                      <p>Company ID: {panel.companyId}</p>
                      <p>Branch ID: {panel.branchId}</p>
                      {panel.mobileNumber && <p>Mobile: {panel.mobileNumber}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {panelFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPanelFormOpen(false)} />
              <div className="surface-panel relative w-full max-w-md rounded-lg p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold text-white">Add New Panel</h3>
                  <button onClick={() => setPanelFormOpen(false)} className="text-slate-400 hover:text-white"><XCircle className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmitPanel(handleCreatePanel)} className="space-y-4">
                  <div>
                    <input {...registerPanel('serial')} placeholder="Panel Serial Number" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                    {panelErrors.serial && <p className="mt-1 text-xs text-red-300">{panelErrors.serial.message}</p>}
                  </div>
                  <div>
                    <input {...registerPanel('name')} placeholder="Panel Name" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                    {panelErrors.name && <p className="mt-1 text-xs text-red-300">{panelErrors.name.message}</p>}
                  </div>
                  {userData?.role === 'super_admin' && (
                    <div>
                      <input {...registerPanel('companyId')} placeholder="Company ID" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                    </div>
                  )}
                  <div>
                    <input {...registerPanel('branchId')} placeholder="Branch ID" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                    {panelErrors.branchId && <p className="mt-1 text-xs text-red-300">{panelErrors.branchId.message}</p>}
                  </div>
                  <div>
                    <input {...registerPanel('mobileNumber')} placeholder="Configured Mobile Number" className="control-field w-full rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                  <button type="submit" disabled={panelFormLoading} className="btn-primary w-full rounded-lg px-4 py-3 text-sm font-semibold">
                    {panelFormLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Provision Panel'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
