import apiClient from './axios';

export interface Company {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

export const CompanyService = {
  async getCompanies(): Promise<Company[]> {
    const response = await apiClient.get('/companies');
    return response.data.companies;
  }
};
