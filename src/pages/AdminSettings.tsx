import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserService } from "../api/UserService";
import { PanelService } from "../api/PanelService";
import { usePanels } from "../hooks/usePanels";
import { User, Role, Panel } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useCompanies } from "../hooks/useCompanies";
import { CompanyService, Company } from "../api/CompanyService";
import {
  DEFAULT_PANEL_COMMANDS,
  normalizeAllowedCommands,
} from "../config/panelDefaults";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  XCircle,
  Trash2,
  Edit2,
  X,
} from "lucide-react";

const panelSchema = z.object({
  serial: z.string().min(1, "Serial is required"),
  name: z.string().min(1, "Name is required"),
  zoneCount: z.coerce.number().min(1).max(8, "Max 8 zones"),
  companyId: z.string().min(1, "Company ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  ipAddress: z.string().optional(),
  allowedCommands: z.string().optional(),
});

const userSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["super_admin", "head_office", "system_integrator", "end_user"]),
  companyId: z.string().optional(),
  branchIds: z.string().optional(),
});

const editUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().optional(),
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["super_admin", "head_office", "system_integrator", "end_user"]),
  companyId: z.string().optional(),
  branchIds: z.string().optional(),
});

type PanelFormData = z.infer<typeof panelSchema>;
type UserFormData = z.infer<typeof userSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

const editPanelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyId: z.string().optional(),
  branchId: z.string().optional(),
  ipAddress: z.string().optional(),
});
type EditPanelFormData = z.infer<typeof editPanelSchema>;

const editCompanySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type EditCompanyFormData = z.infer<typeof editCompanySchema>;

const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type CompanyFormData = z.infer<typeof companySchema>;

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  head_office: "Head Office",
  system_integrator: "System Integrator",
  end_user: "Viewer", // Updated to map End User to "Viewer" per prompt
};

const avatarColors = ["#8B4513", "#6B5B95", "#2E4A6B", "#4A5568", "#7B4F3A"];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

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

