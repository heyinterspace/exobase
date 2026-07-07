import React from 'react';
import { useLinearConnection } from '~/lib/hooks/useLinearConnection';
import { LinearConnection } from './components/LinearConnection';

export default function LinearTab() {
  const { isConnected, connection } = useLinearConnection();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="i-ph:list-checks w-5 h-5 text-bolt-elements-textPrimary" />
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">Linear Integration</h2>
      </div>

      <p className="text-sm text-bolt-elements-textSecondary">
        Connect Linear so the AI can create and reference issues directly from chat. Draft an issue in conversation,
        approve it with one click, done.
      </p>

      <LinearConnection />

      {isConnected && connection.teams && connection.teams.length > 1 && (
        <p className="text-xs text-bolt-elements-textTertiary">
          {connection.teams.length} teams available. The first issue you create will ask which team to use, then
          remember it.
        </p>
      )}
    </div>
  );
}
