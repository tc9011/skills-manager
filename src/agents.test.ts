import { describe, it, expect } from 'vitest';
import { agentRegistry, getAgentGlobalPath, AGENTS_DIR, CANONICAL_SKILLS_DIR, SKILL_LOCK_PATH, type AgentId } from './agents.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('agentRegistry', () => {
  it('contains all 41 agents', () => {
    expect(Object.keys(agentRegistry)).toHaveLength(41);
  });

  it('includes all user lastSelectedAgents', () => {
    const required: AgentId[] = [
      'amp',
      'cline',
      'codex',
      'cursor',
      'gemini-cli',
      'github-copilot',
      'kimi-cli',
      'opencode',
      'antigravity',
      'trae',
      'pi',
      'claude-code',
    ];
    for (const agent of required) {
      expect(agentRegistry[agent]).toBeDefined();
    }
  });

  it('universal agents share .agents/skills project path', () => {
    const universals = Object.entries(agentRegistry).filter(([, v]) => v.universal);
    for (const [, agent] of universals) {
      expect(agent.projectPath).toBe('.agents/skills');
    }
  });

  it('non-universal agents have agent-specific project paths', () => {
    expect(agentRegistry['claude-code'].projectPath).toBe('.claude/skills');
    expect(agentRegistry.antigravity.projectPath).toBe('.agent/skills');
    expect(agentRegistry.windsurf.projectPath).toBe('.windsurf/skills');
  });

  it('has correct count of universal agents', () => {
    const universals = Object.values(agentRegistry).filter(v => v.universal);
    expect(universals).toHaveLength(10);
  });

  it('has correct count of non-universal agents', () => {
    const nonUniversals = Object.values(agentRegistry).filter(v => !v.universal);
    expect(nonUniversals).toHaveLength(31);
  });
});

describe('getAgentGlobalPath', () => {
  it('resolves ~ to home directory', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('cursor');
    expect(path).toBe(`${home}/.cursor/skills`);
  });

  it('resolves opencode with XDG_CONFIG_HOME fallback', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('opencode');
    expect(path).toBe(`${home}/.config/opencode/skills`);
  });

  it('resolves claude-code with CLAUDE_CONFIG_DIR fallback', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('claude-code');
    expect(path).toBe(`${home}/.claude/skills`);
  });

  it('resolves opencode with custom XDG_CONFIG_HOME', () => {
    const original = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = '/tmp/custom-xdg';
    try {
      const path = getAgentGlobalPath('opencode');
      expect(path).toBe('/tmp/custom-xdg/opencode/skills');
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
    }
  });

  it('resolves codex with custom CODEX_HOME', () => {
    const original = process.env.CODEX_HOME;
    process.env.CODEX_HOME = '/tmp/custom-codex';
    try {
      const path = getAgentGlobalPath('codex');
      expect(path).toBe('/tmp/custom-codex/skills');
    } finally {
      if (original === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = original;
    }
  });

  it('resolves claude-code with custom CLAUDE_CONFIG_DIR', () => {
    const original = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = '/tmp/custom-claude';
    try {
      const path = getAgentGlobalPath('claude-code');
      expect(path).toBe('/tmp/custom-claude/skills');
    } finally {
      if (original === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = original;
    }
  });
});

describe('agent constants', () => {
  it('AGENTS_DIR resolves to ~/.agents', () => {
    expect(AGENTS_DIR).toBe(join(homedir(), '.agents'));
  });

  it('CANONICAL_SKILLS_DIR resolves to ~/.agents/skills', () => {
    expect(CANONICAL_SKILLS_DIR).toBe(join(homedir(), '.agents', 'skills'));
  });

  it('SKILL_LOCK_PATH resolves to ~/.agents/.skill-lock.json', () => {
    expect(SKILL_LOCK_PATH).toBe(join(homedir(), '.agents', '.skill-lock.json'));
  });
});
