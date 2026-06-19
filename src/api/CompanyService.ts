import apiClient from './axios';

export interface Company {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

let cachedCompanies: Company[] | null = null;
let lastFetchTime = 0;

export const CompanyService = {
  invalidateCache() {
    cachedCompanies = null;
    lastFetchTime = 0;
  },
  async createCompany(data: { name: string; description?: string }): Promise<Company> {
    const response = await apiClient.post('/companies', data);
    this.invalidateCache();
    return response.data;
  },
  
  async getCompanies(): Promise<Company[]> {
    if (cachedCompanies && Date.now() - lastFetchTime < 60000) {
      return cachedCompanies;
    }
    const response = await apiClient.get('/companies');
    cachedCompanies = response.data.companies;
    lastFetchTime = Date.now();
    return cachedCompanies;
  },
  
  async updateCompany(id: string, data: Partial<Company>): Promise<void> {
    await apiClient.patch(`/companies/${id}`, data);
    this.invalidateCache();
  },
  
  async deleteCompany(id: string, deleteUsers?: boolean): Promise<void> {
    await apiClient.delete(`/companies/${id}${deleteUsers ? '?deleteUsers=true' : ''}`);
    this.invalidateCache();
  }
};
