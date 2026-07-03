import { useState } from 'react';
import { useStore } from '@nanostores/react';
import type { LinearAlert } from '~/types/actions';
import { linearConnection, updateLinearConnection } from '~/lib/stores/linear';
import { useLinearConnection } from '~/lib/hooks/useLinearConnection';
import { classNames } from '~/utils/classNames';

interface Props {
  alert: LinearAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

const buttonClass =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shrink-0 border border-bolt-elements-borderColor shadow-hard press-hard transition-theme disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard';

/**
 * Mirrors SupabaseAlert.tsx's "AI drafts, human approves" shape, but the
 * connect step is a direct OAuth popup call (not a bespoke modal + custom
 * DOM event) since Nango handles it, and success stays visible with a
 * direct link instead of clearing immediately — see the one-click bar this
 * is designed around (feedback_one_click_integration_bar).
 */
export function LinearChatAlert({ alert, clearAlert, postMessage }: Props) {
  const { issueTitle, content, teamId: draftedTeamId } = alert;
  const connection = useStore(linearConnection);
  const { isConnected, isConnecting, connectWithOAuth } = useLinearConnection();

  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<{ identifier: string; url: string } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(draftedTeamId || connection.defaultTeamId);

  const teams = connection.teams || [];
  const needsTeamPicker = isConnected && !selectedTeamId && teams.length > 1;

  const handleCreateIssue = async () => {
    if (!selectedTeamId) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/linear-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: issueTitle, description: content, teamId: selectedTeamId }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        throw new Error(errorData.error || 'Failed to create issue');
      }

      const issue = (await response.json()) as { identifier: string; url: string };

      // Remember the team so future issues never ask again.
      if (!connection.defaultTeamId) {
        updateLinearConnection({ defaultTeamId: selectedTeamId });
      }

      setCreated(issue);
    } catch (error) {
      postMessage(
        `*Error creating Linear issue, please fix and try again*\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\`\n`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-chat glass border border-bolt-elements-borderColor shadow-hard-lg">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="i-ph:list-checks text-bolt-elements-textPrimary" />
          <h3 className="text-sm font-medium text-bolt-elements-textPrimary">
            {created ? 'Issue created' : 'Create Linear Issue'}
          </h3>
        </div>

        {created ? (
          <div className="p-3 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 flex items-center justify-between">
            <span className="text-sm text-bolt-elements-textPrimary">
              <span className="text-bolt-elements-textSecondary">{created.identifier}</span> — {issueTitle}
            </span>
            <a
              href={created.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1 shrink-0 ml-3"
            >
              View in Linear
              <div className="i-ph:arrow-square-out w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="p-3 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
            <p className="text-sm text-bolt-elements-textPrimary font-medium">{issueTitle}</p>
            {content && <p className="text-xs text-bolt-elements-textSecondary mt-1">{content}</p>}
          </div>
        )}

        {needsTeamPicker && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-bolt-elements-textSecondary">Team:</span>
            <select
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="px-2 py-1 text-xs bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor text-bolt-elements-textPrimary"
            >
              <option value="" disabled>
                Choose a team
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {created ? (
            <button
              type="button"
              onClick={clearAlert}
              className={classNames(
                buttonClass,
                'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:border-accent hover:text-accent',
              )}
            >
              <div className="i-ph:check" />
              Done
            </button>
          ) : !isConnected ? (
            <button
              type="button"
              onClick={connectWithOAuth}
              disabled={isConnecting}
              className={classNames(buttonClass, 'bg-accent text-accent-ink hover:brightness-110')}
            >
              <div className={isConnecting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:plug-charging'} />
              {isConnecting ? 'Connecting...' : 'Connect to Linear'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={clearAlert}
                className={classNames(
                  buttonClass,
                  'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:border-accent hover:text-accent',
                )}
              >
                <div className="i-ph:x" />
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleCreateIssue}
                disabled={isCreating || !selectedTeamId}
                className={classNames(buttonClass, 'bg-accent text-accent-ink hover:brightness-110')}
              >
                <div className={isCreating ? 'i-ph:spinner-gap animate-spin' : 'i-ph:check'} />
                {isCreating ? 'Creating...' : 'Create Issue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
