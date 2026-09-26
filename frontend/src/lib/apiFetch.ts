import { supabase } from './supabaseClient';

/**
 * fetch, with the caller's identity attached.
 *
 * Every protected backend route now decides what you may see from the bearer
 * token, so a bare fetch gets a 401. This attaches the current Supabase
 * session and turns an expired one into a typed error the app can act on,
 * rather than a blank screen or a silent empty list.
 */

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
  }
}

/** Fired on 401 so AuthContext can clear the session and send the user to /login. */
export const AUTH_EXPIRED_EVENT = 'ilrds:auth-expired';

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw new ApiAuthError('Your session has expired. Please sign in again.', 401);
  }
  if (res.status === 403) {
    let detail = 'You do not have permission to do that.';
    try {
      const body = await res.clone().json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* keep the default wording */
    }
    throw new ApiAuthError(detail, 403);
  }

  return res;
}
