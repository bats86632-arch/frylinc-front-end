import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, Role } from '../types';
import apiClient from '../api/axios';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
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

  const loadUserProfile = async (user: FirebaseUser) => {
    const tokenResult = await user.getIdTokenResult(true);
    const customClaims = tokenResult.claims;
    const response = await apiClient.get('/me');
    const profile = response.data;

    const userData: User = {
      uid: user.uid,
      email: user.email || profile.email || '',
      displayName: profile.displayName || user.displayName || user.email?.split('@')[0] || 'User',
      role: (customClaims.role as Role) || profile.role || 'end_user',
      companyId: profile.companyId || customClaims.companyId,
      branchIds: profile.branchIds || customClaims.branchIds || []
    };

    setUserData(userData);
    setRole(userData.role);
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
    await loadUserProfile(auth.currentUser);
  };

  const saveDisplayName = async (displayName: string) => {
    const trimmed = displayName.trim();
    if (!trimmed) return;

    await apiClient.patch('/me/profile', { displayName: trimmed });
    await refreshUserData();
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
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
    login,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
