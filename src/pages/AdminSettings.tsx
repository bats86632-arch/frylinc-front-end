import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from 'react-dom';
import { storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  Search,
  Building2,
  Users,
  Cpu,
  ArrowRight,
  ChevronLeft,
  MapPin,
  ChevronRight,
  Camera,
} from "lucide-react";
import { CopyButton } from "../components/CopyButton";
import { CreateUserModal } from "../components/CreateUserModal";

const panelSchema = z.object({
  serial: z.string().min(1, "Serial is required"),
  name: z.string().min(1, "Name is required"),
  zoneCount: z.coerce.number().min(1).max(8, "Max 8 zones"),
  companyId: z.string().optional(),
  branchId: z.string().optional(),
  ipAddress: z.string().optional(),
  allowedCommands: z.string().optional(),
});

type PanelFormData = z.infer<typeof panelSchema>;

// User form schemas moved to CreateUserModal component

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
  logoUrl: z.string().optional(),
});
type EditCompanyFormData = z.infer<typeof editCompanySchema>;

const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  branches: z.array(branchSchema).optional(),
});
type CompanyFormData = z.infer<typeof companySchema>;

const roleLabels: Record<Role, string> = {
  secret_super_admin: "Secret Super Admin",
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
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [addingBranchToCompany, setAddingBranchToCompany] = useState<string | null>(null);
  const [newBranchForm, setNewBranchForm] = useState<Partial<Branch>>({});
  

  const [activeSection, setActiveSection] = useState<"companies" | "users" | "panels" | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedUserCompanyId, setSelectedUserCompanyId] = useState<string | null>(null);
  const [selectedPanelCompanyId, setSelectedPanelCompanyId] = useState<string | null>(null);
  const [expandedUserBranches, setExpandedUserBranches] = useState<Record<string, boolean>>({});

  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [panelFormLoading, setPanelFormLoading] = useState(false);
  
  const [inlineEditingBranchId, setInlineEditingBranchId] = useState<string | null>(null);
  const [inlineEditBranchForm, setInlineEditBranchForm] = useState<Partial<Branch>>({});
  const [inlineEditBranchLoading, setInlineEditBranchLoading] = useState(false);
  
  const [syncingPanelDefaults, setSyncingPanelDefaults] = useState(false);
  
  // Bulk upload states
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  
  const [bulkPanelUploadModalOpen, setBulkPanelUploadModalOpen] = useState(false);
  const [bulkPanelUploading, setBulkPanelUploading] = useState(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number>(Date.now());
  const [syncTimeText, setSyncTimeText] = useState("just now");

  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setSuccess(null), 2000);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const diff = Math.floor((Date.now() - lastSynced) / 1000);
      if (diff < 5) setSyncTimeText("just now");
      else if (diff < 60) setSyncTimeText(`${diff}s ago`);
      else setSyncTimeText(`${Math.floor(diff / 60)}m ago`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastSynced]);

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

  const watchedPanelCompanyId = watch("companyId");
  const watchedEditPanelCompanyId = watchEditPanel("companyId");

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

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet([
      {
        "Company Name": "Acme Corp",
        "Company Description": "Global Manufacturing",
        "Branch Name": "HQ",
        "Branch Address": "123 Main St, NY",
        "Branch Supervisor": "John Doe",
        "Branch Contact": "1234567890",
        "Branch Email": "hq@acmecorp.com"
      },
      {
        "Company Name": "Acme Corp",
        "Company Description": "Global Manufacturing",
        "Branch Name": "West Coast Facility",
        "Branch Address": "456 Market St, CA",
        "Branch Supervisor": "Jane Smith",
        "Branch Contact": "1234567891",
        "Branch Email": "west@acmecorp.com"
      },
      {
        "Company Name": "TechNova",
        "Company Description": "Software Solutions",
        "Branch Name": "Main Office",
        "Branch Address": "789 Tech Blvd, TX",
        "Branch Supervisor": "Alice Johnson",
        "Branch Contact": "1234567892",
        "Branch Email": "info@technova.com"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Companies_Branches_Template.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const companyMap = new Map<string, any>();
      rows.forEach((row: any) => {
        const companyName = row["Company Name"]?.toString().trim();
        if (!companyName) return;

        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            name: companyName,
            description: row["Company Description"]?.toString().trim(),
            branches: []
          });
        }

        const branchName = row["Branch Name"]?.toString().trim();
        if (branchName) {
          companyMap.get(companyName).branches.push({
            name: branchName,
            address: row["Branch Address"]?.toString().trim(),
            supervisorName: row["Branch Supervisor"]?.toString().trim(),
            contactNumber: row["Branch Contact"]?.toString().trim(),
            emailAddress: row["Branch Email"]?.toString().trim()
          });
        }
      });

      const companiesToCreate = Array.from(companyMap.values());
      for (const compData of companiesToCreate) {
        const company = await CompanyService.createCompany({
          name: compData.name,
          description: compData.description
        });

        if (compData.branches && compData.branches.length > 0) {
          await Promise.all(
            compData.branches.map((branch: any) =>
              BranchService.createBranch({
                ...branch,
                companyId: company.id
              })
            )
          );
        }
      }

      setSuccess("Bulk upload completed successfully");
      setBulkUploadModalOpen(false);
      await reloadCompanies();
      await reloadBranches();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Bulk upload failed"));
    } finally {
      setBulkUploading(false);
      e.target.value = "";
    }
  };

  const downloadPanelTemplate = async () => {
    const XLSX = await import("xlsx");
    const isSI = !hasRole(["head_office"]);

    const templateData = [
      {
        "Serial Number": "123456",
        "Panel Name": "Main Lobby Panel",
        "Zone Count": 8,
        "Company Name": "TechNova",
        "Branch Name": "Main Office",
        ...(!isSI && { "IP Address": "72.167.225.142" })
      },
      {
        "Serial Number": "123457",
        "Panel Name": "Warehouse Panel",
        "Zone Count": 4,
        "Company Name": "TechNova",
        "Branch Name": "Main Office",
        ...(!isSI && { "IP Address": "72.167.225.142" })
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Panels");
    XLSX.writeFile(wb, "Panels_Template.xlsx");
  };

  const handleBulkPanelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkPanelUploading(true);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      for (const row of rows as any[]) {
        const serial = row["Serial Number"]?.toString().trim();
        const name = row["Panel Name"]?.toString().trim();
        const zoneCount = parseInt(row["Zone Count"]?.toString().trim()) || 8;
        const companyName = row["Company Name"]?.toString().trim();
        const branchName = row["Branch Name"]?.toString().trim();
        let ipAddress = row["IP Address"]?.toString().trim() || "72.167.225.142";
        if (!hasRole(["head_office"])) {
          ipAddress = "72.167.225.142";
        }

        if (!serial || !name || !companyName) continue;

        const company = companies.find(c => c.name.toLowerCase() === companyName.toLowerCase());
        if (!company) continue;

        let branchId = "";
        if (branchName) {
          const branch = branches.find(b => b.companyId === company.id && b.name.toLowerCase() === branchName.toLowerCase());
          if (branch) branchId = branch.id;
        }

        await PanelService.createPanel({
          serial,
          name,
          zoneCount,
          companyId: company.id,
          branchId,
          ipAddress
        });
      }

      setSuccess("Panels bulk upload completed successfully");
      setBulkPanelUploadModalOpen(false);
      // Wait for PanelsService/Context to reload, though we don't have a reloadPanels here natively, we assume real-time updates or trigger a generic refresh.
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Bulk panel upload failed"));
    } finally {
      setBulkPanelUploading(false);
      e.target.value = "";
    }
  };

  const handleCreateCompany = async (data: CompanyFormData) => {
    setCompanyFormLoading(true);
    try {
      let logoUrl = "";
      if (logoFile) {
        const fileRef = ref(storage, `companies/logos/${Date.now()}_${logoFile.name}`);
        let fileToUpload = logoFile;
        try {
          const imageCompression = (await import("browser-image-compression")).default;
          const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true };
          fileToUpload = await imageCompression(logoFile, options);
        } catch (e) {
          console.error("Compression failed", e);
        }
        await uploadBytes(fileRef, fileToUpload);
        logoUrl = await getDownloadURL(fileRef);
      }

      const companyData: Partial<Company> = { name: data.name, description: data.description || "" };
      if (logoUrl) companyData.logoUrl = logoUrl;

      const company = await CompanyService.createCompany(companyData as Omit<Company, "id" | "createdAt" | "updatedAt">);
      
      // Create branches if any
      if (data.branches && data.branches.length > 0) {
        await Promise.all(
          data.branches.map(branch => 
            BranchService.createBranch({
              ...branch, name: branch.name as string,
              companyId: company.id
            })
          )
        );
      }
      
      setSuccess("Company and branches created successfully");
      setCompanyFormOpen(false);
      setLogoFile(null);
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


  const handleInlineBranchCreate = async (companyId: string) => {
    try {
      setInlineEditBranchLoading(true);
      await BranchService.createBranch({ ...newBranchForm, companyId } as any);
      await reloadBranches();
      showSuccess("Branch created successfully");
      setAddingBranchToCompany(null);
      setNewBranchForm({});
    } catch (err: any) {
      setError(err.message || "Failed to create branch");
      setTimeout(() => setError(null), 3000);
    } finally {
      setInlineEditBranchLoading(false);
    }
  };

  const handleInlineBranchSave = async (branchId: string) => {
    if (!inlineEditingBranchId) return;
    try {
      setInlineEditBranchLoading(true);
      await BranchService.updateBranch(branchId, inlineEditBranchForm);
      await reloadBranches();
      showSuccess("Branch updated successfully");
      setInlineEditingBranchId(null);
    } catch (err: any) {
      setError(err.message || "Failed to update branch");
      setTimeout(() => setError(null), 3000);
    } finally {
      setInlineEditBranchLoading(false);
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
      let logoUrl = data.logoUrl;
      if (logoFile) {
        const fileRef = ref(storage, `companies/logos/${Date.now()}_${logoFile.name}`);
        let fileToUpload = logoFile;
        try {
          const imageCompression = (await import("browser-image-compression")).default;
          const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true };
          fileToUpload = await imageCompression(logoFile, options);
        } catch (e) {
          console.error("Compression failed", e);
        }
        await uploadBytes(fileRef, fileToUpload);
        logoUrl = await getDownloadURL(fileRef);
      }
      await CompanyService.updateCompany(editingCompanyData.id, {
        name: data.name,
        description: data.description || "",
        ...(logoUrl ? { logoUrl } : {}),
      });

      await reloadCompanies();
      await reloadBranches(); // Reload branches in case anything changed
      setEditingCompanyData(null);
      resetEditCompany();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update company");
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
      showSuccess("Company deleted successfully");
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

  const syncedPanelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!panels || panels.length === 0 || syncingPanelDefaults) return;
    const panelsMissingCommands = panels.filter(
      (panel) =>
        (!Array.isArray(panel.allowedCommands) ||
        panel.allowedCommands.length === 0) &&
        !syncedPanelsRef.current.has(panel.serial)
    );
    
    if (panelsMissingCommands.length > 0) {
      setSyncingPanelDefaults(true);
      panelsMissingCommands.forEach(p => syncedPanelsRef.current.add(p.serial));
      
      Promise.all(
        panelsMissingCommands.map((panel) =>
          PanelService.updatePanel(panel.serial, {
            allowedCommands: [...DEFAULT_PANEL_COMMANDS],
          }),
        ),
      )
        .then(() => {
          showSuccess(
            `Applied default controls to ${panelsMissingCommands.length} panel${panelsMissingCommands.length === 1 ? "" : "s"}`
          );
        })
        .catch((err) => {
          console.error("Failed to sync default commands", err);
        })
        .finally(() => {
          setSyncingPanelDefaults(false);
        });
    }
  }, [panels, syncingPanelDefaults, showSuccess]);

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
    setLastSynced(Date.now());
  };

  
  const openEditUser = (user: User) => {
    setEditingUserData(user);
    setUserFormOpen(true);
  };

  const handleCreatePanel = async (data: PanelFormData) => {
    setPanelFormLoading(true);
    setError(null);
    try {
      await PanelService.createPanel({
        serial: data.serial,
        name: data.name,
        zoneCount: data.zoneCount,
        companyId: data.companyId || "",
        branchId: data.branchId || "",
        ipAddress: data.ipAddress?.trim() || undefined,
        allowedCommands: normalizeAllowedCommands(),
      });
      setPanelFormOpen(false);
      reset();
      showSuccess("Panel created successfully");
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
      showSuccess("User deleted successfully");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete user"));
    }
  };

  const handleDeletePanel = async (serial: string) => {
    if (!window.confirm(`Delete panel ${serial}?`)) return;

    setError(null);
    try {
      await PanelService.deletePanel(serial);
      showSuccess("Panel deleted successfully");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete panel"));
    }
  };

  
  const handleDeleteBranch = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this branch? This cannot be undone.")) return;
    try {
      await BranchService.deleteBranch(id);
      setSuccess("Branch deleted successfully");
      await reloadBranches();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete branch"));
    }
  };
