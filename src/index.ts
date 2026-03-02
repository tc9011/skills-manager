#!/usr/bin/env node
import { Command } from 'commander';
import { pushCommand } from './commands/push.js';
import { pullCommand } from './commands/pull.js';
import { linkCommand } from './commands/link.js';

const program = new Command();

program
  .name('skills-manager')
  .description('Backup and restore AI agent skills to GitHub')
  .version('0.1.0');

program
  .command('push')
  .description('Push skills from ~/.agents/skills/ to GitHub')
  .option('-m, --message <message>', 'Commit message')
  .action(pushCommand);

program
  .command('pull')
  .description('Pull skills from GitHub to ~/.agents/skills/')
  .option('-r, --repo <repo>', 'GitHub repo (owner/name)')
  .option('--skip-link', 'Skip automatic agent linking after pull')
  .action(pullCommand);

program
  .command('link')
  .description('Create symlinks from canonical skills to agent directories')
  .option('-a, --agents <agents...>', 'Agent IDs to link (default: from .skill-lock.json)')
  .action(linkCommand);

program.parse();
