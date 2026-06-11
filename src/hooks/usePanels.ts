import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Panel } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function usePanels() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }

    let q;
    if (userData.role === 'super_admin') {
      q = query(collection(db, 'panels'));
    } else if (userData.role === 'head_office') {
      if (!userData.companyId) {
        setPanels([]);
        setLoading(false);
        return;
      }
      q = query(collection(db, 'panels'), where('companyId', '==', userData.companyId));
    } else {
      const branchIds = userData.branchIds || [];
      if (branchIds.length === 0) {
        setPanels([]);
        setLoading(false);
        return;
      }
      q = query(collection(db, 'panels'), where('branchId', 'in', branchIds));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const panelList: Panel[] = [];
        snapshot.forEach((doc) => {
          panelList.push({ serial: doc.id, ...doc.data() } as Panel);
        });
        setPanels(panelList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching panels:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData]);

  return { panels, loading, error };
}

export function usePanel(serial: string) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!serial) {
      setLoading(false);
      return;
    }

    const panelRef = doc(db, 'panels', serial);
    const unsubscribe = onSnapshot(
      panelRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setPanel({ serial: docSnap.id, ...docSnap.data() } as Panel);
        } else {
          setPanel(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching panel:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [serial]);

  return { panel, loading, error };
}
