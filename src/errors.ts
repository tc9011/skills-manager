// src/errors.ts

/**
 * Custom error class for CLI-level failures.
 * Thrown by command handlers instead of calling process.exit(1) directly,
 * enabling testability. Caught at the top-level entrypoint.
 */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}
