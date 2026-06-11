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
  Loader2,
  RefreshCw,
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
  super_admin: 'border-tertiary-container/30 bg-tertiary-container/10 text-tertiary-container',
  head_office: 'border-secondary/30 bg-secondary/10 text-secondary',
  system_integrator: 'border-primary/30 bg-primary/10 text-primary',
  end_user: 'border-white/10 bg-white/[0.04] text-on-surface-variant'
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
    <div className="max-w-[1440px] mx-auto px-margin py-lg space-y-lg">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">System Administration</h1>
          <p className="text-on-surface-variant font-body-md text-body-md mt-xs">Manage organizations, panels, and access controls</p>
        </div>
        
        <nav className="flex bg-white/5 border border-white/10 p-xs rounded-xl backdrop-blur-md overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`px-md py-xs rounded-lg font-label-md text-label-md flex items-center gap-xs transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[18px]">group</span>
            Users
          </button>
          {(userData?.role === 'super_admin' || userData?.role === 'head_office' || userData?.role === 'system_integrator') && (
            <button onClick={() => setActiveTab('orgs')} className={`px-md py-xs rounded-lg font-label-md text-label-md flex items-center gap-xs transition-colors whitespace-nowrap ${activeTab === 'orgs' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
              <span className="material-symbols-outlined text-[18px]">domain</span>
              Hierarchy
            </button>
          )}
          <button onClick={() => setActiveTab('panels')} className={`px-md py-xs rounded-lg font-label-md text-label-md flex items-center gap-xs transition-colors whitespace-nowrap ${activeTab === 'panels' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[18px]">router</span>
            Panels
          </button>
        </nav>
      </header>

      {error && (
        <div className="bg-tertiary-container/10 border border-tertiary-container/30 text-tertiary-container rounded-lg p-md mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm font-medium flex-1">{error}</p>
          <button onClick={() => setError(null)} className="hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}

      {success && (
        <div className="bg-secondary/10 border border-secondary/30 text-secondary rounded-lg p-md mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="text-sm font-medium flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">User Management</h2>
            </div>
            <div className="flex gap-sm">
              <button onClick={loadUsers} disabled={usersLoading} className="bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs transition-colors disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button onClick={() => setUserFormOpen(true)} className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs transition-colors">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add User
              </button>
            </div>
          </div>

          {userFormOpen && (
            <div className="glass-panel p-gutter rounded-xl">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Create User</h3>
              <form onSubmit={handleSubmitUser(handleCreateUser)} className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="md:col-span-2">
                  <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Display Name</label>
                  <input {...registerUser('displayName')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Email Address</label>
                  <input {...registerUser('email')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                  {userErrors.email && <p className="mt-1 text-xs text-tertiary-container">{userErrors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Password</label>
                  <input {...registerUser('password')} type="password" className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                  {userErrors.password && <p className="mt-1 text-xs text-tertiary-container">{userErrors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Role</label>
                  <select {...registerUser('role')} className="w-full bg-[#1e2336] border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none">
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
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Company ID</label>
                    <input {...registerUser('companyId')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                  </div>
                )}
                
                {(selectedUserRole === 'system_integrator' || selectedUserRole === 'end_user') && (
                  <div>
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Branch IDs (comma separated)</label>
                    <input {...registerUser('branchIds')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                  </div>
                )}

                <div className="md:col-span-2 flex gap-md mt-sm">
                  <button type="submit" disabled={userFormLoading} className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg transition-colors disabled:opacity-50">
                    {userFormLoading ? 'Creating...' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setUserFormOpen(false)} className="bg-white/5 hover:bg-white/10 text-on-surface font-label-md text-label-md px-lg py-sm rounded-lg transition-colors border border-white/10">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {usersLoading ? (
            <div className="glass-panel flex justify-center rounded-xl py-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">User</th>
                      <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Email</th>
                      <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Role</th>
                      <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Scope</th>
                      <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                        <td className="px-md py-sm">
                          <div className="flex items-center gap-sm">
                            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                              {user.displayName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="font-label-md text-label-md text-on-surface">{user.displayName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-md py-sm text-on-surface-variant text-body-md">{user.email}</td>
                        <td className="px-md py-sm">
                          <span className={`inline-block px-sm py-[2px] rounded-full text-[11px] font-bold uppercase tracking-wider border ${roleColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </span>
                        </td>
                        <td className="px-md py-sm">
                          <div className="flex flex-col gap-[2px]">
                            {user.companyId && <span className="text-on-surface-variant text-[12px] font-data-mono">C: {user.companyId}</span>}
                            {user.branchIds && user.branchIds.length > 0 && <span className="text-on-surface-variant text-[12px] font-data-mono">B: {user.branchIds.join(', ')}</span>}
                          </div>
                        </td>
                        <td className="px-md py-sm text-right">
                          <button onClick={() => handleDeleteUser(user.uid)} className="text-tertiary-container/70 hover:text-tertiary-container hover:bg-tertiary-container/10 p-sm rounded-lg transition-colors" title="Delete User">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
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

      {activeTab === 'orgs' && (
        <div className="space-y-lg">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
              <h2 className="font-headline-md text-headline-md text-on-surface">Hierarchy Management</h2>
              <div className="flex gap-sm">
                {userData?.role === 'super_admin' && (
                  <button onClick={() => setCompanyFormOpen(true)} className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs transition-colors">
                    <span className="material-symbols-outlined text-[18px]">domain_add</span>
                    Add Company
                  </button>
                )}
                {(userData?.role === 'super_admin' || userData?.role === 'head_office') && (
                  <button onClick={() => setBranchFormOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs transition-colors">
                    <span className="material-symbols-outlined text-[18px]">add_business</span>
                    Add Branch
                  </button>
                )}
              </div>
          </div>

          {companyFormOpen && (
            <div className="glass-panel p-gutter rounded-xl">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Create Company</h3>
              <form onSubmit={handleSubmitCompany(handleCreateCompany)} className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Company Name</label>
                  <input {...registerCompany('name')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Description</label>
                  <input {...registerCompany('description')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="md:col-span-2 flex gap-md mt-sm">
                  <button type="submit" disabled={companyFormLoading} className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg transition-colors disabled:opacity-50">
                    {companyFormLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setCompanyFormOpen(false)} className="bg-white/5 hover:bg-white/10 text-on-surface font-label-md text-label-md px-lg py-sm rounded-lg transition-colors border border-white/10">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {branchFormOpen && (
            <div className="glass-panel p-gutter rounded-xl">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Create Branch</h3>
              <form onSubmit={handleSubmitBranch(handleCreateBranch)} className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                   <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Branch Name</label>
                  <input {...registerBranch('name')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                {userData?.role === 'super_admin' && (
                  <div>
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Company ID</label>
                    <input {...registerBranch('companyId')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                  </div>
                )}
                <div className="md:col-span-2">
                   <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Address</label>
                  <input {...registerBranch('address')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                   <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Manager/Supervisor</label>
                  <input {...registerBranch('supervisorName')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                   <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Contact Number</label>
                  <input {...registerBranch('contactNumber')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="md:col-span-2 flex gap-md mt-sm">
                  <button type="submit" disabled={branchFormLoading} className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg transition-colors disabled:opacity-50">
                    {branchFormLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setBranchFormOpen(false)} className="bg-white/5 hover:bg-white/10 text-on-surface font-label-md text-label-md px-lg py-sm rounded-lg transition-colors border border-white/10">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-gutter lg:grid-cols-2">
            {userData?.role === 'super_admin' && (
              <div className="glass-panel p-gutter rounded-xl">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary">domain</span>
                  Companies
                </h3>
                {orgsLoading ? <div className="py-xl flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
                  <div className="space-y-sm">
                    {companies.map(c => (
                      <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-md flex flex-col hover:border-white/20 transition-colors">
                        <span className="font-label-md text-label-md text-on-surface">{c.name}</span>
                        <span className="font-data-mono text-[12px] text-on-surface-variant mt-xs">ID: {c.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="glass-panel p-gutter rounded-xl">
               <h3 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-xs">
                  <span className="material-symbols-outlined text-secondary">storefront</span>
                  Branches
               </h3>
               {orgsLoading ? <div className="py-xl flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
                 <div className="space-y-sm">
                   {branches.map(b => (
                    <div key={b.id} className="bg-white/5 border border-white/10 rounded-lg p-md flex flex-col hover:border-white/20 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-label-md text-label-md text-on-surface">{b.name}</span>
                        {b.supervisorName && <span className="bg-secondary/10 text-secondary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Mgr: {b.supervisorName}</span>}
                      </div>
                      <span className="font-data-mono text-[12px] text-on-surface-variant mt-xs">ID: {b.id} • Company: {b.companyId}</span>
                    </div>
                  ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'panels' && (
        <div className="space-y-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Panel Provisioning</h2>
            </div>
            <div className="flex gap-sm">
              <button onClick={loadPanels} disabled={panelsLoading} className="bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs transition-colors disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${panelsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              {(userData?.role !== 'end_user') && (
                <button onClick={() => setPanelFormOpen(true)} className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add_box</span>
                  Add Panel
                </button>
              )}
            </div>
          </div>

          <div className="glass-panel p-gutter rounded-xl">
            {panelsLoading ? (
              <div className="py-xl flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : panels.length === 0 ? (
              <div className="py-xl text-center text-on-surface-variant font-label-md text-label-md">No panels provisioned yet.</div>
            ) : (
              <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {panels.map((panel) => (
                  <div key={panel.serial} className="bg-white/5 border border-white/10 rounded-xl p-md flex flex-col group hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-sm">
                      <div>
                        <p className="font-headline-md text-headline-md text-on-surface truncate pr-2">{panel.name}</p>
                        <p className="font-data-mono text-label-sm text-on-surface-variant mt-xs">SN: {panel.serial}</p>
                      </div>
                      {(userData?.role !== 'end_user') && (
                        <button onClick={() => handleDeletePanel(panel.serial)} className="text-tertiary-container/70 hover:text-tertiary-container bg-tertiary-container/10 p-[4px] rounded transition-colors opacity-0 group-hover:opacity-100" title="Delete Panel">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-[2px] mt-auto">
                      <span className="text-[12px] text-on-surface-variant">Company: <span className="font-data-mono text-on-surface">{panel.companyId}</span></span>
                      <span className="text-[12px] text-on-surface-variant">Branch: <span className="font-data-mono text-on-surface">{panel.branchId}</span></span>
                      {panel.mobileNumber && <span className="text-[12px] text-on-surface-variant">Mobile: <span className="font-data-mono text-on-surface">{panel.mobileNumber}</span></span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {panelFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPanelFormOpen(false)} />
              <div className="glass-panel relative w-full max-w-md rounded-xl p-gutter shadow-2xl">
                <div className="mb-lg flex items-center justify-between border-b border-white/10 pb-md">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Provision New Panel</h3>
                  <button onClick={() => setPanelFormOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[24px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitPanel(handleCreatePanel)} className="space-y-md">
                  <div>
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Serial Number</label>
                    <input {...registerPanel('serial')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-data-mono" />
                    {panelErrors.serial && <p className="mt-1 text-xs text-tertiary-container">{panelErrors.serial.message}</p>}
                  </div>
                  <div>
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Panel Name</label>
                    <input {...registerPanel('name')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                    {panelErrors.name && <p className="mt-1 text-xs text-tertiary-container">{panelErrors.name.message}</p>}
                  </div>
                  {userData?.role === 'super_admin' && (
                    <div>
                      <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Company ID</label>
                      <input {...registerPanel('companyId')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                    </div>
                  )}
                  <div>
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Branch ID</label>
                    <input {...registerPanel('branchId')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                    {panelErrors.branchId && <p className="mt-1 text-xs text-tertiary-container">{panelErrors.branchId.message}</p>}
                  </div>
                  <div>
                    <label className="block text-on-surface-variant font-label-sm text-label-sm mb-xs">Configured Mobile Number (Optional)</label>
                    <input {...registerPanel('mobileNumber')} className="w-full bg-white/5 border border-white/10 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="pt-sm">
                    <button type="submit" disabled={panelFormLoading} className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-lg py-md rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-xs">
                      {panelFormLoading ? <Loader2 className="animate-spin" /> : <><span className="material-symbols-outlined text-[20px]">router</span> Provision Panel</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
