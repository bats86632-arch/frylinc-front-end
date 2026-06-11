import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, Role } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const customClaims = tokenResult.claims;

          const userData: User = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            role: (customClaims.role as Role) || 'end_user',
            groups: (customClaims.groups as string[]) || []
          };

          setUserData(userData);
          setRole(userData.role);
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
