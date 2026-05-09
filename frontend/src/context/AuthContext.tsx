'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, authApi } from '@/lib/api';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user:       User | null;
  loading:    boolean;
  logout:     () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user:       null,
  loading:    true,
  logout:     async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Clear the session cookie set by the API route if still used, or just redirect
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    router.push('/login');
  }, [router]);

  useEffect(() => {
    let mounted = true;

    async function loadUser(session: Session | null) {
      if (!session) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await authApi.me();
        if (mounted) setUser(res.user);
      } catch (err) {
        // Fallback user from auth session
        if (mounted) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || '',
            email: session.user.email || '',
            avatar: null,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
