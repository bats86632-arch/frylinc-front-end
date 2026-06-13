import { useState, useEffect, useCallback } from 'react';
import { CompanyService, Company } from '../api/CompanyService';
import { useAuth } from '../contexts/AuthContext';

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  const fetchCompanies = useCallback(async () => {
    if (!userData) {
      setCompanies([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await CompanyService.getCompanies();
      setCompanies(data);
      setError(null);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { companies, loading, error, reloadCompanies: fetchCompanies };
}

