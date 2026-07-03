import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import Nango from '@nangohq/frontend';
import type { GitHubUserResponse, GitHubConnection } from '~/types/GitHub';
import { useGitHubAPI } from './useGitHubAPI';
import {
  githubConnection,
  isConnecting,
  updateGitHubConnection,
  initializeGitHubConnection,
} from '~/lib/stores/github';

/*
 * A stable anonymous id, not a login — only used so Nango can group a
 * browser's connections in its dashboard. Exobase has no server-side user
 * accounts, so there's nothing more meaningful to key it to.
 */
function getOrCreateNangoEndUserId(): string {
  const existing = Cookies.get('exobaseUserId');

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  Cookies.set('exobaseUserId', id, { expires: 3650 });

  return id;
}

export interface ConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  connection: GitHubConnection | null;
  error: string | null;
  isServerSide: boolean; // Indicates if this is a server-side connection
}

export interface UseGitHubConnectionReturn extends ConnectionState {
  connect: (token: string, tokenType: 'classic' | 'fine-grained') => Promise<void>;
  connectWithOAuth: () => Promise<void>;
  disconnect: () => void;
  refreshConnection: () => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const STORAGE_KEY = 'github_connection';

export function useGitHubConnection(): UseGitHubConnectionReturn {
  const connection = useStore(githubConnection);
  const connecting = useStore(isConnecting);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create API instance - will update when connection changes
  useGitHubAPI();

  // Load saved connection on mount
  useEffect(() => {
    loadSavedConnection();
  }, []);

  const loadSavedConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if connection already exists in store (likely from initialization)
      if (connection?.user) {
        setIsLoading(false);
        return;
      }

      // If we have a token but no user, or incomplete data, refresh
      if (connection?.token && (!connection.user || !connection.stats)) {
        await refreshConnectionData(connection);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading saved connection:', error);
      setError('Failed to load saved connection');
      setIsLoading(false);

      // Clean up corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [connection]);

  const refreshConnectionData = useCallback(async (connection: GitHubConnection) => {
    if (!connection.token) {
      return;
    }

    try {
      // Make direct API call instead of using hook
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${connection.token}`,
          'User-Agent': 'exobase-app',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const userData = (await response.json()) as GitHubUserResponse;

      const updatedConnection: GitHubConnection = {
        ...connection,
        user: userData,
      };

      updateGitHubConnection(updatedConnection);
    } catch (error) {
      console.error('Error refreshing connection data:', error);
    }
  }, []);

  /*
   * Real "Connect with GitHub" OAuth via Nango — no token to generate or
   * paste. The resulting access token lives server-side only; this browser
   * only ever holds the opaque Nango connectionId.
   */
  const connectWithOAuth = useCallback(async () => {
    isConnecting.set(true);
    setError(null);

    try {
      const sessionRes = await fetch('/api/nango-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: 'github', endUserId: getOrCreateNangoEndUserId() }),
      });

      if (!sessionRes.ok) {
        throw new Error('GitHub OAuth is not set up on this server yet');
      }

      const { sessionToken } = (await sessionRes.json()) as { sessionToken: string };

      const connectionId = await new Promise<string>((resolve, reject) => {
        const nango = new Nango();
        const connect = nango.openConnectUI({
          onEvent: (event) => {
            if (event.type === 'connect') {
              resolve(event.payload.connectionId);
            } else if (event.type === 'close') {
              reject(new Error('Connection cancelled'));
            } else if (event.type === 'error') {
              reject(new Error(event.payload.errorMessage));
            }
          },
        });
        connect.setSessionToken(sessionToken);
      });

      Cookies.set('githubNangoConnectionId', connectionId, { expires: 3650 });

      await initializeGitHubConnection();
      toast.success('Connected to GitHub');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to GitHub';
      setError(errorMessage);

      if (errorMessage !== 'Connection cancelled') {
        toast.error(`Failed to connect: ${errorMessage}`);
      }

      throw error;
    } finally {
      isConnecting.set(false);
    }
  }, []);

  const connect = useCallback(async (token: string, tokenType: 'classic' | 'fine-grained') => {
    console.log('useGitHubConnection.connect called with tokenType:', tokenType);

    if (!token.trim()) {
      console.log('Token validation failed - empty token');
      setError('Token is required');

      return;
    }

    console.log('Setting isConnecting to true');
    isConnecting.set(true);
    setError(null);

    try {
      console.log('Making API request to GitHub...');

      // Test the token by fetching user info
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `${tokenType === 'classic' ? 'token' : 'Bearer'} ${token}`,
          'User-Agent': 'exobase-app',
        },
      });

      console.log('GitHub API response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const userData = (await response.json()) as GitHubUserResponse;

      // Create connection object
      const connectionData: GitHubConnection = {
        user: userData,
        token,
        tokenType,
      };

      // Set cookies for API requests
      Cookies.set('githubToken', token);
      Cookies.set('githubUsername', userData.login);
      Cookies.set(
        'git:github.com',
        JSON.stringify({
          username: token,
          password: 'x-oauth-basic',
        }),
      );

      // Update the store
      updateGitHubConnection(connectionData);

      toast.success(`Connected to GitHub as ${userData.login}`);
    } catch (error) {
      console.error('Failed to connect to GitHub:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to GitHub';

      setError(errorMessage);
      toast.error(`Failed to connect: ${errorMessage}`);
      throw error;
    } finally {
      isConnecting.set(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

    // Clear all GitHub-related cookies
    Cookies.remove('githubToken');
    Cookies.remove('githubUsername');
    Cookies.remove('git:github.com');
    Cookies.remove('githubNangoConnectionId');

    // Reset store
    updateGitHubConnection({
      user: null,
      token: '',
      tokenType: 'classic',
    });

    setError(null);
    toast.success('Disconnected from GitHub');
  }, []);

  const refreshConnection = useCallback(async () => {
    if (!connection?.token) {
      throw new Error('No connection to refresh');
    }

    setIsLoading(true);
    setError(null);

    try {
      await refreshConnectionData(connection);
    } catch (error) {
      console.error('Error refreshing connection:', error);
      setError('Failed to refresh connection');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [connection, refreshConnectionData]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!connection) {
      return false;
    }

    try {
      // For server-side connections, test via our API
      const isServerSide = !connection.token;

      if (isServerSide) {
        const response = await fetch('/api/github-user');
        return response.ok;
      }

      // For client-side connections, test directly
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${connection.token}`,
          'User-Agent': 'exobase-app',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, [connection]);

  return {
    isConnected: !!connection?.user,
    isLoading,
    isConnecting: connecting,
    connection,
    error,
    isServerSide: !connection?.token, // Server-side if no token
    connect,
    connectWithOAuth,
    disconnect,
    refreshConnection,
    testConnection,
  };
}
