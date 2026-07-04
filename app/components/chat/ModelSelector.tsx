import type { ProviderInfo } from '~/types/model';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { classNames } from '~/utils/classNames';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import { getRecommendedModel, getTopModels, blendedPricePerMillion, getCostTier } from '~/utils/modelEconomics';
import { parseModelLabel } from '~/utils/modelLabel';
import { toast } from 'react-toastify';

// Fuzzy search utilities
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }

  return matrix[str2.length][str1.length];
};

const fuzzyMatch = (query: string, text: string): { score: number; matches: boolean } => {
  if (!query) {
    return { score: 0, matches: true };
  }

  if (!text) {
    return { score: 0, matches: false };
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact substring match gets highest score
  if (textLower.includes(queryLower)) {
    return { score: 100 - (textLower.indexOf(queryLower) / textLower.length) * 20, matches: true };
  }

  // Fuzzy match with reasonable threshold
  const distance = levenshteinDistance(queryLower, textLower);
  const maxLen = Math.max(queryLower.length, textLower.length);
  const similarity = 1 - distance / maxLen;

  return {
    score: similarity > 0.6 ? similarity * 80 : 0,
    matches: similarity > 0.6,
  };
};

const highlightText = (text: string, query: string): string => {
  if (!query) {
    return text;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 text-current">$1</mark>');
};

const formatContextSize = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }

  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }

  return tokens.toString();
};

interface ModelSelectorProps {
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  modelList: ModelInfo[];
  providerList: ProviderInfo[];
  apiKeys: Record<string, string>;
  modelLoading?: string;
}

