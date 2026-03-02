// src/lockfile.ts
import { readFile } from 'node:fs/promises';
import { agentRegistry, type AgentId } from './agents.js';

export interface SkillLockEntry {
  source: string;
  sourceType: string;
  sourceUrl: string;
  skillPath?: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
  pluginName?: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
  dismissed?: Record<string, unknown>;
  lastSelectedAgents?: string[];
}

/**
 * Read and parse .skill-lock.json. Returns null if file doesn't exist.
 * Throws on malformed JSON or other I/O errors.
 */
export async function readLockFile(path: string): Promise<SkillLockFile | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as SkillLockFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Get lastSelectedAgents from lock file, filtered to valid agent IDs.
 * Returns empty array if file missing or field absent.
 */
export async function getLastSelectedAgents(path: string): Promise<AgentId[]> {
  const lock = await readLockFile(path);
  if (!lock?.lastSelectedAgents) return [];

  const validIds = new Set(Object.keys(agentRegistry));
  return lock.lastSelectedAgents.filter(
    (id): id is AgentId => validIds.has(id)
  );
}
