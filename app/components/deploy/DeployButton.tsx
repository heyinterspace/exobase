import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useStore } from '@nanostores/react';
import { coolifyConnection } from '~/lib/stores/coolify';
import { workbenchStore } from '~/lib/stores/workbench';
import { streamingState } from '~/lib/stores/streaming';
import { classNames } from '~/utils/classNames';
import { useState } from 'react';
import { useCoolifyDeploy } from '~/components/deploy/CoolifyDeploy.client';
import { useGitHubDeploy } from '~/components/deploy/GitHubDeploy.client';
import { GitHubDeploymentDialog } from '~/components/deploy/GitHubDeploymentDialog';

/*
 * One opinionated target per layer: Coolify hosts the app, GitHub holds the
 * repo. No provider menu beyond that — see project_opinionated_positioning.
 */
export const DeployButton = () => {
  const coolifyConn = useStore(coolifyConnection);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'coolify' | 'github' | null>(null);
  const isStreaming = useStore(streamingState);
  const { handleCoolifyDeploy } = useCoolifyDeploy();
  const { handleGitHubDeploy } = useGitHubDeploy();
  const [showGitHubDeploymentDialog, setShowGitHubDeploymentDialog] = useState(false);
  const [githubDeploymentFiles, setGithubDeploymentFiles] = useState<Record<string, string> | null>(null);
  const [githubProjectName, setGithubProjectName] = useState('');

  const coolifyConnected = Boolean(coolifyConn.token && coolifyConn.serverUrl);

  const handleCoolifyDeployClick = async () => {
    setIsDeploying(true);
    setDeployingTo('coolify');

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
              className={itemClass(isDeploying || !activePreview || !coolifyConnected)}
              disabled={isDeploying || !activePreview || !coolifyConnected}
              onClick={handleCoolifyDeployClick}
            >
              <span className="i-ph:cloud-arrow-up w-5 h-5" />
              <span className="mx-auto">
                {coolifyConnected ? 'Deploy to Coolify' : 'No Coolify Instance Connected'}
              </span>
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
