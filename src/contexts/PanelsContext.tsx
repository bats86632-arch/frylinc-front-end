import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { Panel } from "../types";
import { useAuth } from "./AuthContext";

interface PanelsContextType {
  panels: Panel[];
  loading: boolean;
  error: Error | null;
}

const PanelsContext = createContext<PanelsContextType | undefined>(undefined);

export function PanelsProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData) {
      // No authenticated user - clear panels and mark as done loading
      setPanels([]);
      setLoading(false);
      return;
    }

    // Reset to loading whenever we (re-)establish a listener for a given user.
    // This prevents a stale loading=false state from showing an empty dashboard
    // during the gap between userData becoming available and the first snapshot.
    setLoading(true);

    let q;
    if (userData.role === "super_admin") {
      q = query(collection(db, "panels"));
    } else if (userData.role === "head_office") {
      q = query(
        collection(db, "panels"),
        where("companyId", "==", userData.companyId || ""),
      );
    } else {
      if (!userData.branchIds || userData.branchIds.length === 0) {
        setPanels([]);
        setLoading(false);
        return;
      }
      q = query(
        collection(db, "panels"),
        where("branchId", "in", userData.branchIds),
      );
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
        console.error("Error fetching panels:", err);
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userData]);

  const value = { panels, loading, error };

  return (
    <PanelsContext.Provider value={value}>{children}</PanelsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePanelsContext() {
  const context = useContext(PanelsContext);
  if (context === undefined) {
    throw new Error("usePanelsContext must be used within a PanelsProvider");
  }
  return context;
}
