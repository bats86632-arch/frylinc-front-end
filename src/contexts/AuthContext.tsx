import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, Role } from '../types';
import apiClient from '../api/axios';

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
  end_user: 1
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (user: FirebaseUser, forceRefresh = false) => {
    // Phase 1: Instant load from cached JWT
    const tokenResult = await user.getIdTokenResult(forceRefresh);
    const customClaims = tokenResult.claims;

    const initialUserData: User = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'User',
      role: (customClaims.role as Role) || 'end_user',
      companyId: customClaims.companyId as string | undefined,
      branchIds: (customClaims.branchIds as string[]) || []
    };

    setUserData(initialUserData);
    setRole(initialUserData.role);

    // Phase 2: Silent background sync
    apiClient.get('/me')
      .then(response => {
        const profile = response.data;
        setUserData(prev => {
          if (!prev) return prev;
          const updatedRole = profile.role || prev.role;
          setRole(updatedRole); // Keep role state in sync
          return {
            ...prev,
            email: user.email || profile.email || prev.email,
            displayName: profile.displayName || user.displayName || prev.displayName,
            role: updatedRole,
            companyId: profile.companyId || prev.companyId,
            branchIds: profile.branchIds || prev.branchIds
          };
        });
      })
      .catch(error => {
        console.warn('Silent sync failed:', error);
      });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          await loadUserProfile(user);
        } catch (error) {
          console.error('Error fetching custom claims:', error);
          setUserData(null);
          setRole(null);
        }
      } else {
        setUserData(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    await loadUserProfile(auth.currentUser, true);
  };

  const saveDisplayName = async (displayName: string) => {
    const trimmed = displayName.trim();
    if (!trimmed) return;

    await apiClient.patch('/me/profile', { displayName: trimmed });
    await refreshUserData();
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserData(null);
    setRole(null);
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!role) return false;

    const userLevel = roleHierarchy[role];
    return allowedRoles.some(allowedRole => {
      const allowedLevel = roleHierarchy[allowedRole];
      return userLevel >= allowedLevel;
    });
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    role,
    loading,
    logout,
    refreshUserData,
    saveDisplayName,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
