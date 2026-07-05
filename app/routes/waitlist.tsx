import { useEffect, useState } from 'react';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import { Button, buttonVariants } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription } from '~/components/ui/Card';
import Starfield from '~/components/ui/Starfield';
import PlanetSilhouette from '~/components/ui/PlanetSilhouette';

export const meta: MetaFunction = () => {
  return [
    { title: 'Exobase — Join the waitlist' },
    {
      name: 'description',
      content:
        'Exobase is the opinionated app builder — best-in-class providers, deeply integrated, so you focus on your idea. Star the repo and join the waitlist for early access.',
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
    title: 'Best-in-class by default',
    body: "One great provider for every layer of your stack — we did the shopping so you don't have to.",
  },
  {
    title: 'Deep, one-click integrations',
    body: 'Every provider is wired in the way it should feel, not bolted on as an afterthought.',
  },
  {
    title: 'Your model, your call',
    body: "The one thing you customize: which AI model runs your app — since that's where cost actually varies.",
  },
];

/** Rise-in delay, staggered per hero element — see animations.scss. */
const riseIn = (ms: number) => ({ animationDelay: `${ms}ms` });

function WaitlistForm({ stars }: { stars: number | null }) {
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
          'flex flex-col sm:flex-row items-center gap-4 px-4 py-3 text-sm w-full max-w-xl',
          'border border-accent bg-accent/10 text-accent',
        )}
      >
        <span className="flex items-center gap-2">
          <span className="i-ph:check-circle-fill text-base shrink-0" />
          You're on the list — we'll email you when it's ready.
        </span>
        <a
          href="/"
          className={classNames(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'ml-auto shrink-0 border-accent text-accent',
          )}
        >
          Open the builder →
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        fetcher.submit({ email }, { method: 'post', action: '/api/waitlist', encType: 'application/json' });
      }}
      className="flex flex-col gap-2 w-full max-w-xl"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={busy}
          className="flex-1 h-10 rounded-none border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 focus-visible:ring-bolt-elements-focus"
        />
        <Button
          type="submit"
          disabled={busy}
          className="animate-glow-pulse shrink-0 bg-accent text-accent-ink hover:bg-accent hover:brightness-110"
        >
          {busy ? 'Joining…' : 'Join waitlist'}
        </Button>
        <a
          href={`https://github.com/${REPO}`}
          target="_blank"
          rel="noopener noreferrer"
          className={classNames(buttonVariants({ variant: 'outline' }), 'shrink-0 gap-2')}
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

        <header className="relative z-10 flex items-center px-4 sm:px-6 h-[var(--header-height)]">
          <span className="text-2xl font-semibold text-accent">Exobase</span>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-4 pt-[12vh] pb-16 text-center">
          <h1
            className="animate-rise-in text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 max-w-3xl"
            style={riseIn(0)}
          >
            Build apps at light speed
          </h1>
          <p
            className="animate-rise-in text-md lg:text-xl mb-10 text-bolt-elements-textSecondary max-w-xl"
            style={riseIn(120)}
          >
            The opinionated app builder. We've already picked the best-in-class provider for every layer of your stack
            and wired it all together — so you focus on your idea, not your infrastructure. Get in early.
          </p>

          <div className="animate-rise-in w-full max-w-xl" style={riseIn(240)}>
            <WaitlistForm stars={stars} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 max-w-4xl w-full text-left">
            {FEATURES.map((feature, i) => (
              <Card
                key={feature.title}
                className="animate-rise-in border-bolt-elements-borderColor bg-bolt-elements-background-depth-2"
                style={riseIn(360 + i * 100)}
              >
                <CardHeader className="p-4 space-y-1">
                  <CardTitle className="text-sm font-semibold text-bolt-elements-textPrimary">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-xs">{feature.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
