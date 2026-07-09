import { atom } from 'nanostores';

/*
 * Coolify is self-hosted, so unlike every other provider the instance URL is
 * user-supplied — there's no fixed api.coolify.io to talk to. Both the URL
 * and the API token live client-side (localStorage), matching the Vercel/
 * Netlify token pattern; requests to the instance are proxied through our
 * server routes purely to avoid CORS, not to hold secrets.
 */
export interface CoolifyConnection {
  serverUrl: string;
  token: string;
  teamName?: string;
}

const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('coolify_connection') : null;
const initialConnection: CoolifyConnection = storedConnection
  ? JSON.parse(storedConnection)
  : {
      serverUrl: '',
      token: '',
    };

export const coolifyConnection = atom<CoolifyConnection>(initialConnection);
export const isCoolifyConnecting = atom<boolean>(false);

export const updateCoolifyConnection = (updates: Partial<CoolifyConnection>) => {
  const newState = { ...coolifyConnection.get(), ...updates };
  coolifyConnection.set(newState);

  if (typeof window !== 'undefined') {
    localStorage.setItem('coolify_connection', JSON.stringify(newState));
  }
};
