import * as Tooltip from '@radix-ui/react-tooltip';
import { classNames } from '~/utils/classNames';
import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { TAB_LABELS, TAB_ICONS } from '~/components/@settings/core/constants';

interface TabTileProps {
  tab: TabVisibilityConfig;
  onClick?: () => void;
  isActive?: boolean;
  hasUpdate?: boolean;
  statusMessage?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TabTile: React.FC<TabTileProps> = ({
  tab,
  onClick,
  isActive,
  hasUpdate,
  statusMessage,
  description,
  isLoading,
  className,
  children,
}: TabTileProps) => {
  const IconComponent = TAB_ICONS[tab.id];

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            onClick={onClick}
            className={classNames(
              'flex items-center gap-3 px-3 py-2.5',
              'group cursor-pointer',
              'hover:bg-bolt-elements-background-depth-2',
              'transition-colors duration-100 ease-out',
              isActive ? 'bg-accent/10' : '',
              isLoading ? 'cursor-wait opacity-70 pointer-events-none' : '',
              className || '',
            )}
          >
            <IconComponent
              className={classNames(
                'w-4 h-4 shrink-0',
                'text-bolt-elements-textSecondary',
                'group-hover:text-accent',
                isActive ? 'text-accent' : '',
              )}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className={classNames(
                    'font-display text-sm font-medium leading-snug',
                    'text-bolt-elements-textPrimary',
                    'group-hover:text-accent',
                    isActive ? 'text-accent' : '',
                  )}
                >
                  {TAB_LABELS[tab.id]}
                </h3>
                {children}
              </div>
              {description && <p className="text-xs text-bolt-elements-textTertiary truncate">{description}</p>}
            </div>

            {hasUpdate && <div className="w-1.5 h-1.5 bg-accent shrink-0" />}

            <div className="i-ph:caret-right w-3.5 h-3.5 text-bolt-elements-textTertiary group-hover:text-accent shrink-0" />

            {hasUpdate && statusMessage && (
              <Tooltip.Portal>
                <Tooltip.Content
                  className="px-3 py-1.5 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary text-sm font-medium select-none z-[100]"
                  side="top"
                  sideOffset={5}
                >
                  {statusMessage}
                  <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </div>
        </Tooltip.Trigger>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
