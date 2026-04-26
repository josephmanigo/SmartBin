'use client';

import { useState, useEffect, FormEvent } from 'react';
import { X, Trash2, Loader2, Info } from 'lucide-react';
import { Bin, BinFormData } from '@/lib/api';

interface Props {
  open:    boolean;
  bin?:    Bin | null;     // null = create mode
  onClose: () => void;
  onSave:  (data: BinFormData) => Promise<void>;
}

const DEFAULT: BinFormData = { name: '', location: '', device_id: '', bin_height: 30 };

export default function BinModal({ open, bin, onClose, onSave }: Props) {
  const [form, setForm]     = useState<BinFormData>(DEFAULT);
  const [loading, setLoad]  = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(
        bin
          ? { name: bin.name, location: bin.location ?? '', device_id: bin.device_id, bin_height: bin.bin_height }
          : DEFAULT
      );
      setErrors({});
    }
  }, [open, bin]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim())      e.name       = 'Bin name is required.';
    if (!form.device_id.trim()) e.device_id  = 'Device ID is required.';
    if (form.bin_height < 5 || form.bin_height > 300)
      e.bin_height = 'Height must be between 5 and 300 cm.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoad(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setLoad(false);
    }
  };

  if (!open) return null;

  const isEdit = !!bin;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-slate-900" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? 'Edit Bin' : 'Add New Bin'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bin Name */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Bin name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={`input-field ${'name' in errors ? 'border-red-500/60' : ''}`}
              placeholder="e.g. Office Bin A"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={100}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{String(errors.name)}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Location <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Room 101, Building A"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              maxLength={200}
            />
          </div>

          {/* Device ID */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Device ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={`input-field font-mono ${'device_id' in errors ? 'border-red-500/60' : ''}`}
              placeholder="e.g. BIN-001"
              value={form.device_id}
              onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))}
              maxLength={100}
            />
            {errors.device_id
              ? <p className="text-xs text-red-400 mt-1">{String(errors.device_id)}</p>
              : <p className="flex items-center gap-1 text-xs text-slate-500 mt-1"><Info className="w-3 h-3" /> Must match the ID programmed on your Arduino device.</p>
            }
          </div>

          {/* Bin Height */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Bin height (cm) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              className={`input-field ${'bin_height' in errors ? 'border-red-500/60' : ''}`}
              placeholder="30"
              min={5}
              max={300}
              value={form.bin_height}
              onChange={e => setForm(f => ({ ...f, bin_height: parseInt(e.target.value) || 30 }))}
            />
            {errors.bin_height
              ? <p className="text-xs text-red-400 mt-1">{String(errors.bin_height)}</p>
              : <p className="flex items-center gap-1 text-xs text-slate-500 mt-1"><Info className="w-3 h-3" /> Used to calculate fill percentage from sensor distance.</p>
            }
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add bin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
