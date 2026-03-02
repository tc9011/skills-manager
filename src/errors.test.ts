import { describe, it, expect } from 'vitest';
import { CliError } from './errors.js';

describe('CliError', () => {
  it('sets name to CliError', () => {
    const err = new CliError('test');
    expect(err.name).toBe('CliError');
  });

  it('message matches constructor arg', () => {
    const err = new CliError('something went wrong');
    expect(err.message).toBe('something went wrong');
  });

  it('is instanceof Error', () => {
    const err = new CliError('test');
    expect(err).toBeInstanceOf(Error);
  });
});
