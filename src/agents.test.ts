import { describe, it, expect } from 'vitest';
import { agentRegistry, getAgentGlobalPath, type AgentId } from './agents.js';

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
});
