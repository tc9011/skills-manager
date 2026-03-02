// src/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSkillSymlinks, listCanonicalSkills } from './linker.js';

describe('integration: link flow', () => {
  let tempDir: string;
  let canonical: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sm-integ-'));
    canonical = join(tempDir, '.agents', 'skills');

    // Create fake canonical skills
    for (const skill of ['brainstorming', 'tdd', 'vue']) {
      await mkdir(join(canonical, skill), { recursive: true });
      await writeFile(join(canonical, skill, 'SKILL.md'), `# ${skill}`);
    }
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('lists skills from canonical directory', async () => {
    const skills = await listCanonicalSkills(canonical);
    expect(skills).toHaveLength(3);
    expect(skills).toContain('brainstorming');
  });

  it('creates symlinks for multiple agent directories', async () => {
    const skills = await listCanonicalSkills(canonical);
    const agents = [
      join(tempDir, '.config', 'opencode', 'skills'),
      join(tempDir, '.claude', 'skills'),
    ];

    for (const agentDir of agents) {
      const results = await createSkillSymlinks(canonical, agentDir, skills);
      expect(results.every(r => r.status === 'created')).toBe(true);
    }

    // Verify symlinks are relative
    const link = await readlink(join(agents[0], 'brainstorming'));
    expect(link).not.toMatch(/^\//); // Should be relative, not absolute
    expect(link).toContain('.agents/skills/brainstorming');
  });

  it('is idempotent — running link twice produces exists status', async () => {
    const skills = await listCanonicalSkills(canonical);
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');

    const first = await createSkillSymlinks(canonical, agentDir, skills);
    expect(first.every(r => r.status === 'created')).toBe(true);

    const second = await createSkillSymlinks(canonical, agentDir, skills);
    expect(second.every(r => r.status === 'exists')).toBe(true);
  });
});
