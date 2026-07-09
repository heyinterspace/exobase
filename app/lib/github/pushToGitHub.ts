import { Octokit } from '@octokit/rest';

/*
 * Headless create-or-update-and-push, mirroring the Octokit sequence
 * GitHubDeploymentDialog.tsx walks interactively (repo get/create, base tree,
 * createTree, createCommit, updateRef). Used by flows that need a git remote
 * as a means to an end rather than as the user-facing goal — currently the
 * Coolify deploy, which can only build from a git repository.
 */

export function sanitizeRepoName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) || 'my-project'
  );
}

export interface PushResult {
  owner: string;
  repoName: string;
  repoUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  createdRepo: boolean;
}

export async function pushFilesToGitHubRepo(options: {
  token: string;
  owner: string;
  repoName: string;
  files: Record<string, string>;
  commitMessage: string;
  isPrivate?: boolean;
}): Promise<PushResult> {
  const { token, owner, files, commitMessage, isPrivate = false } = options;
  const repoName = sanitizeRepoName(options.repoName);
  const octokit = new Octokit({ auth: token });

  let createdRepo = false;

  try {
    await octokit.repos.get({ owner, repo: repoName });
  } catch (error: any) {
    if (error.status !== 404) {
      throw error;
    }

    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: isPrivate,
      auto_init: true,
      gitignore_template: 'Node',
    });
    createdRepo = true;

    // auto_init commits a README asynchronously; give GitHub a moment.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const { data: repo } = await octokit.repos.get({ owner, repo: repoName });
  const defaultBranch = repo.default_branch || 'main';

  let baseTreeSha: string | undefined;
  let parentCommitSha: string | undefined;

  try {
    const { data: refData } = await octokit.git.getRef({ owner, repo: repoName, ref: `heads/${defaultBranch}` });
    parentCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: parentCommitSha,
    });
    baseTreeSha = commitData.tree.sha;
  } catch {
    // Brand-new repo with no commits yet; push a rootless commit below.
  }

  const { data: treeData } = await octokit.git.createTree({
    owner,
    repo: repoName,
    tree: Object.entries(files).map(([filePath, content]) => ({
      path: filePath,
      mode: '100644' as const,
      type: 'blob' as const,
      content,
    })),
    base_tree: baseTreeSha,
  });

  const { data: commitData } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: commitMessage,
    tree: treeData.sha,
    parents: parentCommitSha ? [parentCommitSha] : [],
  });

  try {
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${defaultBranch}`,
      sha: commitData.sha,
      force: true,
    });
  } catch {
    await octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${defaultBranch}`,
      sha: commitData.sha,
    });
  }

  return {
    owner,
    repoName,
    repoUrl: `https://github.com/${owner}/${repoName}`,
    cloneUrl: `https://github.com/${owner}/${repoName}.git`,
    defaultBranch,
    createdRepo,
  };
}
