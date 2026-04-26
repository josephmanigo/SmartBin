'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BinCard from '@/components/BinCard';
import BinModal from '@/components/BinModal';
import DeleteModal from '@/components/DeleteModal';
import FullBinAlert from '@/components/FullBinAlert';
import { useAuth } from '@/context/AuthContext';
import { binsApi, Bin, BinFormData } from '@/lib/api';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 8000; // 8 seconds

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bins, setBins]           = useState<Bin[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [online, setOnline]       = useState(true);

  // Modal state
  const [addOpen, setAddOpen]     = useState(false);
  const [editBin, setEditBin]     = useState<Bin | null>(null);
  const [deleteBin, setDeleteBin] = useState<Bin | null>(null);

  // Notifications: track which full bins have been dismissed
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const prevStatusRef = useRef<Record<number, string>>({});

  const [logs, setLogs]           = useState<import('@/lib/api').GlobalBinLog[]>([]);

  // ── Fetch bins & logs ────────────────────────────────────────────────────────────
  const fetchBins = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const [binsRes, logsRes] = await Promise.all([
        binsApi.list(),
        binsApi.allLogs()
      ]);
      setBins(binsRes.bins);
      setLogs(logsRes.logs);
      setOnline(true);

      // Check for newly full bins
      res.bins.forEach(bin => {
        const prev = prevStatusRef.current[bin.id];
        if (bin.status === 'Full' && prev !== 'Full') {
          // New full bin → clear its dismiss
          setDismissed(d => { const s = new Set(d); s.delete(bin.id); return s; });
        }
        prevStatusRef.current[bin.id] = bin.status;
      });
    } catch {
      setOnline(false);
    } finally {
      setFetching(false);
    }
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Initial + polling
  useEffect(() => {
    if (!user) return;
    fetchBins();
    const id = setInterval(() => fetchBins(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [user, fetchBins]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleCreate = async (data: BinFormData) => {
    const res = await binsApi.create(data);
    setBins(b => [res.bin, ...b]);
    toast.success(`"${res.bin.name}" added successfully!`);
  };

  const handleUpdate = async (data: BinFormData) => {
    if (!editBin) return;
    const res = await binsApi.update(editBin.id, data);
    setBins(b => b.map(x => (x.id === editBin.id ? res.bin : x)));
    toast.success('Bin updated successfully!');
  };

  const handleDelete = async () => {
    if (!deleteBin) return;
    await binsApi.delete(deleteBin.id);
    setBins(b => b.filter(x => x.id !== deleteBin.id));
    toast.success(`"${deleteBin.name}" deleted.`);
    setDeleteBin(null);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:    bins.length,
    empty:    bins.filter(b => b.status === 'Empty').length,
    half:     bins.filter(b => b.status === 'Half-Full').length,
    full:     bins.filter(b => b.status === 'Full').length,
  };

  const fullAndUnread = bins.filter(b => b.status === 'Full' && !dismissed.has(b.id));

  if (authLoading) {
    return (
      <div className="bg-mesh min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Bins</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {user?.name}&apos;s waste monitoring dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">

            <button
              onClick={() => fetchBins()}
              disabled={fetching}
              title="Refresh"
              className="btn btn-ghost px-2.5"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Bin
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bins',  value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50/50 border-slate-200' },
            { label: 'Empty',       value: stats.empty, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
            { label: 'Half-Full',   value: stats.half,  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: 'Full',        value: stats.full,  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'   },
          ].map(s => (
            <div key={s.label} className={`glass-card p-4 border ${s.bg}`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Bins grid */}
        {fetching && bins.length === 0 ? (
          // Skeleton
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5 flex flex-col gap-4">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-2 w-full" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : bins.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-slate-100/60 border border-slate-200 flex items-center justify-center mb-5 p-4 shadow-sm shadow-slate-200/50">
              <img src="/logo-cropped.png" alt="SmartBin" className="w-full h-full object-contain drop-shadow-sm opacity-90" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No bins yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Add your first SmartBin to start monitoring waste levels in real-time.
            </p>
            <button onClick={() => setAddOpen(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add your first bin
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bins.map(bin => (
              <BinCard
                key={bin.id}
                bin={bin}
                onEdit={b => setEditBin(b)}
                onDelete={b => setDeleteBin(b)}
              />
            ))}
          </div>
        )}

        {/* History Logs */}
        {!fetching && logs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Recent History Logs</h2>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Bin Name</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Distance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {logs.map((log) => {
                      const date = new Date(log.created_at);
                      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      
                      let badgeClass = 'bg-slate-100 text-slate-700';
                      if (log.status === 'Empty') badgeClass = 'bg-green-100 text-green-700';
                      if (log.status === 'Half-Full') badgeClass = 'bg-yellow-100 text-yellow-700';
                      if (log.status === 'Full') badgeClass = 'bg-red-100 text-red-700';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            <div className="font-medium">{timeStr}</div>
                            <div className="text-xs text-slate-400">{dateStr}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900">{log.bin_name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {log.distance} cm
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <BinModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleCreate}
      />
      <BinModal
        open={!!editBin}
        bin={editBin}
        onClose={() => setEditBin(null)}
        onSave={handleUpdate}
      />
      <DeleteModal
        open={!!deleteBin}
        bin={deleteBin}
        onClose={() => setDeleteBin(null)}
        onConfirm={handleDelete}
      />

      {/* Full-bin alerts */}
      <FullBinAlert
        fullBins={fullAndUnread}
        onDismiss={id => setDismissed(d => new Set([...d, id]))}
      />
    </div>
  );
}
