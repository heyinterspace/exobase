import { useState } from 'react';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { useGitLabConnection } from '~/lib/hooks';
import { DialogRoot, Dialog, DialogTitle, DialogButton } from '~/components/ui/Dialog';

interface GitLabAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitLabAuthDialog({ isOpen, onClose }: GitLabAuthDialogProps) {
  const { isConnecting, error, connect } = useGitLabConnection();
  const [token, setToken] = useState('');
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com');

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token.trim()) {
      toast.error('Please enter your GitLab access token');
      return;
    }

    try {
      await connect(token, gitlabUrl);
      toast.success('Successfully connected to GitLab!');
      setToken('');
      onClose();
    } catch (error) {
      // Error handling is done in the hook
      console.error('GitLab connect failed:', error);
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <Dialog onClose={onClose} onBackdrop={onClose} className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4">Connect to GitLab</DialogTitle>

            <div className="flex items-center gap-3 mb-6">
              <div className="i-ph:gitlab-logo w-8 h-8 text-orange-500 shrink-0" />
              <div>
                <h3 className="text-base font-medium text-bolt-elements-textPrimary">GitLab Connection</h3>
                <p id="gitlab-auth-description" className="text-sm text-bolt-elements-textSecondary">
                  Connect your GitLab account to deploy your projects
                </p>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">GitLab URL</label>
                <input
                  type="url"
                  value={gitlabUrl}
                  onChange={(e) => setGitlabUrl(e.target.value)}
                  disabled={isConnecting}
                  placeholder="https://gitlab.com"
                  className={classNames(
                    'w-full px-3 py-2 text-sm',
                    'bg-bolt-elements-background-depth-2',
                    'border border-bolt-elements-borderColor',
                    'text-bolt-elements-textPrimary',
                    'placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-2 focus:ring-accent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                />
              </div>

              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">Access Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isConnecting}
                  placeholder="Enter your GitLab access token"
                  className={classNames(
                    'w-full px-3 py-2 text-sm',
                    'bg-bolt-elements-background-depth-2',
                    'border border-bolt-elements-borderColor',
                    'text-bolt-elements-textPrimary',
                    'placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-2 focus:ring-accent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  required
                />
                <div className="mt-2 text-xs text-bolt-elements-textSecondary">
                  <a
                    href={`${gitlabUrl}/-/user_settings/personal_access_tokens`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    Get your token
                    <div className="i-ph:arrow-square-out w-3 h-3" />
                  </a>
                  <span className="mx-2">•</span>
                  <span>Required scopes: api, read_repository</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <DialogButton
                  type="secondary"
                  icon="i-ph:x"
                  onClick={(event) => {
                    event.preventDefault();
                    onClose();
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
                  {isConnecting ? 'Connecting...' : 'Connect to GitLab'}
                </DialogButton>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </DialogRoot>
  );
}
