import { useState, useEffect } from 'react';
import { CompanyService, Company } from '../api/CompanyService';
import { useAuth } from '../contexts/AuthContext';

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    async function fetchCompanies() {
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
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch companies');
      } finally {
        setLoading(false);
      }
    }

    fetchCompanies();
  }, [userData]);

  return { companies, loading, error };
}
