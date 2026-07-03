import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Dialog, DialogRoot, DialogTitle, DialogButton, DialogClose } from '~/components/ui/Dialog';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookies } from './APIKeyManager';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  provider: ProviderInfo;
  apiKey: string;
  setApiKey: (key: string) => void;
}

/**
 * Shown when the user tries to submit a prompt and the current provider has
 * no usable API key (neither saved via the UI nor set as an env var) — a
 * blocking dialog instead of a permanent inline row in the composer.
 */
export function ApiKeyDialog({ open, onClose, provider, apiKey, setApiKey }: ApiKeyDialogProps) {
  const [tempKey, setTempKey] = useState(apiKey);

  useEffect(() => {
    if (open) {
      setTempKey(apiKey);
    }
  }, [open, apiKey]);

  const handleSave = () => {
    setApiKey(tempKey);

    const currentKeys = getApiKeysFromCookies();
    const newKeys = { ...currentKeys, [provider.name]: tempKey };
    Cookies.set('apiKeys', JSON.stringify(newKeys));

    onClose();
  };

  return (
    <DialogRoot open={open} onOpenChange={(next) => !next && onClose()}>
      {open && (
        <Dialog onClose={onClose} onBackdrop={onClose} className="max-w-md p-6">
          <div className="space-y-4">
            <DialogTitle>{provider.name} API key required</DialogTitle>
            <p className="text-sm text-bolt-elements-textSecondary">
              Add your {provider.name} API key to start building, or set it as an environment variable and reload.
            </p>
            <div>
              <input
                type="password"
                autoFocus
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempKey) {
                    handleSave();
                  }
                }}
                placeholder="Enter API key"
                className="w-full px-3 py-2 text-sm border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary shadow-hard focus:outline-none focus:border-accent"
              />
              {provider.getApiKeyLink && (
                <a
                  href={provider.getApiKeyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  {provider.labelForGetApiKey || 'Get an API key'}
                  <div className="i-ph:arrow-square-out w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <DialogButton type="secondary">Cancel</DialogButton>
              </DialogClose>
              <DialogButton type="primary" onClick={handleSave} disabled={!tempKey}>
                Save &amp; continue
              </DialogButton>
            </div>
          </div>
        </Dialog>
      )}
    </DialogRoot>
  );
}
