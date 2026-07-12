import { toast } from 'react-toastify';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { checkManagedHosting, coolifyConnection } from '~/lib/stores/coolify';
import { webcontainer } from '~/lib/webcontainer';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';
import { getLocalStorage } from '~/lib/persistence/localStorage';
import { pushFilesToGitHubRepo, sanitizeRepoName } from '~/lib/github/pushToGitHub';
import { getOrCreateAnonUserId } from '~/lib/anonId';
import { collectProjectFiles, formatBuildFailureOutput } from './deployUtils';

interface StoredCoolifyApp {
  appUuid: string;
  repoUrl: string;
  url?: string;
}

/**
 * One-click deploy: push the project to GitHub (the hosting layer can only
 * build from a git source), then create or redeploy the app. Prefers
 * Exobase-managed hosting when the server offers it (zero user setup, the
 * Replit model); falls back to the user's own Coolify connection.
 */
export function useCoolifyDeploy() {
  const [isDeploying, setIsDeploying] = useState(false);
  const currentChatId = useStore(chatId);
  const connection = useStore(coolifyConnection);

  const handleCoolifyDeploy = async () => {
    const managedAvailable = await checkManagedHosting();
    const byoConnected = Boolean(connection.token && connection.serverUrl);

    if (!managedAvailable && !byoConnected) {
      toast.error('Hosting is not set up yet. Connect a Coolify instance in Settings > Integrations');
      return false;
    }

    /*
     * BYO wins when both exist: someone who connected their own instance did
     * so deliberately and expects their apps on their own hardware.
     */
    const mode = byoConnected ? 'byo' : 'managed';

    if (mode === 'managed') {
      // The server namespaces managed apps by this cookie; make sure it exists.
      getOrCreateAnonUserId();
    }

    const githubConnection = getLocalStorage('github_connection');

    if (!githubConnection?.token || !githubConnection?.user) {
      toast.error('Connect GitHub in Settings > Integrations first. Deploys build from your GitHub repo');
      return false;
    }

    if (!currentChatId) {
      toast.error('No active chat found');
      return false;
    }

    const artifact = workbenchStore.firstArtifact;

    if (!artifact) {
      toast.error('No active project found');
      return false;
    }

    setIsDeploying(true);

    const deploymentId = 'deploy-coolify-project';
    workbenchStore.addArtifact({
      id: deploymentId,
      messageId: deploymentId,
      title: 'Coolify Deployment',
      type: 'standalone',
    });

    const deployArtifact = workbenchStore.artifacts.get()[deploymentId];

    try {
      // Build locally first — catches broken code before anything is pushed.
      deployArtifact.runner.handleDeployAction('building', 'running', { source: 'coolify' });

      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'coolify build',
        artifactId: artifact.id,
        actionId,
        action: {
          type: 'build' as const,
          content: 'npm run build',
        },
      };

      artifact.runner.addAction(actionData);
      await artifact.runner.runAction(actionData);

      const buildOutput = artifact.runner.buildOutput;

      if (!buildOutput || buildOutput.exitCode !== 0) {
        deployArtifact.runner.handleDeployAction('building', 'failed', {
          error: formatBuildFailureOutput(buildOutput?.output),
          source: 'coolify',
        });
        throw new Error('Build failed');
      }

      deployArtifact.runner.handleDeployAction('deploying', 'running', { source: 'coolify' });

      const container = await webcontainer;
      const files = await collectProjectFiles(container);

      const stored = getLocalStorage(`coolify-app-${currentChatId}`) as StoredCoolifyApp | null;
      const repoName = sanitizeRepoName(artifact.title || `exobase-${currentChatId}`);

      const pushResult = await pushFilesToGitHubRepo({
        token: githubConnection.token,
        owner: githubConnection.user.login,
        repoName,
        files,
        commitMessage: 'Deploy from Exobase',
      });

      const response = await fetch('/api/coolify-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          ...(mode === 'byo' ? { serverUrl: connection.serverUrl, token: connection.token } : {}),
          gitRepository: pushResult.cloneUrl,
          gitBranch: pushResult.defaultBranch,
          appName: repoName,
          appUuid: stored?.appUuid,
        }),
      });

      const data = (await response.json()) as { appUuid?: string; url?: string; error?: string };

      if (!response.ok || !data.appUuid) {
        throw new Error(data.error || `Deployment failed (${response.status})`);
      }

      localStorage.setItem(
        `coolify-app-${currentChatId}`,
        JSON.stringify({ appUuid: data.appUuid, repoUrl: pushResult.repoUrl, url: data.url } as StoredCoolifyApp),
      );

      deployArtifact.runner.handleDeployAction('complete', 'complete', {
        source: 'coolify',
        url: data.url,
      });

      const where = mode === 'managed' ? 'Exobase' : 'Coolify';
      toast.success(data.url ? `Deploying on ${where}: ${data.url}` : `Deployment started on ${where}`);

      return true;
    } catch (err) {
      console.error('Coolify deploy error:', err);
      toast.error(err instanceof Error ? err.message : 'Coolify deployment failed');

      return false;
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    isDeploying,
    handleCoolifyDeploy,
  };
}
