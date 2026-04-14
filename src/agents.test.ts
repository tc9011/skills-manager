import { describe, it, expect } from 'vitest';
import { agentRegistry, getAgentGlobalPath, getAgentProjectPath, groupAgentsByProjectPath, AGENTS_DIR, CANONICAL_SKILLS_DIR, SKILL_LOCK_PATH, type AgentId } from './agents.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('agentRegistry', () => {
  it('contains all 46 agents', () => {
    expect(Object.keys(agentRegistry)).toHaveLength(46);
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
    expect(agentRegistry.bob.projectPath).toBe('.bob/skills');
    expect(agentRegistry.windsurf.projectPath).toBe('.windsurf/skills');
  });

  it('has correct count of universal agents', () => {
    const universals = Object.values(agentRegistry).filter(v => v.universal);
    expect(universals).toHaveLength(14);
  });

  it('has correct count of non-universal agents', () => {
    const nonUniversals = Object.values(agentRegistry).filter(v => !v.universal);
    expect(nonUniversals).toHaveLength(32);
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

  it('resolves amp with XDG_CONFIG_HOME fallback', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('amp');
    expect(path).toBe(`${home}/.config/agents/skills`);
  });

  it('resolves goose with XDG_CONFIG_HOME fallback', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('goose');
    expect(path).toBe(`${home}/.config/goose/skills`);
  });

  it('resolves amp with custom XDG_CONFIG_HOME', () => {
    const original = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = '/tmp/custom-xdg';
    try {
      const path = getAgentGlobalPath('amp');
      expect(path).toBe('/tmp/custom-xdg/agents/skills');
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
    }
  });

  it('resolves goose with custom XDG_CONFIG_HOME', () => {
    const original = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = '/tmp/custom-xdg';
    try {
      const path = getAgentGlobalPath('goose');
      expect(path).toBe('/tmp/custom-xdg/goose/skills');
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
    }
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

describe('getAgentProjectPath', () => {
  it('resolves cursor (universal) project path', () => {
    const path = getAgentProjectPath('cursor', '/my/project');
    expect(path).toBe('/my/project/.agents/skills');
  });

  it('resolves claude-code (non-universal) project path', () => {
    const path = getAgentProjectPath('claude-code', '/my/project');
    expect(path).toBe('/my/project/.claude/skills');
  });

  it('resolves antigravity project path', () => {
    const path = getAgentProjectPath('antigravity', '/tmp/foo');
    expect(path).toBe('/tmp/foo/.agents/skills');
  });

  it('resolves opencode (universal) project path', () => {
    const path = getAgentProjectPath('opencode', '/my/project');
    expect(path).toBe('/my/project/.agents/skills');
  });

  it('resolves windsurf (non-universal) project path', () => {
    const path = getAgentProjectPath('windsurf', '/home/user/repo');
    expect(path).toBe('/home/user/repo/.windsurf/skills');
  });
});

describe('groupAgentsByProjectPath', () => {
  it('groups mixed universal and non-universal agents correctly', () => {
    const groups = groupAgentsByProjectPath(['cursor', 'opencode', 'claude-code', 'amp']);
    expect(groups).toBeInstanceOf(Map);
    expect(groups.size).toBe(2);
    expect(groups.get('.agents/skills')).toEqual(expect.arrayContaining(['cursor', 'opencode', 'amp']));
    expect(groups.get('.agents/skills')).toHaveLength(3);
    expect(groups.get('.claude/skills')).toEqual(['claude-code']);
  });

  it('groups only universal agents into single group', () => {
    const groups = groupAgentsByProjectPath(['cursor', 'opencode', 'amp', 'cline', 'codex']);
    expect(groups.size).toBe(1);
    expect(groups.get('.agents/skills')).toHaveLength(5);
  });

  it('returns empty Map for no agents', () => {
    const groups = groupAgentsByProjectPath([]);
    expect(groups).toBeInstanceOf(Map);
    expect(groups.size).toBe(0);
  });

  it('returns single group for single agent', () => {
    const groups = groupAgentsByProjectPath(['cursor']);
    expect(groups.size).toBe(1);
    expect(groups.get('.agents/skills')).toEqual(['cursor']);
  });

  it('groups trae and trae-cn together under .trae/skills', () => {
    const groups = groupAgentsByProjectPath(['trae', 'trae-cn']);
    expect(groups.size).toBe(1);
    expect(groups.get('.trae/skills')).toEqual(expect.arrayContaining(['trae', 'trae-cn']));
    expect(groups.get('.trae/skills')).toHaveLength(2);
  });
});
