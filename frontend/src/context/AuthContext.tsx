'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('smartbin_token');
    localStorage.removeItem('smartbin_user');
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('smartbin_user');
    const token  = localStorage.getItem('smartbin_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
        // Silently validate token
        authApi.me().catch(() => logout());
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  const login = (token: string, userData: User) => {
    localStorage.setItem('smartbin_token', token);
    localStorage.setItem('smartbin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = (userData: User) => {
    localStorage.setItem('smartbin_user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