export function AdminSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUserData, setEditingUserData] = useState<User | null>(null);
  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [panelFormLoading, setPanelFormLoading] = useState(false);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [editUserFormLoading, setEditUserFormLoading] = useState(false);
  const [syncingPanelDefaults, setSyncingPanelDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PanelFormData>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      serial: "219111",
      name: "Fyrlinc Panel 219111",
      zoneCount: 8,
      companyId: "",
      branchId: "",
      ipAddress: "72.167.225.142",
    },
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    formState: { errors: userErrors },
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema) });

  const {
    register: registerEditUser,
    handleSubmit: handleSubmitEditUser,
    reset: resetEditUser,
    setValue: setEditUserValue,
    formState: { errors: editUserErrors },
  } = useForm<EditUserFormData>({ resolver: zodResolver(editUserSchema) });

  const { hasRole } = useAuth();
  const { panels, loading: panelsLoading } = usePanels();
  const [editingPanelData, setEditingPanelData] = useState<Panel | null>(null);
  const [editPanelFormLoading, setEditPanelFormLoading] = useState(false);

  const {
    register: registerEditPanel,
    handleSubmit: handleSubmitEditPanel,
    reset: resetEditPanel,
    setValue: setEditPanelValue,
    formState: { errors: editPanelErrors },
  } = useForm<EditPanelFormData>({ resolver: zodResolver(editPanelSchema) });

  const {
    companies,
    reloadCompanies,
    loading: companiesLoading,
  } = useCompanies();
  const [editingCompanyData, setEditingCompanyData] = useState<Company | null>(
    null,
  );
  const [editCompanyFormLoading, setEditCompanyFormLoading] = useState(false);
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [deleteCompanyModalState, setDeleteCompanyModalState] = useState<{
    isOpen: boolean;
    step: 1 | 2;
    company: Company | null;
    associatedUsers: User[];
    deleteUsersAlso: boolean;
  }>({
    isOpen: false,
    step: 1,
    company: null,
    associatedUsers: [],
    deleteUsersAlso: false,
  });

  const {
    register: registerEditCompany,
    handleSubmit: handleSubmitEditCompany,
    reset: resetEditCompany,
    setValue: setEditCompanyValue,
    formState: { errors: editCompanyErrors },
  } = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanySchema),
  });

  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    reset: resetCompany,
    formState: { errors: companyErrors },
  } = useForm<CompanyFormData>({ resolver: zodResolver(companySchema) });

  const handleCreateCompany = async (data: CompanyFormData) => {
    setCompanyFormLoading(true);
    try {
      await CompanyService.createCompany(data);
      setSuccess("Company created successfully");
      setCompanyFormOpen(false);
      resetCompany();
      await reloadCompanies();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to create company"));
    } finally {
      setCompanyFormLoading(false);
    }
  };

  const handleEditPanel = async (data: EditPanelFormData) => {
    if (!editingPanelData) return;
    setEditPanelFormLoading(true);
    try {
      await PanelService.updatePanel(editingPanelData.serial, {
        name: data.name,
        companyId: data.companyId || undefined,
        branchId: data.branchId || undefined,
        ipAddress: data.ipAddress?.trim() || undefined,
      });
      setSuccess("Panel updated successfully");
      setEditingPanelData(null);
      resetEditPanel();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update panel"));
    } finally {
      setEditPanelFormLoading(false);
    }
  };

  const openEditPanel = (panel: Panel) => {
    setEditingPanelData(panel);
    setEditPanelValue("name", panel.name || "");
    setEditPanelValue("companyId", panel.companyId || "");
    setEditPanelValue("branchId", panel.branchId || "");
    setEditPanelValue("ipAddress", panel.ipAddress || "");
  };

  const handleEditCompany = async (data: EditCompanyFormData) => {
    if (!editingCompanyData) return;
    setEditCompanyFormLoading(true);
    try {
      await CompanyService.updateCompany(editingCompanyData.id, data);
      setSuccess("Company updated successfully");
      setEditingCompanyData(null);
      resetEditCompany();
      await reloadCompanies();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update company"));
    } finally {
      setEditCompanyFormLoading(false);
    }
  };

  const openEditCompany = (company: Company) => {
    setEditingCompanyData(company);
    setEditCompanyValue("name", company.name);
    setEditCompanyValue("description", company.description || "");
  };

  const startDeleteCompany = (company: Company) => {
    const associatedUsers = users.filter((u) => u.companyId === company.id);
    setDeleteCompanyModalState({
      isOpen: true,
      step: 1,
      company,
      associatedUsers,
      deleteUsersAlso: false,
    });
  };

  const confirmDeleteCompany = async () => {
    const { company, deleteUsersAlso } = deleteCompanyModalState;
    if (!company) return;

    try {
      await CompanyService.deleteCompany(company.id, deleteUsersAlso);
      setSuccess("Company deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
      await reloadCompanies();
      await loadUsers();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete company"));
    } finally {
      setDeleteCompanyModalState((prev) => ({ ...prev, isOpen: false }));
    }
  };
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!panels || panels.length === 0 || syncingPanelDefaults) return;
    const panelsMissingCommands = panels.filter(
      (panel) =>
        !Array.isArray(panel.allowedCommands) ||
        panel.allowedCommands.length === 0,
    );
    if (panelsMissingCommands.length > 0) {
      setSyncingPanelDefaults(true);
      Promise.all(
        panelsMissingCommands.map((panel) =>
          PanelService.updatePanel(panel.serial, {
            allowedCommands: [...DEFAULT_PANEL_COMMANDS],
          }),
        ),
      )
        .then(() => {
          setSuccess(
            `Applied default controls to ${panelsMissingCommands.length} panel${panelsMissingCommands.length === 1 ? "" : "s"}`,
          );
          setTimeout(() => setSuccess(null), 3000);
        })
        .catch((err) => {
          console.error("Failed to sync default commands", err);
        })
        .finally(() => {
          setSyncingPanelDefaults(false);
        });
    }
  }, [panels, syncingPanelDefaults]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await UserService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleGlobalRefresh = async () => {
    await loadUsers();
  };

  const handleCreateUser = async (data: UserFormData) => {
    setUserFormLoading(true);
    setError(null);
    try {
      const branchIds = data.branchIds
        ? data.branchIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
      await UserService.createUser({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        role: data.role,
        companyId: data.companyId,
        branchIds,
      });
      setUserFormOpen(false);
      resetUser();
      await loadUsers();
      setSuccess("User created successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to create user"));
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleEditUser = async (data: EditUserFormData) => {
    if (!editingUserData) return;
    setEditUserFormLoading(true);
    setError(null);
    try {
      const branchIds = data.branchIds
        ? data.branchIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
      await UserService.updateUser(editingUserData.uid, {
        displayName: data.displayName,
        email: data.email,
        password: data.password || undefined,
        role: data.role,
        companyId: data.companyId,
        branchIds,
      });
      setEditingUserData(null);
      resetEditUser();
      await loadUsers();
      setSuccess("User updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update user"));
    } finally {
      setEditUserFormLoading(false);
    }
  };

  const openEditUser = (user: User) => {
    setEditingUserData(user);
    setEditUserValue("displayName", user.displayName || "");
    setEditUserValue("email", user.email || "");
    setEditUserValue("role", user.role);
    setEditUserValue("companyId", user.companyId || "");
    setEditUserValue(
      "branchIds",
      Array.isArray(user.branchIds)
        ? user.branchIds.join(", ")
        : String(user.branchIds || ""),
    );
    setEditUserValue("password", "");
  };

  const handleCreatePanel = async (data: PanelFormData) => {
    setPanelFormLoading(true);
    setError(null);
    try {
      await PanelService.createPanel({
        serial: data.serial,
        name: data.name,
        zoneCount: data.zoneCount,
        companyId: data.companyId,
        branchId: data.branchId,
        ipAddress: data.ipAddress?.trim() || undefined,
        allowedCommands: normalizeAllowedCommands(),
      });
      setPanelFormOpen(false);
      reset();
      setSuccess("Panel created successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to create panel"));
    } finally {
      setPanelFormLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Delete this user? Their account will be disabled."))
      return;

    setError(null);
    try {
      await UserService.deleteUser(uid);
      await loadUsers();
      setSuccess("User deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete user"));
    }
  };

  const handleDeletePanel = async (serial: string) => {
    if (!window.confirm(`Delete panel ${serial}?`)) return;

    setError(null);
    try {
      await PanelService.deletePanel(serial);
      setSuccess("Panel deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete panel"));
    }
  };

  // Mock function for panel heartbeat
  const getPanelHeartbeat = (serial: string) => {
    const hash = serial
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const times = ["Just now", "15s ago", "42s ago", "1m ago"];
    return times[hash % times.length];
  };

  return (
    <div className="animate-fade-in p-4 sm:p-5 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-end sm:justify-between mb-6">
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#4ade80]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]"></span>
            </span>
            Live telemetry
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#7a7773]">Synced 12s ago</span>
          <button
            onClick={handleGlobalRefresh}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-white/[0.08] bg-transparent text-white/50 transition-all duration-150 hover:border-white/[0.15] hover:text-white"
          >
            <RefreshCw
              className={`h-[18px] w-[18px] ${usersLoading || panelsLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="animate-fade-in mb-6 flex items-center gap-3 rounded-[10px] border border-red-300/25 bg-red-500/10 p-4 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-200" />
          <p className="text-[13px] text-red-100">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] text-red-200/80 transition-all duration-200 ease-out hover:bg-red-500/20 hover:text-red-100"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="animate-fade-in mb-6 flex items-center gap-3 rounded-[10px] border border-emerald-300/25 bg-emerald-400/10 p-4 shadow-sm">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-200" />
          <p className="text-[13px] text-emerald-100">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] text-emerald-200/80 transition-all duration-200 ease-out hover:bg-emerald-500/20 hover:text-emerald-100"
            aria-label="Dismiss success"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 🏢 Company Management 🏢 */}
      {hasRole(["super_admin"]) && (
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50 font-medium whitespace-nowrap">
              Company Management
            </h2>
            <button
              onClick={() => setCompanyFormOpen(true)}
              className="flex h-[32px] items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-transparent px-[12px] text-[12px] text-[#f0ede8] transition-all hover:bg-white/[0.04]"
            >
              <Plus className="h-[14px] w-[14px]" />
              Add Company
            </button>
          </div>
          <div className="h-[0.5px] w-full bg-white/[0.06] mb-4" />

          {/* Company creation form */}
          {companyFormOpen && (
            <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-white/[0.06] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-balance text-[15px] font-bold text-[#f0ede8]">
                  Create Company
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCompanyFormOpen(false);
                    resetCompany();
                  }}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-[#f0ede8]"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmitCompany(handleCreateCompany)}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Company Name
                  </label>
                  <input
                    {...registerCompany("name")}
                    placeholder="e.g. Acme Corp"
                    className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                    disabled={companyFormLoading}
                  />
                  {companyErrors.name && (
                    <p className="mt-1 text-[12px] text-red-400">
                      {companyErrors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Description
                  </label>
                  <textarea
                    {...registerCompany("description")}
                    className="control-field w-full rounded-[6px] px-3 py-2 text-[13px] resize-none"
                    rows={3}
                    disabled={companyFormLoading}
                    placeholder="Optional details about this company"
                  />
                  {companyErrors.description && (
                    <p className="mt-1 text-[12px] text-red-400">
                      {companyErrors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={companyFormLoading}
                    className="flex h-[36px] items-center justify-center rounded-[6px] bg-[#f0ede8] px-5 text-[13px] font-medium text-[#1a1816] transition-colors hover:bg-white disabled:opacity-50"
                  >
                    {companyFormLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Company"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {companiesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-[#f0ede8] opacity-50" />
            </div>
          ) : companies.length === 0 ? (
            <div className="rounded-[10px] border border-white/[0.08] bg-[#1a1816] p-6 text-center text-[13px] text-[#7a7773]">
              No companies found.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between bg-[#1a1917] rounded-[8px] border border-white/[0.06] p-3 hover:bg-white/[0.02] transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[13px] font-medium text-white/90"
                      style={{ backgroundColor: getAvatarColor(company.name) }}
                    >
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-[#f0ede8]">
                          {company.name}
                        </span>
                        <span className="shrink-0 rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[#7a7773]">
                          {company.id}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[#7a7773]">
                        {company.description || "No description"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditCompany(company)}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] hover:bg-white/[0.04] hover:text-[#f0ede8] transition-colors"
                      aria-label="Edit company"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startDeleteCompany(company)}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                      aria-label="Delete company"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 👥 User Management 👥 */}
      <div className="mb-7">
        {/* Section Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50 font-medium whitespace-nowrap">
            User Management
          </h2>
          <button
            onClick={() => setUserFormOpen(true)}
            className="flex h-[32px] items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-transparent px-[12px] text-[12px] text-[#f0ede8] transition-all hover:bg-white/[0.04]"
          >
            <Plus className="h-[14px] w-[14px]" />
            Add User
          </button>
        </div>
        <div className="h-[0.5px] w-full bg-white/[0.06] mb-4" />

        {/* User creation form */}
        {userFormOpen && (
          <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-balance text-[15px] font-bold text-[#f0ede8]">
                Create User
              </h3>
              <button
                type="button"
                onClick={() => {
                  setUserFormOpen(false);
                  resetUser();
                }}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-[#f0ede8]"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitUser(handleCreateUser)}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-[13px] text-[#7a7773]">
                  Display Name
                </label>
                <input
                  {...registerUser("displayName")}
                  placeholder="Full name"
                  className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                />
                {userErrors.displayName && (
                  <p className="mt-1.5 text-[12px] text-red-400">
                    {userErrors.displayName.message}
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Email
                  </label>
                  <input
                    {...registerUser("email")}
                    placeholder="user@example.com"
                    className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                  />
                  {userErrors.email && (
                    <p className="mt-1.5 text-[12px] text-red-400">
                      {userErrors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Password
                  </label>
                  <input
                    {...registerUser("password")}
                    type="password"
                    placeholder="Min. 6 characters"
                    className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                  />
                  {userErrors.password && (
                    <p className="mt-1.5 text-[12px] text-red-400">
                      {userErrors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Role
                  </label>
                  <select
                    {...registerUser("role")}
                    className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                  >
                    <option value="end_user">End User</option>
                    {hasRole(["super_admin", "head_office"]) && (
                      <option value="system_integrator">
                        System Integrator
                      </option>
                    )}
                    {hasRole(["super_admin"]) && (
                      <option value="head_office">Head Office</option>
                    )}
                    {hasRole(["super_admin"]) && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </div>
                {hasRole(["super_admin"]) && (
                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      Company ID
                    </label>
                    <input
                      {...registerUser("companyId")}
                      placeholder="Optional"
                      className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[13px] text-[#7a7773]">
                  Branch IDs
                </label>
                <input
                  {...registerUser("branchIds")}
                  placeholder="Comma separated, e.g. branch-1, branch-2"
                  className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={userFormLoading}
                  className="flex h-[32px] items-center rounded-[6px] border border-white/[0.08] bg-white/[0.04] px-[16px] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {userFormLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User list */}
        {usersLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#7a7773]" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <div
                key={user.uid}
                className="flex items-center justify-between bg-[#1a1917] rounded-[8px] border border-white/[0.06] p-3 hover:bg-white/[0.02] transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[13px] font-medium text-white/90"
                    style={{
                      backgroundColor: getAvatarColor(
                        user.displayName || user.email,
                      ),
                    }}
                  >
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-[#f0ede8]">
                        {user.displayName || "Unknown User"}
                      </span>
                      <span className="shrink-0 rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[#7a7773]">
                        {roleLabels[user.role as Role] || "User"}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[#7a7773]">
                      {user.email || "No email"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditUser(user)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] hover:bg-white/[0.04] hover:text-[#f0ede8] transition-colors"
                    aria-label="Edit user"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.uid)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                    aria-label="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Company modal overlay */}
      {editingCompanyData && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingCompanyData(null)}
          />
          <div className="fixed left-1/2 top-[calc(60%+36px)] sm:top-1/2 z-[101] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <div
              className="animate-slide-up bg-[#141412] relative w-full max-h-[85vh] overflow-y-auto rounded-[16px] border border-white/[0.06] shadow-2xl box-border"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="p-[20px] sm:p-7">
                <div className="mb-5 sm:mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-[18px] font-bold text-[#f0ede8]">
                      Edit Company
                    </h3>
                    <p className="mt-1 text-[13px] text-[#7a7773]">
                      Update company details
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingCompanyData(null)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] transition-all duration-200 hover:bg-white/[0.06] hover:text-[#f0ede8]"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmitEditCompany(handleEditCompany)}
                  className="space-y-4 [@media(max-height:380px)]:space-y-3 sm:space-y-5"
                >
                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      Company Name
                    </label>
                    <input
                      {...registerEditCompany("name")}
                      placeholder="e.g. Acme Corp"
                      className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                      disabled={editCompanyFormLoading}
                    />
                    {editCompanyErrors.name && (
                      <p className="mt-1 text-[12px] text-red-400">
                        {editCompanyErrors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      Description
                    </label>
                    <textarea
                      {...registerEditCompany("description")}
                      className="control-field w-full rounded-[6px] px-3 py-2 text-[13px] resize-none"
                      rows={3}
                      disabled={editCompanyFormLoading}
                      placeholder="Optional details about this company"
                    />
                    {editCompanyErrors.description && (
                      <p className="mt-1 text-[12px] text-red-400">
                        {editCompanyErrors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingCompanyData(null)}
                      className="flex h-[32px] items-center rounded-[6px] px-[16px] text-[13px] text-[#7a7773] hover:text-[#f0ede8]"
                      disabled={editCompanyFormLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editCompanyFormLoading}
                      className="flex h-[32px] items-center rounded-[6px] border border-white/[0.08] bg-white/[0.04] px-[16px] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {editCompanyFormLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User modal overlay */}
      {editingUserData && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingUserData(null)}
          />
          <div className="fixed left-1/2 top-[calc(60%+36px)] sm:top-1/2 z-[101] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <div
              className="animate-slide-up bg-[#141412] relative w-full max-h-[85vh] overflow-y-auto rounded-[16px] border border-white/[0.06] shadow-2xl box-border"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="p-[20px] sm:p-7">
                <div className="mb-5 sm:mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-[18px] font-bold text-[#f0ede8]">
                      Edit User
                    </h3>
                    <p className="mt-1 text-[13px] text-[#7a7773]">
                      Update user profile and permissions
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingUserData(null)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] transition-all duration-200 hover:bg-white/[0.06] hover:text-[#f0ede8]"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmitEditUser(handleEditUser)}
                  className="space-y-4 [@media(max-height:380px)]:space-y-3 sm:space-y-5"
                >
                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      Display Name
                    </label>
                    <input
                      {...registerEditUser("displayName")}
                      placeholder="Full name"
                      className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                      disabled={editUserFormLoading}
                    />
                    {editUserErrors.displayName && (
                      <p className="mt-1 text-[12px] text-red-400">
                        {editUserErrors.displayName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[13px] text-[#7a7773]">
                        Email
                      </label>
                      <input
                        {...registerEditUser("email")}
                        placeholder="user@example.com"
                        className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                        disabled={editUserFormLoading}
                      />
                      {editUserErrors.email && (
                        <p className="mt-1 text-[12px] text-red-400">
                          {editUserErrors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] text-[#7a7773]">
                        New Password
                      </label>
                      <input
                        {...registerEditUser("password")}
                        type="password"
                        placeholder="Leave blank to keep"
                        className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                        disabled={editUserFormLoading}
                      />
                      {editUserErrors.password && (
                        <p className="mt-1 text-[12px] text-red-400">
                          {editUserErrors.password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[13px] text-[#7a7773]">
                        Role
                      </label>
                      <select
                        {...registerEditUser("role")}
                        className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                        disabled={editUserFormLoading}
                      >
                        <option value="end_user">End User</option>
                        {hasRole(["super_admin", "head_office"]) && (
                          <option value="system_integrator">
                            System Integrator
                          </option>
                        )}
                        {hasRole(["super_admin"]) && (
                          <option value="head_office">Head Office</option>
                        )}
                        {hasRole(["super_admin"]) && (
                          <option value="super_admin">Super Admin</option>
                        )}
                      </select>
                    </div>
                    {hasRole(["super_admin"]) && (
                      <div>
                        <label className="mb-2 block text-[13px] text-[#7a7773]">
                          Company ID
                        </label>
                        <input
                          {...registerEditUser("companyId")}
                          placeholder="Optional"
                          className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                          disabled={editUserFormLoading}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      Branch IDs
                    </label>
                    <input
                      {...registerEditUser("branchIds")}
                      placeholder="Comma separated"
                      className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                      disabled={editUserFormLoading}
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingUserData(null)}
                      className="flex h-[32px] items-center rounded-[6px] px-[16px] text-[13px] text-[#7a7773] hover:text-[#f0ede8]"
                      disabled={editUserFormLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editUserFormLoading}
                      className="flex h-[32px] items-center rounded-[6px] border border-white/[0.08] bg-white/[0.04] px-[16px] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {editUserFormLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Panel modal overlay */}
      {editingPanelData && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingPanelData(null)}
          />
          <div className="fixed left-1/2 top-[calc(60%+36px)] sm:top-1/2 z-[101] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <div
              className="animate-slide-up bg-[#141412] relative w-full max-h-[85vh] overflow-y-auto rounded-[16px] border border-white/[0.06] shadow-2xl box-border"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="p-[20px] sm:p-7">
                <div className="mb-5 sm:mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-[18px] font-bold text-[#f0ede8]">
                      Edit Panel
                    </h3>
                    <p className="mt-1 text-[13px] text-[#7a7773]">
                      Update panel details
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingPanelData(null)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] transition-all duration-200 hover:bg-white/[0.06] hover:text-[#f0ede8]"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmitEditPanel(handleEditPanel)}
                  className="space-y-4 [@media(max-height:380px)]:space-y-3 sm:space-y-5"
                >
                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      Panel Name
                    </label>
                    <input
                      {...registerEditPanel("name")}
                      placeholder="Building A - Floor 1"
                      className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                      disabled={editPanelFormLoading}
                    />
                    {editPanelErrors.name && (
                      <p className="mt-1 text-[12px] text-red-400">
                        {editPanelErrors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[13px] text-[#7a7773]">
                        Company ID
                      </label>
                      <input
                        {...registerEditPanel("companyId")}
                        placeholder="Optional"
                        className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                        disabled={editPanelFormLoading}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] text-[#7a7773]">
                        Branch ID
                      </label>
                      <input
                        {...registerEditPanel("branchId")}
                        placeholder="Optional"
                        className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                        disabled={editPanelFormLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] text-[#7a7773]">
                      IP Address
                    </label>
                    <input
                      {...registerEditPanel("ipAddress")}
                      placeholder="e.g., 72.167.225.142"
                      className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                      disabled={editPanelFormLoading}
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingPanelData(null)}
                      className="flex h-[32px] items-center rounded-[6px] px-[16px] text-[13px] text-[#7a7773] hover:text-[#f0ede8]"
                      disabled={editPanelFormLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editPanelFormLoading}
                      className="flex h-[32px] items-center rounded-[6px] border border-white/[0.08] bg-white/[0.04] px-[16px] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {editPanelFormLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel Provisioning ──────────────────────────────────────────── */}
      <div>
        {/* Section Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50 font-medium whitespace-nowrap">
              Panel Provisioning
            </h2>
            <span className="hidden sm:inline-block text-[12px] text-[#7a7773]">
              {!panelsLoading &&
                `${panels.filter(Boolean).length} of ${panels.length} panels online`}
            </span>
          </div>
          <button
            onClick={() => setPanelFormOpen(true)}
            className="flex h-[32px] items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-transparent px-[12px] text-[12px] text-[#f0ede8] transition-all hover:bg-white/[0.04]"
          >
            <Plus className="h-[14px] w-[14px]" />
            Add Panel
          </button>
        </div>
        <div className="h-[0.5px] w-full bg-white/[0.06] mb-4" />

        {/* Panel Provisioning form */}
        {panelFormOpen && (
          <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-balance text-[15px] font-bold text-[#f0ede8]">
                Provision Panel
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPanelFormOpen(false);
                  reset();
                }}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-[#f0ede8]"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(handleCreatePanel)}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-[13px] text-[#7a7773]">
                  Serial Number
                </label>
                <input
                  {...register("serial")}
                  className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                    errors.serial ? "border-red-400/70" : ""
                  }`}
                  placeholder="e.g., FP-2024-001"
                  disabled={panelFormLoading}
                />
                {errors.serial && (
                  <p className="mt-1 text-[12px] text-red-400">
                    {errors.serial.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[13px] text-[#7a7773]">
                  Panel Name
                </label>
                <input
                  {...register("name")}
                  className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                    errors.name ? "border-red-400/70" : ""
                  }`}
                  placeholder="e.g., Building A - Floor 1"
                  disabled={panelFormLoading}
                />
                {errors.name && (
                  <p className="mt-1 text-[12px] text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[13px] text-[#7a7773]">
                  Number of Zones (1-8)
                </label>
                <input
                  type="number"
                  {...register("zoneCount")}
                  className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                    errors.zoneCount ? "border-red-400/70" : ""
                  }`}
                  placeholder="8"
                  min={1}
                  max={8}
                  disabled={panelFormLoading}
                />
                {errors.zoneCount && (
                  <p className="mt-1 text-[12px] text-red-400">
                    {errors.zoneCount.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Company ID
                  </label>
                  <input
                    {...register("companyId")}
                    className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                      errors.companyId ? "border-red-400/70" : ""
                    }`}
                    placeholder="e.g., company-a"
                    disabled={panelFormLoading}
                  />
                  {errors.companyId && (
                    <p className="mt-1 text-[12px] text-red-400">
                      {errors.companyId.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-[13px] text-[#7a7773]">
                    Branch ID
                  </label>
                  <input
                    {...register("branchId")}
                    className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                      errors.branchId ? "border-red-400/70" : ""
                    }`}
                    placeholder="e.g., branch-a"
                    disabled={panelFormLoading}
                  />
                  {errors.branchId && (
                    <p className="mt-1 text-[12px] text-red-400">
                      {errors.branchId.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-2 block text-[13px] text-[#7a7773]">
                  IP Address (Default is autofilled)
                </label>
                <input
                  {...register("ipAddress")}
                  className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                    errors.ipAddress ? "border-red-400/70" : ""
                  }`}
                  placeholder="e.g., 72.167.225.142"
                  disabled={panelFormLoading}
                />
                {errors.ipAddress && (
                  <p className="mt-1 text-[12px] text-red-400">
                    {errors.ipAddress.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={panelFormLoading}
                  className="flex h-[36px] items-center justify-center rounded-[6px] bg-[#f0ede8] px-5 text-[13px] font-medium text-[#1a1816] transition-colors hover:bg-white disabled:opacity-50"
                >
                  {panelFormLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Panel"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {panelsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#7a7773]" />
          </div>
        ) : panels.length === 0 ? (
          <p className="text-[13px] text-[#7a7773]">
            No panels provisioned yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {(panels || []).filter(Boolean).map((panel) => {
              const isAlarm = panel.zones?.some((z) => z);
              const statusColor = isAlarm ? "bg-red-500" : "bg-emerald-500";
              return (
                <div
                  key={panel.serial || Math.random().toString()}
                  className="flex items-center justify-between bg-[#1a1917] rounded-[8px] border border-white/[0.06] p-3 hover:bg-white/[0.02] transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-white/[0.05]">
                      <div
                        className={`h-[8px] w-[8px] rounded-full ${statusColor}`}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-[#f0ede8]">
                          {panel.name || "Unknown Panel"}
                        </span>
                        <span className="shrink-0 rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[#7a7773]">
                          {panel.serial || "No serial"}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[#7a7773]">
                        Last active: {getPanelHeartbeat(panel.serial)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditPanel(panel)}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#7a7773] hover:bg-white/[0.04] hover:text-[#f0ede8] transition-colors"
                      aria-label="Edit panel"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {hasRole([
                      "super_admin",
                      "head_office",
                      "system_integrator",
                    ]) && (
                      <button
                        onClick={() => handleDeletePanel(panel.serial)}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                        aria-label="Delete panel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🛑 Delete Company Modal 🛑 */}
      {deleteCompanyModalState.isOpen && deleteCompanyModalState.company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[12px] border border-white/[0.08] bg-[#1a1917] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <h3 className="text-[15px] font-medium text-[#f0ede8]">
                Delete Company
              </h3>
              <button
                onClick={() =>
                  setDeleteCompanyModalState((prev) => ({
                    ...prev,
                    isOpen: false,
                  }))
                }
                className="text-[#7a7773] hover:text-[#f0ede8] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5 text-[13px] text-[#f0ede8]">
              {deleteCompanyModalState.step === 1 ? (
                <>
                  <p className="mb-4">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold">
                      {deleteCompanyModalState.company.name}
                    </span>
                    ?
                  </p>
                  <p className="mb-4 text-[#7a7773]">
                    There are{" "}
                    <span className="text-[#f0ede8] font-medium">
                      {
                        (panels || []).filter(
                          (p) =>
                            p &&
                            p.companyId === deleteCompanyModalState.company?.id,
                        ).length
                      }
                    </span>{" "}
                    panels associated with this company that will also be
                    deleted.
                  </p>
                  {deleteCompanyModalState.associatedUsers.length > 0 && (
                    <div className="mt-4 border border-white/[0.08] rounded-[8px] p-4 bg-white/[0.02]">
                      <p className="mb-3 font-medium">Users</p>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded-[4px] border-white/[0.2] bg-white/[0.05] text-[#d4a373] focus:ring-[#d4a373] focus:ring-offset-0"
                          checked={deleteCompanyModalState.deleteUsersAlso}
                          onChange={(e) =>
                            setDeleteCompanyModalState((prev) => ({
                              ...prev,
                              deleteUsersAlso: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-[#7a7773]">
                          Also delete all{" "}
                          {deleteCompanyModalState.associatedUsers.length} users
                          associated with this company.
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() =>
                        setDeleteCompanyModalState((prev) => ({
                          ...prev,
                          isOpen: false,
                        }))
                      }
                      className="px-4 py-2 text-[13px] text-[#7a7773] hover:text-[#f0ede8] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (deleteCompanyModalState.deleteUsersAlso) {
                          setDeleteCompanyModalState((prev) => ({
                            ...prev,
                            step: 2,
                          }));
                        } else {
                          confirmDeleteCompany();
                        }
                      }}
                      className="px-4 py-2 rounded-[6px] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium"
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4 text-red-400 font-medium">
                    Warning: The following users will be permanently deleted:
                  </p>
                  <div className="max-h-[200px] overflow-y-auto mb-4 border border-white/[0.08] rounded-[6px] bg-white/[0.02]">
                    {deleteCompanyModalState.associatedUsers.map((u) => (
                      <div
                        key={u.uid}
                        className="px-3 py-2 border-b border-white/[0.04] last:border-0"
                      >
                        <div className="font-medium">
                          {u.displayName || "Unknown User"}
                        </div>
                        <div className="text-[11px] text-[#7a7773]">
                          {u.email}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mb-4">
                    Are you completely sure you wish to proceed?
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() =>
                        setDeleteCompanyModalState((prev) => ({
                          ...prev,
                          step: 1,
                        }))
                      }
                      className="px-4 py-2 text-[13px] text-[#7a7773] hover:text-[#f0ede8] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={confirmDeleteCompany}
                      className="px-4 py-2 rounded-[6px] bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                    >
                      Confirm Delete All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
