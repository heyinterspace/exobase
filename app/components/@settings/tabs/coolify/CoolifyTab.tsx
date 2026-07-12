import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { checkManagedHosting, managedHostingAvailable } from '~/lib/stores/coolify';
import { CoolifyConnection } from './components/CoolifyConnection';

export default function CoolifyTab() {
  const managedAvailable = useStore(managedHostingAvailable);

  useEffect(() => {
    checkManagedHosting();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="i-ph:rocket-launch-fill w-5 h-5 text-bolt-elements-textPrimary" />
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">Hosting</h2>
      </div>

      {managedAvailable ? (
        <div className="flex items-center gap-2 p-3 text-sm border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary">
          <div className="i-ph:check-circle w-4 h-4 text-bolt-elements-icon-success shrink-0" />
          Apps deploy on Exobase. Nothing to set up, just connect GitHub and hit Deploy.
        </div>
      ) : (
        <p className="text-sm text-bolt-elements-textSecondary">
          Apps deploy on Exobase-managed hosting when available. Nothing to configure here in that case, just connect
          GitHub and hit Deploy.
        </p>
      )}

      <details className="group">
        <summary className="text-sm text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary cursor-pointer list-none flex items-center gap-1">
          <div className="i-ph:caret-right w-3.5 h-3.5 transition-transform group-open:rotate-90" />
          Advanced: host on your own Coolify instance instead
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-bolt-elements-textSecondary">
            Bring your own self-hosted Coolify server and deploys go there instead of Exobase. Deploys still build from
            your GitHub repo, so GitHub stays required either way.
          </p>
          <CoolifyConnection />
        </div>
      </details>
    </div>
  );
}
