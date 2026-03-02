// src/linker.ts
import { symlink, lstat, readdir, mkdir, readlink, unlink, cp, rm } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export interface LinkResult {
  skill: string;
  status: 'created' | 'exists' | 'recreated' | 'skipped';
  reason?: string;
}

export interface CopyResult {
  skill: string;
  status: 'copied' | 'overwritten' | 'skipped';
  reason?: string;
}

/**
 * Compute relative symlink target from linkPath to targetPath.
 * This matches how vercel-labs/skills creates relative symlinks.
 */
export function computeRelativeSymlinkTarget(linkPath: string, targetPath: string): string {
  return relative(dirname(linkPath), targetPath);
}

/**
 * Create symlinks from agentSkillsDir/<skill> → canonicalDir/<skill>
 * for each skill name in the list.
 *
 * @param canonicalDir - Absolute path to ~/.agents/skills/
 * @param agentSkillsDir - Absolute path to agent's global skills dir
 * @param skillNames - List of skill folder names to link
 */
export async function createSkillSymlinks(
  canonicalDir: string,
  agentSkillsDir: string,
  skillNames: string[],
): Promise<LinkResult[]> {
  // Ensure agent dir exists
  await mkdir(agentSkillsDir, { recursive: true });

  const results: LinkResult[] = [];

  for (const skill of skillNames) {
    const canonicalPath = join(canonicalDir, skill);
    const linkPath = join(agentSkillsDir, skill);

    // Check skill exists in canonical
    if (!existsSync(canonicalPath)) {
      results.push({ skill, status: 'skipped', reason: `not found in ${canonicalDir}` });
      continue;
    }

    // Check if symlink already exists
    try {
      const stats = await lstat(linkPath);
      if (stats.isSymbolicLink()) {
        // Verify the symlink points to the correct target
        const expectedTarget = computeRelativeSymlinkTarget(linkPath, canonicalPath);
        const actualTarget = await readlink(linkPath);
        if (actualTarget === expectedTarget) {
          results.push({ skill, status: 'exists' });
          continue;
        }
        // Stale symlink — remove and recreate
        await unlink(linkPath);
        const target = computeRelativeSymlinkTarget(linkPath, canonicalPath);
        await symlink(target, linkPath);
        results.push({ skill, status: 'recreated', reason: `was pointing to ${actualTarget}` });
        continue;
      }
      // Exists but not a symlink — skip to avoid overwriting
      results.push({ skill, status: 'skipped', reason: 'path exists but is not a symlink' });
      continue;
    } catch {
      // Doesn't exist — good, we'll create it
    }

    // Create relative symlink
    const target = computeRelativeSymlinkTarget(linkPath, canonicalPath);
    await symlink(target, linkPath);
    results.push({ skill, status: 'created' });
  }

  return results;
}

/**
 * Get all skill folder names from the canonical directory.
 */
export async function listCanonicalSkills(canonicalDir: string): Promise<string[]> {
  try {
    const entries = await readdir(canonicalDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Copy skill directories from canonicalDir to targetDir.
 * Unlike createSkillSymlinks, this creates actual copies for project-level skills.
 *
 * @param canonicalDir - Absolute path to ~/.agents/skills/
 * @param targetDir - Absolute path to the project's skills directory
 * @param skillNames - List of skill folder names to copy
 */
export async function copySkills(
  canonicalDir: string,
  targetDir: string,
  skillNames: string[],
): Promise<CopyResult[]> {
  // Ensure target dir exists
  await mkdir(targetDir, { recursive: true });

  const results: CopyResult[] = [];

  for (const skill of skillNames) {
    const canonicalPath = join(canonicalDir, skill);
    const destPath = join(targetDir, skill);

    // Check skill exists in canonical
    if (!existsSync(canonicalPath)) {
      results.push({ skill, status: 'skipped', reason: `not found in ${canonicalDir}` });
      continue;
    }

    // Check if skill already exists in target
    if (existsSync(destPath)) {
      await rm(destPath, { recursive: true, force: true });
      await cp(canonicalPath, destPath, { recursive: true });
      results.push({ skill, status: 'overwritten' });
      continue;
    }

    // Copy entire directory
    await cp(canonicalPath, destPath, { recursive: true });
    results.push({ skill, status: 'copied' });
  }

  return results;
}

/**
 * Create absolute symlinks from targetDir/<skill> → canonicalDir/<skill>
 * for project-level linking where source and target are in unrelated trees.
 *
 * @param canonicalDir - Absolute path to ~/.agents/skills/
 * @param targetDir - Absolute path to the project's skills directory
 * @param skillNames - List of skill folder names to link
 */
export async function createProjectSymlinks(
  canonicalDir: string,
  targetDir: string,
  skillNames: string[],
): Promise<LinkResult[]> {
  // Ensure target dir exists
  await mkdir(targetDir, { recursive: true });

  const results: LinkResult[] = [];

  for (const skill of skillNames) {
    const canonicalPath = join(canonicalDir, skill);
    const linkPath = join(targetDir, skill);

    // Check skill exists in canonical
    if (!existsSync(canonicalPath)) {
      results.push({ skill, status: 'skipped', reason: `not found in ${canonicalDir}` });
      continue;
    }

    // Check if symlink already exists
    try {
      const stats = await lstat(linkPath);
      if (stats.isSymbolicLink()) {
        // Verify the symlink points to the correct absolute target
        const actualTarget = await readlink(linkPath);
        if (actualTarget === canonicalPath) {
          results.push({ skill, status: 'exists' });
          continue;
        }
        // Stale symlink — remove and recreate
        await unlink(linkPath);
        await symlink(canonicalPath, linkPath);
        results.push({ skill, status: 'recreated', reason: `was pointing to ${actualTarget}` });
        continue;
      }
      // Exists but not a symlink — skip to avoid overwriting
      results.push({ skill, status: 'skipped', reason: 'path exists but is not a symlink' });
      continue;
    } catch {
      // Doesn't exist — good, we'll create it
    }

    // Create absolute symlink
    await symlink(canonicalPath, linkPath);
    results.push({ skill, status: 'created' });
  }

  return results;
}
