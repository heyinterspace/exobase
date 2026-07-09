import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { SettingsButton } from '~/components/ui/SettingsButton';
import Logo from '~/components/ui/Logo';

export function Header() {
  const chat = useStore(chatStore);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <a href="/" className="flex items-center z-logo cursor-pointer">
        <Logo />
      </a>
      {chat.started && ( // Display ChatDescription only when the chat has started.
        <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
          <ClientOnly>{() => <ChatDescription />}</ClientOnly>
        </span>
      )}
      <div className={classNames('flex items-center gap-2', { 'ml-auto': !chat.started })}>
        {chat.started && <ClientOnly>{() => <HeaderActionButtons chatStarted={chat.started} />}</ClientOnly>}
        <SettingsButton onClick={() => setIsSettingsOpen(true)} />
      </div>
      <ClientOnly>{() => <ControlPanel open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}</ClientOnly>
    </header>
  );
}
