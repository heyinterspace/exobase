import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

// cache which stores whether the provider's API key is set via environment variable
const providerEnvKeyStatusCache: Record<string, boolean> = {};

const apiKeyMemoizeCache: { [k: string]: Record<string, string> } = {};

export function getApiKeysFromCookies() {
  const storedApiKeys = Cookies.get('apiKeys');
  let parsedKeys: Record<string, string> = {};

  if (storedApiKeys) {
    parsedKeys = apiKeyMemoizeCache[storedApiKeys];

    if (!parsedKeys) {
      parsedKeys = apiKeyMemoizeCache[storedApiKeys] = JSON.parse(storedApiKeys);
    }
  }

  return parsedKeys;
}

/**
 * Whether a provider's key is available via an environment variable — used to
 * decide whether the submit-time ApiKeyDialog gate needs to appear at all.
 */
export function useEnvKeyStatus(providerName: string) {
  const [isEnvKeySet, setIsEnvKeySet] = useState(() => providerEnvKeyStatusCache[providerName] ?? false);

  const checkEnvApiKey = useCallback(async () => {
    if (providerEnvKeyStatusCache[providerName] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[providerName]);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(providerName)}`);
      const data = await response.json();
      const isSet = (data as { isSet: boolean }).isSet;

      providerEnvKeyStatusCache[providerName] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [providerName]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  return isEnvKeySet;
}
