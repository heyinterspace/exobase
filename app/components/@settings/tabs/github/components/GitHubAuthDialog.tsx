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
  const { connect, isConnecting, error } = useGitHubConnection();
  const [token, setToken] = useState('');
  const [tokenType, setTokenType] = useState<'classic' | 'fine-grained'>('classic');

  const handleConnect = async (e: React.FormEvent) => {
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
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(next) => !next && handleClose()}>
      {isOpen && (
        <Dialog onClose={handleClose} onBackdrop={handleClose} className="max-w-md">
          <div className="p-6 space-y-6">
            <DialogTitle>Connect to GitHub</DialogTitle>

            <div className="text-xs text-bolt-elements-textSecondary bg-bolt-elements-background-depth-1 p-3">
              <p className="flex items-center gap-1 mb-1">
                <span className="i-ph:lightbulb w-3.5 h-3.5 text-bolt-elements-icon-success" />
                <span className="font-medium">Tip:</span> You need a GitHub token to deploy repositories.
              </p>
              <p>Required scopes: repo, read:org, read:user</p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
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
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
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
            </form>
          </div>
        </Dialog>
      )}
    </DialogRoot>
  );
}
