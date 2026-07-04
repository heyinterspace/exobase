import { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { getFeatureFlags, type Feature } from '~/lib/api/features';
import { checkForUpdates } from '~/lib/api/updates';

interface RoadmapItem {
  title: string;
  description: string;
  status: 'planned' | 'in-progress';
}

/*
 * Hand-maintained for now — a fast-follow is wiring this to Exobase's own
 * Linear project so it reflects real ticket status instead of a static list.
 */
const ROADMAP: RoadmapItem[] = [
  {
    title: 'Deploy from chat',
    description: 'One-click deploy to Cloudflare directly from the conversation.',
    status: 'in-progress',
  },
  {
    title: 'Custom domains',
    description: 'Point your own domain at a published app.',
    status: 'planned',
  },
  {
    title: 'More one-click integrations',
    description:
      'Best-in-class OSS providers for database and deployment, following the same one-click pattern as GitHub and Linear.',
    status: 'planned',
  },
];

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={classNames(icon, 'w-4 h-4 text-accent')} />
      <span className="font-display text-sm font-semibold text-bolt-elements-textPrimary">{title}</span>
    </div>
  );
}

function VersionHeader() {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  useEffect(() => {
    fetch('/package.json')
      .then((res) => res.json() as Promise<{ version: string }>)
      .then((data) => setCurrentVersion(data.version))
      .catch(() => setCurrentVersion(null));
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    setUpdateAvailable(null);

    try {
      const result = await checkForUpdates();
      setUpdateAvailable(result.available ? result.version : null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 mb-8">
      <div className="flex items-center gap-2">
        <div className="i-ph:rocket-launch-fill w-4 h-4 text-accent" />
        <span className="text-sm text-bolt-elements-textPrimary">
          Exobase {currentVersion ? `v${currentVersion}` : ''}
        </span>
        {updateAvailable && <span className="text-xs text-accent">— v{updateAvailable} available</span>}
      </div>
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking}
        className={classNames(
          'px-2.5 py-1 text-xs font-medium shrink-0',
          'border border-bolt-elements-borderColor shadow-hard-sm press-hard-sm',
          'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary',
          'hover:border-accent hover:text-accent transition-theme',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {checking ? 'Checking…' : 'Check for updates'}
      </button>
    </div>
  );
}

function WhatsNewSection() {
  const [entries, setEntries] = useState<Feature[]>([]);

  useEffect(() => {
    getFeatureFlags().then(setEntries);
  }, []);

  return (
    <div>
      <SectionHeading icon="i-ph:sparkle-fill" title="What's new" />
      <div className="border border-bolt-elements-borderColor divide-y divide-bolt-elements-borderColor">
        {entries.map((entry) => (
          <div key={entry.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-bolt-elements-textPrimary">{entry.name}</h4>
              <span className="text-xs text-bolt-elements-textTertiary shrink-0">{entry.releaseDate}</span>
            </div>
            <p className="text-xs text-bolt-elements-textSecondary mt-1">{entry.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapSection() {
  return (
    <div>
      <SectionHeading icon="i-ph:map-trifold-fill" title="Roadmap" />
      <div className="border border-bolt-elements-borderColor divide-y divide-bolt-elements-borderColor">
        {ROADMAP.map((item) => (
          <div key={item.title} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-bolt-elements-textPrimary">{item.title}</h4>
              <span
                className={classNames(
                  'text-xs px-1.5 py-0.5 font-mono shrink-0',
                  item.status === 'in-progress'
                    ? 'text-accent border border-accent'
                    : 'text-bolt-elements-textTertiary border border-bolt-elements-borderColor',
                )}
              >
                {item.status === 'in-progress' ? 'In progress' : 'Planned'}
              </span>
            </div>
            <p className="text-xs text-bolt-elements-textSecondary mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangelogTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <VersionHeader />
      <div className="space-y-8">
        <WhatsNewSection />
        <RoadmapSection />
      </div>
    </div>
  );
}
