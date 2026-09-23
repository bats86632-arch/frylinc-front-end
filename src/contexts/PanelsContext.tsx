import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db, reconnectFirestore } from "../config/firebase";
import { Panel } from "../types";
import { useAuth } from "./AuthContext";
import { useAppLifecycle } from "../platform/lifecycle";
import { useNetworkStatus } from "../platform/network";

interface PanelsContextType {
  panels: Panel[];
  loading: boolean;
  error: Error | null;
  refreshPanels: () => Promise<void>;
}

const PanelsContext = createContext<PanelsContextType | undefined>(undefined);

export function PanelsProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userData } = useAuth();
  const { connected } = useNetworkStatus();

  // Reconnect Firestore when app transitions back to active/foreground
  useAppLifecycle({
    onStateChange: (state) => {
      if (state === "active") {
        reconnectFirestore();
      }
    },
  });

  // Reconnect Firestore when network connectivity is restored
  useEffect(() => {
    if (connected) {
      reconnectFirestore();
    }
  }, [connected]);

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

    const unsubscribes: (() => void)[] = [];
    const panelMap = new Map<string, Panel>();
    
    setLoading(true);
    setError(null);

    let initialLoadsPending = queries.length;

    queries.forEach((q) => {
      const unsub = onSnapshot(
        q,
        (snap) => {
          // Process delta changes
          snap.docChanges().forEach((change) => {
            if (change.type === "removed") {
              panelMap.delete(change.doc.id);
            } else {
              panelMap.set(change.doc.id, {
                serial: change.doc.id,
                ...change.doc.data(),
              } as Panel);
            }
          });

          // Mark this query's initial load as done
          if (initialLoadsPending > 0) {
            initialLoadsPending--;
          }
          if (initialLoadsPending === 0) {
            setLoading(false);
          }

          setPanels(Array.from(panelMap.values()));
        },
        (err) => {
          console.error("Error in onSnapshot:", err);
          setError(err);
          setLoading(false);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [userData]);

  const refreshPanels = async () => {
    try {
      await reconnectFirestore();
    } catch (e) {
      console.warn("Error refreshing Firestore network:", e);
    }
  };

  const value = { panels, loading, error, refreshPanels };

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
