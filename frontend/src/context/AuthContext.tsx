'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/lib/api';

// Re-export FirebaseUser as an alias so internal code can import it if needed
export type { FirebaseUser };

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
    await signOut(auth);
    setUser(null);
    // Clear the session cookie set by the API route
    await fetch('/api/session', { method: 'DELETE' });
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Load extra profile data from Firestore
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          const d = snap.data()!;
          setUser({
            id:         firebaseUser.uid,
            name:       d.name       ?? firebaseUser.displayName ?? '',
            email:      d.email      ?? firebaseUser.email       ?? '',
            avatar:     d.avatar     ?? null,
            created_at: d.created_at?.toDate?.().toISOString() ?? new Date().toISOString(),
          });
        } else {
          // Fallback: build user from Firebase Auth profile only
          setUser({
            id:     firebaseUser.uid,
            name:   firebaseUser.displayName ?? '',
            email:  firebaseUser.email       ?? '',
            avatar: null,
          });
        }
      } catch {
        setUser({
          id:     firebaseUser.uid,
          name:   firebaseUser.displayName ?? '',
          email:  firebaseUser.email       ?? '',
          avatar: null,
        });
      }
      setLoading(false);
    });

    return unsub;
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
