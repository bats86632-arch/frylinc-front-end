import apiClient from './axios';
import { Company } from '../types';

export const CompanyService = {
  async getCompanies(): Promise<Company[]> {
    const response = await apiClient.get('/companies');
    return response.data.companies;
  },

  async createCompany(data: {
    name: string;
    description?: string;
  }): Promise<{ ok: boolean; companyId: string }> {
    const response = await apiClient.post('/companies', data);
    return response.data;
  }
};
