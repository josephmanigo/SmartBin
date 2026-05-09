/**
 * api.ts — Supabase data layer
 *
 * Replaces the old Firebase backend.
 * Uses tables:
 *   - users
 *   - bins
 *   - bin_logs
 */

import { supabase } from './supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) throw new Error('Not authenticated.');
  return session.user.id;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  /** Fetch the current user's profile */
  me: async (): Promise<{ success: boolean; user: User }> => {
    const id = await getUserId();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) throw new Error('User profile not found.');
    return {
      success: true,
      user: {
        id:         data.id,
        name:       data.name       ?? '',
        email:      data.email      ?? '',
        avatar:     data.avatar     ?? null,
        created_at: data.created_at ?? new Date().toISOString(),
      },
    };
  },

  /** Persist a base-64 avatar string to the user's profile */
  updateAvatar: async (avatar: string): Promise<{ success: boolean; avatar: string }> => {
    const id = await getUserId();
    const { error } = await supabase
      .from('users')
      .update({ avatar })
      .eq('id', id);
      
    if (error) throw new Error('Failed to update avatar.');
    return { success: true, avatar };
  },
};

// ── Bins API ──────────────────────────────────────────────────────────────────

export const binsApi = {
  /** List all bins belonging to the current user */
  list: async (): Promise<{ success: boolean; bins: Bin[] }> => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('bins')
      .select('*')
      .eq('uid', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw new Error('Failed to fetch bins.');
    const bins: Bin[] = data.map((d: any) => docToBin(d));
    return { success: true, bins };
  },

  /** Get a single bin by document ID */
  get: async (id: string): Promise<{ success: boolean; bin: Bin }> => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('bins')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) throw new Error('Bin not found.');
    if (data.uid !== userId) throw new Error('Bin not found.');
    
    return { success: true, bin: docToBin(data) };
  },

  /** Create a new bin */
  create: async (body: BinFormData): Promise<{ success: boolean; bin: Bin }> => {
    const userId = await getUserId();

    // Unique device_id check across all bins
    const { data: chk } = await supabase
      .from('bins')
      .select('id')
      .eq('device_id', body.device_id)
      .limit(1);
      
    if (chk && chk.length > 0) throw new Error('Device ID is already registered.');

    const { data, error } = await supabase
      .from('bins')
      .insert({
        uid:           userId,
        name:          body.name,
        location:      body.location || null,
        device_id:     body.device_id,
        bin_height:    body.bin_height,
        status:        'Empty',
        last_distance: null,
        last_updated:  null,
      })
      .select()
      .single();
      
    if (error || !data) throw new Error('Failed to create bin.');
    return { success: true, bin: docToBin(data) };
  },

  /** Update an existing bin */
  update: async (id: string, body: BinFormData): Promise<{ success: boolean; bin: Bin }> => {
    const userId = await getUserId();

    // Ownership check
    const { data: bin } = await supabase.from('bins').select('uid').eq('id', id).single();
    if (!bin || bin.uid !== userId) throw new Error('Bin not found.');

    // Unique device_id check (exclude self)
    const { data: chk } = await supabase
      .from('bins')
      .select('id')
      .eq('device_id', body.device_id)
      .neq('id', id)
      .limit(1);
      
    if (chk && chk.length > 0) throw new Error('Device ID is already used by another bin.');

    const { data, error } = await supabase
      .from('bins')
      .update({
        name:       body.name,
        location:   body.location || null,
        device_id:  body.device_id,
        bin_height: body.bin_height,
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error || !data) throw new Error('Failed to update bin.');
    return { success: true, bin: docToBin(data) };
  },

  /** Delete a bin and all its logs */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const userId = await getUserId();
    
    // Ownership check
    const { data: bin } = await supabase.from('bins').select('uid').eq('id', id).single();
    if (!bin || bin.uid !== userId) throw new Error('Bin not found.');

    // Delete log sub-documents first
    await supabase.from('bin_logs').delete().eq('bin_id', id);

    const { error } = await supabase.from('bins').delete().eq('id', id);
    if (error) throw new Error('Failed to delete bin.');
    
    return { success: true, message: 'Bin deleted successfully.' };
  },

  /** Get logs for a specific bin */
  logs: async (id: string, limitCount = 100): Promise<{ success: boolean; logs: BinLog[] }> => {
    const userId = await getUserId();
    
    // Ownership check
    const { data: bin } = await supabase.from('bins').select('uid').eq('id', id).single();
    if (!bin || bin.uid !== userId) throw new Error('Bin not found.');

    const { data, error } = await supabase
      .from('bin_logs')
      .select('*')
      .eq('bin_id', id)
      .order('created_at', { ascending: false })
      .limit(limitCount);
      
    if (error) throw new Error('Failed to fetch logs.');
    
    const logs: BinLog[] = (data || []).map((d: any) => ({
      id:         d.id,
      distance:   String(d.distance),
      status:     d.status as Status,
      created_at: d.created_at ?? new Date().toISOString(),
    }));
    
    return { success: true, logs };
  },

  /** Get all logs across all bins for the current user (dashboard table) */
  allLogs: async (limitCount = 50): Promise<{ success: boolean; logs: GlobalBinLog[] }> => {
    const userId = await getUserId();

    // Fetch user's bins first
    const { data: bins } = await supabase.from('bins').select('id, name').eq('uid', userId);
    if (!bins || bins.length === 0) return { success: true, logs: [] };

    // Fetch recent logs from every bin in parallel
    const results = await Promise.all(
      bins.map(async (b: any) => {
        const { data: logs } = await supabase
          .from('bin_logs')
          .select('*')
          .eq('bin_id', b.id)
          .order('created_at', { ascending: false })
          .limit(20);
          
        return (logs || []).map((d: any) => ({
          id:         d.id,
          bin_id:     b.id,
          bin_name:   b.name,
          distance:   String(d.distance),
          status:     d.status as Status,
          created_at: d.created_at ?? new Date().toISOString(),
        } satisfies GlobalBinLog));
      })
    );

    // Merge, sort by time descending, take top N
    const all = results.flat().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { success: true, logs: all.slice(0, limitCount) };
  },
};

// ── Internal helper ───────────────────────────────────────────────────────────

function docToBin(data: any): Bin {
  return {
    id:            data.id,
    user_id:       data.uid,
    name:          data.name,
    location:      data.location ?? null,
    device_id:     data.device_id,
    bin_height:    data.bin_height,
    status:        data.status ?? 'Empty',
    last_distance: data.last_distance != null ? String(data.last_distance) : null,
    last_updated:  data.last_updated ?? null,
    created_at:    data.created_at ?? new Date().toISOString(),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type Status = 'Empty' | 'Half-Full' | 'Full';

export interface User {
  id:         string;
  name:       string;
  email:      string;
  avatar?:    string | null;
  created_at?: string;
}

export interface Bin {
  id:            string;
  user_id:       string;
  name:          string;
  location:      string | null;
  device_id:     string;
  bin_height:    number;
  status:        Status;
  last_distance: string | null;
  last_updated:  string | null;
  created_at:    string;
}

export interface BinFormData {
  name:       string;
  location:   string;
  device_id:  string;
  bin_height: number;
}

export interface BinLog {
  id:         string;
  distance:   string;
  status:     Status;
  created_at: string;
}

export interface GlobalBinLog extends BinLog {
  bin_id:   string;
  bin_name: string;
}
