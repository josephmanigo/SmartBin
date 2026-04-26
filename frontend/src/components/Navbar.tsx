'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Trash2, LayoutDashboard, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const pathname         = usePathname();
  const [open, setOpen]  = useState(false);
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-transparent backdrop-blur-xl shadow-sm backdrop-saturate-[1.5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-12 h-12 flex items-center justify-center transition-shadow">
            <img src="/logo-cropped.png" alt="SmartBin" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            <span className="text-blue-700">Smart</span>
            <span className="text-emerald-500">Bin</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
        </nav>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100/60 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-slate-900 text-sm font-semibold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() ?? 'U'
              )}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {user?.name ?? 'User'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-52 glass-card py-1 z-50 shadow-xl shadow-black/40 animate-[slideUp_0.15s_ease]">
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100/50 transition-colors sm:hidden"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100/50 transition-colors"
                >
                  <User className="w-4 h-4" /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
