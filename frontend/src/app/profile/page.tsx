'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Calendar, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { authApi, User as UserType } from '@/lib/api';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, loading: al, updateUser } = useAuth();
  const router                = useRouter();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [loading, setLoad]    = useState(true);

  useEffect(() => {
    if (!al && !user) { router.replace('/login'); return; }
    if (!al && user) {
      authApi.me()
        .then(r => setProfile(r.user))
        .catch(() => setProfile(user))
        .finally(() => setLoad(false));
    }
  }, [al, user, router]);

  if (al || loading) {
    return (
      <div className="bg-mesh min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>

        <div className="glass-card p-8">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer mb-4" onClick={() => document.getElementById('avatar-upload')?.click()}>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-slate-900 text-4xl font-bold shadow-lg shadow-emerald-500/30 overflow-hidden relative border-4 border-white">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.charAt(0).toUpperCase()
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </div>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  // Check size (max 2MB)
                  if (file.size > 2 * 1024 * 1024) {
                    import('react-hot-toast').then(t => t.default.error('Image must be less than 2MB.'));
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const base64 = ev.target?.result as string;
                    try {
                      setLoad(true);
                      await authApi.updateAvatar(base64);
                      const updatedUser = { ...profile!, avatar: base64 };
                      setProfile(updatedUser);
                      updateUser(updatedUser);
                      import('react-hot-toast').then(t => t.default.success('Avatar updated!'));
                    } catch (error) {
                      import('react-hot-toast').then(t => t.default.error('Failed to update avatar.'));
                    } finally {
                      setLoad(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">{profile?.name}</h2>
            <p className="text-slate-500 text-sm">{profile?.email}</p>
          </div>

          {/* Info rows */}
          <div className="space-y-4">
            {[
              { icon: User,     label: 'Full Name',  value: profile?.name     ?? '—' },
              { icon: Mail,     label: 'Email',      value: profile?.email    ?? '—' },
              { icon: Calendar, label: 'Member Since', value: profile?.created_at
                  ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                  : '—'
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 p-4 rounded-xl bg-slate-100/40">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-slate-900 font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
