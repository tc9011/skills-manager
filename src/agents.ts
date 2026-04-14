// src/agents.ts
import { homedir } from 'node:os';
import { join } from 'node:path';

export type AgentId =
  | 'amp' | 'antigravity' | 'augment' | 'bob' | 'claude-code' | 'openclaw'
  | 'cline' | 'codebuddy' | 'codex' | 'command-code' | 'continue'
  | 'cortex' | 'crush' | 'cursor' | 'deepagents' | 'droid' | 'firebender'
  | 'gemini-cli' | 'github-copilot' | 'goose' | 'hermes' | 'junie'
  | 'iflow-cli' | 'kilo' | 'kimi-cli' | 'kiro-cli' | 'kode'
  | 'mcpjam' | 'mistral-vibe' | 'mux' | 'opencode' | 'openhands'
  | 'pi' | 'qoder' | 'qwen-code' | 'replit' | 'roo' | 'trae' | 'trae-cn'
  | 'warp' | 'windsurf' | 'zencoder' | 'neovate' | 'pochi' | 'adal' | 'universal';

export interface AgentPaths {
  displayName: string;
  projectPath: string;
  globalPath: string;       // uses ~ or env var placeholders
  universal: boolean;
}

export const agentRegistry: Record<AgentId, AgentPaths> = {
  // UNIVERSAL GROUP (.agents/skills)
  amp:              { displayName: 'Amp',              projectPath: '.agents/skills', globalPath: '$XDG_CONFIG_HOME/agents/skills',   universal: true },
  antigravity:      { displayName: 'Antigravity',      projectPath: '.agents/skills', globalPath: '~/.gemini/antigravity/skills',    universal: true },
  cline:            { displayName: 'Cline',            projectPath: '.agents/skills', globalPath: '~/.agents/skills',          universal: true },
  codex:            { displayName: 'Codex',            projectPath: '.agents/skills', globalPath: '$CODEX_HOME/skills',        universal: true },
  cursor:           { displayName: 'Cursor',           projectPath: '.agents/skills', globalPath: '~/.cursor/skills',          universal: true },
  deepagents:       { displayName: 'Deep Agents',      projectPath: '.agents/skills', globalPath: '~/.deepagents/agent/skills',      universal: true },
  firebender:       { displayName: 'Firebender',       projectPath: '.agents/skills', globalPath: '~/.firebender/skills',            universal: true },
  'gemini-cli':     { displayName: 'Gemini CLI',       projectPath: '.agents/skills', globalPath: '~/.gemini/skills',          universal: true },
  'github-copilot': { displayName: 'GitHub Copilot',   projectPath: '.agents/skills', globalPath: '~/.copilot/skills',         universal: true },
  'kimi-cli':       { displayName: 'Kimi Code CLI',    projectPath: '.agents/skills', globalPath: '$XDG_CONFIG_HOME/agents/skills',   universal: true },
  opencode:         { displayName: 'OpenCode',         projectPath: '.agents/skills', globalPath: '$XDG_CONFIG_HOME/opencode/skills', universal: true },
  replit:           { displayName: 'Replit',            projectPath: '.agents/skills', globalPath: '$XDG_CONFIG_HOME/agents/skills',   universal: true },
  universal:        { displayName: 'Universal',        projectPath: '.agents/skills', globalPath: '$XDG_CONFIG_HOME/agents/skills',   universal: true },
  warp:             { displayName: 'Warp',             projectPath: '.agents/skills', globalPath: '~/.agents/skills',                universal: true },

  // NON-UNIVERSAL (agent-specific paths)
  augment:          { displayName: 'Augment',          projectPath: '.augment/skills',      globalPath: '~/.augment/skills',               universal: false },
  bob:              { displayName: 'IBM Bob',          projectPath: '.bob/skills',          globalPath: '~/.bob/skills',                   universal: false },
  'claude-code':    { displayName: 'Claude Code',      projectPath: '.claude/skills',       globalPath: '$CLAUDE_CONFIG_DIR/skills',       universal: false },
  openclaw:         { displayName: 'OpenClaw',         projectPath: 'skills',               globalPath: '~/.openclaw/skills',              universal: false },
  codebuddy:        { displayName: 'CodeBuddy',        projectPath: '.codebuddy/skills',    globalPath: '~/.codebuddy/skills',             universal: false },
  'command-code':   { displayName: 'Command Code',     projectPath: '.commandcode/skills',  globalPath: '~/.commandcode/skills',           universal: false },
  continue:         { displayName: 'Continue',         projectPath: '.continue/skills',     globalPath: '~/.continue/skills',              universal: false },
  cortex:           { displayName: 'Cortex Code',      projectPath: '.cortex/skills',       globalPath: '~/.snowflake/cortex/skills',      universal: false },
  crush:            { displayName: 'Crush',            projectPath: '.crush/skills',        globalPath: '$XDG_CONFIG_HOME/crush/skills',          universal: false },
  droid:            { displayName: 'Droid',            projectPath: '.factory/skills',      globalPath: '~/.factory/skills',               universal: false },
  goose:            { displayName: 'Goose',            projectPath: '.goose/skills',        globalPath: '$XDG_CONFIG_HOME/goose/skills',          universal: false },
  hermes:           { displayName: 'Hermes Agent',     projectPath: '.hermes/skills',       globalPath: '~/.hermes/skills',                universal: false },
  junie:            { displayName: 'Junie',            projectPath: '.junie/skills',        globalPath: '~/.junie/skills',                 universal: false },
  'iflow-cli':      { displayName: 'iFlow CLI',        projectPath: '.iflow/skills',        globalPath: '~/.iflow/skills',                 universal: false },
  kilo:             { displayName: 'Kilo Code',        projectPath: '.kilocode/skills',     globalPath: '~/.kilocode/skills',              universal: false },
  'kiro-cli':       { displayName: 'Kiro CLI',         projectPath: '.kiro/skills',         globalPath: '~/.kiro/skills',                  universal: false },
  kode:             { displayName: 'Kode',             projectPath: '.kode/skills',         globalPath: '~/.kode/skills',                  universal: false },
  mcpjam:           { displayName: 'MCPJam',           projectPath: '.mcpjam/skills',       globalPath: '~/.mcpjam/skills',                universal: false },
  'mistral-vibe':   { displayName: 'Mistral Vibe',     projectPath: '.vibe/skills',         globalPath: '~/.vibe/skills',                  universal: false },
  mux:              { displayName: 'Mux',              projectPath: '.mux/skills',          globalPath: '~/.mux/skills',                   universal: false },
  openhands:        { displayName: 'OpenHands',        projectPath: '.openhands/skills',    globalPath: '~/.openhands/skills',             universal: false },
  pi:               { displayName: 'Pi',               projectPath: '.pi/skills',           globalPath: '~/.pi/agent/skills',              universal: false },
  qoder:            { displayName: 'Qoder',            projectPath: '.qoder/skills',        globalPath: '~/.qoder/skills',                 universal: false },
  'qwen-code':      { displayName: 'Qwen Code',        projectPath: '.qwen/skills',         globalPath: '~/.qwen/skills',                  universal: false },
  roo:              { displayName: 'Roo Code',         projectPath: '.roo/skills',          globalPath: '~/.roo/skills',                   universal: false },
  trae:             { displayName: 'Trae',             projectPath: '.trae/skills',         globalPath: '~/.trae/skills',                  universal: false },
  'trae-cn':        { displayName: 'Trae CN',          projectPath: '.trae/skills',         globalPath: '~/.trae-cn/skills',               universal: false },
  windsurf:         { displayName: 'Windsurf',         projectPath: '.windsurf/skills',     globalPath: '~/.codeium/windsurf/skills',      universal: false },
  zencoder:         { displayName: 'Zencoder',         projectPath: '.zencoder/skills',     globalPath: '~/.zencoder/skills',              universal: false },
  neovate:          { displayName: 'Neovate',          projectPath: '.neovate/skills',      globalPath: '~/.neovate/skills',               universal: false },
  pochi:            { displayName: 'Pochi',            projectPath: '.pochi/skills',        globalPath: '~/.pochi/skills',                 universal: false },
  adal:             { displayName: 'AdaL',             projectPath: '.adal/skills',         globalPath: '~/.adal/skills',                  universal: false },
};

