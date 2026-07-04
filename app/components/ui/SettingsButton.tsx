import { memo } from 'react';
import { IconButton } from '~/components/ui/IconButton';
interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton = memo(({ onClick }: SettingsButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      size="xl"
      title="Settings"
      data-testid="settings-button"
      className="gap-1.5 px-2 text-[#666] hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive/10 transition-colors"
    >
      <div className="i-ph:gear text-xl" />
      <span className="text-sm font-medium">Settings</span>
    </IconButton>
  );
});

interface HelpButtonProps {
  onClick: () => void;
}

export const HelpButton = memo(({ onClick }: HelpButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      icon="i-ph:question"
      size="xl"
      title="Help & Documentation"
      data-testid="help-button"
      className="text-[#666] hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive/10 transition-colors"
    />
  );
});
