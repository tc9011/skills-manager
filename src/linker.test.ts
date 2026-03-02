// src/linker.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSkillSymlinks, computeRelativeSymlinkTarget, type LinkResult } from './linker.js';

describe('computeRelativeSymlinkTarget', () => {
  it('computes relative path from opencode global to canonical', () => {
    const result = computeRelativeSymlinkTarget(
      '/Users/test/.config/opencode/skills/my-skill',
      '/Users/test/.agents/skills/my-skill',
    );
    expect(result).toBe('../../../.agents/skills/my-skill');
  });

  it('computes relative path from claude global to canonical', () => {
    const result = computeRelativeSymlinkTarget(
      '/Users/test/.claude/skills/my-skill',
      '/Users/test/.agents/skills/my-skill',
    );
    expect(result).toBe('../../.agents/skills/my-skill');
  });
});

describe('createSkillSymlinks', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'linker-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates symlinks for skills to agent directory', async () => {
    // Setup: canonical skills
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    // Target agent dir
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    const results = await createSkillSymlinks(
      canonical,
      agentDir,
      ['my-skill'],
    );

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('my-skill');
    expect(results[0].status).toBe('created');

    // Verify symlink exists and is relative
    const linkTarget = await readlink(join(agentDir, 'my-skill'));
    expect(linkTarget).toContain('.agents/skills/my-skill');
  });

  it('skips skills that do not exist in canonical', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(canonical, { recursive: true });
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    const results = await createSkillSymlinks(
      canonical,
      agentDir,
      ['nonexistent-skill'],
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not found');
  });

  it('reports already-existing symlinks', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    // Create first
    await createSkillSymlinks(canonical, agentDir, ['my-skill']);
    // Create again
    const results = await createSkillSymlinks(canonical, agentDir, ['my-skill']);

    expect(results[0].status).toBe('exists');
  });
});
