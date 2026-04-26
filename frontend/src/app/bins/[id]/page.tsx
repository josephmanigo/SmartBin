'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Cpu, Clock, RefreshCw,
  TrendingUp, Trash2, Activity
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { binsApi, Bin, BinLog, Status } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<Status, string> = {
  Empty:      '#4ade80',
  'Half-Full':'#facc15',
  Full:       '#f87171',
};

const STATUS_CLS: Record<Status, string> = {
  Empty:      'status-empty',
  'Half-Full':'status-half-full',
  Full:       'status-full',
};

export default function BinDetailPage() {
  const { id }               = useParams<{ id: string }>();
  const { user, loading: al } = useAuth();
  const router               = useRouter();

  const [bin, setBin]       = useState<Bin | null>(null);
  const [logs, setLogs]     = useState<BinLog[]>([]);
  const [loading, setLoad]  = useState(true);
  const [refresh, setRef]   = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoad(true);
    else setRef(true);
    try {
      const [binRes, logRes] = await Promise.all([
        binsApi.get(Number(id)),
        binsApi.logs(Number(id), 50),
      ]);
      setBin(binRes.bin);
      setLogs(logRes.logs);
    } catch {
      toast.error('Failed to load bin data.');
      router.replace('/dashboard');
    } finally {
      setLoad(false);
      setRef(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!al && !user) { router.replace('/login'); return; }
    if (!al && user)  load();
  }, [al, user, load, router]);

  // Polling every 8s
  useEffect(() => {
    const t = setInterval(() => load(true), 8000);
    return () => clearInterval(t);
  }, [load]);

  // Chart data — reverse so oldest first
  const chartData = [...logs].reverse().map(l => ({
    time:     format(new Date(l.created_at), 'HH:mm'),
    distance: parseFloat(l.distance),
    status:   l.status,
  }));

  if (loading) {
    return (
      <div className="bg-mesh min-h-screen">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="skeleton h-8 w-48 rounded-xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!bin) return null;

  const statusCls   = STATUS_CLS[bin.status];
  const chartColor  = STATUS_COLOR[bin.status];
  const fillPct     = bin.last_distance !== null
    ? Math.max(0, Math.min(100, 100 - (parseFloat(bin.last_distance) / bin.bin_height) * 100))
    : 0;

  return (
    <div className="bg-mesh min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <button
            onClick={() => load(true)}
            disabled={refresh}
            className="btn btn-ghost px-2.5"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refresh ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bin info card */}
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                bin.status === 'Full'      ? 'bg-red-500/15 border border-red-500/35' :
                bin.status === 'Half-Full' ? 'bg-yellow-500/15 border border-yellow-500/35' :
                                             'bg-green-500/15 border border-green-500/35'
              }`}>
                <Trash2 className={`w-7 h-7 ${
                  bin.status === 'Full'      ? 'text-red-400' :
                  bin.status === 'Half-Full' ? 'text-yellow-400' :
                                               'text-green-400'
                }`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{bin.name}</h1>
                {bin.location && (
                  <p className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {bin.location}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-slate-500 text-xs mt-1 font-mono">
                  <Cpu className="w-3.5 h-3.5" /> {bin.device_id}
                </p>
              </div>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusCls}`}>
              {bin.status}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Last Distance', value: bin.last_distance ? `${parseFloat(bin.last_distance).toFixed(1)} cm` : '—' },
              { label: 'Bin Height',    value: `${bin.bin_height} cm` },
              { label: 'Fill Level',    value: `${fillPct.toFixed(0)}%` },
              { label: 'Last Updated',  value: bin.last_updated ? formatDistanceToNow(new Date(bin.last_updated), { addSuffix: true }) : 'No data' },
            ].map(s => (
              <div key={s.label} className="bg-slate-100/40 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-base font-semibold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Fill bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Fill level</span>
              <span>{fillPct.toFixed(0)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  bin.status === 'Full' ? 'fill-bar-full' :
                  bin.status === 'Half-Full' ? 'fill-bar-half-full' : 'fill-bar-empty'
                }`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">Distance Over Time</h2>
              <span className="text-xs text-slate-500 ml-1">(last {chartData.length} readings)</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  reversed
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}cm`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v) => [`${Number(v).toFixed(1)} cm`, 'Distance']}
                />
                <Area
                  type="monotone"
                  dataKey="distance"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#distGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: chartColor, stroke: '#0b1120', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Logs table */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Log History</h2>
            <span className="text-xs text-slate-500 ml-1">({logs.length} records)</span>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Clock className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">No data yet. Waiting for Arduino readings…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Timestamp', 'Distance', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 pb-3 pr-4 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 pr-4 text-slate-700 text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td className="py-3 pr-4 text-slate-200 font-mono">
                        {parseFloat(log.distance).toFixed(1)} cm
                      </td>
                      <td className="py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[log.status]}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
