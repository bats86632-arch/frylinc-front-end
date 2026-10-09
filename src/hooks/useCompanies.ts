import { useState, useEffect, useCallback } from 'react';
import { CompanyService, Company } from '../api/CompanyService';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_COMPANIES } from '../mock/demoData';

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData, isDemoMode } = useAuth();

  const fetchCompanies = useCallback(async (forceRefresh = false) => {
    if (isDemoMode) {
      setCompanies(DEMO_COMPANIES);
      setLoading(false);
      setError(null);
      return;
    }
    if (!userData) {
      setCompanies([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      if (forceRefresh) {
        CompanyService.invalidateCache();
      }
      let data = await CompanyService.getCompanies();
      
      if (userData.role === 'system_integrator' || userData.role === 'end_user') {
        const assignedIds = Object.keys(userData.assignments || {});
        data = data.filter(c => assignedIds.includes(c.id));
      } else if (userData.role === 'head_office') {
        const hoId = userData.companyId || Object.keys(userData.assignments || {})[0];
        data = data.filter(c => c.id === hoId);
      }
      
      setCompanies(data);
      setError(null);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [userData, isDemoMode]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const reloadCompanies = useCallback(() => fetchCompanies(true), [fetchCompanies]);

  return { companies, loading, error, reloadCompanies };
}

