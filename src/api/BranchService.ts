import apiClient from './axios';
import { Branch } from '../types';

export const BranchService = {
  async getBranches(): Promise<Branch[]> {
    const response = await apiClient.get('/branches');
    return (response.data.branches || []).map((b: Branch & { id?: string }) => ({
      ...b,
      id: b.id || b.branchId,
    }));
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
    return response.data;
  },
};
