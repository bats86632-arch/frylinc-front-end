import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserService } from "../api/UserService";
import { PanelService } from "../api/PanelService";
import { usePanels } from "../hooks/usePanels";
import { User, Role, Panel, Branch } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { CompanyService, Company } from "../api/CompanyService";
import { BranchService } from "../api/BranchService";
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
  Copy,
  Search,
  Building2,
  Users,
  Cpu,
  ArrowRight,
  ChevronLeft,
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

const branchSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Branch name is required"),
  address: z.string().optional(),
  supervisorName: z.string().optional(),
  contactNumber: z.string().optional(),
  emailAddress: z.string().optional(),
});

const editCompanySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  branches: z.array(branchSchema).optional(),
});
type EditCompanyFormData = z.infer<typeof editCompanySchema>;

const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  branches: z.array(branchSchema).optional(),
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
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [panelSearchQuery, setPanelSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"companies" | "users" | "panels" | null>(null);
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
    watch,
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
    watch: watchUser,
    setValue: setUserValue,
    formState: { errors: userErrors },
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema) });

  const {
    register: registerEditUser,
    handleSubmit: handleSubmitEditUser,
    reset: resetEditUser,
    setValue: setEditUserValue,
    watch: watchEditUser,
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
    watch: watchEditPanel,
    formState: { errors: editPanelErrors },
  } = useForm<EditPanelFormData>({ resolver: zodResolver(editPanelSchema) });

  const { branches, loading: branchesLoading, reloadBranches } = useBranches();

  // Watch form values for dependent dropdowns
  const watchedPanelCompanyId = watch("companyId");
  const watchedEditPanelCompanyId = watchEditPanel("companyId");
  const watchedUserCompanyId = watchUser("companyId") || "";
  const watchedUserBranchIds = watchUser("branchIds") || "";
  const watchedEditUserBranchIds = watchEditUser("branchIds") || "";
  const watchedEditUserCompanyId = watchEditUser("companyId") || "";

  // Helper: get branches filtered by company, or all if no company specified
  const getBranchesForCompany = (companyId: string): Branch[] => {
    if (!companyId) return branches;
    return branches.filter((b) => b.companyId === companyId);
  };

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
    control: controlEditCompany,
    formState: { errors: editCompanyErrors },
  } = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanySchema),
  });

  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    reset: resetCompany,
    control: controlCompany,
    formState: { errors: companyErrors },
  } = useForm<CompanyFormData>({ resolver: zodResolver(companySchema) });

  const {
    fields: createCompanyBranches,
    append: appendCreateCompanyBranch,
    remove: removeCreateCompanyBranch,
  } = useFieldArray({
    control: controlCompany,
    name: "branches",
  });

  const {
    fields: editCompanyBranches,
    append: appendEditCompanyBranch,
    remove: removeEditCompanyBranch,
  } = useFieldArray({
    control: controlEditCompany,
    name: "branches",
  });

  const handleCreateCompany = async (data: CompanyFormData) => {
    setCompanyFormLoading(true);
    try {
      const company = await CompanyService.createCompany({ name: data.name, description: data.description });
      
      // Create branches if any
      if (data.branches && data.branches.length > 0) {
        await Promise.all(
          data.branches.map(branch => 
            BranchService.createBranch({
              ...branch,
              companyId: company.id
            })
          )
        );
      }
      
      setSuccess("Company and branches created successfully");
      setCompanyFormOpen(false);
      resetCompany();
      await reloadCompanies();
      await reloadBranches();
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
      await CompanyService.updateCompany(editingCompanyData.id, {
        name: data.name,
        description: data.description,
      });

      // Handle branches
      if (data.branches) {
        // Find existing branches for this company
        const existingBranches = branches.filter(b => b.companyId === editingCompanyData.id);

        const submittedBranchIds = new Set(data.branches.filter(b => b.id).map(b => b.id));

        // Delete branches that were removed
        const branchesToDelete = existingBranches.filter(b => !submittedBranchIds.has(b.id));
        await Promise.all(branchesToDelete.map(b => BranchService.deleteBranch(b.id)));

        // Create or update branches
        await Promise.all(
          data.branches.map(branch => {
            if (branch.id) {
              return BranchService.updateBranch(branch.id, branch);
            } else {
              return BranchService.createBranch({
                ...branch,
                companyId: editingCompanyData.id
              });
            }
          })
        );
      }

      setSuccess("Company and branches updated successfully");
      setEditingCompanyData(null);
      resetEditCompany();
      await reloadCompanies();
      await reloadBranches();
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
    const companyBranches = branches.filter((b) => b.companyId === company.id);
    setEditCompanyValue("branches", companyBranches);
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
    UserService.invalidateCache();
    CompanyService.invalidateCache();
    BranchService.invalidateCache();
    await Promise.all([
      loadUsers(),
      reloadCompanies(),
      reloadBranches(),
    ]);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setSuccess("ID copied to clipboard");
    setTimeout(() => setSuccess(null), 3000);
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

  const filteredCompanies = (companies || []).filter(
    (c) =>
      c.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(companySearchQuery.toLowerCase())
  );

  const filteredUsers = (users || []).filter(
    (u) =>
      (u.displayName || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredPanels = (panels || []).filter(
    (p) =>
      (p.name || "").toLowerCase().includes(panelSearchQuery.toLowerCase()) ||
      (p.serial || "").toLowerCase().includes(panelSearchQuery.toLowerCase()) ||
      (p.ipAddress || "").toLowerCase().includes(panelSearchQuery.toLowerCase())
  );

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
          <span className="text-[11px] text-[var(--text-secondary)]">Synced 12s ago</span>
          <button
            onClick={handleGlobalRefresh}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-[var(--border-subtle)] bg-transparent text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
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

      {/* ── Hero Cards Grid ──────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Company Management Card */}
        {hasRole(["super_admin"]) && (
          <button
            onClick={() => setActiveSection("companies")}
            className="admin-hero-card surface-panel rounded-[16px] p-6 text-left group"
          >
            <div className="admin-hero-glow bg-amber-500 -top-10 -left-10" />
            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20">
                  <Building2 className="h-6 w-6 text-amber-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-[var(--text-secondary)] transition-all duration-200 group-hover:text-[var(--text-primary)] group-hover:translate-x-1" />
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] mb-1.5">
                Company Management
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
                Create, edit, and manage companies and their branch structures.
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                    {companiesLoading ? "—" : companies.length}
                  </span>
                </div>
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {companiesLoading ? "Loading…" : "companies registered"}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* User Management Card */}
        <button
          onClick={() => setActiveSection("users")}
          className="admin-hero-card surface-panel rounded-[16px] p-6 text-left group"
        >
          <div className="admin-hero-glow bg-sky-500 -top-10 -right-10" />
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/20">
                <Users className="h-6 w-6 text-sky-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-secondary)] transition-all duration-200 group-hover:text-[var(--text-primary)] group-hover:translate-x-1" />
            </div>
            <h3 className="text-[17px] font-bold text-[var(--text-primary)] mb-1.5">
              User Management
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
              Manage user accounts, assign roles, and configure branch access.
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-40 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {usersLoading ? "—" : users.length}
                </span>
              </div>
              <span className="text-[12px] text-[var(--text-secondary)]">
                {usersLoading ? "Loading…" : "users active"}
              </span>
            </div>
          </div>
        </button>

        {/* Panel Provisioning Card */}
        <button
          onClick={() => setActiveSection("panels")}
          className="admin-hero-card surface-panel rounded-[16px] p-6 text-left group"
        >
          <div className="admin-hero-glow bg-emerald-500 -bottom-10 -right-10" />
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                <Cpu className="h-6 w-6 text-emerald-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-secondary)] transition-all duration-200 group-hover:text-[var(--text-primary)] group-hover:translate-x-1" />
            </div>
            <h3 className="text-[17px] font-bold text-[var(--text-primary)] mb-1.5">
              Panel Provisioning
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
              Register new panels, assign them to branches, and track status.
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {panelsLoading ? "—" : panels.length}
                </span>
              </div>
              <span className="text-[12px] text-[var(--text-secondary)]">
                {panelsLoading ? "Loading…" : `panels provisioned`}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* OVERLAY DRAWERS                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Company Management Overlay ────────────────────────────────────── */}
      {activeSection === "companies" && createPortal(
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md admin-overlay-backdrop"
            onClick={() => setActiveSection(null)}
          />
          <div className="fixed inset-x-0 bottom-0 top-[6vh] sm:inset-x-[5vw] sm:top-[8vh] sm:bottom-[4vh] z-[201] flex flex-col admin-overlay-drawer">
            <div
              className="flex flex-col flex-1 min-h-0 bg-[var(--surface-overlay)] rounded-t-[20px] sm:rounded-[20px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
            >
              {/* Sticky header */}
              <div className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-5 sm:px-7 py-4 bg-[var(--surface-overlay)]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20">
                    <Building2 className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Company Management</h2>
                    <p className="text-[11px] text-[var(--text-secondary)]">{!companiesLoading && `${companies.length} companies`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search companies..."
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      className="control-field h-[32px] w-[200px] rounded-[6px] pl-8 pr-3 text-[12px]"
                    />
                  </div>
                  <button
                    onClick={() => setCompanyFormOpen(true)}
                    className="flex h-[32px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-[12px] text-[12px] text-[var(--text-primary)] transition-all hover:bg-[var(--surface-raised)]"
                  >
                    <Plus className="h-[14px] w-[14px]" />
                    Add
                  </button>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Mobile search */}
              <div className="shrink-0 px-5 pt-3 pb-2 sm:hidden">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    className="control-field h-[32px] w-full rounded-[6px] pl-8 pr-3 text-[12px]"
                  />
                </div>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                {/* Company creation form */}
                {companyFormOpen && (
                  <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-[var(--border-subtle)] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-balance text-[15px] font-bold text-[var(--text-primary)]">
                        Create Company
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyFormOpen(false);
                          resetCompany();
                        }}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmitCompany(handleCreateCompany)}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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

                      <div className="pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-4 mt-2">
                          <h4 className="text-[13px] font-medium text-[var(--text-primary)]">
                            Branches
                            <span className="ml-2 text-[11px] text-[var(--text-secondary)] font-normal">
                              ({createCompanyBranches.length})
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => appendCreateCompanyBranch({ name: "", address: "", supervisorName: "", contactNumber: "", emailAddress: "" })}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Branch
                          </button>
                        </div>
                        
                        {createCompanyBranches.length === 0 ? (
                          <p className="text-[12px] text-[var(--text-secondary)] text-center py-4 bg-[var(--surface-base)] rounded-md border border-[var(--border-subtle)]">
                            No branches added. You can add them later.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {createCompanyBranches.map((field, index) => (
                              <div key={field.id} className="p-4 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                    Branch {index + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeCreateCompanyBranch(index)}
                                    className="flex items-center gap-1 text-[11px] text-[var(--color-error)] hover:text-red-400 p-1 rounded-md transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Branch Name *</label>
                                    <input
                                      {...registerCompany(`branches.${index}.name`)}
                                      placeholder="e.g. Headquarters"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={companyFormLoading}
                                    />
                                    {companyErrors.branches?.[index]?.name && (
                                      <p className="mt-1 text-[11px] text-red-400">
                                        {companyErrors.branches[index]?.name?.message}
                                      </p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Address</label>
                                    <input
                                      {...registerCompany(`branches.${index}.address`)}
                                      placeholder="e.g. 123 Main St, City"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={companyFormLoading}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Supervisor Name</label>
                                    <input
                                      {...registerCompany(`branches.${index}.supervisorName`)}
                                      placeholder="e.g. John Doe"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={companyFormLoading}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Contact Number</label>
                                    <input
                                      {...registerCompany(`branches.${index}.contactNumber`)}
                                      placeholder="e.g. +91 9876543210"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={companyFormLoading}
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Email Address</label>
                                    <input
                                      {...registerCompany(`branches.${index}.emailAddress`)}
                                      placeholder="e.g. branch@company.com"
                                      type="email"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={companyFormLoading}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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

                {/* Company edit form */}
                {editingCompanyData && (
                  <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-[var(--border-subtle)] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-balance text-[15px] font-bold text-[var(--text-primary)]">
                        Edit Company
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCompanyData(null);
                          resetEditCompany();
                        }}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmitEditCompany(handleEditCompany)}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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

                      <div className="pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-4 mt-2">
                          <h4 className="text-[13px] font-medium text-[var(--text-primary)]">
                            Branches
                            <span className="ml-2 text-[11px] text-[var(--text-secondary)] font-normal">
                              ({editCompanyBranches.length})
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => appendEditCompanyBranch({ name: "", address: "", supervisorName: "", contactNumber: "", emailAddress: "" })}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Branch
                          </button>
                        </div>
                        
                        {editCompanyBranches.length === 0 ? (
                          <p className="text-[12px] text-[var(--text-secondary)] text-center py-4 bg-[var(--surface-base)] rounded-md border border-[var(--border-subtle)]">
                            No branches for this company. Click "Add Branch" to create one.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {editCompanyBranches.map((field, index) => (
                              <div key={field.id} className="p-4 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                    Branch {index + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeEditCompanyBranch(index)}
                                    className="flex items-center gap-1 text-[11px] text-[var(--color-error)] hover:text-red-400 p-1 rounded-md transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Branch Name *</label>
                                    <input
                                      {...registerEditCompany(`branches.${index}.name`)}
                                      placeholder="e.g. Headquarters"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={editCompanyFormLoading}
                                    />
                                    {editCompanyErrors.branches?.[index]?.name && (
                                      <p className="mt-1 text-[11px] text-red-400">
                                        {editCompanyErrors.branches[index]?.name?.message}
                                      </p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Address</label>
                                    <input
                                      {...registerEditCompany(`branches.${index}.address`)}
                                      placeholder="e.g. 123 Main St, City"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={editCompanyFormLoading}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Supervisor Name</label>
                                    <input
                                      {...registerEditCompany(`branches.${index}.supervisorName`)}
                                      placeholder="e.g. John Doe"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={editCompanyFormLoading}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Contact Number</label>
                                    <input
                                      {...registerEditCompany(`branches.${index}.contactNumber`)}
                                      placeholder="e.g. +91 9876543210"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={editCompanyFormLoading}
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">Email Address</label>
                                    <input
                                      {...registerEditCompany(`branches.${index}.emailAddress`)}
                                      placeholder="e.g. branch@company.com"
                                      type="email"
                                      className="control-field w-full rounded-[4px] px-2 h-[30px] text-[13px]"
                                      disabled={editCompanyFormLoading}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={editCompanyFormLoading}
                          className="flex h-[36px] items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-5 text-[13px] font-medium text-[var(--surface-base)] transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {editCompanyFormLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Company"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {companiesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="surface-panel flex flex-col text-left transition-all hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] animate-fade-in-up rounded-[14px] overflow-hidden"
                      >
                        <div className="p-5 flex-1 w-full relative">
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-[15px] font-medium text-[var(--text-on-accent)] shadow-sm"
                              style={{ backgroundColor: getAvatarColor(company.name) }}
                            >
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditCompany(company)}
                                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                                aria-label="Edit company"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => startDeleteCompany(company)}
                                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)] transition-colors"
                                aria-label="Delete company"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1 truncate">
                              {company.name}
                            </h3>
                            <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 min-h-[39px]">
                              {company.description || "No description provided."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 py-3 w-full">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[10px] shrink-0 font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                              ID
                            </span>
                            <span className="font-mono truncate text-[11px] text-[var(--text-primary)]">
                              {company.id}
                            </span>
                          </div>
                          <CopyButton
                            textToCopy={company.id}
                            className="text-[var(--text-secondary)] shrink-0 ml-2 hover:text-[var(--text-primary)] transition-colors"
                            title="Copy ID"
                            onCopy={() => {
                              setSuccess("ID copied to clipboard");
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <div className="col-span-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[13px] text-[var(--text-secondary)]">
                        {companies.length === 0 ? "No companies found." : "No companies match your search."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── User Management Overlay ───────────────────────────────────────── */}
      {activeSection === "users" && createPortal(
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md admin-overlay-backdrop"
            onClick={() => setActiveSection(null)}
          />
          <div className="fixed inset-x-0 bottom-0 top-[6vh] sm:inset-x-[5vw] sm:top-[8vh] sm:bottom-[4vh] z-[201] flex flex-col admin-overlay-drawer">
            <div
              className="flex flex-col flex-1 min-h-0 bg-[var(--surface-overlay)] rounded-t-[20px] sm:rounded-[20px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
            >
              {/* Sticky header */}
              <div className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-5 sm:px-7 py-4 bg-[var(--surface-overlay)]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/20">
                    <Users className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[var(--text-primary)]">User Management</h2>
                    <p className="text-[11px] text-[var(--text-secondary)]">{!usersLoading && `${users.length} users`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="control-field h-[32px] w-[200px] rounded-[6px] pl-8 pr-3 text-[12px]"
                    />
                  </div>
                  <button
                    onClick={() => setUserFormOpen(true)}
                    className="flex h-[32px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-[12px] text-[12px] text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)]"
                  >
                    <Plus className="h-[14px] w-[14px]" />
                    Add
                  </button>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Mobile search */}
              <div className="shrink-0 px-5 pt-3 pb-2 sm:hidden">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="control-field h-[32px] w-full rounded-[6px] pl-8 pr-3 text-[12px]"
                  />
                </div>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                {/* User creation form */}
                {userFormOpen && (
                  <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-[var(--border-subtle)] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-balance text-[15px] font-bold text-[var(--text-primary)]">
                        Create User
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setUserFormOpen(false);
                          resetUser();
                        }}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmitUser(handleCreateUser)}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                          Display Name
                        </label>
                        <input
                          {...registerUser("displayName")}
                          placeholder="Full name"
                          className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                          disabled={userFormLoading}
                        />
                        {userErrors.displayName && (
                          <p className="mt-1 text-[12px] text-red-400">
                            {userErrors.displayName.message}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Email
                          </label>
                          <input
                            {...registerUser("email")}
                            placeholder="user@example.com"
                            className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                            disabled={userFormLoading}
                          />
                          {userErrors.email && (
                            <p className="mt-1 text-[12px] text-red-400">
                              {userErrors.email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Password
                          </label>
                          <input
                            {...registerUser("password")}
                            type="password"
                            placeholder="Min 6 characters"
                            className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                            disabled={userFormLoading}
                          />
                          {userErrors.password && (
                            <p className="mt-1 text-[12px] text-red-400">
                              {userErrors.password.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Role
                          </label>
                          <select
                            {...registerUser("role")}
                            className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                            disabled={userFormLoading}
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
                            <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                              Company
                            </label>
                            <select
                              {...registerUser("companyId")}
                              className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                              disabled={userFormLoading || companiesLoading}
                            >
                              <option value="">— Select a company —</option>
                              {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                          Branch Access
                        </label>
                        {branchesLoading ? (
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            Loading branches...
                          </p>
                        ) : branches.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            No branches available.
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-[150px] overflow-y-auto rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-2">
                            {getBranchesForCompany(watchedUserCompanyId).map(
                              (branch) => {
                                const currentIds = (watchedUserBranchIds || "")
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const isChecked = currentIds.includes(
                                  branch.id,
                                );
                                return (
                                  <label
                                    key={branch.id}
                                    className="flex cursor-pointer items-center gap-2.5 rounded-[4px] px-2 py-1.5 hover:bg-[var(--surface-hover)]"
                                    style={{
                                      opacity: userFormLoading ? 0.5 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={userFormLoading}
                                      onChange={(e) => {
                                        const prev = (
                                          watchedUserBranchIds || ""
                                        )
                                          .split(",")
                                          .map((s) => s.trim())
                                          .filter(Boolean);
                                        const next = e.target.checked
                                          ? [...prev, branch.id]
                                          : prev.filter(
                                              (id) => id !== branch.id,
                                            );
                                        setUserValue(
                                          "branchIds",
                                          next.join(", "),
                                        );
                                      }}
                                      className="h-4 w-4 rounded border-[var(--border-subtle)] bg-transparent accent-[#e53d3d]"
                                    />
                                    <span className="text-[13px] text-[var(--text-primary)]">
                                      {branch.name}
                                    </span>
                                    <span className="ml-auto font-mono text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
                                      {branch.id.slice(0, 8)}…
                                      <CopyButton
                                        textToCopy={branch.id}
                                        className="hover:text-[var(--text-primary)] transition-colors"
                                        title="Copy full ID"
                                        iconClassName="h-3 w-3"
                                        onCopy={() => {
                                          setSuccess("ID copied to clipboard");
                                          setTimeout(() => setSuccess(null), 3000);
                                        }}
                                      />
                                    </span>
                                  </label>
                                );
                              },
                            )}
                          </div>
                        )}
                        <input type="hidden" {...registerUser("branchIds")} />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={userFormLoading}
                          className="flex h-[36px] items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-5 text-[13px] font-medium text-[var(--surface-base)] transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {userFormLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create User"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* User edit form */}
                {editingUserData && (
                  <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-[var(--border-subtle)] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-balance text-[15px] font-bold text-[var(--text-primary)]">
                        Edit User
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserData(null);
                          resetEditUser();
                        }}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmitEditUser(handleEditUser)}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Password (leave blank to keep current)
                          </label>
                          <input
                            {...registerEditUser("password")}
                            type="password"
                            placeholder="New password (optional)"
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
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                            <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                              Company
                            </label>
                            <select
                              {...registerEditUser("companyId")}
                              className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                              disabled={editUserFormLoading || companiesLoading}
                            >
                              <option value="">— Select a company —</option>
                              {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                          Branch Access
                        </label>
                        {branchesLoading ? (
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            Loading branches...
                          </p>
                        ) : branches.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            No branches available.
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-[150px] overflow-y-auto rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-2">
                            {getBranchesForCompany(watchedEditUserCompanyId).map(
                              (branch) => {
                                const currentIds = (watchedEditUserBranchIds || "")
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const isChecked = currentIds.includes(
                                  branch.id,
                                );
                                return (
                                  <label
                                    key={branch.id}
                                    className="flex cursor-pointer items-center gap-2.5 rounded-[4px] px-2 py-1.5 hover:bg-[var(--surface-hover)]"
                                    style={{
                                      opacity: editUserFormLoading ? 0.5 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={editUserFormLoading}
                                      onChange={(e) => {
                                        const prev = (
                                          watchedEditUserBranchIds || ""
                                        )
                                          .split(",")
                                          .map((s) => s.trim())
                                          .filter(Boolean);
                                        const next = e.target.checked
                                          ? [...prev, branch.id]
                                          : prev.filter(
                                              (id) => id !== branch.id,
                                            );
                                        setEditUserValue(
                                          "branchIds",
                                          next.join(", "),
                                        );
                                      }}
                                      className="h-4 w-4 rounded border-[var(--border-subtle)] bg-transparent accent-[#e53d3d]"
                                    />
                                    <span className="text-[13px] text-[var(--text-primary)]">
                                      {branch.name}
                                    </span>
                                    <span className="ml-auto font-mono text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
                                      {branch.id.slice(0, 8)}…
                                      <CopyButton
                                        textToCopy={branch.id}
                                        className="hover:text-[var(--text-primary)] transition-colors"
                                        title="Copy full ID"
                                        iconClassName="h-3 w-3"
                                        onCopy={() => {
                                          setSuccess("ID copied to clipboard");
                                          setTimeout(() => setSuccess(null), 3000);
                                        }}
                                      />
                                    </span>
                                  </label>
                                );
                              },
                            )}
                          </div>
                        )}
                        <input type="hidden" {...registerEditUser("branchIds")} />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={editUserFormLoading}
                          className="flex h-[36px] items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-5 text-[13px] font-medium text-[var(--surface-base)] transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {editUserFormLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update User"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {usersLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.uid}
                        className="surface-panel flex flex-col text-left transition-all hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] animate-fade-in-up rounded-[14px] overflow-hidden"
                      >
                        <div className="p-5 flex-1 w-full relative">
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-[15px] font-medium text-[var(--text-on-accent)] shadow-sm"
                              style={{ backgroundColor: getAvatarColor(user.displayName || user.email || "U") }}
                            >
                              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="shrink-0 rounded-[4px] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-primary)] mr-1 border border-[var(--border-subtle)]">
                                {roleLabels[user.role as Role] || "User"}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditUser(user)}
                                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                                  aria-label="Edit user"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.uid)}
                                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)] transition-colors"
                                  aria-label="Delete user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1 truncate">
                              {user.displayName || "Unknown User"}
                            </h3>
                            <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 min-h-[39px]">
                              {user.email || "No email provided."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 py-3 w-full">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[10px] shrink-0 font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                              UID
                            </span>
                            <span className="font-mono truncate text-[11px] text-[var(--text-primary)]">
                              {user.uid}
                            </span>
                          </div>
                          <CopyButton
                            textToCopy={user.uid}
                            className="text-[var(--text-secondary)] shrink-0 ml-2 hover:text-[var(--text-primary)] transition-colors"
                            title="Copy UID"
                            onCopy={() => {
                              setSuccess("ID copied to clipboard");
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <div className="col-span-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[13px] text-[var(--text-secondary)]">
                        {users.length === 0 ? "No users found." : "No users match your search."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Panel Provisioning Overlay ─────────────────────────────────────── */}
      {activeSection === "panels" && createPortal(
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md admin-overlay-backdrop"
            onClick={() => setActiveSection(null)}
          />
          <div className="fixed inset-x-0 bottom-0 top-[6vh] sm:inset-x-[5vw] sm:top-[8vh] sm:bottom-[4vh] z-[201] flex flex-col admin-overlay-drawer">
            <div
              className="flex flex-col flex-1 min-h-0 bg-[var(--surface-overlay)] rounded-t-[20px] sm:rounded-[20px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
            >
              {/* Sticky header */}
              <div className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-5 sm:px-7 py-4 bg-[var(--surface-overlay)]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                    <Cpu className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Panel Provisioning</h2>
                    <p className="text-[11px] text-[var(--text-secondary)]">{!panelsLoading && `${panels.length} panels`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search panels..."
                      value={panelSearchQuery}
                      onChange={(e) => setPanelSearchQuery(e.target.value)}
                      className="control-field h-[32px] w-[200px] rounded-[6px] pl-8 pr-3 text-[12px]"
                    />
                  </div>
                  <button
                    onClick={() => setPanelFormOpen(true)}
                    className="flex h-[32px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-[12px] text-[12px] text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)]"
                  >
                    <Plus className="h-[14px] w-[14px]" />
                    Add
                  </button>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Mobile search */}
              <div className="shrink-0 px-5 pt-3 pb-2 sm:hidden">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search panels..."
                    value={panelSearchQuery}
                    onChange={(e) => setPanelSearchQuery(e.target.value)}
                    className="control-field h-[32px] w-full rounded-[6px] pl-8 pr-3 text-[12px]"
                  />
                </div>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                {/* Panel Provisioning form */}
                {panelFormOpen && (
                  <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-[var(--border-subtle)] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-balance text-[15px] font-bold text-[var(--text-primary)]">
                        Provision Panel
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setPanelFormOpen(false);
                          reset();
                        }}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmit(handleCreatePanel)}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Company
                          </label>
                          <select
                            {...register("companyId")}
                            className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                              errors.companyId ? "border-red-400/70" : ""
                            }`}
                            disabled={panelFormLoading || companiesLoading}
                          >
                            <option value="">— Select a company —</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          {errors.companyId && (
                            <p className="mt-1 text-[12px] text-red-400">
                              {errors.companyId.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Branch
                          </label>
                          <select
                            {...register("branchId")}
                            className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                              errors.branchId ? "border-red-400/70" : ""
                            }`}
                            disabled={panelFormLoading || branchesLoading}
                          >
                            <option value="">— Select a branch —</option>
                            {getBranchesForCompany(watchedPanelCompanyId).map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          {errors.branchId && (
                            <p className="mt-1 text-[12px] text-red-400">
                              {errors.branchId.message}
                            </p>
                          )}
                          {!watchedPanelCompanyId && (
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                              Enter a Company ID above to filter branches
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
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
                          className="flex h-[36px] items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-5 text-[13px] font-medium text-[var(--surface-base)] transition-all hover:opacity-90 disabled:opacity-50"
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

                {/* Panel edit form */}
                {editingPanelData && (
                  <div className="animate-fade-in-up surface-panel mb-6 rounded-[14px] border border-[var(--border-subtle)] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-balance text-[15px] font-bold text-[var(--text-primary)]">
                        Edit Panel
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPanelData(null);
                          resetEditPanel();
                        }}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmitEditPanel(handleEditPanel)}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                          Serial Number
                        </label>
                        <input
                          value={editingPanelData?.serial || ""}
                          readOnly
                          className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] opacity-50 cursor-not-allowed"
                          placeholder="e.g., FP-2024-001"
                          disabled={true} 
                        />
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          Serial numbers cannot be modified after creation.
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                          Panel Name
                        </label>
                        <input
                          {...registerEditPanel("name")}
                          className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                            editPanelErrors.name ? "border-red-400/70" : ""
                          }`}
                          placeholder="e.g., Building A - Floor 1"
                          disabled={editPanelFormLoading}
                        />
                        {editPanelErrors.name && (
                          <p className="mt-1 text-[12px] text-red-400">
                            {editPanelErrors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Company
                          </label>
                          <select
                            {...registerEditPanel("companyId")}
                            className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                              editPanelErrors.companyId ? "border-red-400/70" : ""
                            }`}
                            disabled={editPanelFormLoading || companiesLoading}
                          >
                            <option value="">— Select a company —</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          {editPanelErrors.companyId && (
                            <p className="mt-1 text-[12px] text-red-400">
                              {editPanelErrors.companyId.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                            Branch
                          </label>
                          <select
                            {...registerEditPanel("branchId")}
                            className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                              editPanelErrors.branchId ? "border-red-400/70" : ""
                            }`}
                            disabled={editPanelFormLoading || branchesLoading}
                          >
                            <option value="">— Select a branch —</option>
                            {getBranchesForCompany(watchedEditPanelCompanyId || "").map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          {editPanelErrors.branchId && (
                            <p className="mt-1 text-[12px] text-red-400">
                              {editPanelErrors.branchId.message}
                            </p>
                          )}
                          {!watchedEditPanelCompanyId && (
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                              Enter a Company ID above to filter branches
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="mb-2 block text-[13px] text-[var(--text-secondary)]">
                          IP Address (Default is autofilled)
                        </label>
                        <input
                          {...registerEditPanel("ipAddress")}
                          className={`control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] ${
                            editPanelErrors.ipAddress ? "border-red-400/70" : ""
                          }`}
                          placeholder="e.g., 72.167.225.142"
                          disabled={editPanelFormLoading}
                        />
                        {editPanelErrors.ipAddress && (
                          <p className="mt-1 text-[12px] text-red-400">
                            {editPanelErrors.ipAddress.message}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={editPanelFormLoading}
                          className="flex h-[36px] items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-5 text-[13px] font-medium text-[var(--surface-base)] transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {editPanelFormLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Panel"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {panelsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPanels.map((panel) => {
                      const isAlarm = panel.zones?.some((z) => z);
                      const statusColor = isAlarm ? "bg-[var(--color-error)]" : "bg-[var(--color-success)]";
                      return (
                        <div
                          key={panel.serial || Math.random().toString()}
                          className="surface-panel flex flex-col text-left transition-all hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] animate-fade-in-up rounded-[14px] overflow-hidden"
                        >
                          <div className="p-5 flex-1 w-full relative">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] border border-[var(--border-subtle)]">
                                <div className={`h-[10px] w-[10px] rounded-full ${statusColor} shadow-sm`} />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditPanel(panel)}
                                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
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
                                    className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)] transition-colors"
                                    aria-label="Delete panel"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1 truncate">
                                {panel.name || "Unknown Panel"}
                              </h3>
                              <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 min-h-[39px]">
                                Last active: {getPanelHeartbeat(panel.serial)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 py-3 w-full">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-[10px] shrink-0 font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                Serial
                              </span>
                              <span className="font-mono truncate text-[11px] text-[var(--text-primary)]">
                                {panel.serial || "No serial"}
                              </span>
                            </div>
                            <CopyButton
                              textToCopy={panel.serial}
                              className="text-[var(--text-secondary)] shrink-0 ml-2 hover:text-[var(--text-primary)] transition-colors"
                              title="Copy Serial"
                              onCopy={() => {
                                setSuccess("ID copied to clipboard");
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {filteredPanels.length === 0 && (
                      <div className="col-span-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[13px] text-[var(--text-secondary)]">
                        {(panels || []).filter(Boolean).length === 0
                          ? "No panels provisioned yet."
                          : "No panels match your search."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🛑 Delete Company Modal 🛑 */}
      {deleteCompanyModalState.isOpen && deleteCompanyModalState.company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[12px] border border-[var(--border-subtle)] bg-[#1a1917] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
                Delete Company
              </h3>
              <button
                onClick={() =>
                  setDeleteCompanyModalState((prev) => ({
                    ...prev,
                    isOpen: false,
                  }))
                }
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5 text-[13px] text-[var(--text-primary)]">
              {deleteCompanyModalState.step === 1 ? (
                <>
                  <p className="mb-4">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold">
                      {deleteCompanyModalState.company.name}
                    </span>
                    ?
                  </p>
                  <p className="mb-4 text-[var(--text-secondary)]">
                    There are{" "}
                    <span className="text-[var(--text-primary)] font-medium">
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
                    <div className="mt-4 border border-[var(--border-subtle)] rounded-[8px] p-4 bg-[var(--surface-raised)]">
                      <p className="mb-3 font-medium text-[var(--text-primary)]">Users</p>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded-[4px] border-[var(--border-strong)] bg-[var(--surface-base)] text-accent focus:ring-accent focus:ring-offset-0"
                          checked={deleteCompanyModalState.deleteUsersAlso}
                          onChange={(e) =>
                            setDeleteCompanyModalState((prev) => ({
                              ...prev,
                              deleteUsersAlso: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-[var(--text-secondary)]">
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
                      className="px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
                  <div className="max-h-[200px] overflow-y-auto mb-4 border border-[var(--border-subtle)] rounded-[6px] bg-[var(--surface-raised)]">
                    {deleteCompanyModalState.associatedUsers.map((u) => (
                      <div
                        key={u.uid}
                        className="px-3 py-2 border-b border-[var(--border-subtle)] last:border-0"
                      >
                        <div className="font-medium">
                          {u.displayName || "Unknown User"}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
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
                      className="px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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

