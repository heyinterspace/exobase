import React from 'react';
import { classNames } from '~/utils/classNames';
import { useGitHubConnection } from '~/lib/hooks';

interface ConnectionTestResult {
  status: 'success' | 'error' | 'testing';
  message: string;
  timestamp?: number;
}

interface GitHubConnectionProps {
  connectionTest: ConnectionTestResult | null;
  onTestConnection: () => void;
}

const buttonClass =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shrink-0 border border-bolt-elements-borderColor shadow-hard press-hard transition-theme disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard';

export function GitHubConnection({ connectionTest, onTestConnection }: GitHubConnectionProps) {
  const { isConnected, isLoading, isConnecting, connect, connectWithOAuth, disconnect, error } = useGitHubConnection();

  const [showManualToken, setShowManualToken] = React.useState(false);
  const [token, setToken] = React.useState('');
  const [tokenType, setTokenType] = React.useState<'classic' | 'fine-grained'>('classic');

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      return;
    }

    try {
      await connect(token, tokenType);
      setToken(''); // Clear token on successful connection
    } catch {
      // Error handling is done in the hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
          <span className="text-bolt-elements-textSecondary">Loading connection...</span>
        </div>
      </div>
    );
  }

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
                One click, no tokens to generate — you'll approve access on GitHub's own sign-in page.
              </p>
              <button
                type="button"
                onClick={connectWithOAuth}
                disabled={isConnecting}
                className={classNames(buttonClass, 'bg-accent text-accent-ink hover:brightness-110')}
              >
                <div className={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:github-logo'} />
                {isConnecting ? 'Connecting...' : 'Connect with GitHub'}
              </button>
              <div className="text-xs text-bolt-elements-textTertiary">
                <button
                  type="button"
                  onClick={() => setShowManualToken(true)}
                  className="hover:text-bolt-elements-textSecondary underline-offset-2 hover:underline"
                >
                  Or paste a personal access token instead
                </button>
                <span className="mx-1.5">·</span>
                <span>
                  Set <code className="px-1 py-0.5 bg-bolt-elements-background-depth-3">VITE_GITHUB_ACCESS_TOKEN</code>{' '}
                  to connect automatically
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnectToken} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-bolt-elements-textSecondary mb-2">Token Type</label>
                  <select
                    value={tokenType}
                    onChange={(e) => setTokenType(e.target.value as 'classic' | 'fine-grained')}
                    disabled={isConnecting}
                    className={classNames(
                      'w-full px-3 py-2 text-sm',
                      'bg-bolt-elements-background-depth-1',
                      'border border-bolt-elements-borderColor',
                      'text-bolt-elements-textPrimary',
                      'focus:outline-none focus:ring-1 focus:ring-accent',
                      'disabled:opacity-50',
                    )}
                  >
                    <option value="classic">Personal Access Token (Classic)</option>
                    <option value="fine-grained">Fine-grained Token</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-bolt-elements-textSecondary mb-2">
                    {tokenType === 'classic' ? 'Personal Access Token' : 'Fine-grained Token'}
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isConnecting}
                    placeholder={`Enter your GitHub ${
                      tokenType === 'classic' ? 'personal access token' : 'fine-grained token'
                    }`}
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
                      href={`https://github.com/settings/tokens${tokenType === 'fine-grained' ? '/beta' : '/new'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      Get your token
                      <div className="i-ph:arrow-square-out w-4 h-4" />
                    </a>
                    <span className="mx-2">·</span>
                    <span>
                      Required scopes:{' '}
                      {tokenType === 'classic' ? 'repo, read:org, read:user' : 'Repository access, Organization access'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowManualToken(false)}
                  className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary underline-offset-2 hover:underline"
                >
                  Back to Connect with GitHub
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !token.trim()}
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
                Connected to GitHub
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.open('https://github.com/dashboard', '_blank', 'noopener,noreferrer')}
                className={classNames(
                  buttonClass,
                  'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:border-accent hover:text-accent',
                )}
              >
                <div className="i-ph:layout" />
                Dashboard
              </button>
              <button
                type="button"
                onClick={onTestConnection}
                disabled={connectionTest?.status === 'testing'}
                className={classNames(
                  buttonClass,
                  'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:border-accent hover:text-accent',
                )}
              >
                <div
                  className={
                    connectionTest?.status === 'testing' ? 'i-ph:spinner-gap animate-spin' : 'i-ph:plug-charging'
                  }
                />
                {connectionTest?.status === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
