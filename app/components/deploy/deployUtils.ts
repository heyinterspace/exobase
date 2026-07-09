import type { WebContainer } from '@webcontainer/api';
import { path } from '~/utils/path';

const MAX_BUILD_OUTPUT_CHARS = 4000;

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.next']);

/**
 * Recursively read the whole project tree out of the container into a
 * path → content map, skipping dependency/build/VCS directories and
 * secrets. Shared by every deploy flow that ships source (GitHub, Coolify)
 * rather than build output.
 */
export async function collectProjectFiles(
  container: WebContainer,
  dirPath: string = '/',
  basePath: string = '',
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      Object.assign(files, await collectProjectFiles(container, fullPath, relativePath));
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.DS_Store') || entry.name.endsWith('.log') || entry.name.startsWith('.env')) {
        continue;
      }

      try {
        files[relativePath] = await container.fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        console.warn(`Could not read file ${fullPath}:`, error);
      }
    }
  }

  return files;
}

export function formatBuildFailureOutput(output?: string) {
  const trimmed = output?.trim();

  if (!trimmed) {
    return 'Build failed with no output captured.';
  }

  if (trimmed.length <= MAX_BUILD_OUTPUT_CHARS) {
    return trimmed;
  }

  return `Build output (truncated):\n${trimmed.slice(-MAX_BUILD_OUTPUT_CHARS)}`;
}
