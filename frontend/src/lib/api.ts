/**
 * api.ts — Firebase / Firestore data layer
 *
 * Replaces the old PHP REST backend entirely.
 * All data lives in Firestore under:
 *
 *   users/{uid}          – user profile
 *   bins/{binId}         – bin documents (field: uid)
 *   bins/{binId}/logs    – sub-collection of bin readings
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated.');
  return u.uid;
}

function calcStatus(distance: number, binHeight: number): Status {
  const pct = binHeight > 0 ? distance / binHeight : 1;
  if (pct > 0.66) return 'Empty';
  if (pct > 0.33) return 'Half-Full';
  return 'Full';
}

function tsToIso(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

// ── Auth API ──────────────────────────────────────────────────────────────────
// Firebase Auth (create/sign-in) is handled in AuthContext.
// These helpers read / write the Firestore user profile doc.

export const authApi = {
  /** Fetch the current user's Firestore profile */
  me: async (): Promise<{ success: boolean; user: User }> => {
    const id   = uid();
    const snap = await getDoc(doc(db, 'users', id));
    if (!snap.exists()) throw new Error('User profile not found.');
    const d = snap.data()!;
    return {
      success: true,
      user: {
        id:         id,
        name:       d.name       ?? '',
        email:      d.email      ?? '',
        avatar:     d.avatar     ?? null,
        created_at: tsToIso(d.created_at) ?? new Date().toISOString(),
      },
    };
  },

  /** Persist a base-64 avatar string to the user's Firestore profile */
  updateAvatar: async (avatar: string): Promise<{ success: boolean; avatar: string }> => {
    const id = uid();
    await updateDoc(doc(db, 'users', id), { avatar });
    return { success: true, avatar };
  },
};

// ── Bins API ──────────────────────────────────────────────────────────────────

