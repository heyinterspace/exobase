import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Octokit } from '@octokit/rest';
import { classNames } from '~/utils/classNames';
import { getLocalStorage } from '~/lib/persistence/localStorage';
import type { GitHubUserResponse, GitHubRepoInfo } from '~/types/GitHub';
import { logStore } from '~/lib/stores/logs';
import { chatId } from '~/lib/persistence/useChatHistory';
import { useStore } from '@nanostores/react';
import { GitHubAuthDialog } from '~/components/@settings/tabs/github/components/GitHubAuthDialog';
import { SearchInput, EmptyState, StatusIndicator, Badge } from '~/components/ui';
import { DialogRoot, Dialog, DialogTitle, DialogButton } from '~/components/ui/Dialog';

interface GitHubDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  files: Record<string, string>;
}

export function GitHubDeploymentDialog({ isOpen, onClose, projectName, files }: GitHubDeploymentDialogProps) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<GitHubUserResponse | null>(null);
  const [recentRepos, setRecentRepos] = useState<GitHubRepoInfo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepoInfo[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdRepoUrl, setCreatedRepoUrl] = useState('');
  const [pushedFiles, setPushedFiles] = useState<{ path: string; size: number }[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const currentChatId = useStore(chatId);

  /*
   * Load GitHub connection on mount
   * Helper function to sanitize repository name
   */
  const sanitizeRepoName = (name: string): string => {
    return (
      name
        .toLowerCase()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove special characters except hyphens and alphanumeric
        .replace(/[^a-z0-9-]/g, '')
        // Remove multiple consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Ensure it's not empty and has reasonable length
        .substring(0, 100) || 'my-project'
    );
  };

  useEffect(() => {
    if (isOpen) {
      const connection = getLocalStorage('github_connection');

      // Set a default repository name based on the project name with proper sanitization
      setRepoName(sanitizeRepoName(projectName));

      if (connection?.user && connection?.token) {
        setUser(connection.user);

        // Only fetch if we have both user and token
        if (connection.token.trim()) {
          fetchRecentRepos(connection.token);
        }
      }
    }
  }, [isOpen, projectName]);

  // Filter repositories based on search query
  useEffect(() => {
    if (recentRepos.length === 0) {
      setFilteredRepos([]);
      return;
    }

    if (!repoSearchQuery.trim()) {
      setFilteredRepos(recentRepos);
      return;
    }

    const query = repoSearchQuery.toLowerCase().trim();
    const filtered = recentRepos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query)) ||
        (repo.language && repo.language.toLowerCase().includes(query)),
    );

    setFilteredRepos(filtered);
  }, [recentRepos, repoSearchQuery]);

  const fetchRecentRepos = async (token: string) => {
    if (!token) {
      logStore.logError('No GitHub token available');
      toast.error('GitHub authentication required');

      return;
    }

    try {
      setIsFetchingRepos(true);

      // Fetch ALL repos by paginating through all pages
      let allRepos: GitHubRepoInfo[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const requestUrl = `https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}&affiliation=owner,organization_member`;
        const response = await fetch(requestUrl, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token.trim()}`,
          },
        });

        if (!response.ok) {
          let errorData: { message?: string } = {};

          try {
            errorData = await response.json();
          } catch {
            errorData = { message: 'Could not parse error response' };
          }

          if (response.status === 401) {
            toast.error('GitHub token expired. Please reconnect your account.');

            // Clear invalid token
            const connection = getLocalStorage('github_connection');

            if (connection) {
              localStorage.removeItem('github_connection');
              setUser(null);
            }
          } else if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
            // Rate limit exceeded
            const resetTime = response.headers.get('x-ratelimit-reset');
            const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : 'soon';
            toast.error(`GitHub API rate limit exceeded. Limit resets at ${resetDate}`);
          } else {
            logStore.logError('Failed to fetch GitHub repositories', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });
            toast.error(`Failed to fetch repositories: ${errorData.message || response.statusText}`);
          }

          return;
        }

        try {
          const repos = (await response.json()) as GitHubRepoInfo[];
          allRepos = allRepos.concat(repos);

          if (repos.length < 100) {
            hasMore = false;
          } else {
            page += 1;
          }
        } catch (parseError) {
          logStore.logError('Failed to parse GitHub repositories response', { parseError });
          toast.error('Failed to parse repository data');
          setRecentRepos([]);

          return;
        }
      }

      setRecentRepos(allRepos);
    } catch (error) {
      logStore.logError('Failed to fetch GitHub repositories', { error });
      toast.error('Failed to fetch recent repositories');
    } finally {
      setIsFetchingRepos(false);
    }
  };

  // Function to create a new repository or push to an existing one
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const connection = getLocalStorage('github_connection');

    if (!connection?.token || !connection?.user) {
      toast.error('Please connect your GitHub account in Settings > Connections first');
      return;
    }

    if (!repoName.trim()) {
      toast.error('Repository name is required');
      return;
    }

    // Validate repository name
    const sanitizedName = sanitizeRepoName(repoName);

    if (!sanitizedName || sanitizedName.length < 1) {
      toast.error('Repository name must contain at least one alphanumeric character');
      return;
    }

    if (sanitizedName.length > 100) {
      toast.error('Repository name is too long (maximum 100 characters)');
      return;
    }

    // Update the repo name field with the sanitized version if it was changed
    if (sanitizedName !== repoName) {
      setRepoName(sanitizedName);
      toast.info(`Repository name sanitized to: ${sanitizedName}`);
    }

    setIsLoading(true);

    try {
      // Initialize Octokit with the GitHub token
      const octokit = new Octokit({ auth: connection.token });
      let repoExists = false;

      try {
        // Check if the repository already exists - ensure repo name is properly sanitized
        const sanitizedRepoName = sanitizeRepoName(repoName);
        const { data: existingRepo } = await octokit.repos.get({
          owner: connection.user.login,
          repo: sanitizedRepoName,
        });

        repoExists = true;

        // If we get here, the repo exists - confirm overwrite
        let confirmMessage = `Repository "${repoName}" already exists. Do you want to update it? This will add or modify files in the repository.`;

        // Add visibility change warning if needed
        if (existingRepo.private !== isPrivate) {
          const visibilityChange = isPrivate
            ? 'This will also change the repository from public to private.'
            : 'This will also change the repository from private to public.';

          confirmMessage += `\n\n${visibilityChange}`;
        }

        const confirmOverwrite = window.confirm(confirmMessage);

        if (!confirmOverwrite) {
          setIsLoading(false);
          return;
        }

        // If visibility needs to be updated
        if (existingRepo.private !== isPrivate) {
          await octokit.repos.update({
            owner: connection.user.login,
            repo: sanitizedRepoName,
            private: isPrivate,
          });
        }
      } catch (error: any) {
        // 404 means repo doesn't exist, which is what we want for new repos
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create repository if it doesn't exist
      if (!repoExists) {
        const sanitizedRepoName = sanitizeRepoName(repoName);
        const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
          name: sanitizedRepoName,
          private: isPrivate,

          // Initialize with a README to avoid empty repository issues
          auto_init: true,

          // Create a .gitignore file for the project
          gitignore_template: 'Node',
        });

        // Set the URL for success dialog
        setCreatedRepoUrl(newRepo.html_url);

        // Since we created the repo with auto_init, we need to wait for GitHub to initialize it
        console.log('Created new repository with auto_init, waiting for GitHub to initialize it...');

        // Wait a moment for GitHub to set up the initial commit
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        // Set URL for existing repo
        const sanitizedRepoName = sanitizeRepoName(repoName);
        setCreatedRepoUrl(`https://github.com/${connection.user.login}/${sanitizedRepoName}`);
      }

      // Process files to upload
      const fileEntries = Object.entries(files);

      // Filter out files and format them for display
      const fileList = fileEntries.map(([filePath, content]) => {
        // The paths are already properly formatted in the GitHubDeploy component
        return {
          path: filePath,
          size: new TextEncoder().encode(content).length,
        };
      });

      setPushedFiles(fileList);

      /*
       * Now we need to handle the repository, whether it's new or existing
       * Get the default branch for the repository
       */
      let defaultBranch: string;
      let baseSha: string | null = null;

      try {
        // For both new and existing repos, get the repository info
        const sanitizedRepoName = sanitizeRepoName(repoName);
        const { data: repo } = await octokit.repos.get({
          owner: connection.user.login,
          repo: sanitizedRepoName,
        });
        defaultBranch = repo.default_branch || 'main';
        console.log(`Repository default branch: ${defaultBranch}`);

        // For a newly created repo (or existing one), get the reference to the default branch
        try {
          const { data: refData } = await octokit.git.getRef({
            owner: connection.user.login,
            repo: sanitizedRepoName,
            ref: `heads/${defaultBranch}`,
          });

          baseSha = refData.object.sha;
          console.log(`Found existing reference with SHA: ${baseSha}`);

          // Get the latest commit to use as a base for our tree
          const { data: commitData } = await octokit.git.getCommit({
            owner: connection.user.login,
            repo: sanitizedRepoName,
            commit_sha: baseSha,
          });

          // Store the base tree SHA for tree creation
          baseSha = commitData.tree.sha;
          console.log(`Using base tree SHA: ${baseSha}`);
        } catch (refError) {
          console.error('Error getting reference:', refError);
          baseSha = null;
        }
      } catch (repoError) {
        console.error('Error getting repository info:', repoError);
        defaultBranch = 'main';
        baseSha = null;
      }

      try {
        console.log('Creating tree for repository');

        // Create a tree with all files
        const tree = fileEntries.map(([filePath, content]) => ({
          path: filePath, // We've already formatted the paths correctly
          mode: '100644' as const, // Regular file
          type: 'blob' as const,
          content,
        }));

        console.log(`Creating tree with ${tree.length} files using base: ${baseSha || 'none'}`);

        // Create a tree with all the files, using the base tree if available
        const sanitizedRepoName = sanitizeRepoName(repoName);
        const { data: treeData } = await octokit.git.createTree({
          owner: connection.user.login,
          repo: sanitizedRepoName,
          tree,
          base_tree: baseSha || undefined,
        });

        console.log('Tree created successfully', treeData.sha);

        // Get the current reference to use as parent for our commit
        let parentCommitSha: string | null = null;

        try {
          const { data: refData } = await octokit.git.getRef({
            owner: connection.user.login,
            repo: sanitizedRepoName,
            ref: `heads/${defaultBranch}`,
          });
          parentCommitSha = refData.object.sha;
          console.log(`Found parent commit: ${parentCommitSha}`);
        } catch (refError) {
          console.log('No reference found, this is a brand new repo', refError);
          parentCommitSha = null;
        }

        // Create a commit with the tree
        console.log('Creating commit');

        const { data: commitData } = await octokit.git.createCommit({
          owner: connection.user.login,
          repo: sanitizedRepoName,
          message: !repoExists ? 'Initial commit from Exobase' : 'Update from Exobase',
          tree: treeData.sha,
          parents: parentCommitSha ? [parentCommitSha] : [], // Use parent if available
        });

        console.log('Commit created successfully', commitData.sha);

        // Update the reference to point to the new commit
        try {
          console.log(`Updating reference: heads/${defaultBranch} to ${commitData.sha}`);
          await octokit.git.updateRef({
            owner: connection.user.login,
            repo: sanitizedRepoName,
            ref: `heads/${defaultBranch}`,
            sha: commitData.sha,
            force: true, // Use force to ensure the update works
          });
          console.log('Reference updated successfully');
        } catch (refError) {
          console.log('Failed to update reference, attempting to create it', refError);

          // If the reference doesn't exist, create it (shouldn't happen with auto_init, but just in case)
          try {
            await octokit.git.createRef({
              owner: connection.user.login,
              repo: sanitizedRepoName,
              ref: `refs/heads/${defaultBranch}`,
              sha: commitData.sha,
            });
            console.log('Reference created successfully');
          } catch (createRefError) {
            console.error('Error creating reference:', createRefError);

            const errorMsg =
              typeof createRefError === 'object' && createRefError !== null && 'message' in createRefError
                ? String(createRefError.message)
                : 'Unknown error';
            throw new Error(`Failed to create Git reference: ${errorMsg}`);
          }
        }
      } catch (gitError) {
        console.error('Error with git operations:', gitError);

        const gitErrorMsg =
          typeof gitError === 'object' && gitError !== null && 'message' in gitError
            ? String(gitError.message)
            : 'Unknown error';
        throw new Error(`Failed during git operations: ${gitErrorMsg}`);
      }

      // Save the repository information for this chat
      const sanitizedRepoName = sanitizeRepoName(repoName);
      localStorage.setItem(
        `github-repo-${currentChatId}`,
        JSON.stringify({
          owner: connection.user.login,
          name: sanitizedRepoName,
          url: `https://github.com/${connection.user.login}/${sanitizedRepoName}`,
        }),
      );

      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error pushing to GitHub:', error);

      // Attempt to extract more specific error information
      let errorMessage = 'Failed to push to GitHub';
      let isRetryable = false;

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('network') || errorMsg.includes('fetch failed') || errorMsg.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
          isRetryable = true;
        } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
          errorMessage = 'GitHub authentication failed. Please check your access token in Settings > Connections.';
        } else if (errorMsg.includes('403') || errorMsg.includes('forbidden')) {
          errorMessage =
            'Access denied. Your GitHub token may not have sufficient permissions to create/modify repositories.';
        } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          errorMessage = 'Repository or resource not found. Please check the repository name and your permissions.';
        } else if (errorMsg.includes('422') || errorMsg.includes('validation failed')) {
          if (errorMsg.includes('name already exists')) {
            errorMessage =
              'A repository with this name already exists in your account. Please choose a different name.';
          } else {
            errorMessage = 'Repository validation failed. Please check the repository name and settings.';
          }
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          errorMessage = 'GitHub API rate limit exceeded. Please wait a moment and try again.';
          isRetryable = true;
        } else if (errorMsg.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your connection and try again.';
          isRetryable = true;
        } else {
          errorMessage = `GitHub error: ${error.message}`;
        }
      } else if (typeof error === 'object' && error !== null) {
        // Octokit errors
        if ('message' in error) {
          errorMessage = `GitHub API error: ${error.message as string}`;
        }

        // GitHub API errors
        if ('documentation_url' in error) {
          console.log('GitHub API documentation:', error.documentation_url);
        }
      }

      // Show error with retry suggestion if applicable
      const finalMessage = isRetryable ? `${errorMessage} Click to retry.` : errorMessage;
      toast.error(finalMessage);

      // Log detailed error for debugging
      console.error('Detailed GitHub deployment error:', {
        error,
        repoName: sanitizeRepoName(repoName),
        user: connection?.user?.login,
        isRetryable,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRepoName('');
    setIsPrivate(false);
    setShowSuccessDialog(false);
    setCreatedRepoUrl('');
    onClose();
  };

  const handleAuthDialogClose = () => {
    setShowAuthDialog(false);

    // Refresh user data after auth
    const connection = getLocalStorage('github_connection');

    if (connection?.user && connection?.token) {
      setUser(connection.user);
      fetchRecentRepos(connection.token);
    }
  };

  // Determine which screen of the dialog to render; each screen slides in as its own layer.
  const screen = showSuccessDialog ? 'success' : !user ? 'connect' : 'form';

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      {isOpen && (
        <Dialog
          onClose={handleClose}
          onBackdrop={handleClose}
          className={classNames('overflow-hidden max-h-[90vh]', screen === 'success' ? 'max-w-xl' : 'max-w-md')}
        >
          <div key={screen} className="animated fadeInRight flex flex-col max-h-[90vh] overflow-y-auto">
            {screen === 'success' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="i-ph:check-circle w-8 h-8 text-green-500 shrink-0" />
                  <div>
                    <DialogTitle>Successfully pushed to GitHub</DialogTitle>
                    <p className="text-sm text-bolt-elements-textSecondary">Your code is now available on GitHub</p>
                  </div>
                </div>

                <div className="bg-bolt-elements-background-depth-2 p-4 text-left border border-bolt-elements-borderColor">
                  <p className="text-sm font-medium text-bolt-elements-textPrimary mb-2 flex items-center gap-2">
                    <span className="i-ph:github-logo w-4 h-4" />
                    Repository URL
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-bolt-elements-background-depth-1 px-3 py-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary font-mono">
                      {createdRepoUrl}
                    </code>
                    <DialogButton
                      type="secondary"
                      icon="i-ph:copy"
                      onClick={() => {
                        navigator.clipboard.writeText(createdRepoUrl);
                        toast.success('URL copied to clipboard');
                      }}
                    >
                      Copy
                    </DialogButton>
                  </div>
                </div>

                <div className="bg-bolt-elements-background-depth-2 p-4 border border-bolt-elements-borderColor">
                  <p className="text-sm font-medium text-bolt-elements-textPrimary mb-2 flex items-center gap-2">
                    <span className="i-ph:files w-4 h-4" />
                    Pushed Files ({pushedFiles.length})
                  </p>
                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {pushedFiles.slice(0, 100).map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center justify-between py-1.5 text-sm text-bolt-elements-textPrimary border-b border-bolt-elements-borderColor/30 last:border-0"
                      >
                        <span className="font-mono truncate flex-1 text-xs">{file.path}</span>
                        <span className="text-xs px-2 py-0.5 bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary ml-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                    {pushedFiles.length > 100 && (
                      <div className="py-2 text-center text-xs text-bolt-elements-textSecondary">
                        +{pushedFiles.length - 100} more files
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <DialogButton
                    type="secondary"
                    icon="i-ph:copy"
                    onClick={() => {
                      navigator.clipboard.writeText(createdRepoUrl);
                      toast.success('URL copied to clipboard');
                    }}
                  >
                    Copy URL
                  </DialogButton>
                  <a href={createdRepoUrl} target="_blank" rel="noopener noreferrer">
                    <DialogButton type="primary" icon="i-ph:github-logo">
                      View Repository
                    </DialogButton>
                  </a>
                  <DialogButton type="secondary" icon="i-ph:x" onClick={handleClose}>
                    Close
                  </DialogButton>
                </div>
              </div>
            )}

            {screen === 'connect' && (
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-bolt-elements-background-depth-3 flex items-center justify-center">
                  <div className="i-ph:github-logo w-8 h-8 text-bolt-elements-textSecondary" />
                </div>
                <DialogTitle className="justify-center">GitHub Connection Required</DialogTitle>
                <p className="text-sm text-bolt-elements-textSecondary max-w-md mx-auto">
                  To deploy your code to GitHub, you need to connect your GitHub account first.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <DialogButton type="secondary" icon="i-ph:x" onClick={handleClose}>
                    Close
                  </DialogButton>
                  <DialogButton type="primary" icon="i-ph:github-logo" onClick={() => setShowAuthDialog(true)}>
                    Connect GitHub Account
                  </DialogButton>
                </div>
              </div>
            )}

            {screen === 'form' && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-bolt-elements-background-depth-3 flex items-center justify-center shrink-0">
                    <div className="i-ph:github-logo w-5 h-5 text-bolt-elements-textSecondary" />
                  </div>
                  <div>
                    <DialogTitle>Deploy to GitHub</DialogTitle>
                    <p className="text-sm text-bolt-elements-textSecondary">
                      Deploy your code to a new or existing GitHub repository
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6 p-4 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
                  <div className="relative">
                    <img src={user!.avatar_url} alt={user!.login} className="w-10 h-10 rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor flex items-center justify-center">
                      <div className="i-ph:github-logo w-3 h-3 text-bolt-elements-textSecondary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-bolt-elements-textPrimary">{user!.name || user!.login}</p>
                    <p className="text-sm text-bolt-elements-textSecondary">@{user!.login}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="repoName" className="text-sm text-bolt-elements-textSecondary">
                      Repository Name
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary">
                        <span className="i-ph:git-branch w-4 h-4" />
                      </div>
                      <input
                        id="repoName"
                        type="text"
                        value={repoName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRepoName(value);

                          // Show real-time feedback for invalid characters
                          const sanitized = sanitizeRepoName(value);

                          if (value && value !== sanitized) {
                            // Show preview of sanitized name without being too intrusive
                            e.target.setAttribute('data-sanitized', sanitized);
                          } else {
                            e.target.removeAttribute('data-sanitized');
                          }
                        }}
                        placeholder="my-awesome-project"
                        className="w-full pl-10 px-4 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-accent"
                        required
                        maxLength={100}
                        pattern="[a-zA-Z0-9\-_\s]+"
                        title="Repository name can contain letters, numbers, hyphens, underscores, and spaces"
                      />
                    </div>
                    {repoName && sanitizeRepoName(repoName) !== repoName && (
                      <p className="text-xs text-bolt-elements-textSecondary mt-1">
                        Will be created as: <span className="font-mono text-accent">{sanitizeRepoName(repoName)}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-bolt-elements-textSecondary">Recent Repositories</label>
                      <span className="text-xs text-bolt-elements-textTertiary">
                        {filteredRepos.length} of {recentRepos.length}
                      </span>
                    </div>

                    <div className="mb-2">
                      <SearchInput
                        placeholder="Search repositories..."
                        value={repoSearchQuery}
                        onChange={(e) => setRepoSearchQuery(e.target.value)}
                        onClear={() => setRepoSearchQuery('')}
                        className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-sm"
                      />
                    </div>

                    {recentRepos.length === 0 && !isFetchingRepos ? (
                      <EmptyState
                        icon="i-ph:github-logo"
                        title="No repositories found"
                        description="We couldn't find any repositories in your GitHub account."
                        variant="compact"
                      />
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredRepos.length === 0 && repoSearchQuery.trim() !== '' ? (
                          <EmptyState
                            icon="i-ph:magnifying-glass"
                            title="No matching repositories"
                            description="Try a different search term"
                            variant="compact"
                          />
                        ) : (
                          filteredRepos.map((repo) => (
                            <motion.button
                              key={repo.full_name}
                              type="button"
                              onClick={() => setRepoName(repo.name)}
                              className="w-full p-3 text-left bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors group border border-bolt-elements-borderColor hover:border-accent"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="i-ph:git-branch w-4 h-4 text-bolt-elements-textSecondary" />
                                  <span className="text-sm font-medium text-bolt-elements-textPrimary group-hover:text-accent">
                                    {repo.name}
                                  </span>
                                </div>
                                {repo.private && (
                                  <Badge variant="primary" size="sm" icon="i-ph:lock w-3 h-3">
                                    Private
                                  </Badge>
                                )}
                              </div>
                              {repo.description && (
                                <p className="mt-1 text-xs text-bolt-elements-textSecondary line-clamp-2">
                                  {repo.description}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {repo.language && (
                                  <Badge variant="subtle" size="sm" icon="i-ph:code w-3 h-3">
                                    {repo.language}
                                  </Badge>
                                )}
                                <Badge variant="subtle" size="sm" icon="i-ph:star w-3 h-3">
                                  {repo.stargazers_count.toLocaleString()}
                                </Badge>
                                <Badge variant="subtle" size="sm" icon="i-ph:git-fork w-3 h-3">
                                  {repo.forks_count.toLocaleString()}
                                </Badge>
                                <Badge variant="subtle" size="sm" icon="i-ph:clock w-3 h-3">
                                  {new Date(repo.updated_at).toLocaleDateString()}
                                </Badge>
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {isFetchingRepos && (
                    <div className="flex items-center justify-center py-4">
                      <StatusIndicator status="loading" pulse={true} label="Loading repositories..." />
                    </div>
                  )}

                  <div className="p-3 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="private"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="border-bolt-elements-borderColor text-accent focus:ring-accent bg-bolt-elements-background-depth-3"
                      />
                      <label htmlFor="private" className="text-sm text-bolt-elements-textPrimary">
                        Make repository private
                      </label>
                    </div>
                    <p className="text-xs text-bolt-elements-textTertiary mt-2 ml-6">
                      Private repositories are only visible to you and people you share them with
                    </p>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <DialogButton
                      type="secondary"
                      icon="i-ph:x"
                      onClick={(event) => {
                        event.preventDefault();
                        handleClose();
                      }}
                    >
                      Cancel
                    </DialogButton>
                    <DialogButton
                      type="primary"
                      submit
                      icon={isLoading ? 'i-ph:spinner-gap animate-spin' : 'i-ph:github-logo'}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Deploying...' : 'Deploy to GitHub'}
                    </DialogButton>
                  </div>
                </form>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* GitHub Auth Dialog */}
      <GitHubAuthDialog isOpen={showAuthDialog} onClose={handleAuthDialogClose} />
    </DialogRoot>
  );
}
