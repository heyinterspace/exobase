import type { TabType } from './types';
import { User, Settings, Bell, Star, Database, Cloud, Laptop, Github, Wrench, List } from 'lucide-react';

/*
 * Linear icon component — a simplified take on Linear's diagonal-bars mark,
 * not a pixel-exact reproduction of the brand SVG.
 */
const LinearIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="15.5" y="1" width="3" height="12" rx="1.5" fill="currentColor" transform="rotate(45 15.5 1)" />
    <rect x="11" y="5.5" width="3" height="17" rx="1.5" fill="currentColor" transform="rotate(45 11 5.5)" />
    <rect x="6.5" y="10" width="3" height="22" rx="1.5" fill="currentColor" transform="rotate(45 6.5 10)" />
  </svg>
);

export const TAB_ICONS: Record<TabType, React.ComponentType<{ className?: string }>> = {
  profile: User,
  settings: Settings,
  notifications: Bell,
  features: Star,
  data: Database,
  'cloud-providers': Cloud,
  'local-providers': Laptop,
  github: Github,
  linear: () => <LinearIcon />,
  'event-logs': List,
  mcp: Wrench,
};

export const TAB_LABELS: Record<TabType, string> = {
  profile: 'Profile',
  settings: 'Settings',
  notifications: 'Notifications',
  features: 'Features',
  data: 'Data Management',
  'cloud-providers': 'Cloud Providers',
  'local-providers': 'Local Providers',
  github: 'GitHub',
  linear: 'Linear',
  'event-logs': 'Event Logs',
  mcp: 'MCP Servers',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  profile: 'Manage your profile and account settings',
  settings: 'Configure application preferences',
  notifications: 'View and manage your notifications',
  features: 'Explore new and upcoming features',
  data: 'Manage your data and storage',
  'cloud-providers': 'Configure cloud AI providers and models',
  'local-providers': 'Configure local AI providers and models',
  github: 'Connect and manage GitHub integration',
  linear: 'Connect Linear for one-click issue creation from chat',
  'event-logs': 'View system events and logs',
  mcp: 'Configure MCP (Model Context Protocol) servers',
};

/*
 * Which thematic group each tab renders under in the Control Panel (see
 * SETTINGS_GROUPS below). Order here is just data — display order within a
 * group still comes from each tab's `order` field.
 */
export type SettingsGroup = 'profile' | 'platform' | 'data';

export const TAB_GROUPS: Record<TabType, SettingsGroup> = {
  profile: 'profile',
  settings: 'profile',
  notifications: 'profile',
  'cloud-providers': 'platform',
  'local-providers': 'platform',
  github: 'platform',
  linear: 'platform',
  mcp: 'platform',
  data: 'data',
  'event-logs': 'data',
  features: 'data',
};

export const SETTINGS_GROUPS: { id: SettingsGroup; label: string; description: string }[] = [
  { id: 'profile', label: 'Profile', description: 'Your account, preferences, and notifications' },
  { id: 'platform', label: 'Platform', description: 'Model providers and connected integrations' },
  { id: 'data', label: 'Data & Monitoring', description: 'Storage, system events, and upcoming features' },
];

export const DEFAULT_TAB_CONFIG = [
  // User Window Tabs (Always visible by default)
  { id: 'profile', visible: true, window: 'user' as const, order: 0 },
  { id: 'settings', visible: true, window: 'user' as const, order: 1 },
  { id: 'notifications', visible: true, window: 'user' as const, order: 2 },
  { id: 'cloud-providers', visible: true, window: 'user' as const, order: 3 },
  { id: 'local-providers', visible: true, window: 'user' as const, order: 4 },
  { id: 'github', visible: true, window: 'user' as const, order: 5 },
  { id: 'linear', visible: true, window: 'user' as const, order: 6 },
  { id: 'mcp', visible: true, window: 'user' as const, order: 7 },
  { id: 'data', visible: true, window: 'user' as const, order: 8 },
  { id: 'event-logs', visible: true, window: 'user' as const, order: 9 },
  { id: 'features', visible: true, window: 'user' as const, order: 10 },

  // User Window Tabs (In dropdown, initially hidden)
];
