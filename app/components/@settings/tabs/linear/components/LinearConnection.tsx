import React from 'react';
import { classNames } from '~/utils/classNames';
import { useLinearConnection } from '~/lib/hooks/useLinearConnection';

const buttonClass =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shrink-0 border border-bolt-elements-borderColor shadow-hard press-hard transition-theme disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard';

export function LinearConnection() {
  const { isConnected, isConnecting, connection, error, connectWithOAuth, connect, disconnect } = useLinearConnection();

  const [showManualToken, setShowManualToken] = React.useState(false);
  const [apiKey, setApiKey] = React.useState('');

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      return;
    }

    try {
      await connect(apiKey);
      setApiKey('');
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
          !showManualToken ? (
            <div className="space-y-4">
              <p className="text-sm text-bolt-elements-textSecondary">
                One click, no API keys to generate — you'll approve access on Linear's own sign-in page.
              </p>
              <button
                type="button"
                onClick={connectWithOAuth}
                disabled={isConnecting}
                className={classNames(buttonClass, 'bg-accent text-accent-ink hover:brightness-110')}
              >
                <div className={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:plug-charging'} />
                {isConnecting ? 'Connecting...' : 'Connect with Linear'}
              </button>
              <button
                type="button"
                onClick={() => setShowManualToken(true)}
                className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary underline-offset-2 hover:underline"
              >
                Or paste a personal API key instead
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnectToken} className="space-y-4">
              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">Personal API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isConnecting}
                  placeholder="Enter your Linear API key"
                  className={classNames(
                    'w-full px-3 py-2 text-sm',
                    'bg-bolt-elements-background-depth-1',
                    'border border-bolt-elements-borderColor',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-accent',
                    'disabled:opacity-50',
                  )}
                />
                <div className="mt-2 text-sm text-bolt-elements-textSecondary">
                  <a
                    href="https://linear.app/settings/account/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    Get your API key
                    <div className="i-ph:arrow-square-out w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowManualToken(false)}
                  className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary underline-offset-2 hover:underline"
                >
                  Back to Connect with Linear
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !apiKey.trim()}
                  className={classNames(buttonClass, 'bg-accent text-accent-ink hover:brightness-110')}
                >
                  <div className={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:plug-charging'} />
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          )
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
                Connected as {connection.user?.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://linear.app', '_blank', 'noopener,noreferrer')}
              className={classNames(
                buttonClass,
                'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:border-accent hover:text-accent',
              )}
            >
              <div className="i-ph:arrow-square-out" />
              Open Linear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