export const ModelSelector = ({
  model,
  setModel,
  provider,
  setProvider,
  modelList,
  providerList,
  modelLoading,
}: ModelSelectorProps) => {
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [debouncedModelSearchQuery, setDebouncedModelSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const modelOptionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [debouncedProviderSearchQuery, setDebouncedProviderSearchQuery] = useState('');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [focusedProviderIndex, setFocusedProviderIndex] = useState(-1);
  const providerSearchInputRef = useRef<HTMLInputElement>(null);
  const providerOptionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const providerDropdownRef = useRef<HTMLDivElement>(null);

  /*
   * Replit-style composer: the model picker is the one visible control; provider
   * switching (which provider/API key a model comes from) is a collapsed escape
   * hatch for BYO-model power users rather than a second dropdown shown by default.
   */
  const [isProviderPickerExpanded, setIsProviderPickerExpanded] = useState(false);

  type ConnectionStatus = 'unknown' | 'connected' | 'disconnected';

  const [localProviderStatus, setLocalProviderStatus] = useState<Record<string, ConnectionStatus>>({});

  // Check connectivity of local providers when provider list changes
  useEffect(() => {
    const checkLocalProviders = async () => {
      const statuses: Record<string, 'connected' | 'disconnected'> = {};

      for (const p of providerList) {
        if (!LOCAL_PROVIDERS.includes(p.name)) {
          continue;
        }

        // If the provider has models loaded, it's connected
        const hasModels = modelList.some((m) => m.provider === p.name);

        statuses[p.name] = hasModels ? 'connected' : 'disconnected';
      }

      setLocalProviderStatus(statuses);
    };

    checkLocalProviders();
  }, [providerList, modelList]);

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedModelSearchQuery(modelSearchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [modelSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProviderSearchQuery(providerSearchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [providerSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
      }

      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /*
   * Best price/performance, recomputed as pricing/scores change. Not scoped to
   * the currently-selected provider — only ever matches an OpenRouter model.
   */
  const recommendedModelName = useMemo(() => getRecommendedModel(modelList)?.name, [modelList]);

  const allModelsForProvider = useMemo(
    () => [...modelList].filter((e) => e.provider === provider?.name && e.name),
    [modelList, provider?.name],
  );

  const filteredModels = useMemo(() => {
    const searched = allModelsForProvider
      .map((model) => {
        // Calculate search scores for fuzzy matching
        const labelMatch = fuzzyMatch(debouncedModelSearchQuery, model.label);
        const nameMatch = fuzzyMatch(debouncedModelSearchQuery, model.name);
        const contextMatch = fuzzyMatch(debouncedModelSearchQuery, formatContextSize(model.maxTokenAllowed));

        const bestScore = Math.max(labelMatch.score, nameMatch.score, contextMatch.score);
        const matches = labelMatch.matches || nameMatch.matches || contextMatch.matches || !debouncedModelSearchQuery; // Show all if no query

        return {
          ...model,
          searchScore: bestScore,
          searchMatches: matches,
        };
      })
      .filter((model) => model.searchMatches);

    if (debouncedModelSearchQuery) {
      // Typing a name is the escape hatch to the full catalog — no cap, best matches first.
      return searched.sort((a, b) => b.searchScore - a.searchScore);
    }

    /*
     * No query: the best 10 models for the task, ranked by independent coding
     * benchmark score (highest first). Everything else is one search away —
     * the "+N more" row below points people at the full catalog.
     */
    return getTopModels(searched);
  }, [allModelsForProvider, debouncedModelSearchQuery]);

  const filteredProviders = useMemo(() => {
    if (!debouncedProviderSearchQuery) {
      return providerList;
    }

    return providerList
      .map((provider) => {
        const match = fuzzyMatch(debouncedProviderSearchQuery, provider.name);
        return {
          ...provider,
          searchScore: match.score,
          searchMatches: match.matches,
          highlightedName: highlightText(provider.name, debouncedProviderSearchQuery),
        };
      })
      .filter((provider) => provider.searchMatches)
      .sort((a, b) => b.searchScore - a.searchScore);
  }, [providerList, debouncedProviderSearchQuery]);

  useEffect(() => {
    setFocusedModelIndex(-1);
  }, [debouncedModelSearchQuery, isModelDropdownOpen]);

  useEffect(() => {
    setFocusedProviderIndex(-1);
  }, [debouncedProviderSearchQuery, isProviderDropdownOpen]);

  // Clear search functions
  const clearModelSearch = useCallback(() => {
    setModelSearchQuery('');
    setDebouncedModelSearchQuery('');

    if (modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, []);

  const clearProviderSearch = useCallback(() => {
    setProviderSearchQuery('');
    setDebouncedProviderSearchQuery('');

    if (providerSearchInputRef.current) {
      providerSearchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isModelDropdownOpen && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, [isModelDropdownOpen]);

  useEffect(() => {
    if (isProviderDropdownOpen && providerSearchInputRef.current) {
      providerSearchInputRef.current.focus();
    }
  }, [isProviderDropdownOpen]);

  const handleModelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isModelDropdownOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedModelIndex((prev) => (prev + 1 >= filteredModels.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedModelIndex((prev) => (prev - 1 < 0 ? filteredModels.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();

        if (focusedModelIndex >= 0 && focusedModelIndex < filteredModels.length) {
          const selectedModel = filteredModels[focusedModelIndex];
          setModel?.(selectedModel.name);
          setIsModelDropdownOpen(false);
          setModelSearchQuery('');
          setDebouncedModelSearchQuery('');
        }

        break;
      case 'Escape':
        e.preventDefault();
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
        setDebouncedModelSearchQuery('');
        break;
      case 'Tab':
        if (!e.shiftKey && focusedModelIndex === filteredModels.length - 1) {
          setIsModelDropdownOpen(false);
        }

        break;
      case 'k':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          clearModelSearch();
        }

        break;
    }
  };

  const handleProviderKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isProviderDropdownOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedProviderIndex((prev) => (prev + 1 >= filteredProviders.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedProviderIndex((prev) => (prev - 1 < 0 ? filteredProviders.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();

        if (focusedProviderIndex >= 0 && focusedProviderIndex < filteredProviders.length) {
          const selectedProvider = filteredProviders[focusedProviderIndex];

          if (setProvider) {
            setProvider(selectedProvider);

            const firstModel = modelList.find((m) => m.provider === selectedProvider.name);

            if (firstModel && setModel) {
              setModel(firstModel.name);
            }
          }

          setIsProviderDropdownOpen(false);
          setProviderSearchQuery('');
          setDebouncedProviderSearchQuery('');
          setIsProviderPickerExpanded(false);
        }

        break;
      case 'Escape':
        e.preventDefault();
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery('');
        setDebouncedProviderSearchQuery('');
        break;
      case 'Tab':
        if (!e.shiftKey && focusedProviderIndex === filteredProviders.length - 1) {
          setIsProviderDropdownOpen(false);
        }

        break;
      case 'k':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          clearProviderSearch();
        }

        break;
    }
  };

  useEffect(() => {
    if (focusedModelIndex >= 0 && modelOptionsRef.current[focusedModelIndex]) {
      modelOptionsRef.current[focusedModelIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedModelIndex]);

  useEffect(() => {
    if (focusedProviderIndex >= 0 && providerOptionsRef.current[focusedProviderIndex]) {
      providerOptionsRef.current[focusedProviderIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedProviderIndex]);

  useEffect(() => {
    if (providerList.length === 0) {
      return;
    }

    if (provider && !providerList.some((p) => p.name === provider.name)) {
      const firstEnabledProvider = providerList[0];
      setProvider?.(firstEnabledProvider);

      const firstModel = modelList.find((m) => m.provider === firstEnabledProvider.name);

      if (firstModel) {
        setModel?.(firstModel.name);
      }
    }
  }, [providerList, provider, setProvider, modelList, setModel]);

  if (providerList.length === 0) {
    return (
      <div className="mb-2 p-4 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary">
        <p className="text-center">
          No providers are currently enabled. Please enable at least one provider in the settings to start using the
          chat.
        </p>
      </div>
    );
  }

  const providerPickerBody = (
    <div className="relative flex w-full">
      <div
        className={classNames(
          'w-full p-2 rounded-lg border border-bolt-elements-borderColor shadow-hard',
          'bg-bolt-elements-prompt-background text-bolt-elements-textPrimary',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-bolt-elements-focus',
          'transition-all cursor-pointer',
          isProviderDropdownOpen ? 'ring-2 ring-bolt-elements-focus' : undefined,
        )}
        onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsProviderDropdownOpen(!isProviderDropdownOpen);
          }
        }}
        role="combobox"
        aria-expanded={isProviderDropdownOpen}
        aria-controls="provider-listbox"
        aria-haspopup="listbox"
        tabIndex={0}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            {provider?.name && LOCAL_PROVIDERS.includes(provider.name) && (
              <span
                className={classNames(
                  'inline-block w-2 h-2 rounded-full flex-shrink-0',
                  localProviderStatus[provider.name] === 'connected'
                    ? 'bg-green-500'
                    : localProviderStatus[provider.name] === 'disconnected'
                      ? 'bg-red-400'
                      : 'bg-bolt-elements-textTertiary',
                )}
                title={
                  localProviderStatus[provider.name] === 'connected'
                    ? `${provider.name} is running`
                    : localProviderStatus[provider.name] === 'disconnected'
                      ? `${provider.name} is not reachable`
                      : 'Checking...'
                }
              />
            )}
            {provider?.name || 'Select provider'}
          </div>
          <div
            className={classNames(
              'i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary opacity-75',
              isProviderDropdownOpen ? 'rotate-180' : undefined,
            )}
          />
        </div>
      </div>

      {isProviderDropdownOpen && (
        <div
          className="absolute z-20 w-full mt-1 py-1 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 shadow-hard-lg max-h-[min(24rem,calc(100vh-8rem))] flex flex-col"
          role="listbox"
          id="provider-listbox"
        >
          <div className="px-2 pb-2 shrink-0">
            <div className="relative">
              <input
                ref={providerSearchInputRef}
                type="text"
                value={providerSearchQuery}
                onChange={(e) => setProviderSearchQuery(e.target.value)}
                placeholder="Search providers... (⌘K to clear)"
                className={classNames(
                  'w-full pl-8 pr-8 py-1.5 rounded-md text-sm',
                  'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
                  'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
                  'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus',
                  'transition-all',
                )}
                onClick={(e) => e.stopPropagation()}
                role="searchbox"
                aria-label="Search providers"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                <span className="i-ph:magnifying-glass text-bolt-elements-textTertiary" />
              </div>
              {providerSearchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearProviderSearch();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bolt-elements-background-depth-3 transition-colors"
                  aria-label="Clear search"
                >
                  <span className="i-ph:x text-bolt-elements-textTertiary text-xs" />
                </button>
              )}
            </div>
          </div>

          <div
            className={classNames(
              'flex-1 min-h-0 overflow-y-auto',
              'sm:scrollbar-none',
              '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2',
              '[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor',
              '[&::-webkit-scrollbar-thumb]:hover:bg-bolt-elements-borderColorHover',
              '[&::-webkit-scrollbar-thumb]:rounded-full',
              '[&::-webkit-scrollbar-track]:bg-bolt-elements-background-depth-2',
              '[&::-webkit-scrollbar-track]:rounded-full',
              'sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:h-1.5',
              'sm:hover:[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor/50',
              'sm:hover:[&::-webkit-scrollbar-thumb:hover]:bg-bolt-elements-borderColor',
              'sm:[&::-webkit-scrollbar-track]:bg-transparent',
            )}
          >
            {filteredProviders.length === 0 ? (
              <div className="px-3 py-3 text-sm">
                <div className="text-bolt-elements-textTertiary mb-1">
                  {debouncedProviderSearchQuery
                    ? `No providers match "${debouncedProviderSearchQuery}"`
                    : 'No providers found'}
                </div>
                {debouncedProviderSearchQuery && (
                  <div className="text-xs text-bolt-elements-textTertiary">
                    Try searching for provider names like "OpenAI", "Anthropic", or "Google"
                  </div>
                )}
              </div>
            ) : (
              filteredProviders.map((providerOption, index) => (
                <div
                  ref={(el) => (providerOptionsRef.current[index] = el)}
                  key={providerOption.name}
                  role="option"
                  aria-selected={provider?.name === providerOption.name}
                  className={classNames(
                    'px-3 py-2 text-sm cursor-pointer',
                    'hover:bg-bolt-elements-background-depth-3',
                    'text-bolt-elements-textPrimary',
                    'outline-none',
                    provider?.name === providerOption.name || focusedProviderIndex === index
                      ? 'bg-bolt-elements-background-depth-2'
                      : undefined,
                    focusedProviderIndex === index ? 'ring-1 ring-inset ring-bolt-elements-focus' : undefined,
                  )}
                  onClick={(e) => {
                    e.stopPropagation();

                    if (setProvider) {
                      setProvider(providerOption);

                      const firstModel = modelList.find((m) => m.provider === providerOption.name);

                      if (firstModel && setModel) {
                        setModel(firstModel.name);
                      }
                    }

                    setIsProviderDropdownOpen(false);
                    setProviderSearchQuery('');
                    setDebouncedProviderSearchQuery('');
                    setIsProviderPickerExpanded(false);
                  }}
                  tabIndex={focusedProviderIndex === index ? 0 : -1}
                >
                  <div className="flex items-center gap-2">
                    {LOCAL_PROVIDERS.includes(providerOption.name) && (
                      <span
                        className={classNames(
                          'inline-block w-2 h-2 rounded-full flex-shrink-0',
                          localProviderStatus[providerOption.name] === 'connected'
                            ? 'bg-green-500'
                            : localProviderStatus[providerOption.name] === 'disconnected'
                              ? 'bg-red-400'
                              : 'bg-bolt-elements-textTertiary',
                        )}
                      />
                    )}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: (providerOption as any).highlightedName || providerOption.name,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="inline-block relative">
      {/* Model Combobox — compact chip, bottom-left of the composer */}
      <div className="relative inline-flex" onKeyDown={handleModelKeyDown} ref={modelDropdownRef}>
        <div
          className={classNames(
            'max-w-[180px] px-2.5 py-1.5 border border-bolt-elements-borderColor shadow-hard-sm',
            'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary text-xs',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-bolt-elements-focus',
            'transition-all cursor-pointer',
            isModelDropdownOpen ? 'ring-2 ring-bolt-elements-focus' : undefined,
          )}
          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsModelDropdownOpen(!isModelDropdownOpen);
            }
          }}
          role="combobox"
          aria-expanded={isModelDropdownOpen}
          aria-controls="model-listbox"
          aria-haspopup="listbox"
          tabIndex={0}
        >
          <div className="flex items-center gap-1.5">
            <div className="truncate">
              {(() => {
                const current = modelList.find((m) => m.name === model);

                if (!current) {
                  return 'Select model';
                }

                const parsed = parseModelLabel(current.label);

                return parsed.version ? `${parsed.modelName} ${parsed.version}` : parsed.modelName;
              })()}
            </div>
            <div
              className={classNames(
                'i-ph:caret-down w-3 h-3 text-bolt-elements-textSecondary opacity-75 shrink-0',
                isModelDropdownOpen ? 'rotate-180' : undefined,
              )}
            />
          </div>
        </div>

        {isModelDropdownOpen && (
          <div
            className={classNames(
              'absolute z-10 w-80 max-w-[calc(100vw-2rem)] bottom-full right-0 mb-1 py-1 flex flex-col',
              'max-h-[min(28rem,calc(100vh-8rem))]',
              'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 shadow-hard-lg',
            )}
            role="listbox"
            id="model-listbox"
          >
            <div className="px-2 pb-2 space-y-2 shrink-0">
              {/* Provider — which BYO key/endpoint this model list comes from */}
              <div
                className="relative flex border-b border-bolt-elements-borderColor pb-2"
                onKeyDown={handleProviderKeyDown}
                ref={providerDropdownRef}
              >
                {!isProviderPickerExpanded ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProviderPickerExpanded(true);
                    }}
                    className={classNames(
                      'inline-flex items-center gap-1.5 px-2 py-1 text-xs',
                      'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
                      'text-bolt-elements-textSecondary hover:border-accent hover:text-accent transition-theme',
                    )}
                  >
                    {provider?.name && LOCAL_PROVIDERS.includes(provider.name) && (
                      <span
                        className={classNames(
                          'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
                          localProviderStatus[provider.name] === 'connected'
                            ? 'bg-green-500'
                            : localProviderStatus[provider.name] === 'disconnected'
                              ? 'bg-red-400'
                              : 'bg-bolt-elements-textTertiary',
                        )}
                      />
                    )}
                    <span>via {provider?.name || 'provider'}</span>
                    <span className="i-ph:caret-down text-[10px]" />
                  </button>
                ) : (
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-bolt-elements-textTertiary">Provider (BYO model/key)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsProviderPickerExpanded(false);
                        }}
                        className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary flex items-center gap-1"
                      >
                        Hide <span className="i-ph:caret-up text-[10px]" />
                      </button>
                    </div>
                    {providerPickerBody}
                  </div>
                )}
              </div>

              {/*
               * Smart Routing placeholder — visible so people know it's coming, but
               * inert: clicking it does not change the active model. The real
               * complexity-based routing logic doesn't exist yet.
               */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info('Smart routing is coming soon — pick a model directly for now.');
                }}
                className={classNames(
                  'flex items-center justify-between gap-2 px-2.5 py-2 text-left',
                  'border border-dashed border-bolt-elements-borderColor',
                  'hover:border-accent transition-theme',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="i-ph:shuffle-fill text-accent text-sm" />
                  <span className="text-sm text-bolt-elements-textPrimary">Smart</span>
                </span>
                <span className="px-1 py-px text-[9px] font-mono font-medium border border-bolt-elements-borderColor text-bolt-elements-textTertiary shrink-0">
                  SOON
                </span>
              </button>

              {/* Search Result Count */}
              {debouncedModelSearchQuery && filteredModels.length > 0 && (
                <div className="text-xs text-bolt-elements-textTertiary px-1">
                  {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} found
                  {filteredModels.length > 5 && ' (showing best matches)'}
                </div>
              )}

              {/* Default view is capped to the top 10 — explain the escape hatch */}
              {!debouncedModelSearchQuery && allModelsForProvider.length > filteredModels.length && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    modelSearchInputRef.current?.focus();
                  }}
                  className="w-full text-left text-xs text-bolt-elements-textTertiary hover:text-accent transition-theme px-1"
                >
                  +{allModelsForProvider.length - filteredModels.length} more on {provider?.name} — search by name
                </button>
              )}

              {/* Search Input */}
              <div className="relative">
                <input
                  ref={modelSearchInputRef}
                  type="text"
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  placeholder="Search models... (⌘K to clear)"
                  className={classNames(
                    'w-full pl-8 pr-8 py-1.5 rounded-md text-sm',
                    'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
                    'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus',
                    'transition-all',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  role="searchbox"
                  aria-label="Search models"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                  <span className="i-ph:magnifying-glass text-bolt-elements-textTertiary" />
                </div>
                {modelSearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearModelSearch();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bolt-elements-background-depth-3 transition-colors"
                    aria-label="Clear search"
                  >
                    <span className="i-ph:x text-bolt-elements-textTertiary text-xs" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={classNames(
                'flex-1 min-h-0 overflow-y-auto',
                'sm:scrollbar-none',
                '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2',
                '[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor',
                '[&::-webkit-scrollbar-thumb]:hover:bg-bolt-elements-borderColorHover',
                '[&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-track]:bg-bolt-elements-background-depth-2',
                '[&::-webkit-scrollbar-track]:rounded-full',
                'sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:h-1.5',
                'sm:hover:[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor/50',
                'sm:hover:[&::-webkit-scrollbar-thumb:hover]:bg-bolt-elements-borderColor',
                'sm:[&::-webkit-scrollbar-track]:bg-transparent',
              )}
            >
              {modelLoading === 'all' || modelLoading === provider?.name ? (
                <div className="px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 text-bolt-elements-textTertiary">
                    <span className="i-ph:spinner animate-spin" />
                    Loading models...
                  </div>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="px-3 py-3 text-sm">
                  <div className="text-bolt-elements-textTertiary mb-1">
                    {debouncedModelSearchQuery
                      ? `No models match "${debouncedModelSearchQuery}"`
                      : provider?.name && LOCAL_PROVIDERS.includes(provider.name)
                        ? `No models found — is ${provider.name} running?`
                        : 'No models available'}
                  </div>
                  {!debouncedModelSearchQuery && provider?.name && LOCAL_PROVIDERS.includes(provider.name) && (
                    <div className="text-xs text-bolt-elements-textTertiary mt-1">
                      Make sure {provider.name} is running and has at least one model loaded.
                      {provider.name === 'Ollama' && ' Try: ollama pull llama3.2'}
                      {provider.name === 'LMStudio' && ' Load a model in LM Studio first.'}
                    </div>
                  )}
                  {debouncedModelSearchQuery && (
                    <div className="text-xs text-bolt-elements-textTertiary">
                      Try searching for model names, context sizes (e.g., "128k", "1M"), or capabilities
                    </div>
                  )}
                </div>
              ) : (
                filteredModels.map((modelOption, index) => (
                  <div
                    ref={(el) => (modelOptionsRef.current[index] = el)}
                    key={modelOption.name}
                    role="option"
                    aria-selected={model === modelOption.name}
                    className={classNames(
                      'px-3 py-2 text-sm cursor-pointer',
                      'hover:bg-bolt-elements-background-depth-3',
                      'text-bolt-elements-textPrimary',
                      'outline-none',
                      model === modelOption.name || focusedModelIndex === index
                        ? 'bg-bolt-elements-background-depth-2'
                        : undefined,
                      focusedModelIndex === index ? 'ring-1 ring-inset ring-bolt-elements-focus' : undefined,
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModel?.(modelOption.name);
                      setIsModelDropdownOpen(false);
                      setModelSearchQuery('');
                      setDebouncedModelSearchQuery('');
                    }}
                    tabIndex={focusedModelIndex === index ? 0 : -1}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(() => {
                            const parsed = parseModelLabel(modelOption.label);
                            return (
                              <>
                                {parsed.company && (
                                  <span className="shrink-0 px-1 py-px text-[9px] font-mono uppercase tracking-wide border border-bolt-elements-borderColor text-bolt-elements-textTertiary">
                                    {parsed.company}
                                  </span>
                                )}
                                <span className="shrink-0 max-w-[140px] truncate px-1 py-px text-[10px] font-mono font-medium border border-bolt-elements-borderColor text-bolt-elements-textPrimary">
                                  {parsed.modelName}
                                </span>
                                {parsed.version && (
                                  <span className="shrink-0 px-1 py-px text-[10px] font-mono border border-bolt-elements-borderColor text-bolt-elements-textSecondary">
                                    {parsed.version}
                                  </span>
                                )}
                                {parsed.versionDetail && (
                                  <span className="shrink-0 px-1 py-px text-[9px] font-mono border border-bolt-elements-borderColor text-bolt-elements-textTertiary">
                                    {parsed.versionDetail}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          {modelOption.name === recommendedModelName && (
                            <span
                              className="shrink-0 px-1 py-px text-[9px] font-mono font-medium border border-accent bg-accent/10 text-accent"
                              title="Cheapest model that clears our quality bar on Artificial Analysis's independent benchmark"
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-xs text-bolt-elements-textTertiary"
                            title="Context window — how much conversation and file content the model can consider at once"
                          >
                            {formatContextSize(modelOption.maxTokenAllowed)} context
                          </span>
                          {modelOption.qualityScore != null && (
                            <span
                              className="text-xs text-bolt-elements-textTertiary"
                              title="Independent coding benchmark score, 0-100 (Artificial Analysis coding index)"
                            >
                              Score {modelOption.qualityScore.toFixed(0)}
                            </span>
                          )}
                          {modelOption.pricing && (
                            <span
                              className="flex items-center gap-1 text-xs text-bolt-elements-textTertiary"
                              title="USD per 1M tokens, input / output"
                            >
                              <span
                                className={classNames('w-1.5 h-1.5 rounded-full shrink-0', {
                                  'bg-green-500': getCostTier(blendedPricePerMillion(modelOption)!) === 'low',
                                  'bg-yellow-500': getCostTier(blendedPricePerMillion(modelOption)!) === 'medium',
                                  'bg-red-500': getCostTier(blendedPricePerMillion(modelOption)!) === 'high',
                                })}
                              />
                              ${modelOption.pricing.promptPerMillion.toFixed(2)} / $
                              {modelOption.pricing.completionPerMillion.toFixed(2)}
                            </span>
                          )}
                          {debouncedModelSearchQuery && (modelOption as any).searchScore > 70 && (
                            <span className="text-xs text-green-500 font-medium">
                              {(modelOption as any).searchScore.toFixed(0)}% match
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {model === modelOption.name && (
                          <span className="i-ph:check text-xs text-green-500" title="Selected" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
