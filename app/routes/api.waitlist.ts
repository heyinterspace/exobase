import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { withSecurity } from '~/lib/security';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * The builder itself is gated behind waitlist signup for now (no real
 * accounts exist yet) — this cookie is the whole gate. It's a soft,
 * temporary measure to collect signups before launch, not real auth: it
 * proves "this browser joined the waitlist," not who the person is.
 */
export const WAITLIST_ACCESS_COOKIE = 'exobase_waitlist_access';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

async function waitlistAction({ request, context }: ActionFunctionArgs) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const env = (context as any)?.cloudflare?.env ?? {};
  const supabaseUrl = env.WAITLIST_SUPABASE_URL || process.env.WAITLIST_SUPABASE_URL;
  const supabaseAnonKey = env.WAITLIST_SUPABASE_ANON_KEY || process.env.WAITLIST_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Waitlist signup attempted but WAITLIST_SUPABASE_URL/ANON_KEY are not configured');
    return json({ error: 'Waitlist is not configured yet' }, { status: 503 });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify({ email }),
  });

  /*
   * Supabase's ignore-duplicates still 409s on the unique constraint in some
   * Postgres versions — treat "already signed up" as success either way.
   */
  if (!response.ok && response.status !== 409) {
    console.error('Waitlist insert failed:', response.status, await response.text().catch(() => ''));
    return json({ error: 'Something went wrong. Please try again.' }, { status: 502 });
  }

  return json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': `${WAITLIST_ACCESS_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`,
      },
    },
  );
}

export const action = withSecurity(waitlistAction, {
  allowedMethods: ['POST'],
});
