import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { fetchApi, getAuthToken, setAuthToken, removeAuthToken } from './api';

export type Role = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string | null;
  memberships: {
    role: Role;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeOrgId: string | null;
  activeRole: Role | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  setActiveOrgId: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgState] = useState<string | null>(localStorage.getItem('activeOrgId'));

  const setActiveOrgId = (orgId: string) => {
    localStorage.setItem('activeOrgId', orgId);
    setActiveOrgState(orgId);
  };

  const loadProfile = async () => {
    try {
      const data = await fetchApi('/auth/me');
      setUser(data);
      if (data.memberships.length > 0) {
        if (!activeOrgId || !data.memberships.find((m: any) => m.organization.id === activeOrgId)) {
          setActiveOrgId(data.memberships[0].organization.id);
        }
      } else {
        setActiveOrgId(''); // No orgs
      }
    } catch (err) {
      removeAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (getAuthToken()) {
      loadProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (token: string) => {
    setAuthToken(token);
    await loadProfile();
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem('activeOrgId');
    setUser(null);
    setActiveOrgState(null);
  };

  const activeRole = user?.memberships.find(m => m.organization.id === activeOrgId)?.role || null;

  return (
    <AuthContext.Provider value={{ user, isLoading, activeOrgId, activeRole, login, logout, setActiveOrgId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
