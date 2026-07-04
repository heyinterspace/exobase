import ignore from 'ignore';
import { useGit } from '~/lib/hooks/useGit';
import type { Message } from 'ai';
import { detectProjectCommands, createCommandsMessage, escapeBoltTags } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { LoadingOverlay } from '~/components/ui/LoadingOverlay';

import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';
import { DialogRoot, Dialog, DialogTitle } from '~/components/ui/Dialog';
import type { IChatMetadata } from '~/lib/persistence/db';
import { Github, GitBranch } from 'lucide-react';

// Import the new repository selector components
import { GitHubRepositorySelector } from '~/components/@settings/tabs/github/components/GitHubRepositorySelector';
import { GitLabRepositorySelector } from '~/components/@settings/tabs/gitlab/components/GitLabRepositorySelector';

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',

  // Include this so npm install runs much faster '**/*lock.json',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);

const MAX_FILE_SIZE = 100 * 1024; // 100KB limit per file
const MAX_TOTAL_SIZE = 500 * 1024; // 500KB total limit

interface GitCloneButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[], metadata?: IChatMetadata) => Promise<void>;
  iconOnly?: boolean;
}

export default function GitCloneButton({ importChat, className, iconOnly }: GitCloneButtonProps) {
  const { ready, gitClone } = useGit();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'gitlab' | null>(null);

  const handleClone = async (repoUrl: string) => {
    if (!ready) {
      return;
    }

    setLoading(true);
    setIsDialogOpen(false);
    setSelectedProvider(null);

    try {
      const { workdir, data } = await gitClone(repoUrl);

      if (importChat) {
        const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
        const textDecoder = new TextDecoder('utf-8');

        let totalSize = 0;
        const skippedFiles: string[] = [];
        const fileContents = [];

        for (const filePath of filePaths) {
          const { data: content, encoding } = data[filePath];

          // Skip binary files
          if (
            content instanceof Uint8Array &&
            !filePath.match(/\.(txt|md|astro|mjs|js|jsx|ts|tsx|json|html|css|scss|less|yml|yaml|xml|svg|vue|svelte)$/i)
          ) {
            skippedFiles.push(filePath);
            continue;
          }

          try {
            const textContent =
              encoding === 'utf8' ? content : content instanceof Uint8Array ? textDecoder.decode(content) : '';

            if (!textContent) {
              continue;
            }

            // Check file size
            const fileSize = new TextEncoder().encode(textContent).length;

            if (fileSize > MAX_FILE_SIZE) {
              skippedFiles.push(`${filePath} (too large: ${Math.round(fileSize / 1024)}KB)`);
              continue;
            }

            // Check total size
            if (totalSize + fileSize > MAX_TOTAL_SIZE) {
              skippedFiles.push(`${filePath} (would exceed total size limit)`);
              continue;
            }

            totalSize += fileSize;
            fileContents.push({
              path: filePath,
              content: textContent,
            });
          } catch (e: any) {
            skippedFiles.push(`${filePath} (error: ${e.message})`);
          }
        }

        const commands = await detectProjectCommands(fileContents);
        const commandsMessage = createCommandsMessage(commands);

        const filesMessage: Message = {
          role: 'assistant',
          content: `Cloning the repo ${repoUrl} into ${workdir}
${
  skippedFiles.length > 0
    ? `\nSkipped files (${skippedFiles.length}):
${skippedFiles.map((f) => `- ${f}`).join('\n')}`
    : ''
}

<boltArtifact id="imported-files" title="Git Cloned Files" type="bundled">
${fileContents
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${escapeBoltTags(file.content)}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>`,
          id: generateId(),
          createdAt: new Date(),
        };

        const messages = [filesMessage];

        if (commandsMessage) {
          messages.push(commandsMessage);
        }

        await importChat(`Git Project:${repoUrl.split('/').slice(-1)[0]}`, messages);
      }
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Failed to import repository');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setSelectedProvider(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          title="Remix a repo"
          onClick={openDialog}
          disabled={!ready || loading}
          className={classNames(
            'flex items-center gap-1 px-2 py-1.5 shrink-0',
            'border border-bolt-elements-borderColor shadow-hard-sm press-hard-sm',
            'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary',
            'hover:border-accent hover:text-accent',
            'text-xs font-medium transition-theme',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard-sm',
            className,
          )}
        >
          <Github className="w-4 h-4" />
          Remix
        </button>
      ) : (
        <Button
          onClick={openDialog}
          title="Remix a repo"
          variant="default"
          size="lg"
          className={classNames(
            'gap-2 bg-bolt-elements-background-depth-1',
            'text-bolt-elements-textPrimary',
            'hover:bg-bolt-elements-background-depth-2',
            'border border-bolt-elements-borderColor',
            'h-10 px-4 py-2 min-w-[120px] justify-center',
            'transition-all duration-200 ease-in-out',
            className,
          )}
          disabled={!ready || loading}
        >
          Remix a repo
          <div className="flex items-center gap-1 ml-2">
            <Github className="w-4 h-4" />
            <GitBranch className="w-4 h-4" />
          </div>
        </Button>
      )}

      <DialogRoot
        open={isDialogOpen}
        onOpenChange={(next) => {
          if (!next) {
            setIsDialogOpen(false);
            setSelectedProvider(null);
          }
        }}
      >
        {isDialogOpen && (
          <Dialog
            onClose={() => {
              setIsDialogOpen(false);
              setSelectedProvider(null);
            }}
            className={classNames('overflow-hidden', selectedProvider ? 'w-full max-w-4xl max-h-[90vh]' : 'max-w-md')}
          >
            {/* Re-keying on the selected provider re-triggers the slide-in animation, so
                each screen (choose provider -> repo picker) reads as a new layer landing
                on top of the last, not a flat content swap. */}
            <div key={selectedProvider || 'choose'} className="animated fadeInRight flex flex-col max-h-[90vh]">
              {!selectedProvider && (
                <div className="p-6">
                  <DialogTitle className="mb-4">Choose repository provider</DialogTitle>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedProvider('github')}
                      className="w-full p-4 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-accent transition-theme text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Github className="w-6 h-6 text-bolt-elements-textSecondary shrink-0" />
                        <div>
                          <div className="font-medium text-bolt-elements-textPrimary">GitHub</div>
                          <div className="text-sm text-bolt-elements-textSecondary">Clone from GitHub repositories</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedProvider('gitlab')}
                      className="w-full p-4 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-accent transition-theme text-left"
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-6 h-6 text-bolt-elements-textSecondary shrink-0" />
                        <div>
                          <div className="font-medium text-bolt-elements-textPrimary">GitLab</div>
                          <div className="text-sm text-bolt-elements-textSecondary">Clone from GitLab repositories</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {selectedProvider === 'github' && (
                <>
                  <div className="p-6 border-b border-bolt-elements-borderColor flex items-center gap-3">
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="flex items-center justify-center w-8 h-8 shrink-0 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-accent transition-theme"
                    >
                      <div className="i-ph:arrow-left w-4 h-4 text-bolt-elements-textSecondary" />
                    </button>
                    <Github className="w-6 h-6 text-bolt-elements-textSecondary shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">Import GitHub Repository</h3>
                      <p className="text-sm text-bolt-elements-textSecondary">
                        Clone a repository from GitHub to your workspace
                      </p>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto">
                    <GitHubRepositorySelector onClone={handleClone} />
                  </div>
                </>
              )}

              {selectedProvider === 'gitlab' && (
                <>
                  <div className="p-6 border-b border-bolt-elements-borderColor flex items-center gap-3">
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="flex items-center justify-center w-8 h-8 shrink-0 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-accent transition-theme"
                    >
                      <div className="i-ph:arrow-left w-4 h-4 text-bolt-elements-textSecondary" />
                    </button>
                    <GitBranch className="w-6 h-6 text-bolt-elements-textSecondary shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">Import GitLab Repository</h3>
                      <p className="text-sm text-bolt-elements-textSecondary">
                        Clone a repository from GitLab to your workspace
                      </p>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto">
                    <GitLabRepositorySelector onClone={handleClone} />
                  </div>
                </>
              )}
            </div>
          </Dialog>
        )}
      </DialogRoot>

      {loading && <LoadingOverlay message="Please wait while we clone the repository..." />}
    </>
  );
}
