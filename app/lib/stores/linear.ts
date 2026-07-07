import { atom } from 'nanostores';
import type { LinearConnection } from '~/types/Linear';
import { logStore } from './logs';

const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('linear_connection') : null;
const initialConnection: LinearConnection = storedConnection
  ? JSON.parse(storedConnection)
  : {
      user: null,
      token: '',
    };

export const linearConnection = atom<LinearConnection>(initialConnection);
export const isLinearConnecting = atom<boolean>(false);

export const updateLinearConnection = (updates: Partial<LinearConnection>) => {
  const currentState = linearConnection.get();
  const newState = { ...currentState, ...updates };
  linearConnection.set(newState);

  if (typeof window !== 'undefined') {
    localStorage.setItem('linear_connection', JSON.stringify(newState));
  }
};

/**
 * Mirrors initializeGitHubConnection() — populates the connection purely
 * from a server-side-resolved token (Nango connectionId cookie or an env
 * var), so the client never needs to hold the real Linear API key.
 */
export async function initializeLinearConnection() {
  const currentState = linearConnection.get();

  if (currentState.user) {
    return;
  }

  try {
    isLinearConnecting.set(true);

    const response = await fetch('/api/linear-user');

    if (!response.ok) {
      if (response.status === 401) {
        return;
      }

      throw new Error(`Failed to connect to Linear: ${response.statusText}`);
    }

    const userData = (await response.json()) as any;

    updateLinearConnection({
      user: userData,
      token: '', // Token stored server-side only
    });

    await fetchLinearTeams();

    logStore.logSystem('Linear connection initialized successfully');
  } catch (error) {
    console.error('Error initializing Linear connection:', error);
    logStore.logError('Failed to initialize Linear connection', { error });
  } finally {
    isLinearConnecting.set(false);
  }
}

export async function fetchLinearTeams() {
  try {
    const response = await fetch('/api/linear-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_teams' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.status}`);
    }

    const { teams } = (await response.json()) as { teams: Array<{ id: string; name: string; key: string }> };
    const currentState = linearConnection.get();

    updateLinearConnection({
      teams,

      /*
       * Auto-pick the only team so issue creation never needs to ask — see
       * the one-click bar this connection is designed around.
       */
      defaultTeamId: currentState.defaultTeamId || (teams.length === 1 ? teams[0].id : undefined),
    });
  } catch (error) {
    console.error('Failed to fetch Linear teams:', error);
  }
}
