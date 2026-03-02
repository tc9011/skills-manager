// src/linker.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readlink, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSkillSymlinks, computeRelativeSymlinkTarget, listCanonicalSkills, copySkills, createProjectSymlinks } from './linker.js';

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

  it('recreates stale symlinks pointing to wrong target', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    // Create a symlink pointing to the wrong place
    const linkPath = join(agentDir, 'my-skill');
    await symlink('/some/wrong/target', linkPath);

    // Should recreate it
    const results = await createSkillSymlinks(canonical, agentDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('recreated');
    expect(results[0].reason).toContain('/some/wrong/target');

    // Verify new symlink is correct
    const newTarget = await readlink(linkPath);
    expect(newTarget).toContain('.agents/skills/my-skill');
  });

  it('skips when path exists as real directory (not symlink)', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    // Create a real directory at the link path
    await mkdir(join(agentDir, 'my-skill'), { recursive: true });

    const results = await createSkillSymlinks(canonical, agentDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not a symlink');
  });

  it('returns empty array when skillNames is empty', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(canonical, { recursive: true });
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    const results = await createSkillSymlinks(canonical, agentDir, []);
    expect(results).toEqual([]);
  });

});

describe('listCanonicalSkills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'linker-list-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty array for empty directory', async () => {
    const result = await listCanonicalSkills(tempDir);
    expect(result).toEqual([]);
  });

  it('returns only directory names, not files', async () => {
    await mkdir(join(tempDir, 'my-skill'), { recursive: true });
    await writeFile(join(tempDir, 'README.md'), '# readme');
    const result = await listCanonicalSkills(tempDir);
    expect(result).toEqual(['my-skill']);
  });

  it('filters out hidden directories', async () => {
    await mkdir(join(tempDir, 'visible-skill'), { recursive: true });
    await mkdir(join(tempDir, '.hidden-dir'), { recursive: true });
    const result = await listCanonicalSkills(tempDir);
    expect(result).toEqual(['visible-skill']);
  });

  it('returns empty array for nonexistent directory', async () => {
    const result = await listCanonicalSkills('/nonexistent/path/nowhere');
    expect(result).toEqual([]);
  });
});

describe('copySkills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'linker-copy-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('copies a skill directory that does not exist in target', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');

    const results = await copySkills(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('my-skill');
    expect(results[0].status).toBe('copied');

    // Verify files actually exist
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(join(targetDir, 'my-skill', 'SKILL.md'), 'utf-8');
    expect(content).toBe('# My Skill');
  });

  it('skips when skill not found in canonical directory', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(canonical, { recursive: true });

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');

    const results = await copySkills(canonical, targetDir, ['nonexistent-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('nonexistent-skill');
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not found');
  });

  it('overwrites existing skill in target directory', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# Updated Skill');

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');
    // Pre-populate target with old content
    await mkdir(join(targetDir, 'my-skill'), { recursive: true });
    await writeFile(join(targetDir, 'my-skill', 'SKILL.md'), '# Old Skill');

    const results = await copySkills(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('my-skill');
    expect(results[0].status).toBe('overwritten');

    // Verify new content
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(join(targetDir, 'my-skill', 'SKILL.md'), 'utf-8');
    expect(content).toBe('# Updated Skill');
  });

  it('returns empty array when skillNames is empty', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(canonical, { recursive: true });

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');

    const results = await copySkills(canonical, targetDir, []);
    expect(results).toEqual([]);
  });

  it('creates targetDir if it does not exist', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    // targetDir does NOT exist yet
    const targetDir = join(tempDir, 'deeply', 'nested', 'target', 'skills');

    const results = await copySkills(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('copied');

    // Verify the directory and files were created
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(join(targetDir, 'my-skill', 'SKILL.md'), 'utf-8');
    expect(content).toBe('# My Skill');
  });
});

describe('createProjectSymlinks', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'linker-project-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates absolute symlink for skill not yet in target', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');
    await mkdir(targetDir, { recursive: true });

    const results = await createProjectSymlinks(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('my-skill');
    expect(results[0].status).toBe('created');

    // Verify symlink is absolute (starts with /), not relative
    const linkTarget = await readlink(join(targetDir, 'my-skill'));
    expect(linkTarget).toBe(join(canonical, 'my-skill'));
    expect(linkTarget.startsWith('/')).toBe(true);
  });

  it('skips when skill not found in canonical directory', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(canonical, { recursive: true });

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');
    await mkdir(targetDir, { recursive: true });

    const results = await createProjectSymlinks(canonical, targetDir, ['nonexistent-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('nonexistent-skill');
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not found');
  });

  it('reports existing correct absolute symlink', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');
    await mkdir(targetDir, { recursive: true });

    // Create first
    await createProjectSymlinks(canonical, targetDir, ['my-skill']);
    // Create again — should detect existing
    const results = await createProjectSymlinks(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('exists');
  });

  it('recreates stale symlink pointing elsewhere', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');
    await mkdir(targetDir, { recursive: true });

    // Create a stale symlink pointing to wrong place
    const linkPath = join(targetDir, 'my-skill');
    await symlink('/some/wrong/target', linkPath);

    const results = await createProjectSymlinks(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('recreated');
    expect(results[0].reason).toContain('/some/wrong/target');

    // Verify new symlink is absolute and correct
    const newTarget = await readlink(linkPath);
    expect(newTarget).toBe(join(canonical, 'my-skill'));
  });

  it('skips existing non-symlink path', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    const targetDir = join(tempDir, 'project', '.opencode', 'skills');
    // Create a real directory at the link path
    await mkdir(join(targetDir, 'my-skill'), { recursive: true });

    const results = await createProjectSymlinks(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not a symlink');
  });

  it('creates targetDir if it does not exist', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    // targetDir does NOT exist yet
    const targetDir = join(tempDir, 'deeply', 'nested', 'project', 'skills');

    const results = await createProjectSymlinks(canonical, targetDir, ['my-skill']);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('created');

    // Verify the symlink was created and is absolute
    const linkTarget = await readlink(join(targetDir, 'my-skill'));
    expect(linkTarget).toBe(join(canonical, 'my-skill'));
  });
});
