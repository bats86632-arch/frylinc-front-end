import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { User, Role } from "../types";
import apiClient from "../api/axios";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  saveDisplayName: (displayName: string) => Promise<void>;
  hasRole: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleHierarchy: Record<Role, number> = {
  super_admin: 4,
  head_office: 3,
  system_integrator: 2,
  end_user: 1,
};

// ─── Lightweight localStorage session cache ──────────────────────────────────
// Persists user claims across PWA restarts so returning users never see the
// "Loading Fyrlinc…" screen — Firebase verifies the session silently in the
// background while the dashboard renders immediately with the cached data.
const CACHE_KEY = "fyrlinc_ucache_v1";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: User = JSON.parse(raw);
    // Basic sanity check — uid and role are required
    if (!c?.uid || !c?.role) return null;
    return c;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    /* storage full or unavailable (private mode) */
  }
}

function clearCachedUser(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  // Lazy initialisers run once — reads localStorage synchronously at mount
  const [userData, setUserData] = useState<User | null>(readCachedUser);
  const [role, setRole] = useState<Role | null>(
    () => readCachedUser()?.role ?? null,
  );
  // Skip the loading screen entirely if we have a cached user; Firebase will
  // verify and update in the background via onAuthStateChanged.
  const [loading, setLoading] = useState(() => readCachedUser() === null);

  const loadUserProfile = async (user: FirebaseUser, forceRefresh = false) => {
    // Phase 1: Instant resolution from the cached JWT (no network required when fresh)
    const tokenResult = await user.getIdTokenResult(forceRefresh);
    const customClaims = tokenResult.claims;

    const initialUserData: User = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "User",
      role: (customClaims.role as Role) || "end_user",
      companyId: customClaims.companyId as string | undefined,
      branchIds: (customClaims.branchIds as string[]) || [],
    };

    setUserData(initialUserData);
    setRole(initialUserData.role);
    writeCachedUser(initialUserData); // Keep cache fresh after every auth check

    // Phase 2: Silent REST sync — updates display name, role, etc. from the server
    apiClient
      .get("/me")
      .then((response) => {
        const profile = response.data;
        setUserData((prev) => {
          if (!prev) return prev;
          const updatedRole = profile.role || prev.role;
          setRole(updatedRole);
          const updated: User = {
            ...prev,
            email: user.email || profile.email || prev.email,
            displayName:
              profile.displayName || user.displayName || prev.displayName,
            role: updatedRole,
            companyId: profile.companyId || prev.companyId,
            branchIds: profile.branchIds || prev.branchIds,
          };
          writeCachedUser(updated); // Persist freshest data for the next cold start
          return updated;
        });
      })
      .catch((error) => {
        console.warn("Silent sync failed:", error);
      });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          await loadUserProfile(user);
        } catch (error) {
          console.error("Error loading user profile:", error);
          // If Firebase rejects the session, evict the stale cache immediately
          clearCachedUser();
          setUserData(null);
          setRole(null);
        }
      } else {
        // Signed out — clear cache so the next PWA open goes through full auth
        clearCachedUser();
        setUserData(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    await loadUserProfile(auth.currentUser, true);
  };

  const saveDisplayName = async (displayName: string) => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    await apiClient.patch("/me/profile", { displayName: trimmed });
    await refreshUserData();
  };

  const logout = async () => {
    clearCachedUser(); // Evict before signOut so next mount starts clean
    await signOut(auth);
    setCurrentUser(null);
    setUserData(null);
    setRole(null);
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!role) return false;
    const userLevel = roleHierarchy[role];
    return allowedRoles.some(
      (allowedRole) => userLevel >= roleHierarchy[allowedRole],
    );
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    role,
    loading,
    logout,
    refreshUserData,
    saveDisplayName,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
