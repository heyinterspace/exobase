import React from 'react';
import { classNames } from '~/utils/classNames';
import { useCoolifyConnection } from '~/lib/hooks/useCoolifyConnection';

const buttonClass =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shrink-0 border border-bolt-elements-borderColor shadow-hard press-hard transition-theme disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard';

const inputClass = classNames(
  'w-full px-3 py-2 text-sm',
  'bg-bolt-elements-background-depth-1',
  'border border-bolt-elements-borderColor',
  'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
  'focus:outline-none focus:ring-1 focus:ring-accent',
  'disabled:opacity-50',
);

export function CoolifyConnection() {
  const { isConnected, isConnecting, connection, error, connect, disconnect } = useCoolifyConnection();

  const [serverUrl, setServerUrl] = React.useState('');
  const [apiToken, setApiToken] = React.useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await connect(serverUrl, apiToken);
      setApiToken('');
    } catch {
      // Error handling is done in the hook
    }
  };

  return (
    <div className="border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
      <div className="p-6 space-y-6">
        {error && (
          <div className="p-3 text-sm border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary">
            {error}
          </div>
        )}

        {!isConnected ? (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm text-bolt-elements-textSecondary mb-2">Instance URL</label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={isConnecting}
                placeholder="https://coolify.example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm text-bolt-elements-textSecondary mb-2">API Token</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                disabled={isConnecting}
                placeholder="Enter your Coolify API token"
                className={inputClass}
              />
              <div className="mt-2 text-sm text-bolt-elements-textSecondary">
                Create one in your Coolify dashboard under Keys &amp; Tokens &gt; API tokens, with read, write, and
                deploy permissions.
              </div>
            </div>

            <button
              type="submit"
              disabled={isConnecting || !serverUrl.trim() || !apiToken.trim()}
              className={classNames(buttonClass, 'bg-accent text-accent-ink hover:brightness-110')}
            >
              <div className={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:plug-charging'} />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={disconnect}
                className={classNames(
                  buttonClass,
                  'bg-bolt-elements-background-depth-2 text-red-400 hover:border-red-400',
                )}
              >
                <div className="i-ph:plug" />
                Disconnect
              </button>
              <span className="text-sm text-bolt-elements-textSecondary flex items-center gap-1">
                <div className="i-ph:check-circle w-4 h-4 text-bolt-elements-icon-success" />
                Connected to {connection.teamName || new URL(connection.serverUrl).host}
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.open(connection.serverUrl, '_blank', 'noopener,noreferrer')}
              className={classNames(
                buttonClass,
                'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:border-accent hover:text-accent',
              )}
            >
              <div className="i-ph:arrow-square-out" />
              Open Coolify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