/**
 * Resolve an agent's global skills path to an absolute filesystem path.
 * Handles ~, $XDG_CONFIG_HOME, $CODEX_HOME, $CLAUDE_CONFIG_DIR.
 */
export function getAgentGlobalPath(agentId: AgentId): string {
  const home = homedir();
  let p = agentRegistry[agentId].globalPath;

  // Resolve env-var-based paths first
  if (p.startsWith('$XDG_CONFIG_HOME')) {
    const xdg = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
    p = p.replace('$XDG_CONFIG_HOME', xdg);
  } else if (p.startsWith('$CODEX_HOME')) {
    const codex = process.env.CODEX_HOME ?? join(home, '.codex');
    p = p.replace('$CODEX_HOME', codex);
  } else if (p.startsWith('$CLAUDE_CONFIG_DIR')) {
    const claude = process.env.CLAUDE_CONFIG_DIR ?? join(home, '.claude');
    p = p.replace('$CLAUDE_CONFIG_DIR', claude);
  } else if (p.startsWith('~')) {
    p = p.replace('~', home);
  }

  return p;
}

/**
 * Resolve an agent's project-level skills path given a project root.
 * projectPaths are plain relative paths (no env vars), so this is a simple join.
 */
export function getAgentProjectPath(agentId: AgentId, projectRoot: string): string {
  return join(projectRoot, agentRegistry[agentId].projectPath);
}

/**
 * Group agent IDs by their projectPath, enabling deduplication when linking/copying.
 * Returns a Map where keys are projectPath strings and values are arrays of agent IDs
 * that share that projectPath.
 */
export function groupAgentsByProjectPath(agentIds: AgentId[]): Map<string, AgentId[]> {
  const groups = new Map<string, AgentId[]>();
  
  for (const agentId of agentIds) {
    const projectPath = agentRegistry[agentId].projectPath;
    
    if (!groups.has(projectPath)) {
      groups.set(projectPath, []);
    }
    
    groups.get(projectPath)!.push(agentId);
  }
  
  return groups;
}

/** Canonical skills directory — the source of truth. */
export const CANONICAL_SKILLS_DIR = join(homedir(), '.agents', 'skills');

/** The git-managed agents directory — root of the backup repo. */
export const AGENTS_DIR = join(homedir(), '.agents');

/** Lock file path — READ ONLY, owned by vercel-labs/skills. */
export const SKILL_LOCK_PATH = join(homedir(), '.agents', '.skill-lock.json');
