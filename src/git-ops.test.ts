// src/git-ops.test.ts
import { describe, it, expect } from 'vitest';
import { buildRemoteUrl } from './git-ops.js';

describe('buildRemoteUrl', () => {
  it('builds clean HTTPS URL without credentials', () => {
    const url = buildRemoteUrl('tc9011/my-skills');
    expect(url).toBe('https://github.com/tc9011/my-skills.git');
  });

  it('never includes token in URL', () => {
    // buildRemoteUrl no longer accepts tokens — credentials are handled transiently
    const url = buildRemoteUrl('tc9011/my-skills');
    expect(url).not.toContain('@');
    expect(url).not.toContain('ghp_');
  });
});
