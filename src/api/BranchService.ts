import apiClient from './axios';
import { Branch } from '../types';

let cachedBranches: Branch[] | null = null;
let lastFetchTime = 0;

export const BranchService = {
  invalidateCache() {
    cachedBranches = null;
    lastFetchTime = 0;
  },
  async getBranches(): Promise<Branch[]> {
    if (cachedBranches && Date.now() - lastFetchTime < 60000) {
      return cachedBranches;
    }
    const response = await apiClient.get('/branches');
    const branches = (response.data.branches || []).map((b: Branch & { id?: string }) => ({
      ...b,
      id: b.id || b.branchId,
    }));
    cachedBranches = branches;
    lastFetchTime = Date.now();
    return branches;
  },

  async createBranch(data: {
    name: string;
    companyId: string;
    bsrCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    supervisorName?: string;
    contactNumber?: string;
    emailAddress?: string;
  }): Promise<{ ok: boolean; branchId: string }> {
    const response = await apiClient.post('/branches', data);
    this.invalidateCache();
    return response.data;
  },
  async updateBranch(id: string, data: Partial<Branch>): Promise<void> {
    await apiClient.patch(`/branches/${id}`, data);
    this.invalidateCache();
  },

  async deleteBranch(id: string, deletePanels: boolean = false): Promise<void> {
    await apiClient.delete(`/branches/${id}?deletePanels=${deletePanels}`);
    this.invalidateCache();
  },
};
