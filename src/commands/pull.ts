import { CANONICAL_SKILLS_DIR } from '../agents.js';
import { getGitHubToken } from '../auth.js';
import { pullSkills, buildRemoteUrl, getRepoRemoteUrl } from '../git-ops.js';
import { linkCommand } from './link.js';
import * as p from '@clack/prompts';

export async function pullCommand(options: { repo?: string; skipLink?: boolean }): Promise<void> {
  p.intro('skills-manager pull');

  const token = getGitHubToken();

  // Determine remote URL
  let remoteUrl: string;
  if (options.repo) {
    remoteUrl = buildRemoteUrl(options.repo, token);
  } else {
    const existing = await getRepoRemoteUrl(CANONICAL_SKILLS_DIR);
    if (!existing) {
      p.cancel('No repo specified and no existing remote. Use --repo owner/name.');
      process.exit(1);
    }
    remoteUrl = existing;
  }

  // Pull
  const spinner = p.spinner();
  spinner.start('Pulling skills from GitHub...');

  try {
    const result = await pullSkills(CANONICAL_SKILLS_DIR, remoteUrl);
    spinner.stop(
      result.cloned
        ? 'Skills cloned successfully!'
        : 'Skills updated from remote.',
    );
  } catch (err) {
    spinner.stop('Pull failed.');
    p.cancel(String(err));
    process.exit(1);
  }

  // Auto-run link unless skipped
  if (!options.skipLink) {
    await linkCommand({});
  } else {
    p.outro('Pull complete. Run `skills-manager link` to create agent symlinks.');
  }
}
