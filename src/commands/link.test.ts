// src/commands/link.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';

// Mock @clack/prompts to avoid interactive prompts in tests
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
  multiselect: vi.fn(),
  isCancel: vi.fn(() => false),
}));

describe('linkCommand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws CliError for invalid agent IDs', async () => {
    const { linkCommand } = await import('./link.js');
    await expect(
      linkCommand({ agents: ['not-a-real-agent-id'] }),
    ).rejects.toThrow(CliError);
  });

  it('throws CliError with message listing invalid IDs', async () => {
    const { linkCommand } = await import('./link.js');
    await expect(
      linkCommand({ agents: ['bogus-agent', 'also-fake'] }),
    ).rejects.toThrow(/bogus-agent.*also-fake|also-fake.*bogus-agent/);
  });

  it('module exports a linkCommand function', async () => {
    const mod = await import('./link.js');
    expect(typeof mod.linkCommand).toBe('function');
  });
});
