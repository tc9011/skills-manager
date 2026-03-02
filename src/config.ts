// src/config.ts
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

export interface SkillsManagerConfig {
  lastLinkedAgents?: string[];
}

/**
 * Returns the config file path: $XDG_CONFIG_HOME/skills-manager/config.json
 * Falls back to ~/.config/skills-manager/config.json if XDG_CONFIG_HOME is unset.
 */
export function getConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(configHome, 'skills-manager', 'config.json');
}

/**
 * Reads the skills-manager config file.
 * Returns an empty object if the file does not exist or is invalid JSON.
 */
export function readConfig(configPath?: string): SkillsManagerConfig {
  const filePath = configPath ?? getConfigPath();
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as SkillsManagerConfig;
  } catch {
    return {};
  }
}

/**
 * Writes a partial config update (merges with existing config).
 * Creates the config directory if it does not exist.
 */
export function writeConfig(update: Partial<SkillsManagerConfig>, configPath?: string): void {
  const filePath = configPath ?? getConfigPath();
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const existing = readConfig(filePath);
  const merged = { ...existing, ...update };
  writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}
