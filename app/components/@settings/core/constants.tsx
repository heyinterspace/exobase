import type { TabType } from './types';
import { User, Sparkles, Puzzle } from 'lucide-react';

export const TAB_ICONS: Record<TabType, React.ComponentType<{ className?: string }>> = {
  profile: User,
  changelog: Sparkles,
  integrations: Puzzle,
};

export const TAB_LABELS: Record<TabType, string> = {
  profile: 'Profile',
  changelog: 'Changelog',
  integrations: 'Integrations',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  profile: 'Your account, notifications, and preferences',
  changelog: "What's new and what's next",
  integrations: 'Connected providers, organized by piece of the stack',
};

export const DEFAULT_TAB_CONFIG = [
  { id: 'profile', visible: true, window: 'user' as const, order: 0 },
  { id: 'changelog', visible: true, window: 'user' as const, order: 1 },
  { id: 'integrations', visible: true, window: 'user' as const, order: 2 },
];
