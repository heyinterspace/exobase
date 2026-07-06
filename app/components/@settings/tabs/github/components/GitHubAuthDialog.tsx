import React, { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { useGitHubConnection } from '~/lib/hooks';
import { DialogRoot, Dialog, DialogTitle, DialogButton } from '~/components/ui/Dialog';

interface GitHubAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GitHubAuthDialog({ isOpen, onClose, onSuccess }: GitHubAuthDialogProps) {
  const { connect, connectWithOAuth, isConnecting, error } = useGitHubConnection();
  const [showManualToken, setShowManualToken] = useState(false);
  const [token, setToken] = useState('');
  const [tokenType, setTokenType] = useState<'classic' | 'fine-grained'>('classic');

  const handleConnectOAuth = async () => {
    try {
      await connectWithOAuth();
      onSuccess?.();
      onClose();
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      return;
    }

    try {
      await connect(token, tokenType);
      setToken(''); // Clear token on successful connection
      onSuccess?.();
      onClose();
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleClose = () => {
    setToken('');
    setShowManualToken(false);
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(next) => !next && handleClose()}>
      {isOpen && (
        <Dialog onClose={handleClose} onBackdrop={handleClose} className="max-w-md">
          <div className="p-6 space-y-6">
            <DialogTitle>Connect to GitHub</DialogTitle>

            {error && (
              <div className="p-3 text-sm border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary">
                {error}
              </div>
            )}

            {!showManualToken ? (
              <div className="space-y-4">
                <p className="text-sm text-bolt-elements-textSecondary">
                  One click, no tokens to generate. You'll approve access on GitHub's own sign-in page.
                </p>
                <DialogButton
                  type="primary"
                  icon={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:github-logo'}
                  onClick={handleConnectOAuth}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect with GitHub'}
                </DialogButton>
                <button
                  type="button"
                  onClick={() => setShowManualToken(true)}
                  className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary underline-offset-2 hover:underline"
                >
                  Or paste a personal access token instead
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectToken} className="space-y-4">
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
                    <span className="mx-1.5">·</span>
                    <span>Required scopes: repo, read:org, read:user</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowManualToken(false)}
                    className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary underline-offset-2 hover:underline"
                  >
                    Back to Connect with GitHub
                  </button>
                  <div className="flex items-center gap-2">
                    <DialogButton
                      type="secondary"
                      icon="i-ph:x"
                      onClick={(event) => {
                        event.preventDefault();
                        handleClose();
                      }}
                      disabled={isConnecting}
                    >
                      Cancel
                    </DialogButton>
                    <DialogButton
                      type="primary"
                      submit
                      icon={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:plug-charging'}
                      disabled={isConnecting || !token.trim()}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </DialogButton>
                  </div>
                </div>
              </form>
            )}
          </div>
        </Dialog>
      )}
    </DialogRoot>
  );
}
