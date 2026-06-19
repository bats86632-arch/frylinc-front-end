import { useState, useEffect, useCallback } from 'react';
import { BranchService } from '../api/BranchService';
import { Branch } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  const fetchBranches = useCallback(async () => {
    if (!userData) {
      setBranches([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await BranchService.getBranches();
      setBranches(data);
      setError(null);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return { branches, loading, error, reloadBranches: fetchBranches };
}
