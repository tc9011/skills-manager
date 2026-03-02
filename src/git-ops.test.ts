// src/git-ops.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildRemoteUrl, detectSuspiciousFiles, ensureGitignore } from './git-ops.js';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('buildRemoteUrl', () => {
  it('builds clean HTTPS URL without credentials', () => {
    const url = buildRemoteUrl('tc9011/my-skills');
    expect(url).toBe('https://github.com/tc9011/my-skills.git');
  });

  it('never includes token in URL', () => {
    // buildRemoteUrl no longer accepts tokens — credentials are handled transiently
    const url = buildRemoteUrl('tc9011/my-skills');
    expect(url).not.toContain('@');
    expect(url).not.toContain('ghp_');
  });
});

describe('detectSuspiciousFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'git-ops-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects .env files', async () => {
    await writeFile(join(tempDir, '.env'), 'SECRET=123');
    await writeFile(join(tempDir, 'SKILL.md'), '# Normal file');
    const result = detectSuspiciousFiles(tempDir);
    expect(result).toContain('.env');
    expect(result).not.toContain('SKILL.md');
  });

  it('detects credential and key files', async () => {
    await writeFile(join(tempDir, 'credentials.json'), '{}');
    await writeFile(join(tempDir, 'server.key'), 'key');
    const result = detectSuspiciousFiles(tempDir);
    expect(result).toContain('credentials.json');
    expect(result).toContain('server.key');
  });

  it('returns empty array for clean directory', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), '# OK');
    const result = detectSuspiciousFiles(tempDir);
    expect(result).toEqual([]);
  });

  it('returns empty array for nonexistent directory', () => {
    const result = detectSuspiciousFiles('/nonexistent/path');
    expect(result).toEqual([]);
  });
});

describe('ensureGitignore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitignore-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates .gitignore with defaults when none exists', async () => {
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.DS_Store');
  });

  it('appends missing patterns to existing .gitignore', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'node_modules\n');
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules');
    expect(content).toContain('.DS_Store');
  });

  it('does not duplicate existing patterns', async () => {
    await writeFile(join(tempDir, '.gitignore'), '.DS_Store\n');
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    const occurrences = content.split('.DS_Store').length - 1;
    expect(occurrences).toBe(1);
  });

  it('handles .gitignore without trailing newline', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'node_modules');
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toBe('node_modules\n.DS_Store\n');
  });
});
