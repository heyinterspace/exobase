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
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={classNames('min-h-[160px] list-none', className || '')}>
            <div
              onClick={onClick}
              className={classNames(
                'relative flex flex-col items-center justify-center h-full p-4',
                'border border-bolt-elements-borderColor',
                'bg-bolt-elements-background-depth-2',
                'group cursor-pointer',
                'hover:border-accent',
                'transition-colors duration-100 ease-out',
                isActive ? 'bg-accent/10 border-accent' : '',
                isLoading ? 'cursor-wait opacity-70 pointer-events-none' : '',
              )}
            >
              {/* Icon */}
              <div
                className={classNames(
                  'relative',
                  'w-14 h-14',
                  'flex items-center justify-center',
                  'border border-bolt-elements-borderColor',
                  'bg-bolt-elements-background-depth-3',
                  'group-hover:border-accent',
                  'transition-all duration-100 ease-out',
                  isActive ? 'border-accent bg-accent/10' : '',
                )}
              >
                {(() => {
                  const IconComponent = TAB_ICONS[tab.id];
                  return (
                    <IconComponent
                      className={classNames(
                        'w-8 h-8',
                        'text-bolt-elements-textSecondary',
                        'group-hover:text-accent',
                        'transition-colors duration-100 ease-out',
                        isActive ? 'text-accent' : '',
                      )}
                    />
                  );
                })()}
              </div>

              {/* Label and Description */}
              <div className="flex flex-col items-center mt-4 w-full">
                <h3
                  className={classNames(
                    'font-display text-[15px] font-medium leading-snug mb-2',
                    'text-bolt-elements-textPrimary',
                    'group-hover:text-accent',
                    'transition-colors duration-100 ease-out',
                    isActive ? 'text-accent' : '',
                  )}
                >
                  {TAB_LABELS[tab.id]}
                </h3>
                {description && (
                  <p
                    className={classNames(
                      'text-[13px] leading-relaxed',
                      'text-bolt-elements-textTertiary',
                      'max-w-[85%]',
                      'text-center',
                      'transition-colors duration-100 ease-out',
                    )}
                  >
                    {description}
                  </p>
                )}
              </div>

              {/* Update Indicator with Tooltip */}
              {hasUpdate && (
                <>
                  <div className="absolute top-4 right-4 w-2 h-2 bg-accent animate-pulse" />
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className={classNames(
                        'px-3 py-1.5 border border-bolt-elements-borderColor',
                        'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary',
                        'text-sm font-medium',
                        'select-none',
                        'z-[100]',
                      )}
                      side="top"
                      sideOffset={5}
                    >
                      {statusMessage}
                      <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </>
              )}

              {/* Children (e.g. Beta Label) */}
              {children}
            </div>
          </div>
        </Tooltip.Trigger>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
