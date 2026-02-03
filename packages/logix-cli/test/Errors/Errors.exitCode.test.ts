import { describe, expect, it } from 'vitest'

import { exitCodeFromErrorSummary } from '../../src/internal/errors.js'

describe('logix-cli exit code mapping', () => {
  it('should treat CLI_VIOLATION* as exitCode=2', () => {
    expect(exitCodeFromErrorSummary({ message: 'x', code: 'CLI_VIOLATION' })).toBe(2)
    expect(exitCodeFromErrorSummary({ message: 'x', code: 'CLI_VIOLATION_DIFF_FOUND' })).toBe(2)
  })

  it('should treat usage errors as exitCode=2', () => {
    expect(exitCodeFromErrorSummary({ message: 'x', code: 'CLI_INVALID_ARGUMENT' })).toBe(2)
    expect(exitCodeFromErrorSummary({ message: 'x', code: 'CLI_INVALID_COMMAND' })).toBe(2)
    expect(exitCodeFromErrorSummary({ message: 'x', code: 'CLI_MISSING_RUNID' })).toBe(2)
    expect(exitCodeFromErrorSummary({ message: 'x', code: 'CLI_INVALID_INPUT' })).toBe(2)
  })

  it('should treat other errors as exitCode=1', () => {
    expect(exitCodeFromErrorSummary({ message: 'x' })).toBe(1)
  })
})