export const binsApi = {
  /** List all bins belonging to the current user */
  list: async (): Promise<{ success: boolean; bins: Bin[] }> => {
    const userId = uid();
    const q      = query(
      collection(db, 'bins'),
      where('uid', '==', userId),
      orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);
    const bins: Bin[] = snap.docs.map(d => docToBin(d.id, d.data()));
    return { success: true, bins };
  },

  /** Get a single bin by Firestore document ID */
  get: async (id: string): Promise<{ success: boolean; bin: Bin }> => {
    const snap = await getDoc(doc(db, 'bins', id));
    if (!snap.exists()) throw new Error('Bin not found.');
    const bin = docToBin(snap.id, snap.data()!);
    if (bin.user_id !== uid()) throw new Error('Bin not found.');
    return { success: true, bin };
  },

  /** Create a new bin */
  create: async (body: BinFormData): Promise<{ success: boolean; bin: Bin }> => {
    const userId = uid();

    // Unique device_id check across all bins
    const chk = query(collection(db, 'bins'), where('device_id', '==', body.device_id));
    const chkSnap = await getDocs(chk);
    if (!chkSnap.empty) throw new Error('Device ID is already registered.');

    const ref = await addDoc(collection(db, 'bins'), {
      uid:           userId,
      name:          body.name,
      location:      body.location || null,
      device_id:     body.device_id,
      bin_height:    body.bin_height,
      status:        'Empty' as Status,
      last_distance: null,
      last_updated:  null,
      created_at:    serverTimestamp(),
    });

    const newSnap = await getDoc(ref);
    return { success: true, bin: docToBin(ref.id, newSnap.data()!) };
  },

  /** Update an existing bin */
  update: async (id: string, body: BinFormData): Promise<{ success: boolean; bin: Bin }> => {
    const userId = uid();

    // Ownership check
    const snap = await getDoc(doc(db, 'bins', id));
    if (!snap.exists() || snap.data()!.uid !== userId) throw new Error('Bin not found.');

    // Unique device_id check (exclude self)
    const chk = query(collection(db, 'bins'), where('device_id', '==', body.device_id));
    const chkSnap = await getDocs(chk);
    const conflict = chkSnap.docs.find(d => d.id !== id);
    if (conflict) throw new Error('Device ID is already used by another bin.');

    await updateDoc(doc(db, 'bins', id), {
      name:       body.name,
      location:   body.location || null,
      device_id:  body.device_id,
      bin_height: body.bin_height,
    });

    const updated = await getDoc(doc(db, 'bins', id));
    return { success: true, bin: docToBin(id, updated.data()!) };
  },

  /** Delete a bin and all its logs */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const userId = uid();
    const snap   = await getDoc(doc(db, 'bins', id));
    if (!snap.exists() || snap.data()!.uid !== userId) throw new Error('Bin not found.');

    // Delete all log sub-documents first
    const logsSnap = await getDocs(collection(db, 'bins', id, 'logs'));
    await Promise.all(logsSnap.docs.map(d => deleteDoc(d.ref)));

    await deleteDoc(doc(db, 'bins', id));
    return { success: true, message: 'Bin deleted successfully.' };
  },

  /** Get logs for a specific bin */
  logs: async (id: string, limitCount = 100): Promise<{ success: boolean; logs: BinLog[] }> => {
    const userId = uid();
    const binSnap = await getDoc(doc(db, 'bins', id));
    if (!binSnap.exists() || binSnap.data()!.uid !== userId) throw new Error('Bin not found.');

    const q = query(
      collection(db, 'bins', id, 'logs'),
      orderBy('created_at', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    const logs: BinLog[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id:         d.id,
        distance:   String(data.distance),
        status:     data.status as Status,
        created_at: tsToIso(data.created_at) ?? new Date().toISOString(),
      };
    });
    return { success: true, logs };
  },

  /** Get all logs across all bins for the current user (dashboard table) */
  allLogs: async (limitCount = 50): Promise<{ success: boolean; logs: GlobalBinLog[] }> => {
    const userId = uid();

    // Fetch user's bins first
    const binsQ    = query(collection(db, 'bins'), where('uid', '==', userId));
    const binsSnap = await getDocs(binsQ);

    if (binsSnap.empty) return { success: true, logs: [] };

    // Fetch recent logs from every bin in parallel
    const results = await Promise.all(
      binsSnap.docs.map(async binDoc => {
        const binName = binDoc.data().name as string;
        const q       = query(
          collection(db, 'bins', binDoc.id, 'logs'),
          orderBy('created_at', 'desc'),
          limit(20),
        );
        const logsSnap = await getDocs(q);
        return logsSnap.docs.map(d => {
          const data = d.data();
          return {
            id:         d.id,
            bin_id:     binDoc.id,
            bin_name:   binName,
            distance:   String(data.distance),
            status:     data.status as Status,
            created_at: tsToIso(data.created_at) ?? new Date().toISOString(),
          } satisfies GlobalBinLog;
        });
      }),
    );

    // Merge, sort by time descending, take top N
    const all = results.flat().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { success: true, logs: all.slice(0, limitCount) };
  },
};

// ── Internal helper ───────────────────────────────────────────────────────────

function docToBin(id: string, data: Record<string, unknown>): Bin {
  return {
    id:            id,
    user_id:       data.uid as string,
    name:          data.name          as string,
    location:      (data.location     as string | null) ?? null,
    device_id:     data.device_id     as string,
    bin_height:    data.bin_height    as number,
    status:        (data.status       as Status) ?? 'Empty',
    last_distance: data.last_distance != null ? String(data.last_distance) : null,
    last_updated:  tsToIso(data.last_updated  as Timestamp | undefined),
    created_at:    tsToIso(data.created_at    as Timestamp | undefined) ?? new Date().toISOString(),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type Status = 'Empty' | 'Half-Full' | 'Full';

export interface User {
  id:         string;        // Firebase UID
  name:       string;
  email:      string;
  avatar?:    string | null;
  created_at?: string;
}

export interface Bin {
  id:            string;     // Firestore doc ID
  user_id:       string;     // Firebase UID
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
