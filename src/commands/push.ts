// src/commands/push.ts
import { AGENTS_DIR } from '../agents.js';
import { ensureGitHubToken } from '../auth.js';
import { CliError } from '../errors.js';
import {
  pushSkills,
  getRepoRemoteUrl,
  ensureGitRepo,
  ensureRemote,
  createGitHubRepo,
} from '../git-ops.js';
import * as p from '@clack/prompts';

export async function pushCommand(options: { message?: string }): Promise<void> {
  p.intro('skills-manager push');

  // 1. Check auth
  const token = await ensureGitHubToken();

  // 2. Ensure ~/.agents is a git repo (auto-init if needed)
  await ensureGitRepo(AGENTS_DIR);

  // 3. Check for existing remote
  const remote = await getRepoRemoteUrl(AGENTS_DIR);

  // 4. If no remote, prompt user for repo and configure
  if (!remote) {
    const repo = await p.text({
      message: 'Enter GitHub repo (owner/name):',
      placeholder: 'e.g. tc9011/my-skills',
    });

    if (p.isCancel(repo)) {
      p.cancel('Push cancelled.');
      throw new CliError('Push cancelled by user.');
    }

    await ensureRemote(AGENTS_DIR, repo);

    const shouldCreate = await p.confirm({
      message: 'Create this repo on GitHub? (requires gh CLI)',
    });

    if (shouldCreate === true) {
      createGitHubRepo(repo);
    }
  }

  // 5. Push
  const spinner = p.spinner();
  spinner.start('Pushing skills to GitHub...');

  try {
    const result = await pushSkills(AGENTS_DIR, options.message, token);
    spinner.stop(
      result.committed
        ? 'Skills pushed successfully!'
        : 'No changes to push — already up to date.',
    );

    // Warn about suspicious files that may contain secrets
    if (result.suspiciousFiles?.length) {
      p.note(
        `Suspicious files pushed: ${result.suspiciousFiles.join(', ')}
Consider adding a .gitignore to ${AGENTS_DIR}.`,
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
