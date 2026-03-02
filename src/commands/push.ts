// src/commands/push.ts
import { CANONICAL_SKILLS_DIR } from '../agents.js';
import { ensureGitHubToken } from '../auth.js';
import { CliError } from '../errors.js';
import { pushSkills, getRepoRemoteUrl } from '../git-ops.js';
import * as p from '@clack/prompts';

export async function pushCommand(options: { message?: string }): Promise<void> {
  p.intro('skills-manager push');

  // 1. Check auth
  const token = await ensureGitHubToken();

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

    // Warn about suspicious files that may contain secrets
    if (result.suspiciousFiles?.length) {
      p.note(
        `Suspicious files pushed: ${result.suspiciousFiles.join(', ')}\nConsider adding a .gitignore to ${CANONICAL_SKILLS_DIR}.`,
        '⚠ Warning',
      );
    }
  } catch (err) {
    spinner.stop('Push failed.');
    p.cancel(String(err));
    throw new CliError(String(err));
  }

  p.outro('Done!');
}
