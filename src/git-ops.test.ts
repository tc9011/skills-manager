// src/git-ops.test.ts
import { describe, it, expect } from 'vitest';
import { buildRemoteUrl } from './git-ops.js';

describe('buildRemoteUrl', () => {
  it('builds HTTPS URL with token', () => {
    const url = buildRemoteUrl('tc9011/my-skills', 'ghp_abc123');
    expect(url).toBe('https://ghp_abc123@github.com/tc9011/my-skills.git');
  });

  it('builds HTTPS URL without token', () => {
    const url = buildRemoteUrl('tc9011/my-skills', null);
    expect(url).toBe('https://github.com/tc9011/my-skills.git');
  });
});
