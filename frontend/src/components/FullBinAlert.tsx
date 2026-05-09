'use client';

import { useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { Bin } from '@/lib/api';

interface Props {
  fullBins:   Bin[];
  onDismiss:  (id: string) => void;
}

export default function FullBinAlert({ fullBins, onDismiss }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play alert sound when a new full bin appears
  useEffect(() => {
    if (fullBins.length > 0) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(
            'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
            'FvT18AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
          );
        }
        audioRef.current.play().catch(() => {});
      } catch { /* ignore */ }
    }
  }, [fullBins.length]);

  if (fullBins.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {fullBins.map(bin => (
        <div
          key={bin.id}
          className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/40 bg-white/90 backdrop-blur-xl shadow-2xl shadow-red-900/40 animate-[slideUp_0.2s_ease]"
        >
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 ring-pulse">
            <Bell className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400">Bin is Full!</p>
            <p className="text-xs text-slate-500 truncate">{bin.name}{bin.location ? ` · ${bin.location}` : ''}</p>
          </div>
          <button
            onClick={() => onDismiss(bin.id)}
            className="text-slate-500 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
