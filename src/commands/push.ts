// src/commands/push.ts
import { CANONICAL_SKILLS_DIR } from '../agents.js';
import { getGitHubToken } from '../auth.js';
import { CliError } from '../errors.js';
import { pushSkills, getRepoRemoteUrl } from '../git-ops.js';
import * as p from '@clack/prompts';

export async function pushCommand(options: { message?: string }): Promise<void> {
  p.intro('skills-manager push');

  // 1. Check auth
  const token = getGitHubToken();
  if (!token) {
    p.cancel('No GitHub authentication found. Run `gh auth login` or set GITHUB_TOKEN.');
    throw new CliError('No GitHub authentication found.');
  }

  // 2. Check canonical dir has a remote
  const remote = await getRepoRemoteUrl(CANONICAL_SKILLS_DIR);
  if (!remote) {
    p.cancel(`No git remote found in ${CANONICAL_SKILLS_DIR}. Initialize with git first.`);
    throw new CliError(`No git remote found in ${CANONICAL_SKILLS_DIR}.`);
  }

  // 3. Push
  const spinner = p.spinner();
  spinner.start('Pushing skills to GitHub...');

  try {
    const result = await pushSkills(CANONICAL_SKILLS_DIR, options.message, token);
    spinner.stop(
      result.committed
        ? 'Skills pushed successfully!'
        : 'No changes to push — already up to date.',
    );
  } catch (err) {
    spinner.stop('Push failed.');
    p.cancel(String(err));
    throw new CliError(String(err));
  }

  p.outro('Done!');
}
