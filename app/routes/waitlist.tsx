import { useEffect, useState } from 'react';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import Starfield from '~/components/ui/Starfield';
import PlanetSilhouette from '~/components/ui/PlanetSilhouette';

export const meta: MetaFunction = () => {
  return [
    { title: 'Exobase — Join the waitlist' },
    {
      name: 'description',
      content: 'Exobase is a BYO-model AI app builder. Star the repo and join the waitlist for early access.',
    },
  ];
};

const REPO = 'heyinterspace/exobase';

export async function loader() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'exobase-waitlist-page' },
    });

    if (!response.ok) {
      return json({ stars: null });
    }

    const data = (await response.json()) as { stargazers_count?: number };

    return json({ stars: data.stargazers_count ?? null });
  } catch {
    return json({ stars: null });
  }
}

const FEATURES = [
  {
    title: 'Bring your own model',
    body: 'Wire up any provider or key you already have — no lock-in to one vendor.',
  },
  {
    title: 'One-click integrations',
    body: 'GitHub, and more on the way, connected the way OAuth should feel: one click.',
  },
  {
    title: 'Ship, not just prototype',
    body: 'Go from a prompt to a deployed app without leaving the chat.',
  },
];

function WaitlistForm() {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const [email, setEmail] = useState('');
  const succeeded = fetcher.data?.ok === true;
  const busy = fetcher.state !== 'idle';

  useEffect(() => {
    if (succeeded) {
      setEmail('');
    }
  }, [succeeded]);

  if (succeeded) {
    return (
      <div
        className={classNames(
          'flex items-center gap-2 px-4 py-3 text-sm',
          'border border-accent bg-accent/10 text-accent',
        )}
      >
        <span className="i-ph:check-circle-fill text-base shrink-0" />
        You're on the list — we'll email you when it's ready.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        fetcher.submit({ email }, { method: 'post', action: '/api/waitlist', encType: 'application/json' });
      }}
      className="flex flex-col gap-2 w-full max-w-md"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={busy}
          className={classNames(
            'flex-1 px-3 py-2 text-sm',
            'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
            'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
            'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus',
          )}
        />
        <button
          type="submit"
          disabled={busy}
          className={classNames(
            'px-4 py-2 text-sm font-medium shrink-0',
            'border border-bolt-elements-borderColor shadow-hard-sm press-hard-sm',
            'bg-accent text-accent-ink hover:brightness-110 transition-[filter]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {busy ? 'Joining…' : 'Join waitlist'}
        </button>
      </div>
      {fetcher.data?.error && <p className="text-xs text-red-400">{fetcher.data.error}</p>}
    </form>
  );
}

export default function Waitlist() {
  const { stars } = useLoaderData<typeof loader>();

  return (
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden bg-bolt-elements-background-depth-1">
      <div className="relative isolate flex flex-col flex-1">
        <Starfield />
        <PlanetSilhouette />

        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 h-[var(--header-height)]">
          <a href="/" className="text-2xl font-semibold text-accent">
            Exobase
          </a>
          <a href="/" className="text-sm text-bolt-elements-textSecondary hover:text-accent transition-theme">
            Open the builder →
          </a>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-4 pt-[12vh] pb-16 text-center">
          <h1 className="text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 max-w-3xl animate-fade-in">
            Build software that breaks through
          </h1>
          <p className="text-md lg:text-xl mb-10 text-bolt-elements-textSecondary max-w-xl animate-fade-in animation-delay-200">
            Exobase is a BYO-model AI app builder — no vendor lock-in, one-click integrations, and a straight line from
            prompt to shipped app. Get in early.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                'border border-bolt-elements-borderColor shadow-hard-sm press-hard-sm',
                'bg-bolt-elements-background-depth-2 hover:border-accent hover:text-accent transition-theme',
                'text-bolt-elements-textPrimary',
              )}
            >
              <span className="i-ph:star-fill text-base" />
              Star on GitHub
              {typeof stars === 'number' && (
                <span className="px-1.5 py-px text-xs font-mono border border-bolt-elements-borderColor text-bolt-elements-textSecondary">
                  {stars}
                </span>
              )}
            </a>
          </div>

          <WaitlistForm />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 max-w-4xl w-full text-left">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4"
              >
                <h3 className="text-sm font-semibold text-bolt-elements-textPrimary mb-1">{feature.title}</h3>
                <p className="text-xs text-bolt-elements-textSecondary">{feature.body}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
