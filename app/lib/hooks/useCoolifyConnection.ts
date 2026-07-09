import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { coolifyConnection, isCoolifyConnecting, updateCoolifyConnection } from '~/lib/stores/coolify';

export interface UseCoolifyConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connection: ReturnType<typeof coolifyConnection.get>;
  error: string | null;
  connect: (serverUrl: string, token: string) => Promise<void>;
  disconnect: () => void;
}

/*
 * Mirrors useLinearConnection's manual-token path. No OAuth: Coolify is
 * self-hosted and not in Nango's catalog, so the connection is an instance
 * URL + API token pair, validated through our server proxy (CORS).
 */
export function useCoolifyConnection(): UseCoolifyConnectionReturn {
  const connection = useStore(coolifyConnection);
  const connecting = useStore(isCoolifyConnecting);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (serverUrl: string, token: string) => {
    if (!serverUrl.trim() || !token.trim()) {
      setError('Instance URL and API token are both required');
      return;
    }

    isCoolifyConnecting.set(true);
    setError(null);

    try {
      const response = await fetch('/api/coolify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: serverUrl.trim(), token: token.trim() }),
      });

      const data = (await response.json()) as { teamName?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || `Validation failed (${response.status})`);
      }

      updateCoolifyConnection({ serverUrl: serverUrl.trim(), token: token.trim(), teamName: data.teamName });
      toast.success(`Connected to Coolify (${data.teamName})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Coolify';
      setError(errorMessage);
      toast.error(`Failed to connect: ${errorMessage}`);
      throw error;
    } finally {
      isCoolifyConnecting.set(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('coolify_connection');
    coolifyConnection.set({ serverUrl: '', token: '' });
    setError(null);
    toast.success('Disconnected from Coolify');
  }, []);

  return {
    isConnected: !!connection.token && !!connection.serverUrl,
    isConnecting: connecting,
    connection,
    error,
    connect,
    disconnect,
  };
}
