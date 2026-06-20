import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Loader2,
  ShieldAlert,
  Building,
  Users,
  MapPin,
  XCircle,
  Plus,
  ChevronDown,
  Eye,
} from "lucide-react";
import { UserService } from "../api/UserService";
import { useAuth } from "../contexts/AuthContext";
import { useCompanies } from "../hooks/useCompanies";
import { useBranches } from "../hooks/useBranches";
import { User, Role, Branch } from "../types";
import { Company } from "../api/CompanyService";
import { CopyButton } from "./CopyButton";

// ─── Types & Constants ──────────────────────────────────────────────────────

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  editingUser?: User | null;
}

const ROLE_META: Record<
  Role,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  secret_super_admin: {
    label: "Secret Super Admin",
    description: "Invisible super admin with global access",
    icon: <ShieldAlert className="h-4 w-4" />,
    color: "#6b7280", // gray
  },
  super_admin: {
    label: "Super Admin",
    description: "Unrestricted global access to everything",
    icon: <ShieldAlert className="h-4 w-4" />,
    color: "#1e6b8a", // teal
  },
  head_office: {
    label: "Head Office",
    description: "Full admin for one company",
    icon: <Building className="h-4 w-4" />,
    color: "#4a6fa5", // slate blue
  },
  system_integrator: {
    label: "System Integrator",
    description: "Field operations across assigned branches",
    icon: <Users className="h-4 w-4" />,
    color: "#7c6f8a", // muted purple
  },
  end_user: {
    label: "Viewer",
    description: "View-only access to assigned branch",
    icon: <Eye className="h-4 w-4" />,
    color: "#2e7d5e", // muted green
  },
};

// ─── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

// ─── RBAC Helpers ───────────────────────────────────────────────────────────

function getCreatableRoles(actorRole: Role, isSecret: boolean): Role[] {
  switch (actorRole) {
    case "super_admin":
    case "secret_super_admin":
      return isSecret 
        ? ["secret_super_admin", "super_admin", "head_office", "system_integrator", "end_user"]
        : ["super_admin", "head_office", "system_integrator", "end_user"];
    case "head_office":
      return ["system_integrator", "end_user"];
    case "system_integrator":
      return ["end_user"];
    default:
      return [];
  }
}

function getAvailableCompanies(
  actorRole: Role,
  actorData: User | null,
  allCompanies: Company[],
): Company[] {
  if (actorRole === "super_admin") return allCompanies;

  if (actorRole === "head_office" && actorData?.companyId) {
    return allCompanies.filter((c) => c.id === actorData.companyId);
  }

  if (actorRole === "system_integrator" && actorData?.assignments) {
    const assignedCompanyIds = Object.keys(actorData.assignments);
    return allCompanies.filter((c) => assignedCompanyIds.includes(c.id));
  }

  return [];
}

function getAvailableBranches(
  actorRole: Role,
  actorData: User | null,
  allBranches: Branch[],
  companyId: string,
): Branch[] {
  if (!companyId) return [];

  const companyBranches = allBranches.filter((b) => b.companyId === companyId);

  if (actorRole === "super_admin" || actorRole === "head_office") {
    return companyBranches;
  }

  if (actorRole === "system_integrator" && actorData?.assignments) {
    const allowed = actorData.assignments[companyId] || [];
    if (allowed.includes("*")) return companyBranches;
    return companyBranches.filter((b) => allowed.includes(b.id));
  }

  return [];
}

function isCompanyAutoSet(actorRole: Role): boolean {
  return actorRole === "head_office" || actorRole === "system_integrator";
}

