import { AGENTS_DIR } from '../agents.js';
import { getGitHubToken } from '../auth.js';
import { CliError } from '../errors.js';
import {
  pullSkills,
  buildRemoteUrl,
  getRepoRemoteUrl,
  ensureGitRepo,
  ensureRemote,
} from '../git-ops.js';
import { linkCommand } from './link.js';
import * as p from '@clack/prompts';

export async function pullCommand(options: { repo?: string; skipLink?: boolean }): Promise<void> {
  p.intro('skills-manager pull');

  const token = getGitHubToken();

  // Determine remote URL
  let remoteUrl: string;
  if (options.repo) {
    remoteUrl = buildRemoteUrl(options.repo);
  } else {
    const existing = await getRepoRemoteUrl(AGENTS_DIR);
    if (existing) {
      remoteUrl = existing;
    } else {
      // No --repo flag and no existing remote — prompt interactively
      await ensureGitRepo(AGENTS_DIR);

      const repo = await p.text({
        message: 'Enter GitHub repo to pull from (owner/name):',
        placeholder: 'e.g. xxxx/my-skills',
      });

      if (p.isCancel(repo)) {
        p.cancel('Pull cancelled.');
        throw new CliError('Pull cancelled by user.');
      }

      const result = await ensureRemote(AGENTS_DIR, repo);
      remoteUrl = result.remoteUrl;
    }
  }

  // Pull
  const spinner = p.spinner();
  spinner.start('Pulling skills from GitHub...');

  let result: { cloned: boolean; pulled: boolean };
  try {
    result = await pullSkills(AGENTS_DIR, remoteUrl, token);
    if (result.cloned) {
      spinner.stop('Skills cloned successfully!');
    } else if (result.pulled) {
      spinner.stop('Skills updated from remote.');
    } else {
      spinner.stop('Already up to date.');
    }
  } catch (err) {
    spinner.error('Pull failed.');
    p.cancel(String(err));
    throw new CliError(String(err));
  }

  // Auto-run link unless skipped or nothing changed
  if (!options.skipLink && (result.cloned || result.pulled)) {
    await linkCommand({});
  } else if (options.skipLink) {
    p.outro('Pull complete. Run `skills-manager link` to create agent symlinks.');
  } else {
    p.outro('No changes pulled. Skipping link.');
  }
}
