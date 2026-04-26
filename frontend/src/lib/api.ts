const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/smartbin/backend/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('smartbin_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'An error occurred.');
  }
  return data as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ success: boolean; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => request<{ success: boolean; user: User }>('/auth/me'),

  updateAvatar: (avatar: string) =>
    request<{ success: boolean; avatar: string }>('/auth/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar }),
    }),
};

// ── Bins ─────────────────────────────────────────────────────────────────────
export const binsApi = {
  allLogs: () => request<{ success: boolean; logs: GlobalBinLog[] }>('/logs'),

  list: () => request<{ success: boolean; bins: Bin[] }>('/bins'),

  get: (id: number) => request<{ success: boolean; bin: Bin }>(`/bins/${id}`),

  create: (body: BinFormData) =>
    request<{ success: boolean; bin: Bin }>('/bins', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: number, body: BinFormData) =>
    request<{ success: boolean; bin: Bin }>(`/bins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/bins/${id}`, {
      method: 'DELETE',
    }),

  logs: (id: number, limit = 100) =>
    request<{ success: boolean; logs: BinLog[] }>(`/bins/${id}/logs?limit=${limit}`),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type Status = 'Empty' | 'Half-Full' | 'Full';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  created_at?: string;
}

export interface Bin {
  id: number;
  user_id: number;
  name: string;
  location: string | null;
  device_id: string;
  bin_height: number;
  status: Status;
  last_distance: string | null;
  last_updated: string | null;
  created_at: string;
}

export interface BinFormData {
  name: string;
  location: string;
  device_id: string;
  bin_height: number;
}

export interface BinLog {
  id: number;
  distance: string;
  status: Status;
  created_at: string;
}

export interface GlobalBinLog extends BinLog {
  bin_id: number;
  bin_name: string;
}
