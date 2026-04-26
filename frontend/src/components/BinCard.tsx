'use client';

import { Bin, Status } from '@/lib/api';
import { MapPin, Cpu, Clock, Pencil, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  bin: Bin;
  onEdit:   (bin: Bin) => void;
  onDelete: (bin: Bin) => void;
}

const statusMeta: Record<Status, { label: string; cls: string; bar: string; pct: number }> = {
  Empty:     { label: 'Empty',     cls: 'status-empty',     bar: 'fill-bar-empty',     pct: 5  },
  'Half-Full':{ label: 'Half-Full',cls: 'status-half-full', bar: 'fill-bar-half-full', pct: 55 },
  Full:      { label: 'Full',      cls: 'status-full',      bar: 'fill-bar-full',       pct: 100 },
};

export default function BinCard({ bin, onEdit, onDelete }: Props) {
  const meta       = statusMeta[bin.status] ?? statusMeta['Empty'];
  const isFull     = bin.status === 'Full';
  const lastUpdate = bin.last_updated
    ? formatDistanceToNow(new Date(bin.last_updated), { addSuffix: true })
    : 'No data yet';

  return (
    <div
      className={`glass-card p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 ${
        isFull ? 'ring-pulse border-red-500/40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-base truncate">{bin.name}</h3>
          {bin.location && (
            <p className="flex items-center gap-1 text-slate-500 text-xs mt-0.5 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {bin.location}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      {/* Fill bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-500">Fill level</span>
          <span className="text-xs text-slate-700 font-medium">
            {bin.last_distance !== null ? `${parseFloat(bin.last_distance ?? '0').toFixed(1)} cm` : '— cm'}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
            style={{ width: `${meta.pct}%` }}
          />
        </div>
      </div>

      {/* Device info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Cpu className="w-3.5 h-3.5" />
        <span className="font-mono truncate">{bin.device_id}</span>
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="w-3.5 h-3.5" />
        <span>{lastUpdate}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
        <Link
          href={`/bins/${bin.id}`}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
        >
          View details <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => onEdit(bin)}
          title="Edit bin"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(bin)}
          title="Delete bin"
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
