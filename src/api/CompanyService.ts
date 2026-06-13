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
  },
  
  async updateCompany(id: string, data: Partial<Company>): Promise<void> {
    await apiClient.patch(`/companies/${id}`, data);
  },
  
  async deleteCompany(id: string, deleteUsers?: boolean): Promise<void> {
    await apiClient.delete(`/companies/${id}${deleteUsers ? '?deleteUsers=true' : ''}`);
  }
};
