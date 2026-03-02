// src/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readConfig, writeConfig } from './config.js';

describe('config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'skills-mgr-cfg-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('readConfig', () => {
    it('returns empty object when file does not exist', () => {
      const result = readConfig(join(tmpDir, 'nonexistent.json'));
      expect(result).toEqual({});
    });

    it('returns parsed config when file exists', () => {
      const configPath = join(tmpDir, 'config.json');
      writeFileSync(configPath, JSON.stringify({ lastLinkedAgents: ['cursor', 'opencode'] }));
      const result = readConfig(configPath);
      expect(result).toEqual({ lastLinkedAgents: ['cursor', 'opencode'] });
    });

    it('returns empty object for invalid JSON', () => {
      const configPath = join(tmpDir, 'config.json');
      writeFileSync(configPath, 'not valid json{{{');
      const result = readConfig(configPath);
      expect(result).toEqual({});
    });

    it('returns empty object for non-object JSON (array)', () => {
      const configPath = join(tmpDir, 'config.json');
      writeFileSync(configPath, '["a","b"]');
      const result = readConfig(configPath);
      expect(result).toEqual({});
    });
  });

  describe('writeConfig', () => {
    it('creates directories and writes config', () => {
      const configPath = join(tmpDir, 'nested', 'dir', 'config.json');
      writeConfig({ lastLinkedAgents: ['cursor'] }, configPath);
      const raw = readFileSync(configPath, 'utf-8');
      expect(JSON.parse(raw)).toEqual({ lastLinkedAgents: ['cursor'] });
    });

    it('merges with existing config', () => {
      const configPath = join(tmpDir, 'config.json');
      mkdirSync(tmpDir, { recursive: true });
      writeFileSync(configPath, JSON.stringify({ lastLinkedAgents: ['cursor'] }));
      writeConfig({ lastLinkedAgents: ['opencode', 'claude-code'] }, configPath);
      const raw = readFileSync(configPath, 'utf-8');
      expect(JSON.parse(raw)).toEqual({ lastLinkedAgents: ['opencode', 'claude-code'] });
    });

    it('overwrites gracefully when existing file is corrupt', () => {
      const configPath = join(tmpDir, 'config.json');
      writeFileSync(configPath, 'broken!!!');
      writeConfig({ lastLinkedAgents: ['amp'] }, configPath);
      const raw = readFileSync(configPath, 'utf-8');
      expect(JSON.parse(raw)).toEqual({ lastLinkedAgents: ['amp'] });
    });
  });
});
