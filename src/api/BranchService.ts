import apiClient from './axios';
import { Branch } from '../types';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

let cachedBranches: Branch[] | null = null;
let lastFetchTime = 0;

export const BranchService = {
  invalidateCache() {
    cachedBranches = null;
    lastFetchTime = 0;
  },
  async getBranches(companyId?: string, forceRefresh = false): Promise<Branch[]> {
    if (!companyId && !forceRefresh && cachedBranches && Date.now() - lastFetchTime < 60000) {
      return cachedBranches;
    }
    try {
      const url = companyId ? `/branches?companyId=${encodeURIComponent(companyId)}` : '/branches';
      const response = await apiClient.get(url);
      const branches = (response.data.branches || []).map((b: Branch & { id?: string }) => ({
        ...b,
        id: b.id || b.branchId,
      }));
      if (!companyId) {
        cachedBranches = branches;
        lastFetchTime = Date.now();
      } else if (cachedBranches) {
        const otherBranches = cachedBranches.filter((b) => b.companyId !== companyId);
        cachedBranches = [...otherBranches, ...branches];
      }
      return branches;
    } catch (apiErr) {
      console.warn('REST API /branches failed, falling back to direct Firestore fetch:', apiErr);
      try {
        let snap;
        if (companyId) {
          snap = await getDocs(query(collection(db, 'branches'), where('companyId', '==', companyId)));
        } else {
          snap = await getDocs(collection(db, 'branches'));
        }
        const branches = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            branchId: data.branchId || d.id,
            name: data.name,
            companyId: data.companyId,
            ...data,
          } as Branch;
        });
        if (!companyId) {
          cachedBranches = branches;
          lastFetchTime = Date.now();
        } else if (cachedBranches) {
          const otherBranches = cachedBranches.filter((b) => b.companyId !== companyId);
          cachedBranches = [...otherBranches, ...branches];
        }
        return branches;
      } catch (fsErr) {
        console.error('Direct Firestore fetch for branches also failed:', fsErr);
        throw apiErr;
      }
    }
  },

  async getBranchesByCompany(companyId: string): Promise<Branch[]> {
    return this.getBranches(companyId, true);
  },

  
  async createBranchesBulk(branches: {
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
  }[]): Promise<{ ok: boolean; addedCount: number }> {
    const response = await apiClient.post('/branches/bulk', { branches });
    this.invalidateCache();
    return response.data;
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
