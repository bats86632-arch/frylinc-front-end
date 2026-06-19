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
    address?: string;
    supervisorName?: string;
    contactNumber?: string;
    emailAddress?: string;
  }): Promise<{ ok: boolean; branchId: string }> {
    const response = await apiClient.post('/branches', data);
    this.invalidateCache();
    return response.data;
  },
};
