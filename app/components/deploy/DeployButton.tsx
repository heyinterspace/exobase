import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useStore } from '@nanostores/react';
import { checkManagedHosting, coolifyConnection, managedHostingAvailable } from '~/lib/stores/coolify';
import { workbenchStore } from '~/lib/stores/workbench';
import { streamingState } from '~/lib/stores/streaming';
import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { useCoolifyDeploy } from '~/components/deploy/CoolifyDeploy.client';
import { useGitHubDeploy } from '~/components/deploy/GitHubDeploy.client';
import { GitHubDeploymentDialog } from '~/components/deploy/GitHubDeploymentDialog';

/*
 * One opinionated target per layer: Exobase hosts the app (managed Coolify
 * server-side, invisible to the user — they "just think Exobase"), GitHub
 * holds the repo. BYO Coolify is the self-hoster escape hatch. See
 * project_opinionated_positioning and project_managed_hosting.
 */
export const DeployButton = () => {
  const coolifyConn = useStore(coolifyConnection);
  const managedAvailable = useStore(managedHostingAvailable);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'exobase' | 'github' | null>(null);
  const isStreaming = useStore(streamingState);
  const { handleCoolifyDeploy } = useCoolifyDeploy();
  const { handleGitHubDeploy } = useGitHubDeploy();
  const [showGitHubDeploymentDialog, setShowGitHubDeploymentDialog] = useState(false);
  const [githubDeploymentFiles, setGithubDeploymentFiles] = useState<Record<string, string> | null>(null);
  const [githubProjectName, setGithubProjectName] = useState('');

  useEffect(() => {
    checkManagedHosting();
  }, []);

  const byoConnected = Boolean(coolifyConn.token && coolifyConn.serverUrl);
  const hostingReady = Boolean(managedAvailable) || byoConnected;

  const hostingLabel = byoConnected
    ? 'Deploy to your Coolify'
    : hostingReady
      ? 'Deploy on Exobase'
      : 'Hosting not set up yet';

  const handleCoolifyDeployClick = async () => {
    setIsDeploying(true);
    setDeployingTo('exobase');

    try {
      await handleCoolifyDeploy();
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const handleGitHubDeployClick = async () => {
    setIsDeploying(true);
    setDeployingTo('github');

    try {
      const result = await handleGitHubDeploy();

      if (result && result.success && result.files) {
        setGithubDeploymentFiles(result.files);
        setGithubProjectName(result.projectName);
        setShowGitHubDeploymentDialog(true);
      }
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const itemClass = (disabled: boolean) =>
    classNames(
      'cursor-pointer flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative',
      { 'opacity-60 cursor-not-allowed': disabled },
    );

  return (
    <>
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden text-sm">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            disabled={isDeploying || !activePreview || isStreaming}
            className="rounded-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs bg-accent-500 text-white hover:text-bolt-elements-item-contentAccent [&:not(:disabled,.disabled)]:hover:bg-bolt-elements-button-primary-backgroundHover outline-accent-500 flex gap-1.7"
          >
            {isDeploying ? `Deploying to ${deployingTo}...` : 'Deploy'}
            <span className={classNames('i-ph:caret-down transition-transform')} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            className={classNames(
              'z-[250]',
              'bg-bolt-elements-background-depth-2',
              'rounded-lg shadow-lg',
              'border border-bolt-elements-borderColor',
              'animate-in fade-in-0 zoom-in-95',
              'py-1',
            )}
            sideOffset={5}
            align="end"
          >
            <DropdownMenu.Item
              className={itemClass(isDeploying || !activePreview || !hostingReady)}
              disabled={isDeploying || !activePreview || !hostingReady}
              onClick={handleCoolifyDeployClick}
            >
              <span className="i-ph:rocket-launch-fill w-5 h-5" />
              <span className="mx-auto">{hostingLabel}</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass(isDeploying || !activePreview)}
              disabled={isDeploying || !activePreview}
              onClick={handleGitHubDeployClick}
            >
              <span className="i-ph:github-logo w-5 h-5" />
              <span className="mx-auto">Push to GitHub</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      {showGitHubDeploymentDialog && githubDeploymentFiles && (
        <GitHubDeploymentDialog
          isOpen={showGitHubDeploymentDialog}
          onClose={() => setShowGitHubDeploymentDialog(false)}
          projectName={githubProjectName}
          files={githubDeploymentFiles}
        />
      )}
    </>
  );
};