// ─── Helper: API Error Extraction ───────────────────────────────────────────

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown; error?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") return response.data.message;
    if (typeof response?.data?.error === "string") return response.data.error;
  }
  return fallback;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  editingUser,
}: CreateUserModalProps) {
  const { role: actorRole, userData: actorData } = useAuth();
  const { companies, loading: companiesLoading } = useCompanies();
  const { branches, loading: branchesLoading } = useBranches();

  // ── Local state ──
  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [siAssignments, setSiAssignments] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEditMode = !!editingUser;
  const schema = isEditMode ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(schema),
  });

  // ── Derived data ──
  const creatableRoles = useMemo(
    () => (actorRole ? getCreatableRoles(actorRole, !!actorData?.secret_super_admin) : []),
    [actorRole, actorData],
  );

  const availableCompanies = useMemo(
    () =>
      actorRole ? getAvailableCompanies(actorRole, actorData, companies) : [],
    [actorRole, actorData, companies],
  );

  const availableBranches = useMemo(
    () =>
      actorRole
        ? getAvailableBranches(actorRole, actorData, branches, selectedCompanyId)
        : [],
    [actorRole, actorData, branches, selectedCompanyId],
  );

  const actorCompanyAutoSet = useMemo(
    () => (actorRole ? isCompanyAutoSet(actorRole) : false),
    [actorRole],
  );

  // ── Reset/populate on open or user change ──
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editingUser) {
      // Edit mode: pre-populate
      reset({
        displayName: editingUser.displayName || "",
        email: editingUser.email || "",
        password: "",
      });
      setSelectedRole(editingUser.role);

      if (editingUser.role === "system_integrator") {
        setSiAssignments(editingUser.assignments || {});
        const firstComp = Object.keys(editingUser.assignments || {})[0] || "";
        setSelectedCompanyId(firstComp);
        setSelectedBranchIds([]);
      } else {
        setSelectedCompanyId(editingUser.companyId || "");
        setSelectedBranchIds(editingUser.branchIds || []);
        setSiAssignments({});
      }
    } else {
      // Create mode: reset everything
      reset({ displayName: "", email: "", password: "" });
      setSelectedRole("");
      setSelectedCompanyId("");
      setSelectedBranchIds([]);
      setSiAssignments({});
      setShowPassword(false);
    }
  }, [isOpen, editingUser, isEditMode, reset]);

  // ── Auto-set company for HO/SI actors ──
  useEffect(() => {
    if (!isOpen || !actorCompanyAutoSet || !selectedRole) return;
    if (selectedRole === "super_admin") return;

    if (actorRole === "head_office" && actorData?.companyId) {
      setSelectedCompanyId(actorData.companyId);
    } else if (
      actorRole === "system_integrator" &&
      actorData?.assignments
    ) {
      const firstComp = Object.keys(actorData.assignments)[0] || "";
      setSelectedCompanyId(firstComp);
    }
  }, [isOpen, actorCompanyAutoSet, selectedRole, actorRole, actorData]);

  // ── Clear branch selection when company changes (non-SI) ──
  useEffect(() => {
    if (selectedRole !== "system_integrator") {
      setSelectedBranchIds([]);
    }
  }, [selectedCompanyId, selectedRole]);

  // ── Submission ──
  const onSubmit = async (formData: CreateFormData | EditFormData) => {
    if (!selectedRole) return;
    setSubmitting(true);

    try {
      let finalCompanyId: string | undefined;
      let finalBranchIds: string[] = [];
      let finalAssignments: Record<string, string[]> | undefined;

      if (selectedRole === "super_admin") {
        finalCompanyId = undefined;
        finalBranchIds = [];
      } else if (selectedRole === "head_office") {
        finalCompanyId = selectedCompanyId || undefined;
        finalBranchIds = [];
      } else if (selectedRole === "system_integrator") {
        finalAssignments = siAssignments;
        const firstComp = Object.keys(siAssignments)[0];
        finalCompanyId = firstComp || undefined;
        finalBranchIds = firstComp ? siAssignments[firstComp] : [];
      } else {
        // end_user
        finalCompanyId = selectedCompanyId || undefined;
        finalBranchIds = selectedBranchIds;
      }

      if (isEditMode && editingUser) {
        await UserService.updateUser(editingUser.uid, {
          displayName: formData.displayName,
          email: formData.email,
          password: formData.password || undefined,
          role: selectedRole,
          companyId: finalCompanyId,
          branchIds: finalBranchIds,
          assignments: finalAssignments,
        });
        onSuccess("User updated successfully");
      } else {
        const createData = formData as CreateFormData;
        await UserService.createUser({
          displayName: createData.displayName,
          email: createData.email,
          password: createData.password,
          role: selectedRole,
          companyId: finalCompanyId,
          branchIds: finalBranchIds,
          assignments: finalAssignments,
        });
        onSuccess("User created successfully");
      }

      onClose();
    } catch (err: unknown) {
      onError(
        getApiErrorMessage(
          err,
          isEditMode ? "Failed to update user" : "Failed to create user",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── SI: Add company to assignments ──
  const handleAddSiCompany = (companyId: string) => {
    if (!companyId || siAssignments[companyId]) return;
    setSiAssignments((prev) => ({ ...prev, [companyId]: [] }));
  };

  const handleRemoveSiCompany = (companyId: string) => {
    setSiAssignments((prev) => {
      const next = { ...prev };
      delete next[companyId];
      return next;
    });
  };

  const handleToggleSiBranch = (
    companyId: string,
    branchId: string,
    checked: boolean,
  ) => {
    setSiAssignments((prev) => {
      const next = { ...prev };
      if (checked) {
        next[companyId] = [...(next[companyId] || []), branchId];
      } else {
        next[companyId] = (next[companyId] || []).filter(
          (id) => id !== branchId,
        );
      }
      return next;
    });
  };

  // ── Branch checkbox toggle (for EU/HO) ──
  const handleToggleBranch = (branchId: string, checked: boolean) => {
    setSelectedBranchIds((prev) =>
      checked ? [...prev, branchId] : prev.filter((id) => id !== branchId),
    );
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  const needsCompany =
    selectedRole === "head_office" || selectedRole === "end_user";
  const needsBranches = selectedRole === "end_user";
  const needsSiMatrix = selectedRole === "system_integrator";
  const showCompanyDropdown = needsCompany && !actorCompanyAutoSet;
  const showCompanyReadonly = needsCompany && actorCompanyAutoSet;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[540px] mx-4 max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
                {isEditMode ? "Edit User" : "Create New User"}
              </h2>
              {isEditMode && editingUser && (
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  {editingUser.email}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="user-modal-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* ── Step 1: Role Selection ── */}
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[var(--text-primary)]">
                  Role
                </label>
                <p className="mb-3 text-[11px] text-[var(--text-secondary)]">
                  Select the role for this user. The form fields below will
                  adapt based on role.
                </p>

                <div className="grid gap-2">
                  {creatableRoles.map((r) => {
                    const meta = ROLE_META[r];
                    const isSelected = selectedRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setSelectedRole(r);
                          // Reset scope when role changes
                          setSelectedBranchIds([]);
                          setSiAssignments({});
                          if (r === "super_admin") {
                            setSelectedCompanyId("");
                          } else if (actorCompanyAutoSet && actorData) {
                            if (
                              actorRole === "head_office" &&
                              actorData.companyId
                            ) {
                              setSelectedCompanyId(actorData.companyId);
                            } else if (
                              actorRole === "system_integrator" &&
                              actorData.assignments
                            ) {
                              setSelectedCompanyId(
                                Object.keys(actorData.assignments)[0] || "",
                              );
                            }
                          }
                        }}
                        disabled={submitting}
                        className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-all duration-150 ${
                          isSelected
                            ? "border-[color:var(--border-default)] bg-[var(--surface-hover)] ring-1 ring-[var(--border-default)]"
                            : "border-[var(--border-subtle)] bg-transparent hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {meta.label}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-[var(--text-primary)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Step 2: Dynamic Form (only when role is selected) ── */}
              {selectedRole && (
                <div className="space-y-5 animate-fade-in-up">
                  {/* Divider */}
                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* ── Account Details ── */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
                      Account Details
                    </h3>

                    <div className="space-y-4">
                      {/* Display Name */}
                      <div>
                        <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                          Display Name
                        </label>
                        <input
                          {...register("displayName")}
                          placeholder="Full name"
                          className="control-field w-full rounded-[8px] px-3 h-[38px] text-[13px]"
                          disabled={submitting}
                        />
                        {errors.displayName && (
                          <p className="mt-1 text-[11px] text-red-400">
                            {errors.displayName.message}
                          </p>
                        )}
                      </div>

                      {/* Email & Password */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                            Email
                          </label>
                          <input
                            {...register("email")}
                            type="email"
                            placeholder="user@example.com"
                            className="control-field w-full rounded-[8px] px-3 h-[38px] text-[13px]"
                            disabled={submitting}
                          />
                          {errors.email && (
                            <p className="mt-1 text-[11px] text-red-400">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                            {isEditMode
                              ? "Password (leave blank to keep)"
                              : "Password"}
                          </label>
                          <div className="relative">
                            <input
                              {...register("password")}
                              type={showPassword ? "text" : "password"}
                              placeholder={
                                isEditMode
                                  ? "New password (optional)"
                                  : "Min 6 characters"
                              }
                              className="control-field w-full rounded-[8px] px-3 pr-9 h-[38px] text-[13px]"
                              disabled={submitting}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setShowPassword((p) => !p)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {errors.password && (
                            <p className="mt-1 text-[11px] text-red-400">
                              {errors.password.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Scope & Access ── */}
                  {selectedRole !== "super_admin" && (
                    <>
                      <div className="border-t border-[var(--border-subtle)]" />
                      <div>
                        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
                          Scope & Access
                        </h3>

                        <div className="space-y-4">
                          {/* ── Company Dropdown (SA creating HO/EU) ── */}
                          {showCompanyDropdown && (
                            <div>
                              <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                                Company
                              </label>
                              {companiesLoading ? (
                                <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] py-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Loading companies…
                                </div>
                              ) : (
                                <div className="relative">
                                  <select
                                    value={selectedCompanyId}
                                    onChange={(e) =>
                                      setSelectedCompanyId(e.target.value)
                                    }
                                    className="control-field w-full rounded-[8px] px-3 h-[38px] text-[13px] appearance-none"
                                    disabled={submitting}
                                  >
                                    <option value="">
                                      — Select a company —
                                    </option>
                                    {availableCompanies.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Company Read-only (HO/SI actor) ── */}
                          {showCompanyReadonly && selectedCompanyId && (
                            <div>
                              <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                                Company
                              </label>
                              <div className="control-field flex items-center gap-2 rounded-[8px] px-3 h-[38px] text-[13px] opacity-70 cursor-not-allowed">
                                <Building className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                                <span>
                                  {availableCompanies.find(
                                    (c) => c.id === selectedCompanyId,
                                  )?.name || selectedCompanyId}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* ── Branch Checkboxes (EU) ── */}
                          {needsBranches && selectedCompanyId && (
                            <div>
                              <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                                Branch Access
                              </label>
                              {branchesLoading ? (
                                <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] py-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Loading branches…
                                </div>
                              ) : availableBranches.length === 0 ? (
                                <p className="text-[11px] text-[var(--text-secondary)] py-2">
                                  No branches available for this company.
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-[160px] overflow-y-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-2">
                                  {availableBranches.map((branch) => (
                                    <label
                                      key={branch.id}
                                      className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 hover:bg-[var(--surface-hover)] transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedBranchIds.includes(
                                          branch.id,
                                        )}
                                        disabled={submitting}
                                        onChange={(e) =>
                                          handleToggleBranch(
                                            branch.id,
                                            e.target.checked,
                                          )
                                        }
                                        className="h-4 w-4 rounded border-[var(--border-subtle)] bg-transparent accent-[var(--accent)]"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[12px] text-[var(--text-primary)]">
                                          {branch.name}
                                        </span>
                                      </div>
                                      <span className="ml-auto font-mono text-[9px] text-[var(--text-secondary)] flex items-center gap-1">
                                        {branch.id.slice(0, 8)}…
                                        <CopyButton
                                          textToCopy={branch.id}
                                          className="hover:text-[var(--text-primary)] transition-colors"
                                          title="Copy full ID"
                                          iconClassName="h-2.5 w-2.5"
                                        />
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── SI Multi-Company Assignment Matrix ── */}
                          {needsSiMatrix && (
                            <div>
                              <label className="mb-1.5 block text-[12px] text-[var(--text-secondary)]">
                                Company & Branch Assignments
                              </label>

                              <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3">
                                {/* Add company row */}
                                <div className="flex gap-2 mb-3">
                                  <div className="relative flex-1">
                                    <select
                                      id="si-modal-company-select"
                                      className="control-field w-full rounded-[6px] px-3 h-[32px] text-[12px] appearance-none"
                                      disabled={submitting}
                                    >
                                      <option value="">
                                        — Add a Company —
                                      </option>
                                      {availableCompanies.map((c) => (
                                        <option
                                          key={c.id}
                                          value={c.id}
                                          disabled={!!siAssignments[c.id]}
                                        >
                                          {c.name}
                                          {siAssignments[c.id]
                                            ? " (already added)"
                                            : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const select = document.getElementById(
                                        "si-modal-company-select",
                                      ) as HTMLSelectElement;
                                      if (select?.value) {
                                        handleAddSiCompany(select.value);
                                        select.value = "";
                                      }
                                    }}
                                    disabled={submitting}
                                    className="flex h-[32px] items-center gap-1 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors disabled:opacity-50"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add
                                  </button>
                                </div>

                                {/* Company assignments */}
                                {Object.keys(siAssignments).length === 0 ? (
                                  <p className="text-[11px] text-[var(--text-secondary)] text-center py-3">
                                    No companies assigned yet. Add a company
                                    above to begin.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {Object.entries(siAssignments).map(
                                      ([compId, assignedBranchIds]) => {
                                        const company = companies.find(
                                          (c) => c.id === compId,
                                        );
                                        const compBranches =
                                          getAvailableBranches(
                                            actorRole!,
                                            actorData,
                                            branches,
                                            compId,
                                          );

                                        return (
                                          <div
                                            key={compId}
                                            className="rounded-[8px] border border-[var(--border-subtle)] overflow-hidden"
                                          >
                                            {/* Company header */}
                                            <div className="bg-[var(--surface-hover)] px-3 py-2 flex items-center justify-between border-b border-[var(--border-subtle)]">
                                              <div className="flex items-center gap-2">
                                                <Building className="h-3.5 w-3.5 text-blue-400" />
                                                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                                                  {company?.name || compId}
                                                </span>
                                                <span className="text-[9px] text-[var(--text-secondary)] bg-[var(--surface-base)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                                                  {assignedBranchIds.length}{" "}
                                                  branches
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveSiCompany(compId)
                                                }
                                                disabled={submitting}
                                                className="text-[var(--text-secondary)] hover:text-red-500 transition-colors disabled:opacity-50"
                                              >
                                                <XCircle className="h-4 w-4" />
                                              </button>
                                            </div>

                                            {/* Branch checkboxes */}
                                            <div className="p-2 space-y-0.5 max-h-[130px] overflow-y-auto bg-[var(--surface-base)]">
                                              {compBranches.length === 0 ? (
                                                <p className="text-[10px] text-[var(--text-secondary)] px-1 py-1">
                                                  No branches found for this
                                                  company.
                                                </p>
                                              ) : (
                                                compBranches.map((b) => (
                                                  <label
                                                    key={b.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 hover:bg-[var(--surface-hover)] transition-colors"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={assignedBranchIds.includes(
                                                        b.id,
                                                      )}
                                                      disabled={submitting}
                                                      onChange={(e) =>
                                                        handleToggleSiBranch(
                                                          compId,
                                                          b.id,
                                                          e.target.checked,
                                                        )
                                                      }
                                                      className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] bg-transparent accent-[var(--accent)]"
                                                    />
                                                    <span className="text-[11px] text-[var(--text-primary)]">
                                                      {b.name}
                                                    </span>
                                                    <span className="ml-auto font-mono text-[9px] text-[var(--text-secondary)]">
                                                      {b.id.slice(0, 6)}…
                                                    </span>
                                                  </label>
                                                ))
                                              )}
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── HO: Auto-branches info ── */}
                          {selectedRole === "head_office" &&
                            selectedCompanyId && (
                              <div className="rounded-[8px] bg-blue-500/8 border border-blue-500/20 p-3 flex items-start gap-2.5">
                                <Building className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                  Head Office users automatically receive access
                                  to{" "}
                                  <strong className="text-[var(--text-primary)]">
                                    all branches
                                  </strong>{" "}
                                  within their assigned company. No branch
                                  selection is needed.
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── SA: Unrestricted info ── */}
                  {selectedRole === "super_admin" && (
                    <>
                      <div className="border-t border-[var(--border-subtle)]" />
                      <div className="rounded-[8px] bg-orange-500/8 border border-orange-500/20 p-3 flex items-start gap-2.5">
                        <ShieldAlert className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          Super Admins have{" "}
                          <strong className="text-[var(--text-primary)]">
                            unrestricted global access
                          </strong>{" "}
                          to all companies, branches, users, and panels. No
                          scoping configuration is needed.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-subtle)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-[36px] px-4 rounded-[8px] text-[13px] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-modal-form"
              disabled={submitting || !selectedRole}
              className="flex h-[36px] items-center justify-center rounded-[8px] bg-[var(--text-primary)] px-5 text-[13px] font-medium text-[var(--surface-base)] transition-all hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating…" : "Creating…"}
                </>
              ) : isEditMode ? (
                "Update User"
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
