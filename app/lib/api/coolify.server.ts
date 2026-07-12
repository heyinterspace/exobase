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

export interface ManagedHostingConfig {
  baseUrl: string;
  token: string;
}

/**
 * Exobase-operated Coolify instance for the default "Deploy on Exobase"
 * path — users never see or configure it (they "just think Exobase", the
 * way Replit users think Replit). Server-only env vars, no VITE_ prefix:
 * this token controls the shared hosting box and must never reach a client.
 */
export function getManagedHostingConfig(context: any): ManagedHostingConfig | null {
  const url = context?.cloudflare?.env?.EXOBASE_COOLIFY_URL || process.env.EXOBASE_COOLIFY_URL;
  const token = context?.cloudflare?.env?.EXOBASE_COOLIFY_TOKEN || process.env.EXOBASE_COOLIFY_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    return { baseUrl: normalizeCoolifyUrl(url), token };
  } catch {
    console.error('EXOBASE_COOLIFY_URL is set but not a valid URL');
    return null;
  }
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
