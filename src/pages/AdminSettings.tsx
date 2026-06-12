import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserService } from "../api/UserService";
import { PanelService } from "../api/PanelService";
import { Panel, User, Role } from "../types";
import {
  DEFAULT_PANEL_COMMANDS,
  normalizeAllowedCommands,
} from "../config/panelDefaults";
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Users,
  KeyRound,
  Layers3,
  XCircle,
  Trash2,
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

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  head_office: "Head Office",
  system_integrator: "System Integrator",
  end_user: "End User",
};

const roleColors: Record<Role, string> = {
  super_admin: "border-red-400/30 bg-red-500/15 text-red-200",
  head_office: "border-amber-300/30 bg-amber-400/15 text-amber-200",
  system_integrator: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
  end_user: "border-slate-400/20 bg-slate-500/10 text-slate-300",
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
  const [panels, setPanels] = useState<Panel[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [panelsLoading, setPanelsLoading] = useState(true);
  const [editingUserData, setEditingUserData] = useState<User | null>(null);
  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [panelFormLoading, setPanelFormLoading] = useState(false);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [editUserFormLoading, setEditUserFormLoading] = useState(false);
  const [groupFormLoading, setGroupFormLoading] = useState(false);
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

  useEffect(() => {
    loadUsers();
    loadPanels();
  }, []);

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

  const loadPanels = async () => {
    setPanelsLoading(true);
    try {
      const data = await PanelService.getPanels();
      setPanels(data);

      const panelsMissingCommands = data.filter(
        (panel) =>
          !Array.isArray(panel.allowedCommands) ||
          panel.allowedCommands.length === 0,
      );
      if (panelsMissingCommands.length > 0 && !syncingPanelDefaults) {
        setSyncingPanelDefaults(true);
        try {
          await Promise.all(
            panelsMissingCommands.map((panel) =>
              PanelService.updatePanel(panel.serial, {
                allowedCommands: [...DEFAULT_PANEL_COMMANDS],
              }),
            ),
          );
          const refreshedPanels = await PanelService.getPanels();
          setPanels(refreshedPanels);
          setSuccess(
            `Applied default controls to ${panelsMissingCommands.length} panel${panelsMissingCommands.length === 1 ? "" : "s"}`,
          );
          setTimeout(() => setSuccess(null), 3000);
        } finally {
          setSyncingPanelDefaults(false);
        }
      }
    } catch (err) {
      console.error("Failed to load panels:", err);
    } finally {
      setPanelsLoading(false);
    }
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
    setEditUserValue("branchIds", user.branchIds?.join(", ") || "");
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
        allowedCommands: normalizeAllowedCommands(undefined),
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
      await loadPanels();
      setSuccess("Panel deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete panel"));
    }
  };

  /** Returns a role-appropriate Tailwind gradient for user avatars */
  const getAvatarGradient = (role: Role): string => {
    switch (role) {
      case "super_admin":
        return "from-red-500 to-red-700";
      case "head_office":
        return "from-amber-400 to-amber-600";
      case "system_integrator":
        return "from-cyan-400 to-cyan-600";
      case "end_user":
        return "from-slate-500 to-slate-700";
      default:
        return "from-slate-500 to-slate-700";
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Page header */}
      <section className="surface-panel rounded-[14px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-amber-300/20 bg-amber-400/10 text-amber-200 shadow-lg shadow-amber-500/5">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-balance text-3xl font-semibold leading-tight tracking-tight text-white">
                Admin Settings
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-slate-400">
                Manage users and panel provisioning
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="animate-fade-in flex items-center gap-3 rounded-[10px] border border-red-300/25 bg-red-500/10 p-4 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-200" />
          <p className="text-sm text-red-100">{error}</p>
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
        <div className="animate-fade-in flex items-center gap-3 rounded-[10px] border border-emerald-300/25 bg-emerald-400/10 p-4 shadow-sm">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-200" />
          <p className="text-sm text-emerald-100">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] text-emerald-200/80 transition-all duration-200 ease-out hover:bg-emerald-500/20 hover:text-emerald-100"
            aria-label="Dismiss success"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── User Management ────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.04]">
              <Users className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-balance text-lg font-semibold text-white">
                User Management
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-slate-500">
                {users.length} user{users.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            onClick={loadUsers}
            disabled={usersLoading}
            className="btn-secondary flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setUserFormOpen(true)}
            className="btn-primary flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* User creation form — amber left-rail accent */}
        {userFormOpen && (
          <div className="animate-fade-in-up surface-panel rounded-[14px] border-l-4 border-l-amber-400 p-6">
            {/* Form header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-balance text-lg font-semibold text-white">Create User</h3>
              <button
                type="button"
                onClick={() => {
                  setUserFormOpen(false);
                  resetUser();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-400 transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white"
                aria-label="Close user form"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitUser(handleCreateUser)}
              className="space-y-5"
            >
              {/* Display name — full width */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Display Name
                </label>
                <input
                  {...registerUser("displayName")}
                  placeholder="Full name"
                  className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                />
                {userErrors.displayName && (
                  <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                    {userErrors.displayName.message}
                  </p>
                )}
              </div>

              {/* Email + Password */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <input
                    {...registerUser("email")}
                    placeholder="user@example.com"
                    className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                  />
                  {userErrors.email && (
                    <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                      {userErrors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <input
                    {...registerUser("password")}
                    type="password"
                    placeholder="Min. 6 characters"
                    className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                  />
                  {userErrors.password && (
                    <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                      {userErrors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Role + Company */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Role
                  </label>
                  <select
                    {...registerUser("role")}
                    className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                  >
                    <option value="end_user">End User</option>
                    {hasRole(["super_admin", "head_office"]) && (
                      <option value="system_integrator">System Integrator</option>
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
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Company ID
                    </label>
                    <input
                      {...registerUser("companyId")}
                      placeholder="Optional"
                      className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Branch IDs */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Branch IDs
                </label>
                <input
                  {...registerUser("branchIds")}
                  placeholder="Comma separated, e.g. branch-1, branch-2"
                  className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={userFormLoading}
                  className="btn-primary rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out disabled:opacity-50"
                >
                  {userFormLoading ? "Creating..." : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserFormOpen(false);
                    resetUser();
                  }}
                  className="btn-secondary rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User table */}
        {usersLoading ? (
          <div className="surface-panel flex justify-center rounded-[14px] py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
          </div>
        ) : (
          <div className="table-shell overflow-x-auto rounded-[14px]">
            <table className="w-full min-w-[820px]">
              <thead className="sticky top-0 z-10 border-b border-white/[0.07] bg-slate-950/95 backdrop-blur-md">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    User
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Company ID
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {users.map((user) => (
                  <tr
                    key={user.uid}
                    className="transition-all duration-200 ease-out hover:bg-white/[0.04]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br text-sm font-semibold text-white shadow-lg shadow-black/20 ${getAvatarGradient(user.role)}`}
                        >
                          {user.displayName?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {user.displayName || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">
                      {user.email}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        title={roleLabels[user.role]}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${roleColors[user.role]}`}
                      >
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-400">
                        {user.companyId || "None"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditUser(user)}
                          className="flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm text-slate-300 transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          className="rounded-[10px] px-3.5 py-2 text-sm text-red-200 transition-all duration-200 ease-out hover:bg-red-500/10 hover:text-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User modal overlay */}
      {editingUserData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setEditingUserData(null)}
          />
          <div className="animate-slide-up surface-panel relative w-full max-w-lg overflow-hidden rounded-[14px] shadow-2xl shadow-black/40">
            {/* Accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
            <div className="p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-balance text-xl font-semibold text-white">Edit User</h3>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Update user profile and permissions
                  </p>
                </div>
                <button
                  onClick={() => setEditingUserData(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-400 transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white"
                  type="button"
                  aria-label="Close edit form"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmitEditUser(handleEditUser)}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Display Name
                  </label>
                  <input
                    {...registerEditUser("displayName")}
                    placeholder="Full name"
                    className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                    disabled={editUserFormLoading}
                  />
                  {editUserErrors.displayName && (
                    <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                      {editUserErrors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Email
                    </label>
                    <input
                      {...registerEditUser("email")}
                      placeholder="user@example.com"
                      className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                      disabled={editUserFormLoading}
                    />
                    {editUserErrors.email && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {editUserErrors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      New Password
                    </label>
                    <input
                      {...registerEditUser("password")}
                      type="password"
                      placeholder="Leave blank to keep current"
                      className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                      disabled={editUserFormLoading}
                    />
                    {editUserErrors.password && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {editUserErrors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Role
                    </label>
                    <select
                      {...registerEditUser("role")}
                      className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                      disabled={editUserFormLoading}
                    >
                      <option value="end_user">End User</option>
                      {hasRole(["super_admin", "head_office"]) && (
                        <option value="system_integrator">System Integrator</option>
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
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Company ID
                      </label>
                      <input
                        {...registerEditUser("companyId")}
                        placeholder="Optional"
                        className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                        disabled={editUserFormLoading}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Branch IDs
                  </label>
                  <input
                    {...registerEditUser("branchIds")}
                    placeholder="Comma separated"
                    className="control-field w-full rounded-[10px] px-4 py-3 text-sm"
                    disabled={editUserFormLoading}
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5">
                  <button
                    type="button"
                    onClick={() => setEditingUserData(null)}
                    className="btn-secondary rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out"
                    disabled={editUserFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editUserFormLoading}
                    className="btn-primary rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out disabled:opacity-50"
                  >
                    {editUserFormLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel Provisioning ──────────────────────────────────────────── */}
      <div className="mt-12 space-y-5 border-t border-white/[0.07] pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.04]">
              <Layers3 className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-balance text-lg font-semibold text-white">
                Panel Provisioning
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Create panel records for monitoring
              </p>
            </div>
          </div>
          <button
            onClick={() => setPanelFormOpen(true)}
            className="btn-primary flex items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add Panel</span>
          </button>
        </div>

        {/* Provisioned panels card */}
        <div className="surface-panel rounded-[14px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-balance text-lg font-semibold text-white">
                Provisioned Panels
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Panels currently stored in Firestore
              </p>
            </div>
            <button
              onClick={loadPanels}
              disabled={panelsLoading}
              className="btn-secondary flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out"
            >
              <RefreshCw
                className={`h-4 w-4 ${panelsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {panelsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
            </div>
          ) : panels.length === 0 ? (
            <p className="text-sm text-slate-500">No panels provisioned yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {panels.map((panel) => (
                <div
                  key={panel.serial}
                  className="surface-muted rounded-[14px] border border-white/[0.07] p-5 transition-all duration-200 ease-out hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {panel.name}
                      </p>
                      <p className="mt-1 font-mono text-xs tabular-nums text-slate-500">
                        {panel.serial}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2.5">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          panel.mqttConnected
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                            : "border-slate-400/20 bg-slate-500/10 text-slate-300"
                        }`}
                      >
                        {panel.mqttConnected ? "Online" : "Offline"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/panel/${panel.serial}`}
                          className="rounded-[10px] px-3 py-1.5 text-xs font-medium text-cyan-300 transition-all duration-200 ease-out hover:bg-cyan-400/10 hover:text-cyan-200"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDeletePanel(panel.serial)}
                          className="rounded-[10px] px-3 py-2 text-xs font-medium text-red-200 transition-all duration-200 ease-out hover:bg-red-500/10 hover:text-red-100"
                        >
                          <Trash2 className="mr-1 inline h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-slate-400">
                    <p className="tabular-nums">{panel.zoneCount} zones</p>
                    <p className="truncate text-xs">Company: <span className="font-mono text-slate-300">{panel.companyId || "None"}</span></p>
                    <p className="truncate text-xs">Branch: <span className="font-mono text-slate-300">{panel.branchId || "None"}</span></p>
                    <p className="mt-2.5 text-xs tabular-nums text-slate-500">
                      {panel.allowedCommands?.length ||
                        DEFAULT_PANEL_COMMANDS.length}{" "}
                      commands configured
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Panel modal overlay */}
        {panelFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setPanelFormOpen(false)}
            />
            <div className="animate-slide-up surface-panel relative w-full max-w-md overflow-hidden rounded-[14px] shadow-2xl shadow-black/40">
              {/* Accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
              <div className="p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-balance text-xl font-semibold text-white">
                      Add New Panel
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-500">
                      Provision a new fire alarm panel.
                    </p>
                  </div>
                  <button
                    onClick={() => setPanelFormOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-400 transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white"
                    type="button"
                    aria-label="Close panel form"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit(handleCreatePanel)}
                  className="space-y-5"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Serial Number
                    </label>
                    <input
                      {...register("serial")}
                      className={`control-field w-full rounded-[10px] px-4 py-3 text-sm placeholder:text-slate-500 ${
                        errors.serial ? "border-red-400/70" : ""
                      }`}
                      placeholder="e.g., FP-2024-001"
                      disabled={panelFormLoading}
                    />
                    {errors.serial && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {errors.serial.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Panel Name
                    </label>
                    <input
                      {...register("name")}
                      className={`control-field w-full rounded-[10px] px-4 py-3 text-sm placeholder:text-slate-500 ${
                        errors.name ? "border-red-400/70" : ""
                      }`}
                      placeholder="e.g., Building A - Floor 1"
                      disabled={panelFormLoading}
                    />
                    {errors.name && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Number of Zones (1–8)
                    </label>
                    <input
                      type="number"
                      {...register("zoneCount")}
                      className={`control-field w-full rounded-[10px] px-4 py-3 text-sm tabular-nums placeholder:text-slate-500 ${
                        errors.zoneCount ? "border-red-400/70" : ""
                      }`}
                      placeholder="8"
                      min={1}
                      max={8}
                      disabled={panelFormLoading}
                    />
                    {errors.zoneCount && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {errors.zoneCount.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Company ID
                    </label>
                    <input
                      {...register("companyId")}
                      className={`control-field w-full rounded-[10px] px-4 py-3 text-sm placeholder:text-slate-500 ${
                        errors.companyId ? "border-red-400/70" : ""
                      }`}
                      placeholder="e.g., company-a"
                      disabled={panelFormLoading}
                    />
                    {errors.companyId && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {errors.companyId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Branch ID
                    </label>
                    <input
                      {...register("branchId")}
                      className={`control-field w-full rounded-[10px] px-4 py-3 text-sm placeholder:text-slate-500 ${
                        errors.branchId ? "border-red-400/70" : ""
                      }`}
                      placeholder="e.g., branch-a"
                      disabled={panelFormLoading}
                    />
                    {errors.branchId && (
                      <p className="animate-fade-in mt-1.5 text-sm text-red-300">
                        {errors.branchId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      IP Address
                    </label>
                    <input
                      {...register("ipAddress")}
                      className="control-field w-full rounded-[10px] px-4 py-3 text-sm placeholder:text-slate-500"
                      placeholder="Optional"
                      disabled={panelFormLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setPanelFormOpen(false);
                        reset();
                      }}
                      className="btn-secondary rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out"
                      disabled={panelFormLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={panelFormLoading}
                      className="btn-primary flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out"
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
          </div>
        )}

        {/* Empty-state info card */}
        <div className="surface-panel rounded-[14px] p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[14px] border border-white/[0.07] bg-white/[0.03] shadow-lg shadow-black/10">
            <Shield className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-balance text-sm font-medium text-slate-300">
            Use the "Add Panel" button above to provision new fire alarm panels.
          </p>
          <p className="mt-2.5 text-sm text-slate-500">
            All panels will appear on the dashboard after creation.
          </p>
        </div>
      </div>
    </div>
  );
}
