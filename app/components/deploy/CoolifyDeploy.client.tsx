import { toast } from 'react-toastify';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { coolifyConnection } from '~/lib/stores/coolify';
import { webcontainer } from '~/lib/webcontainer';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';
import { getLocalStorage } from '~/lib/persistence/localStorage';
import { pushFilesToGitHubRepo, sanitizeRepoName } from '~/lib/github/pushToGitHub';
import { collectProjectFiles, formatBuildFailureOutput } from './deployUtils';

interface StoredCoolifyApp {
  appUuid: string;
  repoUrl: string;
  url?: string;
}

/**
 * One-click deploy: push the project to GitHub (Coolify can only build from
 * a git source), then create or redeploy a Coolify application pointed at
 * that repo. GitHub is the repo layer, Coolify is the hosting layer — both
 * already connected in Settings, so the click itself asks nothing.
 */
export function useCoolifyDeploy() {
  const [isDeploying, setIsDeploying] = useState(false);
  const currentChatId = useStore(chatId);
  const connection = useStore(coolifyConnection);

  const handleCoolifyDeploy = async () => {
    if (!connection.token || !connection.serverUrl) {
      toast.error('Connect Coolify in Settings > Integrations first');
      return false;
    }

    const githubConnection = getLocalStorage('github_connection');

    if (!githubConnection?.token || !githubConnection?.user) {
      toast.error('Connect GitHub in Settings > Integrations first — Coolify deploys from a GitHub repo');
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
          serverUrl: connection.serverUrl,
          token: connection.token,
          gitRepository: pushResult.cloneUrl,
          gitBranch: pushResult.defaultBranch,
          appName: repoName,
          appUuid: stored?.appUuid,
        }),
      });

      const data = (await response.json()) as { appUuid?: string; url?: string; error?: string };

      if (!response.ok || !data.appUuid) {
        throw new Error(data.error || `Coolify deployment failed (${response.status})`);
      }

      localStorage.setItem(
        `coolify-app-${currentChatId}`,
        JSON.stringify({ appUuid: data.appUuid, repoUrl: pushResult.repoUrl, url: data.url } as StoredCoolifyApp),
      );

      deployArtifact.runner.handleDeployAction('complete', 'complete', {
        source: 'coolify',
        url: data.url,
      });

      toast.success(data.url ? `Deploying on Coolify: ${data.url}` : 'Deployment started on Coolify');

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
