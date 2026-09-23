import apiClient from './axios';
import { db } from '../config/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export interface Company {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  enabled?: boolean;
}

let cachedCompanies: Company[] | null = null;
let lastFetchTime = 0;

export const CompanyService = {
  invalidateCache() {
    cachedCompanies = null;
    lastFetchTime = 0;
  },
  async createCompany(data: { name: string; description?: string; logoUrl?: string }): Promise<Company> {
    const response = await apiClient.post('/companies', data);
    this.invalidateCache();
    const result = response.data;
    return { id: result.companyId || result.id, name: data.name, description: data.description, logoUrl: data.logoUrl };
  },
  
  async getCompanies(): Promise<Company[]> {
    if (cachedCompanies && Date.now() - lastFetchTime < 60000) {
      return cachedCompanies;
    }
    try {
      const response = await apiClient.get('/companies');
      cachedCompanies = response.data.companies || [];
      lastFetchTime = Date.now();
      return cachedCompanies as Company[];
    } catch (apiErr) {
      console.warn('REST API /companies failed, falling back to direct Firestore fetch:', apiErr);
      try {
        const q = query(collection(db, 'companies'), orderBy('name'));
        const snap = await getDocs(q);
        const companies = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Company[];
        cachedCompanies = companies;
        lastFetchTime = Date.now();
        return companies;
      } catch (fsErr) {
        console.error('Direct Firestore fetch for companies also failed:', fsErr);
        throw apiErr;
      }
    }
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
