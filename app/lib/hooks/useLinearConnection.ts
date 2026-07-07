import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { connectViaNango } from './useNangoConnect';
import {
  linearConnection,
  isLinearConnecting,
  updateLinearConnection,
  initializeLinearConnection,
} from '~/lib/stores/linear';

export interface UseLinearConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connection: ReturnType<typeof linearConnection.get>;
  error: string | null;
  connectWithOAuth: () => Promise<void>;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => void;
}

export function useLinearConnection(): UseLinearConnectionReturn {
  const connection = useStore(linearConnection);
  const connecting = useStore(isLinearConnecting);
  const [error, setError] = useState<string | null>(null);

  // Real "Connect with Linear" OAuth via Nango — mirrors useGitHubConnection.
  const connectWithOAuth = useCallback(async () => {
    isLinearConnecting.set(true);
    setError(null);

    try {
      const connectionId = await connectViaNango('linear');
      Cookies.set('linearNangoConnectionId', connectionId, { expires: 3650 });

      await initializeLinearConnection();
      toast.success('Connected to Linear');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Linear';
      setError(errorMessage);

      if (errorMessage !== 'Connection cancelled') {
        toast.error(`Failed to connect: ${errorMessage}`);
      }

      throw error;
    } finally {
      isLinearConnecting.set(false);
    }
  }, []);

  // Manual personal API key fallback for self-hosters who skip Nango.
  const connect = useCallback(async (apiKey: string) => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    isLinearConnecting.set(true);
    setError(null);

    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({ query: '{ viewer { id name email avatarUrl } }' }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const { data, errors } = (await response.json()) as {
        data?: { viewer: any };
        errors?: Array<{ message: string }>;
      };

      if (errors?.length) {
        throw new Error(errors[0].message);
      }

      updateLinearConnection({ user: data!.viewer, token: apiKey });
      toast.success(`Connected to Linear as ${data!.viewer.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Linear';
      setError(errorMessage);
      toast.error(`Failed to connect: ${errorMessage}`);
      throw error;
    } finally {
      isLinearConnecting.set(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('linear_connection');
    Cookies.remove('linearNangoConnectionId');
    updateLinearConnection({ user: null, token: '', teams: undefined, defaultTeamId: undefined });
    setError(null);
    toast.success('Disconnected from Linear');
  }, []);

  return {
    isConnected: !!connection.user,
    isConnecting: connecting,
    connection,
    error,
    connectWithOAuth,
    connect,
    disconnect,
  };
}