// Mock function for panel heartbeat
  
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
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[var(--text-secondary)]">Synced {syncTimeText}</span>
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
        <div className="animate-fade-in mb-6 flex items-center gap-3 rounded-[10px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-error)]" />
          <p className="text-[13px] text-[var(--text-primary)]">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--color-error)]/80 transition-all duration-200 ease-out hover:bg-[var(--status-danger-bg)] hover:text-[var(--text-primary)]"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="animate-fade-in mb-6 flex items-center gap-3 rounded-[10px] border border-emerald-300/25 bg-[var(--accent)]/10 p-4 shadow-sm">
          <CheckCircle className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
          <p className="text-[13px] text-[var(--text-primary)]">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--color-success)]/80 transition-all duration-200 ease-out hover:bg-[var(--status-success-bg)] hover:text-[var(--text-primary)]"
            aria-label="Dismiss success"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* â”€â”€ Hero Cards Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Company Management Card */}
        {hasRole(["super_admin"]) && (
          <button
            onClick={() => setActiveSection("companies")}
            className="admin-hero-card surface-panel rounded-[16px] p-6 text-left group"
          >
            
            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                  <Building2 className="h-6 w-6 text-[var(--accent)]" />
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
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-40 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                    {companiesLoading ? "—" : companies.length}
                  </span>
                </div>
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {companiesLoading ? "● Loading…" : "companies registered"}
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
          
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                <Users className="h-6 w-6 text-[var(--accent)]" />
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
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-40 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {usersLoading ? "—" : users.length}
                </span>
              </div>
              <span className="text-[12px] text-[var(--text-secondary)]">
                {usersLoading ? "● Loading…" : "users active"}
              </span>
            </div>
          </div>
        </button>

        {/* Panel Provisioning Card */}
        <button
          onClick={() => setActiveSection("panels")}
          className="admin-hero-card surface-panel rounded-[16px] p-6 text-left group"
        >
          
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                <Cpu className="h-6 w-6 text-[var(--accent)]" />
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
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-40 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {panelsLoading ? "—" : panels.length}
                </span>
              </div>
              <span className="text-[12px] text-[var(--text-secondary)]">
                {panelsLoading ? "● Loading…" : `panels provisioned`}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
      {/* OVERLAY DRAWERS                                                    */}
      {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}

      {/* â”€â”€ Company Management Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeSection === "companies" && createPortal(
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md admin-overlay-backdrop"
            onClick={() => setActiveSection(null)}
          />
          <div className="fixed inset-x-0 bottom-0 top-[6vh] sm:inset-x-[2.5vw] sm:top-[4vh] sm:bottom-[2vh] z-[201] flex flex-col admin-overlay-drawer">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                    <Building2 className="h-4 w-4 text-[var(--accent)]" />
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
                    onClick={() => setBulkUploadModalOpen(true)}
                    className="flex h-[32px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-[12px] text-[12px] text-[var(--text-primary)] transition-all hover:bg-[var(--surface-raised)]"
                  >
                    <Plus className="h-[14px] w-[14px]" />
                    Use Excel
                  </button>
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
                  {bulkUploadModalOpen && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !bulkUploading) {
                        setBulkUploadModalOpen(false);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-[400px] mx-4 flex flex-col animate-fade-in-up">
                      <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden p-6 flex flex-col gap-4 text-center bg-[var(--surface-overlay)]">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-2">
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                            Bulk Create Companies & Branches
                          </h3>
                          <button
                            type="button"
                            onClick={() => setBulkUploadModalOpen(false)}
                            disabled={bulkUploading}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <p className="text-[13px] text-[var(--text-secondary)] mb-4 text-left">
                          Download the template, fill in your data, and upload the Excel file to bulk-create companies and branches.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={downloadTemplate}
                            disabled={bulkUploading}
                            className="flex h-[36px] items-center justify-center rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                          >
                            Download Template
                          </button>
                          
                          <button
                            onClick={() => document.getElementById("excel-upload")?.click()}
                            disabled={bulkUploading}
                            className="flex h-[36px] items-center justify-center rounded-[6px] bg-[#f0ede8] px-5 text-[13px] font-medium text-[#1a1816] transition-colors hover:bg-white disabled:opacity-50"
                          >
                            {bulkUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              "Upload Excel"
                            )}
                          </button>
                          <input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleBulkUpload}
                          />
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              {companyFormOpen && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !companyFormLoading) {
                        setCompanyFormOpen(false);
                        resetCompany();
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-[600px] mx-4 max-h-[90vh] flex flex-col animate-fade-in-up">
                      <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                            Create Company
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setCompanyFormOpen(false);
                              resetCompany();
                            }}
                            disabled={companyFormLoading}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                          <form
                            onSubmit={handleSubmitCompany(handleCreateCompany)}
                            className="space-y-5"
                          >
                        <div className="flex justify-center mb-6">
                          <div className="relative inline-block shrink-0">
                            <div className="flex h-20 w-20 items-center justify-center rounded-[12px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                              {logoFile ? (
                                <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[24px] font-bold text-[var(--text-secondary)]">
                                  <Building2 className="h-8 w-8 opacity-50" />
                                </span>
                              )}
                            </div>
                            <label
                              htmlFor="create-company-logo"
                              className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                              title="Upload company logo"
                            >
                              <Camera className="h-4 w-4" />
                            </label>
                            <input
                              id="create-company-logo"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                              disabled={companyFormLoading}
                            />
                          </div>
                        </div>

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
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                                    className="flex items-center gap-1 text-[11px] text-[var(--color-error)] hover:text-[var(--color-error)] p-1 rounded-md transition-colors"
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
                                      <p className="mt-1 text-[11px] text-[var(--color-error)]">
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
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {/* Company edit form */}
                {editingCompanyData && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !editCompanyFormLoading) {
                        setEditingCompanyData(null);
                        resetEditCompany();
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-[600px] mx-4 max-h-[90vh] flex flex-col animate-fade-in-up">
                      <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                            Edit Company
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCompanyData(null);
                              resetEditCompany();
                            }}
                            disabled={editCompanyFormLoading}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                          <form
                            onSubmit={handleSubmitEditCompany(handleEditCompany)}
                            className="space-y-5"
                          >
                        <div className="flex justify-center mb-6">
                          <div className="relative inline-block shrink-0">
                            <div className="flex h-20 w-20 items-center justify-center rounded-[12px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                              {logoFile ? (
                                <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="h-full w-full object-cover" />
                              ) : editingCompanyData.logoUrl ? (
                                <img src={editingCompanyData.logoUrl} alt="Company Logo" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[24px] font-bold text-[var(--text-secondary)]">
                                  <Building2 className="h-8 w-8 opacity-50" />
                                </span>
                              )}
                            </div>
                            <label
                              htmlFor="edit-company-logo"
                              className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                              title="Update company logo"
                            >
                              <Camera className="h-4 w-4" />
                            </label>
                            <input
                              id="edit-company-logo"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                              disabled={editCompanyFormLoading}
                            />
                          </div>
                        </div>

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
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
                            {editCompanyErrors.description.message}
                          </p>
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
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {companiesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-0 md:gap-0 flex-1 min-h-0">
                    {/* â”€â”€ Left Panel: Company List â”€â”€ */}
                    <div className={`${selectedCompanyId ? 'hidden md:flex' : 'flex'} flex-col md:w-[240px] lg:w-[280px] shrink-0 border-r border-[var(--border-subtle)] overflow-hidden`}>
                      <div className="flex-1 overflow-y-auto">
                        {filteredCompanies.length === 0 ? (
                          <div className="p-6 text-center text-[12px] text-[var(--text-secondary)]">
                            {companies.length === 0 ? "No companies found." : "No companies match your search."}
                          </div>
                        ) : (
                          <div className="divide-y divide-[var(--border-subtle)]">
                            {filteredCompanies.map((company) => {
                              const companyBranches = branches.filter(b => b.companyId === company.id);
                              const isSelected = selectedCompanyId === company.id;
                              return (
                                <button
                                  key={company.id}
                                  onClick={() => setSelectedCompanyId(company.id)}
                                  className={`w-full flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-left transition-colors group ${
                                    isSelected
                                      ? 'bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]'
                                      : 'hover:bg-[var(--surface-hover)] border-l-2 border-l-transparent'
                                  }`}
                                >
                                  <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[12px] font-medium text-[var(--text-on-accent)] shadow-sm"
                                    style={{ backgroundColor: getAvatarColor(company.name) }}
                                  >
                                    {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className='h-full w-full object-cover' /> : company.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                                        {company.name}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                                      {company.description || "No description"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="flex items-center gap-1 text-[9px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                                      <MapPin className="h-[9px] w-[9px]" />
                                      {companyBranches.length}
                                    </span>
                                    <ChevronRight className="h-3 w-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity md:block hidden" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* â”€â”€ Right Panel: Company Detail â”€â”€ */}
                    <div className={`${selectedCompanyId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-h-0 overflow-hidden`}>
                      {(() => {
                        const selectedCompany = companies.find(c => c.id === selectedCompanyId);
                        if (!selectedCompany) {
                          return (
                            <div className="flex-1 flex items-center justify-center p-8">
                              <div className="text-center">
                                <Building2 className="mx-auto h-12 w-12 text-[var(--text-secondary)] opacity-30 mb-3" />
                                <p className="text-[14px] font-medium text-[var(--text-secondary)]">Select a company</p>
                                <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1">Choose a company from the list to view its details and branches</p>
                              </div>
                            </div>
                          );
                        }
                        const companyBranches = branches.filter(b => 
                          b.companyId === selectedCompany.id &&
                          (b.name.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
                           (b.address && b.address.toLowerCase().includes(branchSearchQuery.toLowerCase())) ||
                           (b.supervisorName && b.supervisorName.toLowerCase().includes(branchSearchQuery.toLowerCase())) ||
                           (b.contactNumber && b.contactNumber.toLowerCase().includes(branchSearchQuery.toLowerCase())) ||
                           (b.emailAddress && b.emailAddress.toLowerCase().includes(branchSearchQuery.toLowerCase())))
                        );
                        return (
                          <div className="flex-1 overflow-y-auto">
                            {/* Company Header */}
                            <div className="px-3 sm:px-5 pt-3 pb-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] sticky top-0 z-10">
                              <div className="flex items-start gap-3">
                                {/* Mobile back button */}
                                <button
                                  onClick={() => setSelectedCompanyId(null)}
                                  className="flex md:hidden h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors mt-0.5"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[14px] font-semibold text-[var(--text-on-accent)] shadow-sm"
                                  style={{ backgroundColor: getAvatarColor(selectedCompany.name) }}
                                >
                                  {selectedCompany.logoUrl ? <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className='h-full w-full object-cover' /> : selectedCompany.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] truncate">{selectedCompany.name}</h3>
                                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                                    {selectedCompany.description || "No description provided."}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">ID</span>
                                    <span className="font-mono text-[9.5px] text-[var(--text-primary)] truncate">{selectedCompany.id}</span>
                                    <CopyButton
                                      textToCopy={selectedCompany.id}
                                      className="text-[var(--text-secondary)] shrink-0 hover:text-[var(--text-primary)] transition-colors"
                                      title="Copy ID"
                                      iconClassName="h-3 w-3"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => openEditCompany(selectedCompany)}
                                    className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                                    aria-label="Edit company"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => startDeleteCompany(selectedCompany)}
                                    className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)] transition-colors"
                                    aria-label="Delete company"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Branches Section */}
                            <div className="px-3 sm:px-5 py-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm">
                                    <MapPin className="h-3 w-3 text-[var(--text-secondary)]" />
                                  </div>
                                  <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">Branches</h4>
                                  <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-base)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                                    {companyBranches.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setAddingBranchToCompany(selectedCompany.id)}
                                    className="flex h-[28px] items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] shadow-sm"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Branch
                                  </button>
                                  <div className="relative w-40 sm:w-48 hidden sm:block">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                                    <input
                                      type="text"
                                      placeholder="Search branches..."
                                      className="control-field w-full h-[28px] pl-8 pr-3 text-[11px] rounded-[6px]"
                                      value={branchSearchQuery}
                                      onChange={(e) => setBranchSearchQuery(e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="relative w-full sm:hidden mb-4">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                                <input
                                  type="text"
                                  placeholder="Search branches..."
                                  className="control-field w-full h-[32px] pl-8 pr-3 text-[12px] rounded-[6px]"
                                  value={branchSearchQuery}
                                  onChange={(e) => setBranchSearchQuery(e.target.value)}
                                />
                              </div>

                              <div className="space-y-4">
                                {addingBranchToCompany === selectedCompany.id && (
                                <div className="mb-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-3 shadow-sm animate-fade-in-up">
                                  <h5 className="mb-2 text-[12px] font-bold text-[var(--text-primary)]">Create New Branch</h5>
                                  <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                    <input
                                      className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                      value={newBranchForm.name || ""}
                                      onChange={(e) => setNewBranchForm(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="Branch Name *"
                                    />
                                    <input
                                      className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                      value={newBranchForm.address || ""}
                                      onChange={(e) => setNewBranchForm(prev => ({ ...prev, address: e.target.value }))}
                                      placeholder="Address"
                                    />
                                    <input
                                      className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                      value={newBranchForm.supervisorName || ""}
                                      onChange={(e) => setNewBranchForm(prev => ({ ...prev, supervisorName: e.target.value }))}
                                      placeholder="Supervisor Name"
                                    />
                                    <input
                                      className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                      value={newBranchForm.contactNumber || ""}
                                      onChange={(e) => setNewBranchForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                                      placeholder="Phone Number"
                                    />
                                    <input
                                      type="email"
                                      className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px] md:col-span-2"
                                      value={newBranchForm.emailAddress || ""}
                                      onChange={(e) => setNewBranchForm(prev => ({ ...prev, emailAddress: e.target.value }))}
                                      placeholder="Email Address"
                                    />
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setAddingBranchToCompany(null);
                                        setNewBranchForm({});
                                      }}
                                      disabled={inlineEditBranchLoading}
                                      className="flex h-8 items-center justify-center rounded-[6px] px-3 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleInlineBranchCreate(selectedCompany.id)}
                                      disabled={inlineEditBranchLoading || !newBranchForm.name}
                                      className="flex h-8 items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-3 text-[12px] font-medium text-[var(--surface-base)] transition-colors hover:opacity-90 disabled:opacity-50"
                                    >
                                      {inlineEditBranchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {companyBranches.length === 0 ? (
                                <div className="rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] p-8 text-center">
                                  <MapPin className="mx-auto h-8 w-8 text-[var(--text-secondary)] opacity-30 mb-2" />
                                  <p className="text-[13px] font-medium text-[var(--text-secondary)]">No branches yet</p>
                                  <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1">Use the edit button on the company to add branches</p>
                                </div>
                              ) : (
                                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                                  {companyBranches.map((branch, idx) => {
                                    const isEditing = inlineEditingBranchId === branch.id;
                                    return (
                                      <div
                                        key={branch.id}
                                        className={`group relative rounded-[8px] border transition-all animate-fade-in-up flex flex-col p-4 ${
                                          isEditing
                                            ? 'border-[var(--border-default)] bg-[var(--surface-base)] shadow-md z-10'
                                            : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
                                        }`}
                                        style={{ animationDelay: `${idx * 20}ms` }}
                                      >
                                        {isEditing ? (
                                          <div className="flex flex-col gap-2.5 flex-1">
                                            <div>
                                              <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Name</label>
                                              <input
                                                type="text"
                                                className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                                value={inlineEditBranchForm.name || ""}
                                                onChange={(e) => setInlineEditBranchForm(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="Branch Name"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Address</label>
                                              <input
                                                type="text"
                                                className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                                value={inlineEditBranchForm.address || ""}
                                                onChange={(e) => setInlineEditBranchForm(prev => ({ ...prev, address: e.target.value }))}
                                                placeholder="Address"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Supervisor</label>
                                              <input
                                                type="text"
                                                className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                                value={inlineEditBranchForm.supervisorName || ""}
                                                onChange={(e) => setInlineEditBranchForm(prev => ({ ...prev, supervisorName: e.target.value }))}
                                                placeholder="Supervisor Name"
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Contact</label>
                                                <input
                                                  type="text"
                                                  className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                                  value={inlineEditBranchForm.contactNumber || ""}
                                                  onChange={(e) => setInlineEditBranchForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                                                  placeholder="Phone"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Email</label>
                                                <input
                                                  type="email"
                                                  className="control-field h-8 w-full rounded-[6px] px-2.5 text-[12px]"
                                                  value={inlineEditBranchForm.emailAddress || ""}
                                                  onChange={(e) => setInlineEditBranchForm(prev => ({ ...prev, emailAddress: e.target.value }))}
                                                  placeholder="Email"
                                                />
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] justify-end">
                                              <button
                                                onClick={() => {
                                                  setInlineEditingBranchId(null);
                                                  setInlineEditBranchForm({});
                                                }}
                                                disabled={inlineEditBranchLoading}
                                                className="flex h-7 px-3 items-center justify-center rounded-[6px] text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => handleInlineBranchSave(branch.id)}
                                                disabled={inlineEditBranchLoading}
                                                className="flex h-7 px-4 items-center justify-center rounded-[6px] bg-[var(--text-primary)] text-[11px] font-medium text-[var(--surface-base)] hover:opacity-90 transition-colors disabled:opacity-50"
                                              >
                                                {inlineEditBranchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col flex-1 h-full relative">
                                            <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center gap-2.5 pr-14">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                                                  <MapPin className="h-4 w-4 text-[var(--accent)]" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                  <span className="text-[13px] font-bold text-[var(--text-primary)] truncate" title={branch.name}>{branch.name}</span>
                                                  <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate">{branch.id}</span>
                                                </div>
                                              </div>
                                              <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CopyButton
                                                  textToCopy={branch.id}
                                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors h-6 w-6 rounded-[4px] flex items-center justify-center bg-[var(--surface-base)] shadow-sm border border-[var(--border-subtle)]"
                                                  title="Copy Branch ID"
                                                  iconClassName="h-3 w-3"
                                                />
                                                <button
                                                  onClick={() => {
                                                    setInlineEditingBranchId(branch.id);
                                                    setInlineEditBranchForm({
                                                      name: branch.name,
                                                      address: branch.address,
                                                      supervisorName: branch.supervisorName,
                                                      contactNumber: branch.contactNumber,
                                                      emailAddress: branch.emailAddress,
                                                    });
                                                  }}
                                                  className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                                                  title="Edit branch"
                                                >
                                                  <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteBranch(branch.id);
                                                  }}
                                                  className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-sm text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] hover:border-[var(--color-error)] transition-all"
                                                  title="Delete branch"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>

                                              </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3 mt-auto text-[11px]">
                                              <div className="flex flex-col gap-0.5 col-span-2">
                                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Address</span>
                                                {branch.address ? <span className="text-[11px] text-[var(--text-primary)] truncate">{branch.address}</span> : <span className="text-[11px] text-[var(--text-secondary)] opacity-50 italic">None</span>}
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Supervisor</span>
                                                {branch.supervisorName ? <span className="text-[11px] text-[var(--text-primary)] truncate">{branch.supervisorName}</span> : <span className="text-[11px] text-[var(--text-secondary)] opacity-50 italic">None</span>}
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Contact</span>
                                                {branch.contactNumber ? <span className="text-[11px] text-[var(--text-primary)] truncate">{branch.contactNumber}</span> : <span className="text-[11px] text-[var(--text-secondary)] opacity-50 italic">None</span>}
                                              </div>
                                              <div className="flex flex-col gap-0.5 col-span-2">
                                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Email</span>
                                                {branch.emailAddress ? <span className="text-[11px] text-[var(--text-primary)] truncate">{branch.emailAddress}</span> : <span className="text-[11px] text-[var(--text-secondary)] opacity-50 italic">None</span>}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* â”€â”€ User Management Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeSection === "users" && createPortal(
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md admin-overlay-backdrop"
            onClick={() => setActiveSection(null)}
          />
          <div className="fixed inset-x-0 bottom-0 top-[6vh] sm:inset-x-[2.5vw] sm:top-[4vh] sm:bottom-[2vh] z-[201] flex flex-col admin-overlay-drawer">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                    <Users className="h-4 w-4 text-[var(--accent)]" />
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
                {usersLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-0 md:gap-0 flex-1 min-h-0">
  {/* â”€â”€ Left Panel: Company List â”€â”€ */}
  <div className={`${selectedUserCompanyId ? 'hidden md:flex' : 'flex'} flex-col md:w-[240px] lg:w-[280px] shrink-0 border-r border-[var(--border-subtle)] overflow-hidden`}>
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-[var(--border-subtle)]">
        {[...(hasRole(['super_admin']) ? [{ id: 'unassigned', name: 'Unassigned', description: 'Users without a company' }] : []), ...filteredCompanies].map((company) => {
          const isUnassigned = company.id === 'unassigned';
          const isSelected = selectedUserCompanyId === company.id;
          const userCount = isUnassigned 
            ? filteredUsers.filter(u => !u.companyId).length 
            : filteredUsers.filter(u => u.companyId === company.id).length;
          
          return (
            <button
              key={company.id}
              onClick={() => setSelectedUserCompanyId(company.id)}
              className={`w-full flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-left transition-colors group ${
                isSelected
                  ? 'bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]'
                  : 'hover:bg-[var(--surface-hover)] border-l-2 border-l-transparent'
              }`}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[12px] font-medium text-[var(--text-on-accent)] shadow-sm"
                style={{ backgroundColor: isUnassigned ? '#64748b' : getAvatarColor(company.name) }}
              >
                {isUnassigned ? <Users className='h-3.5 w-3.5 text-white' /> : company.logoUrl ? <img src={company.logoUrl} alt={company.name} className='h-full w-full object-cover' /> : company.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                    {company.name}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                  {company.description || "No description"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 text-[9px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                  <Users className="h-[9px] w-[9px]" />
                  {userCount}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity md:block hidden" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>

  {/* â”€â”€ Right Panel: Company Detail & Branches â”€â”€ */}
  <div className={`${selectedUserCompanyId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-h-0 overflow-hidden`}>
    {(() => {
      if (!selectedUserCompanyId) {
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-[var(--text-secondary)] opacity-30 mb-3" />
              <p className="text-[14px] font-medium text-[var(--text-secondary)]">Select a company</p>
              <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1">Choose a company from the list to view its users</p>
            </div>
          </div>
        );
      }

      const isUnassigned = selectedUserCompanyId === 'unassigned';
      const selectedCompany = isUnassigned 
        ? { id: 'unassigned', name: 'Unassigned', description: 'Users without a company' } 
        : companies.find(c => c.id === selectedUserCompanyId);
      
      if (!selectedCompany) return null;

      const companyUsers = isUnassigned 
        ? filteredUsers.filter(u => !u.companyId)
        : filteredUsers.filter(u => u.companyId === selectedCompany.id);

      const companyBranches = isUnassigned ? [] : branches.filter(b => b.companyId === selectedCompany.id);
      
      const renderUserBtn = (user: User) => (
        <button
          key={user.uid}
          onClick={() => openEditUser(user)}
          className="flex items-center gap-2 p-2 rounded-[6px] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors text-left group min-w-0"
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-medium text-[var(--text-on-accent)] shadow-sm"
            style={{ backgroundColor: getAvatarColor(user.displayName || user.email || "U") }}
          >
            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{user.displayName || "Unknown User"}</p>
            <p className="text-[9px] text-[var(--text-secondary)] truncate">{roleLabels[user.role as Role] || "User"}</p>
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.uid); }}
            className="h-5 w-5 flex items-center justify-center rounded text-[var(--color-error)] opacity-0 group-hover:opacity-100 hover:bg-[var(--status-danger-bg)] transition-all shrink-0"
          >
            <Trash2 className="h-3 w-3" />
          </div>
        </button>
      );

      return (
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="px-3 sm:px-5 pt-3 pb-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedUserCompanyId(null)}
                className="flex md:hidden h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[14px] font-semibold text-[var(--text-on-accent)] shadow-sm"
                style={{ backgroundColor: isUnassigned ? '#64748b' : getAvatarColor(selectedCompany.name) }}
              >
                {isUnassigned ? <Users className='h-4 w-4 text-white' /> : selectedCompany.logoUrl ? <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className='h-full w-full object-cover' /> : selectedCompany.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-[var(--text-primary)] truncate">{selectedCompany.name}</h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{companyUsers.length} total users</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 sm:px-5 py-3">
            {isUnassigned ? (
               <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                 {companyUsers.map(renderUserBtn)}
                 {companyUsers.length === 0 && (
                   <p className="text-[12px] text-[var(--text-secondary)] col-span-full text-center py-4">No unassigned users.</p>
                 )}
               </div>
            ) : (
              <div className="space-y-4">
                {companyBranches.map(branch => {
                  const assignedUsers = companyUsers.filter(u => u.branchIds?.includes(branch.id));
                  const isExpanded = expandedUserBranches[`${selectedCompany.id}-${branch.id}`];
                  const displayedUsers = isExpanded ? assignedUsers : assignedUsers.slice(0, 5);

                  return (
                    <div key={branch.id} className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden">
                      <div className="bg-[var(--surface-hover)] px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">{branch.name}</h4>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                          {assignedUsers.length} users
                        </span>
                      </div>
                      <div className="p-3">
                        {assignedUsers.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-secondary)] text-center py-2">No users assigned to this branch.</p>
                        ) : (
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                            {displayedUsers.map(renderUserBtn)}
                          </div>
                        )}
                        {assignedUsers.length > 5 && (
                          <div className="mt-3 text-center border-t border-[var(--border-subtle)] pt-2">
                            <button
                              onClick={() => setExpandedUserBranches(prev => ({ ...prev, [`${selectedCompany.id}-${branch.id}`]: !isExpanded }))}
                              className="text-[11px] font-medium text-sky-500 hover:text-[var(--accent)] transition-colors"
                            >
                              {isExpanded ? "Show less" : `See all ${assignedUsers.length} users`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const noBranchUsers = companyUsers.filter(u => !u.branchIds || u.branchIds.length === 0);
                  if (noBranchUsers.length === 0) return null;
                  
                  const isExpanded = expandedUserBranches[`${selectedCompany.id}-nobranch`];
                  const displayedUsers = isExpanded ? noBranchUsers : noBranchUsers.slice(0, 5);
                  
                  return (
                    <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden">
                      <div className="bg-[var(--surface-hover)] px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">Company Level (No Branch)</h4>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                          {noBranchUsers.length} users
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          {displayedUsers.map(renderUserBtn)}
                        </div>
                        {noBranchUsers.length > 5 && (
                          <div className="mt-3 text-center border-t border-[var(--border-subtle)] pt-2">
                            <button
                              onClick={() => setExpandedUserBranches(prev => ({ ...prev, [`${selectedCompany.id}-nobranch`]: !isExpanded }))}
                              className="text-[11px] font-medium text-sky-500 hover:text-[var(--accent)] transition-colors"
                            >
                              {isExpanded ? "Show less" : `See all ${noBranchUsers.length} users`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
                {companyBranches.length === 0 && companyUsers.length === 0 && (
                   <p className="text-[12px] text-[var(--text-secondary)] text-center py-4">No branches or users in this company.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    })()}
  </div>
</div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* â”€â”€ Panel Provisioning Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeSection === "panels" && createPortal(
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md admin-overlay-backdrop"
            onClick={() => setActiveSection(null)}
          />
          <div className="fixed inset-x-0 bottom-0 top-[6vh] sm:inset-x-[2.5vw] sm:top-[4vh] sm:bottom-[2vh] z-[201] flex flex-col admin-overlay-drawer">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                    <Cpu className="h-4 w-4 text-[var(--accent)]" />
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
                  {hasRole(["system_integrator"]) && (
                    <button
                      onClick={() => setBulkPanelUploadModalOpen(true)}
                      className="flex h-[32px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-[12px] text-[12px] text-[var(--text-primary)] transition-all hover:bg-[var(--surface-raised)]"
                    >
                      <Plus className="h-[14px] w-[14px]" />
                      Use Excel
                    </button>
                  )}
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
                  {bulkPanelUploadModalOpen && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !bulkPanelUploading) {
                        setBulkPanelUploadModalOpen(false);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-[400px] mx-4 flex flex-col animate-fade-in-up">
                      <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden p-6 flex flex-col gap-4 text-center bg-[var(--surface-overlay)]">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-2">
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                            Bulk Create Panels
                          </h3>
                          <button
                            type="button"
                            onClick={() => setBulkPanelUploadModalOpen(false)}
                            disabled={bulkPanelUploading}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <p className="text-[13px] text-[var(--text-secondary)] mb-4 text-left">
                          Download the template, fill in your data, and upload the Excel file to bulk-create panels and assign them to companies and branches.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={downloadPanelTemplate}
                            disabled={bulkPanelUploading}
                            className="flex h-[36px] items-center justify-center rounded-[6px] border border-[var(--border-subtle)] bg-transparent px-5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                          >
                            Download Template
                          </button>
                          
                          <button
                            onClick={() => document.getElementById("panel-excel-upload")?.click()}
                            disabled={bulkPanelUploading}
                            className="flex h-[36px] items-center justify-center rounded-[6px] bg-[#f0ede8] px-5 text-[13px] font-medium text-[#1a1816] transition-colors hover:bg-white disabled:opacity-50"
                          >
                            {bulkPanelUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              "Upload Excel"
                            )}
                          </button>
                          <input
                            id="panel-excel-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleBulkPanelUpload}
                          />
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
                {panelFormOpen && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !panelFormLoading) {
                        setPanelFormOpen(false);
                        reset();
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-[600px] mx-4 max-h-[90vh] flex flex-col animate-fade-in-up">
                      <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                            Provision Panel
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setPanelFormOpen(false);
                              reset();
                            }}
                            disabled={panelFormLoading}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
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
                            errors.serial ? "border-[var(--status-danger-border)]" : ""
                          }`}
                          placeholder="e.g., FP-2024-001"
                          disabled={panelFormLoading}
                        />
                        {errors.serial && (
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                            errors.name ? "border-[var(--status-danger-border)]" : ""
                          }`}
                          placeholder="e.g., Building A - Floor 1"
                          disabled={panelFormLoading}
                        />
                        {errors.name && (
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                            errors.zoneCount ? "border-[var(--status-danger-border)]" : ""
                          }`}
                          placeholder="8"
                          min={1}
                          max={8}
                          disabled={panelFormLoading}
                        />
                        {errors.zoneCount && (
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                              errors.companyId ? "border-[var(--status-danger-border)]" : ""
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
                            <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                              errors.branchId ? "border-[var(--status-danger-border)]" : ""
                            }`}
                            disabled={panelFormLoading || branchesLoading}
                          >
                            <option value="">— Select a branch —</option>
                            {getBranchesForCompany(watchedPanelCompanyId || "").map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          {errors.branchId && (
                            <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                            errors.ipAddress ? "border-[var(--status-danger-border)]" : ""
                          }`}
                          placeholder="e.g., 72.167.225.142"
                          disabled={panelFormLoading || !hasRole(["super_admin", "head_office"])}
                        />
                        {errors.ipAddress && (
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {/* Panel edit form */}
                {editingPanelData && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !editPanelFormLoading) {
                        setEditingPanelData(null);
                        resetEditPanel();
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-[600px] mx-4 max-h-[90vh] flex flex-col animate-fade-in-up">
                      <div className="surface-panel rounded-[16px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                            Edit Panel
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPanelData(null);
                              resetEditPanel();
                            }}
                            disabled={editPanelFormLoading}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
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
                            editPanelErrors.name ? "border-[var(--status-danger-border)]" : ""
                          }`}
                          placeholder="e.g., Building A - Floor 1"
                          disabled={editPanelFormLoading}
                        />
                        {editPanelErrors.name && (
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                              editPanelErrors.companyId ? "border-[var(--status-danger-border)]" : ""
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
                            <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                              editPanelErrors.branchId ? "border-[var(--status-danger-border)]" : ""
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
                            <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                            editPanelErrors.ipAddress ? "border-[var(--status-danger-border)]" : ""
                          }`}
                          placeholder="e.g., 72.167.225.142"
                          disabled={editPanelFormLoading || !hasRole(["super_admin", "head_office"])}
                        />
                        {editPanelErrors.ipAddress && (
                          <p className="mt-1 text-[12px] text-[var(--color-error)]">
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
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {panelsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] opacity-50" />
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-0 md:gap-0 flex-1 min-h-0">
  {/* ââ Left Panel: Company List ââ */}
  <div className={`${selectedPanelCompanyId ? 'hidden md:flex' : 'flex'} flex-col md:w-[240px] lg:w-[280px] shrink-0 border-r border-[var(--border-subtle)] overflow-hidden`}>
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-[var(--border-subtle)]">
        {[...(hasRole(['super_admin']) ? [{ id: 'unassigned', name: 'Unassigned', description: 'Panels without a company' }] : []), ...filteredCompanies].map((company) => {
          const isUnassigned = company.id === 'unassigned';
          const isSelected = selectedPanelCompanyId === company.id;
          const panelCount = isUnassigned 
            ? filteredPanels.filter(p => !p.companyId).length 
            : filteredPanels.filter(p => p.companyId === company.id).length;
          
          return (
            <button
              key={company.id}
              onClick={() => setSelectedPanelCompanyId(company.id)}
              className={`w-full flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-left transition-colors group ${
                isSelected
                  ? 'bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]'
                  : 'hover:bg-[var(--surface-hover)] border-l-2 border-l-transparent'
              }`}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[12px] font-medium text-[var(--text-on-accent)] shadow-sm"
                style={{ backgroundColor: isUnassigned ? '#64748b' : getAvatarColor(company.name) }}
              >
                {isUnassigned ? <Cpu className='h-3.5 w-3.5 text-white' /> : company.logoUrl ? <img src={company.logoUrl} alt={company.name} className='h-full w-full object-cover' /> : company.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                    {company.name}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                  {company.description || "No description"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 text-[9px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                  <Cpu className="h-[9px] w-[9px]" />
                  {panelCount}
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity md:block hidden" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>

  {/* ââ Right Panel: Company Detail & Branches ââ */}
  <div className={`${selectedPanelCompanyId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-h-0 overflow-hidden`}>
    {(() => {
      if (!selectedPanelCompanyId) {
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Cpu className="mx-auto h-12 w-12 text-[var(--text-secondary)] opacity-30 mb-3" />
              <p className="text-[14px] font-medium text-[var(--text-secondary)]">Select a company</p>
              <p className="text-[12px] text-[var(--text-secondary)] opacity-60 mt-1">Choose a company from the list to view its panels</p>
            </div>
          </div>
        );
      }

      const isUnassigned = selectedPanelCompanyId === 'unassigned';
      const selectedCompany = isUnassigned 
        ? { id: 'unassigned', name: 'Unassigned', description: 'Panels without a company' } 
        : companies.find(c => c.id === selectedPanelCompanyId);
      
      if (!selectedCompany) return null;

      const companyPanels = isUnassigned 
        ? filteredPanels.filter(p => !p.companyId)
        : filteredPanels.filter(p => p.companyId === selectedCompany.id);

      const companyBranches = isUnassigned ? [] : branches.filter(b => b.companyId === selectedCompany.id);
      
      const renderPanelBtn = (panel: Panel) => {
        const isAlarm = panel.zones?.some((z) => z);
        const statusColor = isAlarm ? "bg-[var(--color-error)]" : "bg-[var(--color-success)]";
        return (
          <button
            key={panel.serial || Math.random().toString()}
            onClick={() => openEditPanel(panel)}
            className="flex items-center gap-2 p-2 rounded-[6px] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors text-left group min-w-0"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[var(--surface-muted)] border border-[var(--border-subtle)]">
              <div className={`h-[6px] w-[6px] rounded-full ${statusColor} shadow-sm`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{panel.name || "Unknown Panel"}</p>
              <p className="text-[9px] text-[var(--text-secondary)] truncate">S/N: {panel.serial}</p>
            </div>
            {panel.serial && hasRole([
                                  "super_admin",
                                  "head_office",
                                  "system_integrator",
                                ]) && (
              <div
                onClick={(e) => { e.stopPropagation(); handleDeletePanel(panel.serial || ""); }}
                className="h-5 w-5 flex items-center justify-center rounded text-[var(--color-error)] opacity-0 group-hover:opacity-100 hover:bg-[var(--status-danger-bg)] transition-all shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </div>
            )}
          </button>
        );
      };

      return (
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="px-3 sm:px-5 pt-3 pb-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPanelCompanyId(null)}
                className="flex md:hidden h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[14px] font-semibold text-[var(--text-on-accent)] shadow-sm"
                style={{ backgroundColor: isUnassigned ? '#64748b' : getAvatarColor(selectedCompany.name) }}
              >
                {isUnassigned ? <Cpu className='h-4 w-4 text-white' /> : selectedCompany.logoUrl ? <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className='h-full w-full object-cover' /> : selectedCompany.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-[var(--text-primary)] truncate">{selectedCompany.name}</h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{companyPanels.length} total panels</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 sm:px-5 py-3">
            {isUnassigned ? (
               <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                 {companyPanels.map(renderPanelBtn)}
                 {companyPanels.length === 0 && (
                   <p className="text-[12px] text-[var(--text-secondary)] col-span-full text-center py-4">No unassigned panels.</p>
                 )}
               </div>
            ) : (
              <div className="space-y-4">
                {companyBranches.map(branch => {
                  const assignedPanels = companyPanels.filter(p => p.branchId === branch.id);
                  
                  return (
                    <div key={branch.id} className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden">
                      <div className="bg-[var(--surface-hover)] px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">{branch.name}</h4>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                          {assignedPanels.length} panels
                        </span>
                      </div>
                      <div className="p-3">
                        {assignedPanels.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-secondary)] text-center py-2">No panels assigned to this branch.</p>
                        ) : (
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                            {assignedPanels.map(renderPanelBtn)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const noBranchPanels = companyPanels.filter(p => !p.branchId);
                  if (noBranchPanels.length === 0) return null;
                  
                  return (
                    <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden">
                      <div className="bg-[var(--surface-hover)] px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">Company Level (No Branch)</h4>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                          {noBranchPanels.length} panels
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          {noBranchPanels.map(renderPanelBtn)}
                        </div>
                      </div>
                    </div>
                  )
                })()}
                {companyBranches.length === 0 && companyPanels.length === 0 && (
                   <p className="text-[12px] text-[var(--text-secondary)] text-center py-4">No branches or panels in this company.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    })()}
  </div>
</div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ð Delete Company Modal ð */}
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
                      className="px-4 py-2 rounded-[6px] bg-[var(--status-danger-bg)] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)] transition-colors font-medium"
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4 text-[var(--color-error)] font-medium">
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
      <CreateUserModal
        isOpen={userFormOpen}
        onClose={() => { setUserFormOpen(false); setEditingUserData(null); }}
        onSuccess={(msg) => { showSuccess(msg); loadUsers(); }}
        onError={(msg) => { setError(msg); }}
        editingUser={editingUserData}
      />
    </div>
  );
}
