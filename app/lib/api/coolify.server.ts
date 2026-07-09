/**
 * Shared server-side helpers for talking to a user-supplied Coolify instance.
 * The instance URL comes from the user (self-hosted), so it gets validated
 * and normalized before any server-side fetch touches it.
 */
export function normalizeCoolifyUrl(raw: string): string {
  const url = new URL(raw.trim());

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Unsupported protocol');
  }

  // Strip any path/query the user pasted along (e.g. a dashboard deep link).
  return `${url.protocol}//${url.host}`;
}

export interface CoolifyRequestOptions {
  baseUrl: string;
  token: string;
  method?: string;
  body?: unknown;
}

export async function coolifyFetch<T>(path: string, { baseUrl, token, method = 'GET', body }: CoolifyRequestOptions) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Coolify ${method} ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}
