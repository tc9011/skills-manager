// src/linker.ts
import { symlink, lstat, readdir, mkdir, readlink } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export interface LinkResult {
  skill: string;
  status: 'created' | 'exists' | 'skipped';
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
        results.push({ skill, status: 'exists' });
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
