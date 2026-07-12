import Cookies from 'js-cookie';

export const ANON_ID_COOKIE = 'exobaseUserId';

/**
 * A stable anonymous id, not a login — Exobase has no server-side user
 * accounts yet. Used to group a browser's Nango connections and to namespace
 * managed-hosting deploys (soft per-browser quotas until real identity lands
 * with Phase 2 of the infra plan). Spoofable by design; treat any limit keyed
 * to it as a speed bump, not a security boundary.
 */
export function getOrCreateAnonUserId(): string {
  const existing = Cookies.get(ANON_ID_COOKIE);

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  Cookies.set(ANON_ID_COOKIE, id, { expires: 3650 });

  return id;
}
