// ============================================================================
// Frontend <-> backend sync + auth layer.
//
// - Public storefront reads products via /api/public/catalog (no login).
// - Admin (/admin) logs in, gets a JWT, and reads/writes the full state.
// - All writes and /api/state require the Bearer token.
//
//   VITE_API_BASE="http://localhost:8000"  -> API on another origin (dev)
//   VITE_API_BASE=""                        -> same origin as the site
//   (unset, production build)               -> same origin as the site
//   (unset, dev build)                      -> disabled, localStorage only
// ============================================================================

const RAW = import.meta.env.VITE_API_BASE as string | undefined;

/**
 * True when a backend is configured.
 *
 * A production build always talks to its own origin, even when VITE_API_BASE
 * was missing at build time. That variable is baked in by Vite during the
 * build, so a host that rebuilds without it would otherwise ship a site that
 * looks fine but silently never reaches the API ("Backend not configured").
 * Dev builds keep the opt-in behaviour so `npm run dev` works with no backend.
 */
export const API_ENABLED = RAW !== undefined || import.meta.env.PROD;

const BASE = (RAW ?? '').replace(/\/$/, '');
const url = (path: string) => `${BASE}${path}`;

// --- Token storage ----------------------------------------------------------
const TOKEN_KEY = 'amanat_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

// --- Types ------------------------------------------------------------------
export interface ServerState {
  staffUsers?: any[];
  products?: any[];
  customers?: any[];
  suppliers?: any[];
  sales?: any[];
  installmentPlans?: any[];
  quotations?: any[];
  supplierRequisitions?: any[];
  purchaseOrders?: any[];
  expenses?: any[];
  smsLogs?: any[];
  stockAdjustments?: any[];
  damageLogs?: any[];
  supplierReturns?: any[];
  ledgerEntries?: any[];
  customerReturns?: any[];
  settings?: any;
  auditConfig?: any;
  masterLists?: {
    brands?: string[];
    categories?: string[];
    expenseCategories?: string[];
    crmGroups?: string[];
    crmLeadSources?: string[];
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'staff';
  assignedBusiness: string;
  permissions: Record<string, boolean>;
}

// --- Auth -------------------------------------------------------------------
export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  if (!API_ENABLED) return { ok: false, error: 'Backend not configured' };
  try {
    const res = await fetch(url('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? 'Invalid email or password' : 'Login failed' };
    }
    const data = await res.json();
    if (data.token) setToken(data.token);
    return { ok: true, user: data.user as AuthUser };
  } catch {
    return { ok: false, error: 'Cannot reach the server' };
  }
}

/** Validate the stored token; returns the current user or null. */
export async function fetchMe(): Promise<AuthUser | null> {
  if (!API_ENABLED || !getToken()) return null;
  try {
    const res = await fetch(url('/api/auth/me'), { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as AuthUser;
  } catch {
    return null;
  }
}

export function logout(): void {
  clearToken();
}

/** Super-admin: create a new staff login. Returns the created StaffUser or an error. */
export async function createStaffUser(payload: {
  name: string;
  email: string;
  password: string;
  assignedBusiness: string;
  role: 'super_admin' | 'staff';
  permissions: Record<string, boolean>;
}): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  if (!API_ENABLED) return { ok: false, error: 'Backend not configured' };
  try {
    const res = await fetch(url('/api/admin/users'), {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const map: Record<string, string> = {
        email_exists: 'That email already has a login',
        forbidden: 'Only a Super Admin can create users',
        missing_fields: 'Name, email and password are required',
      };
      return { ok: false, error: map[body.error] || 'Could not create user' };
    }
    const data = await res.json();
    return { ok: true, user: data.user as AuthUser };
  } catch {
    return { ok: false, error: 'Cannot reach the server' };
  }
}

// --- Full state (authenticated) --------------------------------------------
export async function fetchState(): Promise<ServerState | null> {
  if (!API_ENABLED) return null;
  try {
    const res = await fetch(url('/api/state'), { headers: authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as ServerState;
  } catch {
    return null;
  }
}

// --- Public catalog (storefront) -------------------------------------------
export async function fetchPublicCatalog(): Promise<ServerState | null> {
  if (!API_ENABLED) return null;
  try {
    const res = await fetch(url('/api/public/catalog'));
    if (!res.ok) return null;
    return (await res.json()) as ServerState;
  } catch {
    return null;
  }
}

/** Submit a storefront lead (quotation) without login. */
export function submitPublicQuote(quote: unknown): void {
  if (!API_ENABLED) return;
  fetch(url('/api/public/quote'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  }).catch(() => {
    /* ignore */
  });
}

// --- Debounced authenticated writes ----------------------------------------
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

function debouncedPut(id: string, path: string, body: unknown, delay = 700) {
  if (!API_ENABLED || !getToken()) return;
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => {
    fetch(url(path), {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(body),
    }).catch(() => {
      /* offline / server error: keep localStorage as the fallback */
    });
  }, delay);
}

export function pushCollection(key: string, data: unknown[]): void {
  debouncedPut(`col:${key}`, `/api/collections/${key}`, data);
}
export function pushSingleton(key: string, data: unknown): void {
  debouncedPut(`sing:${key}`, `/api/singletons/${key}`, data);
}
export function pushMasterList(key: string, data: string[]): void {
  debouncedPut(`ml:${key}`, `/api/master-lists/${key}`, data);
}
