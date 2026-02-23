import { useMemo } from 'react';

const SESSION_TOKEN_KEY = 'rr_session_token';

/**
 * Returns a stable anonymous session token for the current browser session.
 * The token is generated once via `crypto.randomUUID()`, persisted to
 * `sessionStorage`, and returned on every subsequent call.  It is intentionally
 * short-lived: it disappears when the browser tab is closed.
 *
 * @returns A UUID string that uniquely identifies this browser session.
 *          Used exclusively for rate-limiting (30 reports/hr); no PII is stored.
 */
export function useSessionToken(): string {
  return useMemo(() => {
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  }, []);
}
