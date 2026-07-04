import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { classNames } from '~/utils/classNames';
import { TabTile } from '~/components/@settings/shared/components/TabTile';
import { useFeatures } from '~/lib/hooks/useFeatures';
import { useConnectionStatus } from '~/lib/hooks/useConnectionStatus';
import { tabConfigurationStore, resetTabConfiguration } from '~/lib/stores/settings';
import type { TabType } from './types';
import { TAB_LABELS, DEFAULT_TAB_CONFIG, TAB_DESCRIPTIONS } from './constants';
import { DialogTitle } from '~/components/ui/Dialog';
import { AvatarDropdown } from './AvatarDropdown';

// Import all tab components
import ProfileTab from '~/components/@settings/tabs/profile/ProfileTab';
import ChangelogTab from '~/components/@settings/tabs/changelog/ChangelogTab';
import IntegrationsTab from '~/components/@settings/tabs/integrations/IntegrationsTab';

interface ControlPanelProps {
  open: boolean;
  onClose: () => void;
}

export const ControlPanel = ({ open, onClose }: ControlPanelProps) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [loadingTab, setLoadingTab] = useState<TabType | null>(null);
  const [showTabManagement, setShowTabManagement] = useState(false);

  // Store values
  const tabConfiguration = useStore(tabConfigurationStore);

  // Status hooks
  const { hasNewFeatures, unviewedFeatures, acknowledgeAllFeatures } = useFeatures();
  const { hasConnectionIssues, currentIssue, acknowledgeIssue } = useConnectionStatus();

  // Memoize the base tab configurations to avoid recalculation
  const baseTabConfig = useMemo(() => {
    return new Map(DEFAULT_TAB_CONFIG.map((tab) => [tab.id, tab]));
  }, []);

  // Add visibleTabs logic using useMemo with optimized calculations
  const visibleTabs = useMemo(() => {
    if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
      console.warn('Invalid tab configuration, resetting to defaults');
      resetTabConfiguration();

      return [];
    }

    return tabConfiguration.userTabs
      .filter((tab) => tab?.id && tab.visible && tab.window === 'user')
      .sort((a, b) => a.order - b.order);
  }, [tabConfiguration, baseTabConfig]);

  // Reset to default view when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Reset when closing
      setActiveTab(null);
      setLoadingTab(null);
      setShowTabManagement(false);
    } else {
      // When opening, set to null to show the main view
      setActiveTab(null);
    }
  }, [open]);

  // Handle closing
  const handleClose = () => {
    setActiveTab(null);
    setLoadingTab(null);
    setShowTabManagement(false);
    onClose();
  };

  // Handlers
  const handleBack = () => {
    if (showTabManagement) {
      setShowTabManagement(false);
    } else if (activeTab) {
      setActiveTab(null);
    }
  };

  const getTabComponent = (tabId: TabType) => {
    switch (tabId) {
      case 'profile':
        return <ProfileTab />;
      case 'changelog':
        return <ChangelogTab />;
      case 'integrations':
        return <IntegrationsTab />;

      default:
        return null;
    }
  };

  const getTabUpdateStatus = (tabId: TabType): boolean => {
    switch (tabId) {
      case 'changelog':
        return hasNewFeatures;
      case 'integrations':
        return hasConnectionIssues;
      default:
        return false;
    }
  };

  const getStatusMessage = (tabId: TabType): string => {
    switch (tabId) {
      case 'changelog':
        return `${unviewedFeatures.length} new update${unviewedFeatures.length === 1 ? '' : 's'} to see`;
      case 'integrations':
        return currentIssue === 'disconnected'
          ? 'Connection lost'
          : currentIssue === 'high-latency'
            ? 'High latency detected'
            : 'Connection issues detected';
      default:
        return '';
    }
  };

  const handleTabClick = (tabId: TabType) => {
    setLoadingTab(tabId);
    setActiveTab(tabId);
    setShowTabManagement(false);

    // Acknowledge notifications based on tab
    switch (tabId) {
      case 'changelog':
        acknowledgeAllFeatures();
        break;
      case 'integrations':
        acknowledgeIssue();
        break;
    }

    // Clear loading state after a delay
    setTimeout(() => setLoadingTab(null), 500);
  };

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <div className="fixed inset-0 flex items-center justify-center z-[100] modern-scrollbar">
          <RadixDialog.Overlay className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-200" />

          <RadixDialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={handleClose}
            onPointerDownOutside={handleClose}
            className="relative z-[101]"
          >
            <div
              className={classNames(
                'w-[95vw] max-w-[1200px] h-[85vh] max-h-[900px]',
                'glass',
                'border border-bolt-elements-borderColor shadow-hard-lg',
                'flex flex-col overflow-hidden',
                'relative',
                'transform transition-all duration-200 ease-out',
                open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[6vw]',
              )}
            >
              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-bolt-elements-borderColor">
                  <div className="flex items-center space-x-4">
                    {(activeTab || showTabManagement) && (
                      <button
                        onClick={handleBack}
                        className={classNames(
                          'flex items-center justify-center w-8 h-8 shrink-0',
                          'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
                          'hover:border-accent group transition-theme',
                        )}
                      >
                        <div className="i-ph:arrow-left w-4 h-4 text-bolt-elements-textSecondary group-hover:text-accent transition-colors" />
                      </button>
                    )}
                    <DialogTitle className="text-xl font-display font-semibold text-bolt-elements-textPrimary">
                      {showTabManagement ? 'Tab Management' : activeTab ? TAB_LABELS[activeTab] : 'Settings'}
                    </DialogTitle>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Avatar and Dropdown */}
                    <div className="pl-6">
                      <AvatarDropdown onSelectTab={handleTabClick} />
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={handleClose}
                      className={classNames(
                        'flex items-center justify-center w-8 h-8 shrink-0',
                        'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
                        'hover:border-accent group transition-theme',
                      )}
                    >
                      <div className="i-ph:x w-4 h-4 text-bolt-elements-textSecondary group-hover:text-accent transition-colors" />
                    </button>
                  </div>
                </div>

                {/*
                 * Content — two stacked layers, not a single view that swaps in place.
                 * The tab grid is layer 0 and always stays mounted; opening a tab slides
                 * layer 1 in from the right on top of it, and layer 0 recedes (scales
                 * down, dims) behind it rather than disappearing, so the panel reads as
                 * one layer landing on another instead of a flat content swap.
                 */}
                <div className="flex-1 relative overflow-hidden">
                  <div
                    className={classNames(
                      'absolute inset-0 overflow-y-auto',
                      'scrollbar scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-bolt-elements-borderColor',
                      'will-change-scroll touch-auto',
                      'transition-all duration-200 ease-out origin-top',
                      activeTab || showTabManagement ? 'scale-95 opacity-40 pointer-events-none' : '',
                    )}
                  >
                    <div className="p-6">
                      <div className="border border-bolt-elements-borderColor divide-y divide-bolt-elements-borderColor">
                        {visibleTabs.map((tab) => (
                          <TabTile
                            key={tab.id}
                            tab={tab}
                            onClick={() => handleTabClick(tab.id as TabType)}
                            isActive={activeTab === tab.id}
                            hasUpdate={getTabUpdateStatus(tab.id as TabType)}
                            statusMessage={getStatusMessage(tab.id as TabType)}
                            description={TAB_DESCRIPTIONS[tab.id as TabType]}
                            isLoading={loadingTab === tab.id}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {(activeTab || showTabManagement) && (
                    <div
                      key={activeTab || 'tab-management'}
                      className={classNames(
                        'animated fadeInRight',
                        'absolute inset-0 overflow-y-auto',
                        'scrollbar scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-bolt-elements-borderColor',
                        'will-change-scroll touch-auto',
                        'bg-bolt-elements-background-depth-1 border-l border-bolt-elements-borderColor shadow-hard-lg',
                      )}
                    >
                      <div className="p-6">{activeTab && getTabComponent(activeTab)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
