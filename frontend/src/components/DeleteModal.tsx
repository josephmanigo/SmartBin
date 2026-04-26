'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Bin } from '@/lib/api';

interface Props {
  open:    boolean;
  bin:     Bin | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteModal({ open, bin, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  };

  if (!open || !bin) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box glass-card p-6 max-w-sm relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <h2 className="flex items-center justify-center gap-3 text-lg font-semibold text-slate-900 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            Delete bin?
          </h2>
          <p className="text-sm text-slate-500 mb-1">
            You are about to delete <span className="text-slate-900 font-medium">&ldquo;{bin.name}&rdquo;</span>.
          </p>
          <p className="text-sm text-red-400/80 mb-6 px-2">
            This will permanently remove all logs and data associated with this bin. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1 justify-center">Cancel</button>
          <button onClick={handleConfirm} className="btn btn-danger flex-1 justify-center" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Deleting…' : 'Delete bin'}
          </button>
        </div>
      </div>
    </div>
  );
}
