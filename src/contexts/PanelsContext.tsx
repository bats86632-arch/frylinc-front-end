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

    const queries = [];

    if (userData.role === "super_admin") {
      queries.push(query(collection(db, "panels")));
    } else if (userData.role === "head_office") {
      queries.push(
        query(
          collection(db, "panels"),
          where("companyId", "==", userData.companyId || "")
        )
      );
    } else if (userData.role === "system_integrator") {
      const assignments = userData.assignments || {};
      for (const [compId, branches] of Object.entries(assignments)) {
        if (branches.includes("*")) {
          queries.push(
            query(
              collection(db, "panels"),
              where("companyId", "==", compId)
            )
          );
        } else if (branches.length > 0) {
          for (let i = 0; i < branches.length; i += 10) {
            const chunk = branches.slice(i, i + 10);
            queries.push(
              query(
                collection(db, "panels"),
                where("companyId", "==", compId),
                where("branchId", "in", chunk)
              )
            );
          }
        }
      }
    } else {
      if (userData.branchIds && userData.branchIds.length > 0) {
        for (let i = 0; i < userData.branchIds.length; i += 10) {
          const chunk = userData.branchIds.slice(i, i + 10);
          queries.push(
            query(
              collection(db, "panels"),
              where("companyId", "==", userData.companyId || ""),
              where("branchId", "in", chunk)
            )
          );
        }
      }
    }

    if (queries.length === 0) {
      setPanels([]);
      setLoading(false);
      return;
    }

    const unsubscribes: Array<() => void> = [];
    const results = new Map<number, Panel[]>();
    
    let initialLoadCount = 0;
    let hasError = false;

    queries.forEach((q, index) => {
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (hasError) return;
          const panelList: Panel[] = [];
          snapshot.forEach((doc) => {
            panelList.push({ serial: doc.id, ...doc.data() } as Panel);
          });
          results.set(index, panelList);
          
          if (initialLoadCount < queries.length) {
            initialLoadCount++;
          }
          
          if (initialLoadCount === queries.length) {
            const allPanels = Array.from(results.values()).flat();
            const uniquePanels = Array.from(
              new Map(allPanels.map((p) => [p.serial, p])).values()
            );
            setPanels(uniquePanels);
            setLoading(false);
          }
        },
        (err) => {
          console.error("Error fetching panels:", err);
          if (!hasError) {
            hasError = true;
            setError(err);
            setLoading(false);
          }
        }
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
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
