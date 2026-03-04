import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readLockFile, getLastSelectedAgents } from './lockfile.js';

// Mock fs to avoid reading real files in tests
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
const mockReadFile = vi.mocked(readFile);

describe('readLockFile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses valid lock file', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        version: 3,
        skills: {
          'my-skill': {
            source: 'user/repo',
            sourceType: 'github',
            sourceUrl: 'https://github.com/user/repo.git',
            skillFolderHash: 'abc123',
            installedAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
        lastSelectedAgents: ['opencode', 'claude-code'],
      })
    );

    const result = await readLockFile('/fake/path');
    expect(result).toBeDefined();
    expect(result!.version).toBe(3);
    expect(result!.lastSelectedAgents).toEqual(['opencode', 'claude-code']);
    expect(Object.keys(result!.skills)).toContain('my-skill');
  });

  it('returns null when file does not exist', async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockReadFile.mockRejectedValue(err);

    const result = await readLockFile('/nonexistent/path');
    expect(result).toBeNull();
  });

  it('throws on invalid JSON', async () => {
    mockReadFile.mockResolvedValue('not json{{{');
    await expect(readLockFile('/bad/path')).rejects.toThrow();
  });

  it('re-throws non-ENOENT errors', async () => {
    const err = new Error('EACCES') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockReadFile.mockRejectedValue(err);

    await expect(readLockFile('/permission/denied')).rejects.toThrow('EACCES');
  });
});

describe('getLastSelectedAgents', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns lastSelectedAgents filtered to valid AgentIds', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        version: 3,
        skills: {},
        lastSelectedAgents: ['opencode', 'claude-code', 'nonexistent-agent'],
      })
    );

    const agents = await getLastSelectedAgents('/fake/path');
    expect(agents).toEqual(['opencode', 'claude-code']);
  });

  it('returns empty array when lock file missing', async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockReadFile.mockRejectedValue(err);

    const agents = await getLastSelectedAgents('/fake/path');
    expect(agents).toEqual([]);
  });

  it('returns empty array when lastSelectedAgents is absent', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        version: 3,
        skills: {},
      })
    );

    const agents = await getLastSelectedAgents('/fake/path');
    expect(agents).toEqual([]);
  });
});
